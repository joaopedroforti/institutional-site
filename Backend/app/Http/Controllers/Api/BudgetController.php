<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AdminNotification;
use App\Models\Budget;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BudgetController extends Controller
{
    public function index(): JsonResponse
    {
        $budgets = Budget::query()
            ->with(['contact', 'responsibleUser', 'template'])
            ->orderByDesc('updated_at')
            ->get();

        $notifications = AdminNotification::query()
            ->where('type', 'proposal_adjustment')
            ->where('is_read', false)
            ->orderByDesc('created_at')
            ->limit(20)
            ->get();

        return response()->json([
            'data' => [
                'budgets' => $budgets,
                'notifications' => $notifications,
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
}

