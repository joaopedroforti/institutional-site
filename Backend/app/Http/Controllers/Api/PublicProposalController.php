<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AdminNotification;
use App\Models\Budget;
use App\Models\ProposalView;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PublicProposalController extends Controller
{
    public function show(Request $request, string $slug): JsonResponse
    {
        $budget = Budget::query()
            ->with(['contact', 'responsibleUser', 'template'])
            ->where('slug', $slug)
            ->firstOrFail();

        $isInternal = $request->boolean('internal');

        ProposalView::query()->create([
            'budget_id' => $budget->id,
            'session_key' => $request->string('session_key')->toString() ?: null,
            'ip_address' => $request->ip(),
            'user_agent' => (string) $request->userAgent(),
            'is_internal' => $isInternal,
            'viewed_at' => now(),
        ]);

        $publicViews = ProposalView::query()
            ->where('budget_id', $budget->id)
            ->where('is_internal', false)
            ->count();

        return response()->json([
            'data' => [
                ...$budget->toArray(),
                'public_views' => $publicViews,
            ],
        ])->header('X-Robots-Tag', 'noindex, nofollow');
    }

    public function approve(Request $request, string $slug): JsonResponse
    {
        $payload = $request->validate([
            'person_name' => ['required', 'string', 'min:3', 'max:255'],
            'person_cpf' => ['required', 'string', 'max:20'],
            'person_birth_date' => ['required', 'date', 'before:today'],
        ]);

        $cpfDigits = preg_replace('/\D+/', '', $payload['person_cpf'] ?? '');
        if (strlen($cpfDigits) !== 11) {
            return response()->json([
                'message' => 'CPF invalido. Informe um CPF com 11 digitos.',
            ], 422);
        }

        $budget = Budget::query()->with('contact')->where('slug', $slug)->firstOrFail();
        $budget->forceFill([
            'status' => 'approved',
            'approved_at' => now(),
            'approved_person_name' => trim($payload['person_name']),
            'approved_person_cpf' => $cpfDigits,
            'approved_person_birth_date' => $payload['person_birth_date'],
            'adjustment_message' => null,
            'adjustment_requested_at' => null,
        ])->save();

        if ($budget->contact) {
            $metadata = is_array($budget->contact->metadata) ? $budget->contact->metadata : [];
            $metadata['proposal_status'] = 'approved';

            $budget->contact->forceFill([
                'metadata' => $metadata,
            ])->save();
        }

        return response()->json([
            'message' => 'Proposta aprovada com sucesso.',
        ]);
    }

    public function requestAdjustment(Request $request, string $slug): JsonResponse
    {
        $payload = $request->validate([
            'message' => ['required', 'string', 'max:5000'],
        ]);

        $budget = Budget::query()->with('contact')->where('slug', $slug)->firstOrFail();
        $budget->forceFill([
            'status' => 'adjustment_requested',
            'adjustment_message' => trim($payload['message']),
            'adjustment_requested_at' => now(),
        ])->save();

        if ($budget->contact) {
            $metadata = is_array($budget->contact->metadata) ? $budget->contact->metadata : [];
            $metadata['proposal_status'] = 'adjustment_requested';

            $budget->contact->forceFill([
                'metadata' => $metadata,
            ])->save();
        }

        AdminNotification::query()->create([
            'type' => 'proposal_adjustment',
            'title' => 'Solicitacao de ajuste em proposta',
            'message' => 'O cliente solicitou ajustes na proposta '.$budget->identifier.'.',
            'payload' => [
                'budget_id' => $budget->id,
                'slug' => $budget->slug,
                'contact_id' => $budget->contact_request_id,
                'contact_name' => $budget->contact?->name,
                'adjustment_message' => $budget->adjustment_message,
            ],
        ]);

        return response()->json([
            'message' => 'Solicitacao de ajuste enviada com sucesso.',
        ]);
    }
}
