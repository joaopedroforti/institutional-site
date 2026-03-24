<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Budget;
use App\Models\ContactRequest;
use App\Models\SellerProfile;
use App\Models\User;
use App\Models\WhatsAppConversation;
use App\Models\WhatsAppMessage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;

class SellerController extends Controller
{
    public function index(): JsonResponse
    {
        $monthStart = now()->startOfMonth();

        $sellers = User::query()
            ->where('is_seller', true)
            ->with('sellerProfile')
            ->orderBy('name')
            ->get()
            ->map(function (User $user) use ($monthStart): array {
                $profile = $user->sellerProfile ?? SellerProfile::query()->firstOrCreate(
                    ['user_id' => $user->id],
                    [
                        'is_active' => true,
                        'receives_leads' => true,
                        'distribution_weight' => 1,
                        'commission_percent' => 0,
                        'participates_in_commission' => true,
                        'monthly_revenue_goal' => 0,
                        'monthly_sales_goal' => 0,
                    ],
                );

                $received = ContactRequest::query()->where('assigned_user_id', $user->id)->count();
                $inProgress = ContactRequest::query()
                    ->where('assigned_user_id', $user->id)
                    ->where('pipeline', 'comercial')
                    ->count();
                $proposals = ContactRequest::query()
                    ->where('assigned_user_id', $user->id)
                    ->whereNotNull('deal_value')
                    ->count();
                $approved = ContactRequest::query()
                    ->where('responsible_closer_user_id', $user->id)
                    ->whereIn('pipeline', ['desenvolvimento', 'cs'])
                    ->count();
                $reproved = ContactRequest::query()
                    ->where('responsible_closer_user_id', $user->id)
                    ->where('pipeline', 'followup')
                    ->count();

                $soldMonth = (float) (ContactRequest::query()
                    ->where('responsible_closer_user_id', $user->id)
                    ->whereIn('pipeline', ['desenvolvimento', 'cs'])
                    ->where('updated_at', '>=', $monthStart)
                    ->sum('deal_value') ?? 0);

                $ticket = $approved > 0 ? $soldMonth / $approved : 0;
                $conversion = $received > 0 ? ($approved / $received) * 100 : 0;
                $commission = $profile->participates_in_commission
                    ? $soldMonth * ((float) $profile->commission_percent / 100)
                    : 0;
                $goalProgress = (float) $profile->monthly_revenue_goal > 0
                    ? ($soldMonth / (float) $profile->monthly_revenue_goal) * 100
                    : 0;

                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'username' => $user->username,
                    'email' => $user->email,
                    'is_admin' => (bool) ($user->is_admin || $user->is_super_admin),
                    'is_seller' => (bool) $user->is_seller,
                    'profile' => $profile,
                    'metrics' => [
                        'leads_received' => $received,
                        'leads_in_progress' => $inProgress,
                        'proposals_created' => $proposals,
                        'approved_count' => $approved,
                        'reproved_count' => $reproved,
                        'sold_value_month' => round($soldMonth, 2),
                        'ticket_avg' => round($ticket, 2),
                        'conversion_rate' => round($conversion, 2),
                        'commission_accumulated' => round($commission, 2),
                        'goal_progress' => round($goalProgress, 2),
                    ],
                ];
            })
            ->values();

        $distribution = DB::table('lead_distribution_settings')->first();
        $onboardingDeadlines = Schema::hasTable('onboarding_deadline_settings')
            ? DB::table('onboarding_deadline_settings')
                ->orderByRaw("case option_key when 'urgente' then 1 when 'mes' then 2 when '30-60' then 3 when 'sem-pressa' then 4 else 99 end")
                ->get()
            : collect();

