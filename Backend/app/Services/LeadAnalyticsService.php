<?php

namespace App\Services;

use App\Models\ContactRequest;
use App\Models\InteractionEvent;
use App\Models\LeadHistory;
use App\Models\PageVisit;
use App\Models\VisitorSession;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class LeadAnalyticsService
{
    private const SCORE_RULES_KEY = 'lead_score_rules';
    private ?array $scoreRulesCache = null;

    public function buildLeadMetrics(ContactRequest $lead): array
    {
        $sessions = $this->resolveSessionsForLead($lead);
        $sessionIds = $sessions->pluck('id')->all();

        if (empty($sessionIds)) {
            return [
                'sessions_count' => 0,
                'total_page_views' => 0,
                'last_page_accessed' => null,
                'last_access_at' => null,
                'accessed_contact_page' => false,
                'accessed_proposal' => false,
                'proposal_accesses' => 0,
                'returned_after_proposal' => false,
                'origin' => [
                    'referrer' => $lead->referrer,
                    'utm_source' => null,
                    'utm_medium' => null,
                    'utm_campaign' => null,
                ],
                'top_pages' => [],
                'navigation_depth' => 0,
            ];
        }

        $pageVisits = PageVisit::query()
            ->whereIn('visitor_session_id', $sessionIds)
            ->orderByDesc('visited_at')
            ->get();

        $events = InteractionEvent::query()
            ->whereIn('visitor_session_id', $sessionIds)
            ->orderByDesc('occurred_at')
            ->get();

        $lastVisit = $pageVisits->first();
        $proposalEvents = $events->filter(fn (InteractionEvent $event) => in_array($event->event_type, [
            'proposal_open',
            'proposal_reopen',
            'proposal_view',
        ], true));
        $latestProposalAt = $proposalEvents->max('occurred_at');

        $returnedAfterProposal = false;

        if ($latestProposalAt) {
            $returnedAfterProposal = $pageVisits
                ->contains(fn (PageVisit $visit) => $visit->visited_at && $visit->visited_at->gt($latestProposalAt) && ! str_starts_with($visit->path, '/proposta/'));
        }

        $topPages = $pageVisits
            ->groupBy('path')
            ->map(fn (Collection $items, string $path) => [
                'path' => $path,
                'total' => $items->count(),
            ])
            ->sortByDesc('total')
            ->take(5)
            ->values()
            ->all();

        $firstSessionWithUtm = $sessions->first(fn (VisitorSession $session) => is_array($session->utm) && ! empty($session->utm));
        $originUtm = $firstSessionWithUtm?->utm ?? [];
        $originReferrer = $sessions->pluck('referrer')->filter()->first() ?? $lead->referrer;

        return [
            'sessions_count' => $sessions->count(),
            'total_page_views' => $pageVisits->count(),
            'last_page_accessed' => $lastVisit?->path,
            'last_access_at' => $sessions->max('last_seen_at') ?? $lastVisit?->visited_at,
            'accessed_contact_page' => $pageVisits->contains(fn (PageVisit $visit) => str_contains($visit->path, 'contato')),
            'accessed_proposal' => $proposalEvents->isNotEmpty() || $pageVisits->contains(fn (PageVisit $visit) => str_starts_with($visit->path, '/proposta/')),
            'proposal_accesses' => $proposalEvents->count(),
            'returned_after_proposal' => $returnedAfterProposal,
            'origin' => [
                'referrer' => $originReferrer,
                'utm_source' => $originUtm['utm_source'] ?? null,
                'utm_medium' => $originUtm['utm_medium'] ?? null,
                'utm_campaign' => $originUtm['utm_campaign'] ?? null,
            ],
            'top_pages' => $topPages,
            'navigation_depth' => $sessions->max('total_page_views') ?? 0,
        ];
    }

    public function buildLeadTracking(ContactRequest $lead): array
    {
        $sessions = $this->resolveSessionsForLead($lead);
        $sessionIds = $sessions->pluck('id')->all();

        if (empty($sessionIds)) {
            return [
                'sessions' => [],
                'events' => [],
                'timeline' => [],
            ];
        }

        $visits = PageVisit::query()
            ->whereIn('visitor_session_id', $sessionIds)
            ->orderByDesc('visited_at')
            ->get();

        $events = InteractionEvent::query()
            ->whereIn('visitor_session_id', $sessionIds)
            ->orderByDesc('occurred_at')
            ->get();

        $historyEvents = collect();

        if (Schema::hasTable('lead_histories')) {
            $historyEvents = $lead->histories()
                ->get()
                ->map(fn (LeadHistory $history) => [
                    'type' => 'lead_history',
                    'event_type' => $history->event_type,
                    'label' => $history->event_label,
                    'at' => $history->occurred_at,
                    'payload' => $history->payload,
                ]);
        }

        $visitTimeline = $visits->map(fn (PageVisit $visit) => [
            'type' => 'page_visit',
            'event_type' => 'page_visit',
            'label' => $visit->path,
            'at' => $visit->visited_at,
            'payload' => [
                'title' => $visit->title,
                'url' => $visit->url,
            ],
        ]);

        $interactionTimeline = $events->map(fn (InteractionEvent $event) => [
            'type' => 'interaction',
            'event_type' => $event->event_type,
            'label' => $event->label ?? $event->event_type,
            'at' => $event->occurred_at,
            'payload' => [
                'element' => $event->element,
                'page_path' => $event->page_path,
                'metadata' => $event->metadata,
            ],
        ]);

        $timeline = collect()
            ->concat($historyEvents)
            ->concat($visitTimeline)
            ->concat($interactionTimeline)
            ->sortByDesc('at')
            ->values()
            ->all();

        return [
            'sessions' => $sessions,
            'events' => $events,
            'timeline' => $timeline,
        ];
    }

    public function refreshLeadScore(ContactRequest $lead): void
    {
        if (! Schema::hasColumns('contact_requests', ['lead_score', 'score_band'])) {
            return;
        }

        $rules = $this->scoreRules();

        $metrics = $this->buildLeadMetrics($lead);
        $sessions = $this->resolveSessionsForLead($lead);
        $sessionIds = $sessions->pluck('id')->all();
        $events = empty($sessionIds)
            ? collect()
            : InteractionEvent::query()
                ->whereIn('visitor_session_id', $sessionIds)
                ->get()
                ->filter(function (InteractionEvent $event): bool {
                    $actorType = is_array($event->metadata) ? ($event->metadata['actor_type'] ?? null) : null;

                    return $actorType !== 'internal' && $actorType !== 'admin' && $actorType !== 'seller';
                });

        $score = 0;

        if (! empty($metrics['origin']['utm_source'])) {
            $score += (int) ($rules['utm_source_bonus'] ?? 10);
        }

        $score += min(
            (int) $metrics['total_page_views'] * (int) ($rules['page_view_weight'] ?? 2),
            (int) ($rules['page_view_cap'] ?? 20),
        );

        if (! empty($metrics['accessed_contact_page'])) {
            $score += (int) ($rules['contact_page_bonus'] ?? 15);
        }

        $score += min(
            (int) $metrics['proposal_accesses'] * (int) ($rules['proposal_access_weight'] ?? 15),
            (int) ($rules['proposal_access_cap'] ?? 30),
        );

        if (! empty($metrics['returned_after_proposal'])) {
            $score += (int) ($rules['returned_after_proposal_bonus'] ?? 10);
        }

        $formSubmitEvents = $events->whereIn('event_type', ['lead_form_submitted', 'contact_form_submit']);
        $whatsappClickEvents = $events->whereIn('event_type', ['whatsapp_button_click', 'whatsapp_click']);
        $ctaEvents = $events->whereIn('event_type', ['cta_request_proposal_click', 'cta_click']);
        $whatsappFormEvents = $events->where('event_type', 'whatsapp_form_submitted');

        $score += min($formSubmitEvents->count() * (int) ($rules['form_submit_weight'] ?? 10), (int) ($rules['form_submit_cap'] ?? 20));
        $score += min($whatsappClickEvents->count() * (int) ($rules['whatsapp_click_weight'] ?? 8), (int) ($rules['whatsapp_click_cap'] ?? 16));
        $score += min($ctaEvents->count() * (int) ($rules['cta_click_weight'] ?? 4), (int) ($rules['cta_click_cap'] ?? 12));
        $score += min($whatsappFormEvents->count() * (int) ($rules['whatsapp_form_weight'] ?? 10), (int) ($rules['whatsapp_form_cap'] ?? 20));
        $score += $this->resolveOnboardingDeadlineBonus($lead, (int) ($rules['onboarding_deadline_bonus_cap'] ?? 20));

        if ($metrics['total_page_views'] <= 1 && $events->count() === 0) {
            $score = max($score - (int) ($rules['low_activity_penalty'] ?? 5), 0);
        }

        $band = 'cold';

        if ($score >= (int) ($rules['hot_min_score'] ?? 70)) {
            $band = 'hot';
        } elseif ($score >= (int) ($rules['warm_min_score'] ?? 35)) {
            $band = 'warm';
        }

        $lead->forceFill([
            'lead_score' => $score,
            'score_band' => $band,
            'last_activity_at' => $metrics['last_access_at'] ?? now(),
        ])->save();
    }

    private function resolveOnboardingDeadlineBonus(ContactRequest $lead, int $maxBonus = 20): int
    {
        $metadata = is_array($lead->metadata) ? $lead->metadata : [];
        $onboardingInternal = is_array($metadata['onboarding_internal'] ?? null) ? $metadata['onboarding_internal'] : null;
        $onboarding = is_array($metadata['onboarding'] ?? null) ? $metadata['onboarding'] : null;
        $answers = is_array($onboarding['answers'] ?? null) ? $onboarding['answers'] : [];

        $days = isset($onboardingInternal['internal_days']) ? (int) $onboardingInternal['internal_days'] : null;
        $selection = isset($onboardingInternal['selection_key'])
            ? (string) $onboardingInternal['selection_key']
            : (isset($answers['siteDeadline']) ? (string) $answers['siteDeadline'] : null);

        $defaults = [
            'urgente' => 4,
            'mes' => 20,
            '30-60' => 40,
            'sem-pressa' => 100,
        ];

        $map = $defaults;

        if (Schema::hasTable('onboarding_deadline_settings')) {
            $rows = DB::table('onboarding_deadline_settings')->get(['option_key', 'internal_days']);
            foreach ($rows as $row) {
                $map[(string) $row->option_key] = (int) $row->internal_days;
            }
        }

        if ($days === null && $selection && isset($map[$selection])) {
            $days = (int) $map[$selection];
        }

        if ($days === null || $days <= 0) {
            return 0;
        }

        $values = array_values($map);
        $minDays = min($values);
        $maxDays = max($values);

        if ($maxDays <= $minDays) {
            return 0;
        }

        $normalized = ($maxDays - $days) / ($maxDays - $minDays);
        $bonus = (int) round($normalized * max(0, $maxBonus));

        return max(0, min(max(0, $maxBonus), $bonus));
    }

    public function scoreRules(): array
    {
        if ($this->scoreRulesCache !== null) {
            return $this->scoreRulesCache;
        }

        $defaults = [
            'utm_source_bonus' => 10,
            'page_view_weight' => 2,
            'page_view_cap' => 20,
            'contact_page_bonus' => 15,
            'proposal_access_weight' => 15,
            'proposal_access_cap' => 30,
            'returned_after_proposal_bonus' => 10,
            'form_submit_weight' => 10,
            'form_submit_cap' => 20,
            'whatsapp_click_weight' => 8,
            'whatsapp_click_cap' => 16,
            'cta_click_weight' => 4,
            'cta_click_cap' => 12,
            'whatsapp_form_weight' => 10,
            'whatsapp_form_cap' => 20,
            'onboarding_deadline_bonus_cap' => 20,
            'low_activity_penalty' => 5,
            'hot_min_score' => 70,
            'warm_min_score' => 35,
            'draft_max_score' => 12,
            'draft_score_band' => 'cold',
            'inbound_whatsapp_score' => 80,
            'inbound_whatsapp_band' => 'hot',
        ];

        if (! Schema::hasTable('general_settings')) {
            $this->scoreRulesCache = $defaults;

            return $this->scoreRulesCache;
        }

        $raw = DB::table('general_settings')
            ->where('setting_key', self::SCORE_RULES_KEY)
            ->value('setting_value');

        if (! is_string($raw) || trim($raw) === '') {
            $this->scoreRulesCache = $defaults;

            return $this->scoreRulesCache;
        }

        $decoded = json_decode($raw, true);
        if (! is_array($decoded)) {
            $this->scoreRulesCache = $defaults;

            return $this->scoreRulesCache;
        }

        $this->scoreRulesCache = array_replace($defaults, $decoded);

        return $this->scoreRulesCache;
    }

    public function refreshLeadsBySession(VisitorSession $session): void
    {
        $leads = ContactRequest::query()
            ->where('visitor_session_id', $session->id)
            ->when($session->identified_email, fn ($query) => $query->orWhere('email', $session->identified_email))
            ->when($session->identified_phone, fn ($query) => $query->orWhere('phone', $session->identified_phone))
            ->get();

        foreach ($leads as $lead) {
            $this->refreshLeadScore($lead);
        }
    }

    /**
     * @return EloquentCollection<int, VisitorSession>
     */
    public function resolveSessionsForLead(ContactRequest $lead): EloquentCollection
    {
        if (! $lead->visitor_session_id && empty($lead->email) && empty($lead->phone)) {
            return new EloquentCollection();
        }

        return VisitorSession::query()
            ->where(function ($query) use ($lead): void {
                if ($lead->visitor_session_id) {
                    $query->orWhere('id', $lead->visitor_session_id);
                }

                if (! empty($lead->email)) {
                    $query->orWhere('identified_email', $lead->email);
                }

                if (! empty($lead->phone)) {
                    $query->orWhere('identified_phone', $lead->phone);
                }
            })
            ->with([
                'pageVisits' => fn ($query) => $query->orderByDesc('visited_at'),
                'interactionEvents' => fn ($query) => $query->orderByDesc('occurred_at'),
            ])
            ->orderByDesc('last_seen_at')
            ->get();
    }
}
