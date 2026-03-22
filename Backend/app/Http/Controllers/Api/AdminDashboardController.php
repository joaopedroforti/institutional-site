<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ContactRequest;
use App\Models\InteractionEvent;
use App\Models\PageVisit;
use App\Models\VisitorSession;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class AdminDashboardController extends Controller
{
    public function dashboard(): JsonResponse
    {
        $dailySessions = VisitorSession::query()
            ->selectRaw("DATE(created_at) as date, COUNT(*) as total")
            ->where('created_at', '>=', now()->subDays(13)->startOfDay())
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        $topPages = PageVisit::query()
            ->select('path', DB::raw('COUNT(*) as total'))
            ->groupBy('path')
            ->orderByDesc('total')
            ->limit(8)
            ->get();

        $topEvents = InteractionEvent::query()
            ->select('event_type', DB::raw('COUNT(*) as total'))
            ->groupBy('event_type')
            ->orderByDesc('total')
            ->limit(8)
            ->get();

        $recentContacts = ContactRequest::query()
            ->with('visitorSession')
            ->latest()
            ->limit(10)
            ->get();

        $recentSessions = VisitorSession::query()
            ->with(['pageVisits' => fn ($query) => $query->latest('visited_at')->limit(5), 'interactionEvents' => fn ($query) => $query->latest('occurred_at')->limit(5)])
            ->latest('last_seen_at')
            ->limit(10)
            ->get();

        $leadsByStatus = ContactRequest::query()
            ->select('status', DB::raw('COUNT(*) as total'))
            ->groupBy('status')
            ->orderByDesc('total')
            ->get();

        $topSources = VisitorSession::query()
            ->selectRaw("JSON_UNQUOTE(JSON_EXTRACT(utm, '$.utm_source')) as source, COUNT(*) as total")
            ->whereNotNull('utm')
            ->groupBy('source')
            ->orderByDesc('total')
            ->limit(5)
            ->get();

        $proposalAccesses = InteractionEvent::query()
            ->whereIn('event_type', ['proposal_open', 'proposal_reopen', 'proposal_view'])
            ->count();

        return response()->json([
            'summary' => [
                'contacts_total' => ContactRequest::query()->count(),
                'contacts_pending' => ContactRequest::query()->where('status', 'novo')->count(),
                'sessions_total' => VisitorSession::query()->count(),
                'sessions_identified' => VisitorSession::query()->whereNotNull('identified_email')->orWhereNotNull('identified_name')->count(),
                'page_views_total' => PageVisit::query()->count(),
                'interactions_total' => InteractionEvent::query()->count(),
                'proposal_accesses_total' => $proposalAccesses,
                'leads_hot' => ContactRequest::query()->where('score_band', 'hot')->count(),
                'leads_warm' => ContactRequest::query()->where('score_band', 'warm')->count(),
                'leads_cold' => ContactRequest::query()->where('score_band', 'cold')->count(),
            ],
            'daily_sessions' => $dailySessions,
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