        return response()->json([
            'data' => [
                'sellers' => $sellers,
                'distribution' => $distribution,
                'onboarding_deadlines' => $onboardingDeadlines,
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $payload = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'username' => ['required', 'string', 'max:120', 'unique:users,username'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:6'],
            'is_admin' => ['nullable', 'boolean'],
            'is_seller' => ['nullable', 'boolean'],
            'profile.is_active' => ['nullable', 'boolean'],
            'profile.receives_leads' => ['nullable', 'boolean'],
            'profile.distribution_weight' => ['nullable', 'integer', 'min:0', 'max:1000'],
            'profile.commission_percent' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'profile.participates_in_commission' => ['nullable', 'boolean'],
            'profile.monthly_revenue_goal' => ['nullable', 'numeric', 'min:0'],
            'profile.monthly_sales_goal' => ['nullable', 'integer', 'min:0'],
        ]);

        $user = null;

        DB::transaction(function () use (&$user, $payload): void {
            $user = User::query()->create([
                'name' => $payload['name'],
                'username' => $payload['username'],
                'email' => $payload['email'],
                'password' => Hash::make($payload['password']),
                'is_admin' => (bool) ($payload['is_admin'] ?? false),
                'is_seller' => (bool) ($payload['is_seller'] ?? true),
            ]);

            SellerProfile::query()->create([
                'user_id' => $user->id,
                'is_active' => (bool) ($payload['profile']['is_active'] ?? true),
                'receives_leads' => (bool) ($payload['profile']['receives_leads'] ?? true),
                'distribution_weight' => (int) ($payload['profile']['distribution_weight'] ?? 1),
                'commission_percent' => (float) ($payload['profile']['commission_percent'] ?? 0),
                'participates_in_commission' => (bool) ($payload['profile']['participates_in_commission'] ?? true),
                'monthly_revenue_goal' => (float) ($payload['profile']['monthly_revenue_goal'] ?? 0),
                'monthly_sales_goal' => (int) ($payload['profile']['monthly_sales_goal'] ?? 0),
            ]);
        });

        return response()->json([
            'data' => $user?->fresh('sellerProfile'),
        ], 201);
    }

    public function update(Request $request, User $user): JsonResponse
    {
        $payload = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'username' => ['required', 'string', 'max:120', 'unique:users,username,'.$user->id],
            'email' => ['required', 'email', 'max:255', 'unique:users,email,'.$user->id],
            'password' => ['nullable', 'string', 'min:6'],
            'is_admin' => ['nullable', 'boolean'],
            'is_seller' => ['nullable', 'boolean'],
            'profile.is_active' => ['nullable', 'boolean'],
            'profile.receives_leads' => ['nullable', 'boolean'],
            'profile.distribution_weight' => ['nullable', 'integer', 'min:0', 'max:1000'],
            'profile.commission_percent' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'profile.participates_in_commission' => ['nullable', 'boolean'],
            'profile.monthly_revenue_goal' => ['nullable', 'numeric', 'min:0'],
            'profile.monthly_sales_goal' => ['nullable', 'integer', 'min:0'],
        ]);

        DB::transaction(function () use ($user, $payload): void {
            $user->update([
                'name' => $payload['name'],
                'username' => $payload['username'],
                'email' => $payload['email'],
                'is_admin' => (bool) ($payload['is_admin'] ?? false),
                'is_seller' => (bool) ($payload['is_seller'] ?? true),
                ...(! empty($payload['password']) ? ['password' => Hash::make($payload['password'])] : []),
            ]);

            SellerProfile::query()->updateOrCreate(
                ['user_id' => $user->id],
                [
                    'is_active' => (bool) ($payload['profile']['is_active'] ?? true),
                    'receives_leads' => (bool) ($payload['profile']['receives_leads'] ?? true),
                    'distribution_weight' => (int) ($payload['profile']['distribution_weight'] ?? 1),
                    'commission_percent' => (float) ($payload['profile']['commission_percent'] ?? 0),
                    'participates_in_commission' => (bool) ($payload['profile']['participates_in_commission'] ?? true),
                    'monthly_revenue_goal' => (float) ($payload['profile']['monthly_revenue_goal'] ?? 0),
                    'monthly_sales_goal' => (int) ($payload['profile']['monthly_sales_goal'] ?? 0),
                ],
            );
        });

