<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ContactRequest;
use App\Models\InteractionEvent;
use App\Models\PageVisit;
use App\Models\VisitorSession;
use Illuminate\Support\Facades\Schema;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class AdminDashboardController extends Controller
{
    public function dashboard(Request $request): JsonResponse
    {
        $payload = $request->validate([
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
        ]);

        $from = isset($payload['from'])
            ? Carbon::parse((string) $payload['from'])->startOfDay()
            : now()->subDays(29)->startOfDay();
        $to = isset($payload['to'])
            ? Carbon::parse((string) $payload['to'])->endOfDay()
            : now()->endOfDay();

        if ($to->lessThan($from)) {
            [$from, $to] = [$to->copy()->startOfDay(), $from->copy()->endOfDay()];
        }

        $dailySessions = VisitorSession::query()
            ->selectRaw("DATE(created_at) as date, COUNT(*) as total")
            ->whereBetween('created_at', [$from, $to])
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        $dailyPageViews = PageVisit::query()
            ->selectRaw("DATE(visited_at) as date, COUNT(*) as total")
            ->whereBetween('visited_at', [$from, $to])
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        $dailyInteractions = InteractionEvent::query()
            ->selectRaw("DATE(occurred_at) as date, COUNT(*) as total")
            ->whereBetween('occurred_at', [$from, $to])
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        $topPages = PageVisit::query()
            ->select('path', DB::raw('COUNT(*) as total'))
            ->whereBetween('visited_at', [$from, $to])
            ->groupBy('path')
            ->orderByDesc('total')
            ->limit(12)
            ->get();

        $topEvents = InteractionEvent::query()
            ->select('event_type', DB::raw('COUNT(*) as total'))
            ->whereBetween('occurred_at', [$from, $to])
            ->groupBy('event_type')
            ->orderByDesc('total')
            ->limit(12)
            ->get();

        $recentContacts = ContactRequest::query()
            ->with('visitorSession')
            ->whereBetween('created_at', [$from, $to])
            ->latest()
            ->limit(10)
            ->get();

        $recentSessions = VisitorSession::query()
            ->with(['pageVisits' => fn ($query) => $query->latest('visited_at')->limit(5), 'interactionEvents' => fn ($query) => $query->latest('occurred_at')->limit(5)])
            ->whereBetween('created_at', [$from, $to])
            ->latest('last_seen_at')
            ->limit(10)
            ->get();

        $leadsByStatus = ContactRequest::query()
            ->select('status', DB::raw('COUNT(*) as total'))
            ->whereBetween('created_at', [$from, $to])
            ->groupBy('status')
            ->orderByDesc('total')
            ->get();

        $topSources = VisitorSession::query()
            ->whereNotNull('utm')
            ->whereBetween('created_at', [$from, $to])
            ->get()
            ->map(function (VisitorSession $session): array {
                $utm = is_array($session->utm) ? $session->utm : [];
                $source = $utm['utm_source'] ?? 'direto';

                return [
                    'source' => $source,
                ];
            })
            ->groupBy('source')
            ->map(fn ($rows, $source) => ['source' => $source, 'total' => count($rows)])
            ->sortByDesc('total')
            ->take(5)
            ->values();

        $proposalAccesses = InteractionEvent::query()
            ->whereIn('event_type', ['proposal_open', 'proposal_reopen', 'proposal_view'])
            ->whereBetween('occurred_at', [$from, $to])
            ->count();

        $hasScoreBandColumn = Schema::hasColumn('contact_requests', 'score_band');

        return response()->json([
            'summary' => [
                'contacts_total' => ContactRequest::query()->whereBetween('created_at', [$from, $to])->count(),
                'contacts_pending' => ContactRequest::query()->whereBetween('created_at', [$from, $to])->where('status', 'novo')->count(),
                'sessions_total' => VisitorSession::query()->whereBetween('created_at', [$from, $to])->count(),
                'sessions_identified' => VisitorSession::query()
                    ->whereBetween('created_at', [$from, $to])
                    ->where(function ($query): void {
                        $query->whereNotNull('identified_email')->orWhereNotNull('identified_name');
                    })
                    ->count(),
                'page_views_total' => PageVisit::query()->whereBetween('visited_at', [$from, $to])->count(),
                'interactions_total' => InteractionEvent::query()->whereBetween('occurred_at', [$from, $to])->count(),
                'proposal_accesses_total' => $proposalAccesses,
                'leads_hot' => $hasScoreBandColumn ? ContactRequest::query()->whereBetween('created_at', [$from, $to])->where('score_band', 'hot')->count() : 0,
                'leads_warm' => $hasScoreBandColumn ? ContactRequest::query()->whereBetween('created_at', [$from, $to])->where('score_band', 'warm')->count() : 0,
                'leads_cold' => $hasScoreBandColumn ? ContactRequest::query()->whereBetween('created_at', [$from, $to])->where('score_band', 'cold')->count() : 0,
            ],
            'filters' => [
                'from' => $from->toDateString(),
                'to' => $to->toDateString(),
            ],
            'daily_sessions' => $dailySessions,
            'daily_page_views' => $dailyPageViews,
            'daily_interactions' => $dailyInteractions,
            'top_pages' => $topPages,
            'top_events' => $topEvents,
            'leads_by_status' => $leadsByStatus,
            'top_sources' => $topSources,
            'recent_contacts' => $recentContacts,
            'recent_sessions' => $recentSessions,
        ]);
    }

    public function sessions(): JsonResponse
    {
        $sessions = VisitorSession::query()
            ->with(['pageVisits' => fn ($query) => $query->orderByDesc('visited_at'), 'interactionEvents' => fn ($query) => $query->latest('occurred_at')])
            ->orderByDesc('last_seen_at')
            ->get();

        return response()->json([
            'data' => $sessions,
        ]);
    }
}
