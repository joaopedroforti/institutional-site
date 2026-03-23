<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ContactRequest;
use App\Models\SellerProfile;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
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
}