        return response()->json([
            'data' => $user->fresh('sellerProfile'),
        ]);
    }

    public function updateDistribution(Request $request): JsonResponse
    {
        $payload = $request->validate([
            'is_enabled' => ['required', 'boolean'],
            'fallback_rule' => ['required', 'string', 'in:unassigned,default_user'],
            'fallback_user_id' => ['nullable', 'integer', 'exists:users,id'],
        ]);

        DB::table('lead_distribution_settings')
            ->where('id', 1)
            ->update([
                'is_enabled' => $payload['is_enabled'],
                'fallback_rule' => $payload['fallback_rule'],
                'fallback_user_id' => $payload['fallback_rule'] === 'default_user'
                    ? ($payload['fallback_user_id'] ?? null)
                    : null,
                'updated_at' => now(),
            ]);

        return response()->json([
            'message' => 'Configuracoes de distribuicao atualizadas.',
        ]);
    }

    public function updateOnboardingDeadlines(Request $request): JsonResponse
    {
        if (! Schema::hasTable('onboarding_deadline_settings')) {
            return response()->json([
                'message' => 'Tabela de prazos internos ainda nao disponivel.',
            ], 422);
        }

        $payload = $request->validate([
            'deadlines' => ['required', 'array', 'min:1'],
            'deadlines.*.option_key' => ['required', 'string', 'in:urgente,mes,30-60,sem-pressa'],
            'deadlines.*.internal_days' => ['required', 'integer', 'min:1', 'max:365'],
        ]);

        DB::transaction(function () use ($payload): void {
            foreach ($payload['deadlines'] as $deadline) {
                DB::table('onboarding_deadline_settings')
                    ->where('option_key', $deadline['option_key'])
                    ->update([
                        'internal_days' => (int) $deadline['internal_days'],
                        'updated_at' => now(),
                    ]);
            }
        });

        return response()->json([
            'message' => 'Prazos internos do onboarding atualizados.',
        ]);
    }

    public function analytics(Request $request): JsonResponse
    {
        $payload = $request->validate([
            'seller_id' => ['nullable', 'integer', 'exists:users,id'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
        ]);

        $from = isset($payload['from']) ? Carbon::parse((string) $payload['from'])->startOfDay() : null;
        $to = isset($payload['to']) ? Carbon::parse((string) $payload['to'])->endOfDay() : null;

        $sellers = User::query()
            ->where('is_seller', true)
            ->when(! empty($payload['seller_id']), fn ($query) => $query->where('id', (int) $payload['seller_id']))
            ->with('sellerProfile')
            ->orderBy('name')
            ->get();

        $items = $sellers->map(function (User $user) use ($from, $to): array {
            $leadsReceivedQuery = ContactRequest::query()
                ->where('assigned_user_id', $user->id)
                ->when($from, fn ($query) => $query->where('created_at', '>=', $from))
                ->when($to, fn ($query) => $query->where('created_at', '<=', $to));

            $approvedQuery = ContactRequest::query()
                ->where('responsible_closer_user_id', $user->id)
                ->whereIn('pipeline', ['desenvolvimento', 'cs'])
                ->when($from, fn ($query) => $query->where('updated_at', '>=', $from))
                ->when($to, fn ($query) => $query->where('updated_at', '<=', $to));

            $reprovedQuery = ContactRequest::query()
                ->where('responsible_closer_user_id', $user->id)
                ->where('pipeline', 'followup')
                ->when($from, fn ($query) => $query->where('updated_at', '>=', $from))
                ->when($to, fn ($query) => $query->where('updated_at', '<=', $to));

            $leadsInProgressQuery = ContactRequest::query()
                ->where('assigned_user_id', $user->id)
                ->where('pipeline', 'comercial')
                ->when($from, fn ($query) => $query->where('updated_at', '>=', $from))
                ->when($to, fn ($query) => $query->where('updated_at', '<=', $to));

            $budgetsBaseQuery = Budget::query()
                ->where('responsible_user_id', $user->id)
                ->when($from, fn ($query) => $query->where('created_at', '>=', $from))
                ->when($to, fn ($query) => $query->where('created_at', '<=', $to));

            $leadsReceived = (clone $leadsReceivedQuery)->count();
            $approvedCount = (clone $approvedQuery)->count();
            $reprovedCount = (clone $reprovedQuery)->count();
            $leadsInProgress = (clone $leadsInProgressQuery)->count();
            $pipelineCounts = [
                'comercial' => ContactRequest::query()
                    ->where('assigned_user_id', $user->id)
                    ->where('pipeline', 'comercial')
                    ->when($from, fn ($query) => $query->where('updated_at', '>=', $from))
                    ->when($to, fn ($query) => $query->where('updated_at', '<=', $to))
                    ->count(),
                'desenvolvimento' => ContactRequest::query()
                    ->where('responsible_closer_user_id', $user->id)
                    ->where('pipeline', 'desenvolvimento')
                    ->when($from, fn ($query) => $query->where('updated_at', '>=', $from))
                    ->when($to, fn ($query) => $query->where('updated_at', '<=', $to))
                    ->count(),
                'followup' => ContactRequest::query()
                    ->where('responsible_closer_user_id', $user->id)
                    ->where('pipeline', 'followup')
                    ->when($from, fn ($query) => $query->where('updated_at', '>=', $from))
                    ->when($to, fn ($query) => $query->where('updated_at', '<=', $to))
                    ->count(),
                'cs' => ContactRequest::query()
                    ->where('responsible_closer_user_id', $user->id)
                    ->where('pipeline', 'cs')
                    ->when($from, fn ($query) => $query->where('updated_at', '>=', $from))
                    ->when($to, fn ($query) => $query->where('updated_at', '<=', $to))
                    ->count(),
            ];

            $proposalsCreated = (clone $budgetsBaseQuery)->count();
            $proposalsApproved = (clone $budgetsBaseQuery)->where('status', 'approved')->count();
            $proposalsReproved = (clone $budgetsBaseQuery)->where('status', 'adjustment_requested')->count();
            $proposalsSent = (clone $budgetsBaseQuery)->whereIn('status', ['sent', 'pending_validation'])->count();
            $proposalStatusCounts = [
                'draft' => (clone $budgetsBaseQuery)->where('status', 'draft')->count(),
                'pending_validation' => (clone $budgetsBaseQuery)->where('status', 'pending_validation')->count(),
                'sent' => (clone $budgetsBaseQuery)->where('status', 'sent')->count(),
                'approved' => $proposalsApproved,
                'adjustment_requested' => $proposalsReproved,
            ];

            $avgDiscountPercent = (float) ((clone $budgetsBaseQuery)
                ->whereNotNull('discount_percent')
                ->where('discount_percent', '>', 0)
                ->avg('discount_percent') ?? 0);
            $discountAmount = (float) ((clone $budgetsBaseQuery)->sum('discount_amount') ?? 0);

            $soldValue = (float) ((clone $budgetsBaseQuery)->where('status', 'approved')->sum('total_amount') ?? 0);
            if ($soldValue <= 0) {
                $soldValue = (float) ((clone $approvedQuery)->sum('deal_value') ?? 0);
            }

            $avgTicket = $proposalsApproved > 0 ? $soldValue / $proposalsApproved : 0.0;
            $conversionRate = $proposalsCreated > 0 ? ($proposalsApproved / $proposalsCreated) * 100 : 0.0;
            $whatsAppResponse = $this->resolveWhatsappResponseMetrics((int) $user->id, $from, $to);

            return [
                'seller' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'username' => $user->username,
                    'email' => $user->email,
                ],
                'metrics' => [
                    'leads_received' => $leadsReceived,
                    'leads_in_progress' => $leadsInProgress,
                    'proposals_created' => $proposalsCreated,
                    'proposals_sent' => $proposalsSent,
                    'proposals_approved' => $proposalsApproved,
                    'proposals_reproved' => $proposalsReproved,
                    'approved_count' => $approvedCount,
                    'reproved_count' => $reprovedCount,
                    'sold_value' => round($soldValue, 2),
                    'avg_ticket' => round($avgTicket, 2),
                    'conversion_rate' => round($conversionRate, 2),
                    'avg_discount_percent' => round($avgDiscountPercent, 2),
                    'discount_amount' => round($discountAmount, 2),
                    'avg_response_minutes' => $whatsAppResponse['avg_response_minutes'],
                    'response_samples' => $whatsAppResponse['samples'],
                    'pipeline_counts' => $pipelineCounts,
                    'proposal_status_counts' => $proposalStatusCounts,
                ],
            ];
        })->values();

        $totals = [
            'leads_received' => (int) $items->sum(fn (array $item) => (int) ($item['metrics']['leads_received'] ?? 0)),
            'leads_in_progress' => (int) $items->sum(fn (array $item) => (int) ($item['metrics']['leads_in_progress'] ?? 0)),
            'proposals_created' => (int) $items->sum(fn (array $item) => (int) ($item['metrics']['proposals_created'] ?? 0)),
            'proposals_sent' => (int) $items->sum(fn (array $item) => (int) ($item['metrics']['proposals_sent'] ?? 0)),
            'proposals_approved' => (int) $items->sum(fn (array $item) => (int) ($item['metrics']['proposals_approved'] ?? 0)),
            'proposals_reproved' => (int) $items->sum(fn (array $item) => (int) ($item['metrics']['proposals_reproved'] ?? 0)),
            'approved_count' => (int) $items->sum(fn (array $item) => (int) ($item['metrics']['approved_count'] ?? 0)),
            'reproved_count' => (int) $items->sum(fn (array $item) => (int) ($item['metrics']['reproved_count'] ?? 0)),
            'sold_value' => round((float) $items->sum(fn (array $item) => (float) ($item['metrics']['sold_value'] ?? 0)), 2),
            'discount_amount' => round((float) $items->sum(fn (array $item) => (float) ($item['metrics']['discount_amount'] ?? 0)), 2),
            'response_samples' => (int) $items->sum(fn (array $item) => (int) ($item['metrics']['response_samples'] ?? 0)),
        ];

        $allResponseMeans = $items
            ->pluck('metrics.avg_response_minutes')
            ->filter(fn ($value) => is_numeric($value))
            ->map(fn ($value) => (float) $value)
            ->values();

        $totals['avg_response_minutes'] = $allResponseMeans->isNotEmpty()
            ? round($allResponseMeans->avg(), 2)
            : null;

        $allDiscountMeans = $items
            ->pluck('metrics.avg_discount_percent')
            ->filter(fn ($value) => is_numeric($value))
            ->map(fn ($value) => (float) $value)
            ->values();

        $totals['avg_discount_percent'] = $allDiscountMeans->isNotEmpty()
            ? round($allDiscountMeans->avg(), 2)
            : 0.0;

        $totals['conversion_rate'] = $totals['proposals_created'] > 0
            ? round(($totals['proposals_approved'] / $totals['proposals_created']) * 100, 2)
            : 0.0;

        $totals['avg_ticket'] = $totals['proposals_approved'] > 0
            ? round($totals['sold_value'] / $totals['proposals_approved'], 2)
            : 0.0;

        return response()->json([
            'data' => [
                'filters' => [
                    'seller_id' => isset($payload['seller_id']) ? (int) $payload['seller_id'] : null,
                    'from' => $from?->toDateString(),
                    'to' => $to?->toDateString(),
                ],
                'totals' => $totals,
                'items' => $items,
            ],
        ]);
    }

    private function resolveWhatsappResponseMetrics(int $sellerId, ?Carbon $from, ?Carbon $to): array
    {
        $conversationIds = WhatsAppConversation::query()
            ->where('assigned_user_id', $sellerId)
            ->pluck('id')
            ->all();

        if (empty($conversationIds)) {
            return [
                'avg_response_minutes' => null,
                'samples' => 0,
            ];
        }

        $messages = WhatsAppMessage::query()
            ->whereIn('whatsapp_conversation_id', $conversationIds)
            ->when($from, fn ($query) => $query->where('sent_at', '>=', $from))
            ->when($to, fn ($query) => $query->where('sent_at', '<=', $to))
            ->whereNotNull('sent_at')
            ->orderBy('whatsapp_conversation_id')
            ->orderBy('sent_at')
            ->get(['whatsapp_conversation_id', 'direction', 'from_me', 'sent_at']);

        if ($messages->isEmpty()) {
            return [
                'avg_response_minutes' => null,
                'samples' => 0,
            ];
        }

        $durations = [];

        $messages
            ->groupBy('whatsapp_conversation_id')
            ->each(function ($conversationMessages) use (&$durations): void {
                $waitingInboundAt = null;

                foreach ($conversationMessages as $message) {
                    if ($message->direction === 'inbound') {
                        if (! $waitingInboundAt) {
                            $waitingInboundAt = $message->sent_at;
                        }
                        continue;
                    }

                    $isOutbound = $message->direction === 'outbound' || (bool) $message->from_me;
                    if ($isOutbound && $waitingInboundAt && $message->sent_at && $message->sent_at->greaterThan($waitingInboundAt)) {
                        $durations[] = $waitingInboundAt->diffInSeconds($message->sent_at) / 60;
                        $waitingInboundAt = null;
                    }
                }
            });

        if (empty($durations)) {
            return [
                'avg_response_minutes' => null,
                'samples' => 0,
            ];
        }

        return [
            'avg_response_minutes' => round(array_sum($durations) / count($durations), 2),
            'samples' => count($durations),
        ];
    }
}
