<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ContactRequest;
use App\Models\LeadHistory;
use App\Models\LeadKanbanColumn;
use App\Services\BudgetService;
use App\Services\LeadAnalyticsService;
use App\Services\LeadDistributionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class OnboardingController extends Controller
{
    public function progress(Request $request): JsonResponse
    {
        $payload = $request->validate([
            'session_key' => ['nullable', 'string', 'max:64'],
            'step' => ['required', 'string', 'max:120'],
            'project_type' => ['nullable', 'string', 'max:40'],
            'answers' => ['required', 'array'],
        ]);

        $contact = $this->findLeadBySession($payload['session_key'] ?? null);

        if (! $contact) {
            return response()->json([
                'saved' => false,
                'identified' => false,
            ]);
        }

        $metadata = is_array($contact->metadata) ? $contact->metadata : [];
        $metadata['onboarding_progress'] = [
            'step' => $payload['step'],
            'project_type' => $payload['project_type'] ?? ($metadata['onboarding_progress']['project_type'] ?? null),
            'answers' => $payload['answers'],
            'updated_at' => now()->toIso8601String(),
        ];

        $contact->update([
            'metadata' => $metadata,
        ]);

        return response()->json([
            'saved' => true,
            'identified' => true,
        ]);
    }

    public function submit(
        Request $request,
        LeadDistributionService $leadDistribution,
        LeadAnalyticsService $leadAnalytics,
        BudgetService $budgetService,
    ): JsonResponse {
        $payload = $request->validate([
            'lead_id' => ['nullable', 'integer', 'exists:contact_requests,id'],
            'session_key' => ['nullable', 'string', 'max:64'],
            'project_type' => ['required', 'string', 'in:site,sistema,automacao'],
            'answers' => ['required', 'array'],
            'contact' => ['required', 'array'],
            'contact.name' => ['required', 'string', 'max:255'],
            'contact.company' => ['nullable', 'string', 'max:255'],
            'contact.email' => ['required', 'string', 'max:255'],
            'contact.phone' => ['required', 'string', 'max:50'],
            'contact.segment' => ['nullable', 'string', 'max:255'],
            'source_url' => ['nullable', 'string', 'max:2048'],
            'referrer' => ['nullable', 'string', 'max:2048'],
        ]);

        $email = trim((string) $payload['contact']['email']);
        $phone = preg_replace('/\D+/', '', (string) $payload['contact']['phone']) ?: null;

        $contact = null;

        if (! empty($payload['lead_id'])) {
            $contact = ContactRequest::query()->find($payload['lead_id']);
        }

        if (! $contact && $phone) {
            $contact = ContactRequest::query()->whereRaw("regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g') = ?", [$phone])->first();
        }

        if (! $contact && $email !== '') {
            $contact = ContactRequest::query()->where('email', $email)->first();
        }

        $onboardingColumn = LeadKanbanColumn::findByPipelineAndSlug(LeadKanbanColumn::PIPE_COMERCIAL, 'onboarding')
            ?? LeadKanbanColumn::defaultColumn(LeadKanbanColumn::PIPE_COMERCIAL);

        $metadataPayload = [
            'project_type' => $payload['project_type'],
            'answers' => $payload['answers'],
            'segment' => $payload['contact']['segment'] ?? null,
            'completed_at' => now()->toIso8601String(),
        ];
        $internalDeadline = $this->resolveInternalDeadline($payload['answers']);

        if (! $contact) {
            $nextOrder = ContactRequest::query()
                ->where('pipeline', LeadKanbanColumn::PIPE_COMERCIAL)
                ->where('lead_kanban_column_id', $onboardingColumn->id)
                ->max('lead_order');

            $contact = ContactRequest::query()->create([
                'name' => $payload['contact']['name'],
                'email' => $email,
                'phone' => $payload['contact']['phone'],
                'company' => $payload['contact']['company'] ?? null,
                'message' => 'Onboarding recebido via site.',
                'status' => $onboardingColumn->slug,
                'pipeline' => LeadKanbanColumn::PIPE_COMERCIAL,
                'lead_kanban_column_id' => $onboardingColumn->id,
                'lead_order' => ($nextOrder ?? -1) + 1,
                'source_url' => $payload['source_url'] ?? null,
                'referrer' => $payload['referrer'] ?? null,
                'stage_entered_at' => now(),
                'metadata' => [
                    'onboarding' => $metadataPayload,
                    ...($internalDeadline ? ['onboarding_internal' => $internalDeadline] : []),
                ],
            ]);

            $leadDistribution->assignLead($contact);

            $this->createHistory(
                $contact->id,
                null,
                'onboarding_created',
                'Lead criado a partir do onboarding',
                [
                    'project_type' => $payload['project_type'],
                ],
            );
        } else {
            $currentMetadata = is_array($contact->metadata) ? $contact->metadata : [];
            $currentMetadata['onboarding'] = $metadataPayload;
            if ($internalDeadline) {
                $currentMetadata['onboarding_internal'] = $internalDeadline;
            }

            $contact->update([
                'name' => $payload['contact']['name'],
                'email' => $email,
                'phone' => $payload['contact']['phone'],
                'company' => $payload['contact']['company'] ?? $contact->company,
                'status' => $onboardingColumn->slug,
                'pipeline' => LeadKanbanColumn::PIPE_COMERCIAL,
                'lead_kanban_column_id' => $onboardingColumn->id,
                'stage_entered_at' => now(),
                'metadata' => $currentMetadata,
            ]);

            $this->createHistory(
                $contact->id,
                null,
                'onboarding_updated',
                'Onboarding atualizado no lead existente',
                [
                    'project_type' => $payload['project_type'],
                ],
            );
        }

        if ($payload['project_type'] === 'site') {
            $budgetService->createOrUpdateAutomaticSiteBudget($contact, $metadataPayload, $internalDeadline);
            $this->moveLeadToBudgetColumn($contact);
        }

        $leadAnalytics->refreshLeadScore($contact);

        return response()->json([
            'message' => 'Onboarding recebido com sucesso.',
            'contact_id' => $contact->id,
        ], 201);
    }

    private function findLeadBySession(?string $sessionKey): ?ContactRequest
    {
        if (! $sessionKey) {
            return null;
        }

        return ContactRequest::query()
            ->whereHas('visitorSession', fn ($query) => $query->where('session_key', $sessionKey))
            ->latest('id')
            ->first();
    }

    private function createHistory(
        int $contactId,
        ?int $actorId,
        string $eventType,
        string $eventLabel,
        array $payload = [],
    ): void {
        if (! Schema::hasTable('lead_histories')) {
            return;
        }

        LeadHistory::query()->create([
            'contact_request_id' => $contactId,
            'actor_user_id' => $actorId,
            'event_type' => $eventType,
            'event_label' => $eventLabel,
            'payload' => $payload,
            'occurred_at' => now(),
        ]);
    }

    private function resolveInternalDeadline(array $answers): ?array
    {
        $selection = isset($answers['siteDeadline']) ? (string) $answers['siteDeadline'] : null;
        if (! $selection) {
            return null;
        }

        $defaults = [
            'urgente' => 4,
            'mes' => 20,
            '30-60' => 40,
            'sem-pressa' => 100,
        ];

        $daysMap = $defaults;

        if (Schema::hasTable('onboarding_deadline_settings')) {
            $rows = DB::table('onboarding_deadline_settings')->get(['option_key', 'internal_days']);
            foreach ($rows as $row) {
                $daysMap[(string) $row->option_key] = (int) $row->internal_days;
            }
        }

        if (! isset($daysMap[$selection])) {
            return null;
        }

        $days = max(1, (int) $daysMap[$selection]);

        return [
            'selection_key' => $selection,
            'internal_days' => $days,
            'expected_due_date' => now()->copy()->addWeekdays($days)->toDateString(),
            'calculated_at' => now()->toIso8601String(),
        ];
    }

    private function moveLeadToBudgetColumn(ContactRequest $contact): void
    {
        $targetColumn = LeadKanbanColumn::findByPipelineAndSlug(LeadKanbanColumn::PIPE_COMERCIAL, 'orcamento');
        if (! $targetColumn) {
            return;
        }

        $nextOrder = ContactRequest::query()
            ->where('pipeline', LeadKanbanColumn::PIPE_COMERCIAL)
            ->where('lead_kanban_column_id', $targetColumn->id)
            ->max('lead_order');

        $contact->forceFill([
            'status' => $targetColumn->slug,
            'pipeline' => LeadKanbanColumn::PIPE_COMERCIAL,
            'lead_kanban_column_id' => $targetColumn->id,
            'lead_order' => ($nextOrder ?? -1) + 1,
            'stage_entered_at' => now(),
        ])->save();

        $this->createHistory(
            $contact->id,
            null,
            'lead_moved_to_budget',
            'Lead movido automaticamente para Orcamento',
            [
                'column_id' => $targetColumn->id,
                'column_slug' => $targetColumn->slug,
            ],
        );
    }
}
