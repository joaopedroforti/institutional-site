<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AdminNotification;
use App\Models\Budget;
use App\Models\PricingProjectSetting;
use App\Services\BudgetService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BudgetController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $isAdmin = (bool) ($user?->is_admin || $user?->is_super_admin);

        $budgetsQuery = Budget::query()
            ->with(['contact', 'responsibleUser', 'template', 'adminValidator'])
            ->orderByDesc('updated_at');

        if (! $isAdmin) {
            $budgetsQuery->where('is_visible_to_seller', true);
        }

        $budgets = $budgetsQuery->get();

        $notifications = $isAdmin
            ? AdminNotification::query()
                ->where('type', 'proposal_adjustment')
                ->where('is_read', false)
                ->orderByDesc('created_at')
                ->limit(20)
                ->get()
            : collect();

        $pricingSettings = PricingProjectSetting::query()
            ->orderBy('project_type')
            ->get()
            ->mapWithKeys(fn (PricingProjectSetting $setting) => [
                $setting->project_type => [
                    'max_discount_percent' => (float) $setting->max_discount_percent,
                    'requires_admin_validation' => (bool) $setting->requires_admin_validation,
                ],
            ]);

        return response()->json([
            'data' => [
                'budgets' => $budgets,
                'notifications' => $notifications,
                'pricing_settings' => $pricingSettings,
            ],
        ]);
    }

    public function markNotificationAsRead(AdminNotification $adminNotification): JsonResponse
    {
        $adminNotification->forceFill([
            'is_read' => true,
            'read_at' => now(),
        ])->save();

        return response()->json([
            'message' => 'Notificacao marcada como lida.',
        ]);
    }

    public function validateBudget(Request $request, Budget $budget): JsonResponse
    {
        $user = $request->user();
        $isAdmin = (bool) ($user?->is_admin || $user?->is_super_admin);

        if (! $isAdmin) {
            return response()->json([
                'message' => 'Somente administradores podem validar orcamentos pendentes.',
            ], 403);
        }

        if ($budget->status === 'approved') {
            return response()->json([
                'message' => 'Proposta aprovada nao pode mais ser alterada.',
            ], 422);
        }

        $budget->forceFill([
            'status' => $budget->status === 'pending_validation' ? 'sent' : $budget->status,
            'is_visible_to_seller' => true,
            'admin_validated_at' => now(),
            'admin_validated_by' => $user?->id,
            'published_at' => $budget->published_at ?? now(),
        ])->save();

        if ($budget->contact) {
            $metadata = is_array($budget->contact->metadata) ? $budget->contact->metadata : [];
            $metadata['proposal_status'] = 'sent';
            $metadata['proposal_slug'] = $budget->slug;

            $budget->contact->forceFill([
                'deal_value' => (float) $budget->total_amount,
                'metadata' => $metadata,
            ])->save();
        }

        return response()->json([
            'message' => 'Orcamento validado e liberado para vendedor.',
            'data' => $budget->fresh(['contact', 'responsibleUser', 'template', 'adminValidator']),
        ]);
    }

    public function applyDiscount(Request $request, Budget $budget, BudgetService $budgetService): JsonResponse
    {
        $payload = $request->validate([
            'discount_percent' => ['required', 'numeric', 'min:0', 'max:100'],
        ]);

        $user = $request->user();
        $isAdmin = (bool) ($user?->is_admin || $user?->is_super_admin);

        if (! $isAdmin && ! $budget->is_visible_to_seller) {
            return response()->json([
                'message' => 'Este orcamento ainda nao esta liberado para vendedores.',
            ], 403);
        }

        if ($budget->status === 'approved') {
            return response()->json([
                'message' => 'Proposta aprovada nao pode mais receber desconto.',
            ], 422);
        }

        $pricing = PricingProjectSetting::query()
            ->where('project_type', $budget->project_type)
            ->first();

        $maxPercent = (float) ($pricing?->max_discount_percent ?? 0);
        $requestedPercent = round((float) $payload['discount_percent'], 2);

        if ($requestedPercent > $maxPercent) {
            return response()->json([
                'message' => 'Desconto acima do limite autorizado para este tipo de projeto.',
            ], 422);
        }

        $baseAmount = (float) $budget->base_amount;
        $discountAmount = round($baseAmount * ($requestedPercent / 100), 2);
        $newTotal = max(0, round($baseAmount - $discountAmount, 2));
        $newEntry = round($newTotal * 0.5, 2);

        $metadata = is_array($budget->metadata) ? $budget->metadata : [];
        $metadata['discount'] = [
            'percent' => $requestedPercent,
            'amount' => $discountAmount,
            'applied_by' => $user?->id,
            'applied_at' => now()->toIso8601String(),
        ];

        $budget->forceFill([
            'total_amount' => $newTotal,
            'entry_amount' => $newEntry,
            'discount_percent' => $requestedPercent,
            'discount_amount' => $discountAmount,
            'metadata' => $metadata,
        ])->save();

        if ($budget->contact) {
            $budget->contact->forceFill([
                'deal_value' => $newTotal,
            ])->save();
        }

        $budgetService->storeVersionSnapshot($budget, $user?->id);

        return response()->json([
            'message' => 'Desconto aplicado com sucesso.',
            'data' => $budget->fresh(['contact', 'responsibleUser', 'template', 'adminValidator']),
        ]);
    }
}
