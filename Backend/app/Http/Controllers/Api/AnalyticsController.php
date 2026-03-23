<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\InteractionEvent;
use App\Models\PageVisit;
use App\Models\VisitorSession;
use App\Services\LeadAnalyticsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Str;

class AnalyticsController extends Controller
{
    public function syncSession(Request $request): JsonResponse
    {
        $payload = $request->validate([
            'session_key' => ['nullable', 'string', 'max:64'],
            'landing_page' => ['nullable', 'string', 'max:255'],
            'last_path' => ['nullable', 'string', 'max:255'],
            'referrer' => ['nullable', 'string', 'max:2048'],
            'utm' => ['nullable', 'array'],
            'metadata' => ['nullable', 'array'],
        ]);

        $sessionKey = $payload['session_key'] ?: (string) Str::uuid();
        $now = now();

        $session = VisitorSession::query()->firstOrNew([
            'session_key' => $sessionKey,
        ]);

        $session->fill([
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'referrer' => $payload['referrer'] ?? $session->referrer,
            'landing_page' => $session->landing_page ?: ($payload['landing_page'] ?? $payload['last_path'] ?? '/'),
            'last_path' => $payload['last_path'] ?? $session->last_path,
            'utm' => $payload['utm'] ?? $session->utm,
            'metadata' => array_filter([
                ...($session->metadata ?? []),
                ...($payload['metadata'] ?? []),
            ], fn ($value) => $value !== null && $value !== ''),
            'first_seen_at' => $session->first_seen_at ?: $now,
            'last_seen_at' => $now,
        ]);

        $session->save();

        return response()->json([
            'session_key' => $session->session_key,
        ]);
    }

    public function trackPageView(Request $request, LeadAnalyticsService $leadAnalytics): JsonResponse
    {
        $payload = $request->validate([
            'session_key' => ['required', 'string', 'max:64'],
            'path' => ['required', 'string', 'max:255'],
            'url' => ['nullable', 'string', 'max:2048'],
            'title' => ['nullable', 'string', 'max:255'],
            'duration_seconds' => ['nullable', 'integer', 'min:0'],
            'visited_at' => ['nullable', 'date'],
            'metadata' => ['nullable', 'array'],
        ]);

        $session = $this->resolveSession($request, $payload['session_key'], $payload['path']);

        $pageVisit = PageVisit::query()->create([
            'visitor_session_id' => $session->id,
            'path' => $payload['path'],
            'url' => $payload['url'] ?? null,
            'title' => $payload['title'] ?? null,
            'duration_seconds' => $payload['duration_seconds'] ?? 0,
            'visited_at' => $payload['visited_at'] ?? now(),
            'metadata' => $payload['metadata'] ?? null,
        ]);

        $session->increment('total_page_views');
        $session->forceFill([
            'last_path' => $payload['path'],
            'last_seen_at' => now(),
            'total_duration_seconds' => $session->total_duration_seconds + ($payload['duration_seconds'] ?? 0),
        ])->save();
        $leadAnalytics->refreshLeadsBySession($session);

        return response()->json([
            'page_visit_id' => $pageVisit->id,
        ]);
    }

    public function trackEvent(Request $request, LeadAnalyticsService $leadAnalytics): JsonResponse
    {
        $payload = $request->validate([
            'session_key' => ['required', 'string', 'max:64'],
            'page_visit_id' => ['nullable', 'integer'],
            'event_type' => ['required', 'string', 'max:100'],
            'element' => ['nullable', 'string', 'max:100'],
            'label' => ['nullable', 'string', 'max:255'],
            'page_path' => ['nullable', 'string', 'max:255'],
            'occurred_at' => ['nullable', 'date'],
            'metadata' => ['nullable', 'array'],
        ]);

        $session = $this->resolveSession($request, $payload['session_key'], $payload['page_path'] ?? null);
        $pageVisit = null;

        if (! empty($payload['page_visit_id'])) {
            $pageVisit = PageVisit::query()
                ->where('visitor_session_id', $session->id)
                ->find($payload['page_visit_id']);
        }

        $eventType = $this->normalizeEventType($payload['event_type']);

        InteractionEvent::query()->create([
            'visitor_session_id' => $session->id,
            'page_visit_id' => $pageVisit?->id,
            'event_type' => $eventType,
            'element' => $payload['element'] ?? null,
            'label' => $payload['label'] ?? null,
            'page_path' => $payload['page_path'] ?? $session->last_path,
            'occurred_at' => $payload['occurred_at'] ?? now(),
            'metadata' => $payload['metadata'] ?? null,
        ]);

        $session->increment('total_interactions');
        $session->forceFill([
            'last_seen_at' => now(),
        ])->save();
        $leadAnalytics->refreshLeadsBySession($session);

        return response()->json([
            'message' => 'Evento registrado.',
        ]);
    }

    private function resolveSession(Request $request, string $sessionKey, ?string $lastPath = null): VisitorSession
    {
        $now = now();

        $session = VisitorSession::query()->firstOrNew([
            'session_key' => $sessionKey,
        ]);

        $session->fill([
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'landing_page' => $session->landing_page ?: ($lastPath ?: '/'),
            'last_path' => $lastPath ?: $session->last_path,
            'first_seen_at' => $session->first_seen_at ?: $now,
            'last_seen_at' => $now,
            'metadata' => Arr::wrap($session->metadata),
        ]);

        $session->save();

        return $session;
    }

    private function normalizeEventType(string $eventType): string
    {
        return match ($eventType) {
            'contact_submit' => 'contact_form_submit',
            'proposal_opened' => 'proposal_open',
            'contact_form_open' => 'lead_form_fill_started',
            'contact_form_submit' => 'lead_form_submitted',
            'cta_click' => 'cta_request_proposal_click',
            'whatsapp_click' => 'whatsapp_button_click',
            default => $eventType,
        };
    }
}
