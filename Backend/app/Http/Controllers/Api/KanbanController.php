<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ContactRequest;
use App\Models\LeadHistory;
use App\Models\LeadKanbanColumn;
use App\Models\LostReasonOption;
use App\Services\LeadAnalyticsService;
use App\Services\LeadDistributionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class KanbanController extends Controller
{
    public function pipes(): JsonResponse
    {
        LeadKanbanColumn::seedDefaults();

        return response()->json([
            'data' => LeadKanbanColumn::availablePipelines(),
        ]);
    }

    public function board(Request $request): JsonResponse
    {
        $pipeline = $this->resolvePipeline((string) $request->query('pipeline', LeadKanbanColumn::PIPE_COMERCIAL));

        LeadKanbanColumn::seedPipelineDefaults($pipeline);

        $columns = LeadKanbanColumn::query()
            ->where('pipeline', $pipeline)
            ->with([
                'contacts' => fn ($query) => $query
                    ->where('pipeline', $pipeline)
                    ->with(['visitorSession', 'kanbanColumn'])
                    ->orderBy('lead_order')
                    ->orderBy('created_at'),
            ])
            ->orderBy('position')
            ->get();

        return response()->json([
            'pipeline' => $pipeline,
            'data' => $columns,
        ]);
    }

    public function storeLead(Request $request, LeadDistributionService $leadDistribution): JsonResponse
    {
        $payload = $request->validate([
            'pipeline' => ['required', 'string', 'max:40'],
            'name' => ['required', 'string', 'max:255'],
            'email' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'company' => ['nullable', 'string', 'max:255'],
            'message' => ['nullable', 'string', 'max:5000'],
            'source' => ['nullable', 'string', 'max:255'],
            'deal_value' => ['nullable', 'numeric', 'min:0'],
        ]);

        if (empty($payload['email']) && empty($payload['phone'])) {
            return response()->json([
                'message' => 'Informe ao menos e-mail ou WhatsApp para criar o lead.',
            ], 422);
        }

        $pipeline = $this->resolvePipeline($payload['pipeline']);
        $defaultColumn = LeadKanbanColumn::defaultColumn($pipeline);

        $nextOrder = ContactRequest::query()
            ->where('pipeline', $pipeline)
            ->where('lead_kanban_column_id', $defaultColumn->id)
            ->max('lead_order');

        $contact = ContactRequest::query()->create([
            'name' => $payload['name'],
            'email' => $payload['email'] ?? null,
            'phone' => $payload['phone'] ?? null,
            'company' => $payload['company'] ?? null,
            'message' => $payload['message'] ?? '',
            'status' => $defaultColumn->slug,
            'pipeline' => $pipeline,
            'lead_kanban_column_id' => $defaultColumn->id,
            'lead_order' => ($nextOrder ?? -1) + 1,
            'source_url' => $payload['source'] ?? null,
            'deal_value' => $payload['deal_value'] ?? null,
            'stage_entered_at' => now(),
        ]);

        if ($pipeline === LeadKanbanColumn::PIPE_COMERCIAL) {
            $leadDistribution->assignLead($contact);
        }

        $this->createHistory(
            $contact->id,
            $request->user()?->id,
            'lead_created_manual',
            'Lead criado manualmente',
            [
                'pipeline' => $pipeline,
                'column' => $defaultColumn->name,
            ],
        );

        return response()->json([
            'data' => $contact->fresh(['visitorSession', 'kanbanColumn']),
        ], 201);
    }

    public function storeColumn(Request $request): JsonResponse
    {
        $payload = $request->validate([
            'pipeline' => ['required', 'string', 'max:40'],
            'name' => ['required', 'string', 'max:255'],
            'color' => ['nullable', 'string', 'max:30'],
        ]);

        $pipeline = $this->resolvePipeline($payload['pipeline']);

        $position = (LeadKanbanColumn::query()
            ->where('pipeline', $pipeline)
            ->max('position') ?? -1) + 1;

        $data = [
            'name' => $payload['name'],
            'slug' => LeadKanbanColumn::generateUniqueSlug($payload['name'], $pipeline),
            'pipeline' => $pipeline,
            'color' => $payload['color'] ?? '#5b6ef1',
            'position' => $position,
            'is_default' => false,
            'is_initial' => false,
        ];

        if (Schema::hasColumn('lead_kanban_columns', 'is_locked')) {
            $data['is_locked'] = false;
        }

        $column = LeadKanbanColumn::query()->create($data);

        return response()->json([
            'data' => $column,
        ], 201);
    }

    public function reorderColumns(Request $request): JsonResponse
    {
        $payload = $request->validate([
            'pipeline' => ['required', 'string', 'max:40'],
            'column_ids' => ['required', 'array', 'min:1'],
            'column_ids.*' => ['integer', 'exists:lead_kanban_columns,id'],
        ]);

        $pipeline = $this->resolvePipeline($payload['pipeline']);
        $ids = $payload['column_ids'];

        $columns = LeadKanbanColumn::query()
            ->where('pipeline', $pipeline)
            ->whereIn('id', $ids)
            ->get();

        if ($columns->count() !== count($ids)) {
            return response()->json([
                'message' => 'Ordem invalida para o pipe informado.',
            ], 422);
        }

        DB::transaction(function () use ($ids): void {
            foreach (array_values($ids) as $position => $columnId) {
                LeadKanbanColumn::query()->where('id', $columnId)->update(['position' => $position]);
            }
        });

        return response()->json([
            'message' => 'Ordem atualizada.',
        ]);
    }

    public function updateColumn(Request $request, LeadKanbanColumn $leadKanbanColumn): JsonResponse
    {
        if (Schema::hasColumn('lead_kanban_columns', 'is_locked') && $leadKanbanColumn->is_locked) {
            return response()->json([
                'message' => 'Esta etapa e fixa e nao pode ser editada.',
            ], 422);
        }

        $payload = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'color' => ['nullable', 'string', 'max:30'],
        ]);

        $previousSlug = $leadKanbanColumn->slug;
        $newSlug = LeadKanbanColumn::generateUniqueSlug($payload['name'], $leadKanbanColumn->pipeline, $leadKanbanColumn->id);

        DB::transaction(function () use ($leadKanbanColumn, $payload, $newSlug, $previousSlug): void {
            $leadKanbanColumn->update([
                'name' => $payload['name'],
                'slug' => $newSlug,
                'color' => $payload['color'] ?? $leadKanbanColumn->color,
            ]);

            if ($newSlug !== $previousSlug) {
                ContactRequest::query()
                    ->where('lead_kanban_column_id', $leadKanbanColumn->id)
                    ->update(['status' => $newSlug]);
            }
        });

        return response()->json([
            'data' => $leadKanbanColumn->fresh(),
        ]);
    }

    public function deleteColumn(LeadKanbanColumn $leadKanbanColumn): JsonResponse
    {
        if (Schema::hasColumn('lead_kanban_columns', 'is_locked') && $leadKanbanColumn->is_locked) {
            return response()->json([
                'message' => 'Esta etapa e fixa e nao pode ser removida.',
            ], 422);
        }

        DB::transaction(function () use ($leadKanbanColumn): void {
            $fallbackColumn = LeadKanbanColumn::query()
                ->where('pipeline', $leadKanbanColumn->pipeline)
                ->where('id', '!=', $leadKanbanColumn->id)
                ->orderByDesc('is_default')
                ->orderByDesc('is_initial')
                ->orderBy('position')
                ->first();

            if (! $fallbackColumn) {
                $fallbackColumn = LeadKanbanColumn::defaultColumn($leadKanbanColumn->pipeline);
            }

            $contacts = ContactRequest::query()
                ->where('lead_kanban_column_id', $leadKanbanColumn->id)
                ->orderBy('lead_order')
                ->get();

            $startOrder = (ContactRequest::query()
                ->where('lead_kanban_column_id', $fallbackColumn->id)
                ->max('lead_order') ?? -1) + 1;

            foreach ($contacts as $index => $contact) {
                $contact->update([
                    'lead_kanban_column_id' => $fallbackColumn->id,
                    'status' => $fallbackColumn->slug,
                    'pipeline' => $fallbackColumn->pipeline,
                    'stage_entered_at' => now(),
                    'lead_order' => $startOrder + $index,
                ]);
            }

            $leadKanbanColumn->delete();

            LeadKanbanColumn::query()
                ->where('pipeline', $fallbackColumn->pipeline)
                ->orderBy('position')
                ->get()
                ->values()
                ->each(fn (LeadKanbanColumn $column, int $index) => $column->update(['position' => $index]));
        });

        return response()->json([
            'message' => 'Coluna removida com sucesso.',
        ]);
    }

    public function moveLead(Request $request, ContactRequest $contactRequest, LeadAnalyticsService $leadAnalytics): JsonResponse
    {
        $payload = $request->validate([
            'lead_kanban_column_id' => ['required', 'integer', 'exists:lead_kanban_columns,id'],
            'lead_order' => ['nullable', 'integer', 'min:0'],
        ]);

        $targetColumn = LeadKanbanColumn::query()->findOrFail($payload['lead_kanban_column_id']);
        $fromColumn = $contactRequest->kanbanColumn?->name ?? $contactRequest->status;

        DB::transaction(function () use ($contactRequest, $targetColumn, $payload, $request): void {
            $this->ensureResponsibleOwner($contactRequest, $request->user()?->id);
            $insertIndex = $payload['lead_order'] ?? PHP_INT_MAX;
            $this->moveContactToColumn($contactRequest, $targetColumn, $insertIndex);
        });

        $freshContact = $contactRequest->fresh(['visitorSession', 'kanbanColumn']);
        $leadAnalytics->refreshLeadScore($freshContact);

        $this->createHistory(
            $contactRequest->id,
            $request->user()?->id,
            'kanban_moved',
            'Lead movido no kanban',
            [
                'from' => $fromColumn,
                'to' => $freshContact->kanbanColumn?->name ?? $freshContact->status,
                'pipeline' => $freshContact->pipeline,
            ],
        );

        return response()->json([
            'data' => $freshContact,
        ]);
    }

    public function transition(Request $request, ContactRequest $contactRequest, LeadAnalyticsService $leadAnalytics): JsonResponse
    {
        $payload = $request->validate([
            'action' => ['required', 'string', 'in:approve,reject,project_delivered,project_finalized'],
            'lost_reason' => ['nullable', 'string', 'max:255'],
        ]);

        $action = $payload['action'];
        $lostReason = isset($payload['lost_reason']) ? trim((string) $payload['lost_reason']) : null;
        $currentColumn = $contactRequest->kanbanColumn;

        if (! $currentColumn) {
            return response()->json([
                'message' => 'Card sem etapa atual.',
            ], 422);
        }

        $targetColumn = null;
        $eventLabel = '';

        if ($action === 'approve') {
            if ($contactRequest->pipeline !== LeadKanbanColumn::PIPE_COMERCIAL) {
                return response()->json([
                    'message' => 'Aprovacao disponivel apenas no pipe Comercial.',
                ], 422);
            }

            $targetColumn = LeadKanbanColumn::findByPipelineAndSlug(LeadKanbanColumn::PIPE_DESENVOLVIMENTO, 'contrato')
                ?? LeadKanbanColumn::defaultColumn(LeadKanbanColumn::PIPE_DESENVOLVIMENTO);
            $eventLabel = 'Negocio aprovado e enviado para Desenvolvimento';
        }

        if ($action === 'reject') {
            if ($contactRequest->pipeline !== LeadKanbanColumn::PIPE_COMERCIAL) {
                return response()->json([
                    'message' => 'Reprovacao disponivel apenas no pipe Comercial.',
                ], 422);
            }

            if (! $lostReason) {
                return response()->json([
                    'message' => 'Informe o motivo da perda para continuar.',
                ], 422);
            }

            $targetColumn = LeadKanbanColumn::findByPipelineAndSlug(LeadKanbanColumn::PIPE_FOLLOWUP, 'em-espera')
                ?? LeadKanbanColumn::defaultColumn(LeadKanbanColumn::PIPE_FOLLOWUP);
            $eventLabel = 'Negocio reprovado e enviado para FollowUp';
        }

        if ($action === 'project_delivered') {
            if ($contactRequest->pipeline !== LeadKanbanColumn::PIPE_DESENVOLVIMENTO || $currentColumn->slug !== 'entrega') {
                return response()->json([
                    'message' => 'Acao disponivel apenas para cards em Desenvolvimento > Entrega.',
                ], 422);
            }

            $targetColumn = LeadKanbanColumn::findByPipelineAndSlug(LeadKanbanColumn::PIPE_CS, 'projeto-entregue')
                ?? LeadKanbanColumn::defaultColumn(LeadKanbanColumn::PIPE_CS);
            $eventLabel = 'Projeto entregue e enviado para pipe CS';
        }

        if ($action === 'project_finalized') {
            if ($contactRequest->pipeline !== LeadKanbanColumn::PIPE_CS) {
                return response()->json([
                    'message' => 'Acao disponivel apenas no pipe CS.',
                ], 422);
            }

            $targetColumn = LeadKanbanColumn::findByPipelineAndSlug(LeadKanbanColumn::PIPE_CS, 'projeto-finalizado')
                ?? LeadKanbanColumn::defaultColumn(LeadKanbanColumn::PIPE_CS);
            $eventLabel = 'Projeto marcado como finalizado';
        }

        if (! $targetColumn) {
            return response()->json([
                'message' => 'Transicao nao suportada.',
            ], 422);
        }

        DB::transaction(function () use ($contactRequest, $targetColumn, $lostReason, $request): void {
            $this->ensureResponsibleOwner($contactRequest, $request->user()?->id);
            $this->moveContactToColumn($contactRequest, $targetColumn, PHP_INT_MAX, $lostReason);
        });

        $freshContact = $contactRequest->fresh(['visitorSession', 'kanbanColumn']);
        $leadAnalytics->refreshLeadScore($freshContact);

        $this->createHistory(
            $contactRequest->id,
            $request->user()?->id,
            'pipeline_transition',
            $eventLabel,
            [
                'action' => $action,
                'from_pipeline' => $currentColumn->pipeline,
                'from_stage' => $currentColumn->name,
                'to_pipeline' => $freshContact->pipeline,
                'to_stage' => $freshContact->kanbanColumn?->name,
                'lost_reason' => $freshContact->lost_reason,
            ],
        );

        return response()->json([
            'data' => $freshContact,
        ]);
    }

    public function lostReasons(): JsonResponse
    {
        return response()->json([
            'data' => LostReasonOption::query()
                ->where('is_active', true)
                ->orderBy('name')
                ->get(),
        ]);
    }

    public function storeLostReason(Request $request): JsonResponse
    {
        $payload = $request->validate([
            'name' => ['required', 'string', 'max:120'],
        ]);

        $name = trim($payload['name']);

        $option = LostReasonOption::query()->firstOrCreate(
            ['name' => $name],
            ['is_active' => true],
        );

        if (! $option->is_active) {
            $option->update(['is_active' => true]);
        }

        return response()->json([
            'data' => $option,
        ], 201);
    }

    private function moveContactToColumn(
        ContactRequest $contactRequest,
        LeadKanbanColumn $targetColumn,
        int $desiredOrder,
        ?string $lostReason = null,
    ): void {
        $sourceColumnId = $contactRequest->lead_kanban_column_id;
        $stageChanged = $contactRequest->lead_kanban_column_id !== $targetColumn->id
            || $contactRequest->pipeline !== $targetColumn->pipeline
            || $contactRequest->status !== $targetColumn->slug;

        if ($sourceColumnId) {
            $sourceContacts = ContactRequest::query()
                ->where('lead_kanban_column_id', $sourceColumnId)
                ->where('id', '!=', $contactRequest->id)
                ->orderBy('lead_order')
                ->get()
                ->values();

            $sourceContacts->each(fn (ContactRequest $contact, int $index) => $contact->update(['lead_order' => $index]));
        }

        $targetContacts = ContactRequest::query()
            ->where('lead_kanban_column_id', $targetColumn->id)
            ->where('id', '!=', $contactRequest->id)
            ->orderBy('lead_order')
            ->get()
            ->values();

        $insertIndex = min($desiredOrder, $targetContacts->count());
        $targetContacts->splice($insertIndex, 0, [$contactRequest]);

        $targetContacts->values()->each(function (ContactRequest $contact, int $index) use (
            $contactRequest,
            $targetColumn,
            $lostReason,
            $stageChanged,
        ): void {
            if ($contact->id === $contactRequest->id) {
                $updates = [
                    'lead_order' => $index,
                ];

                if ($stageChanged) {
                    $updates['lead_kanban_column_id'] = $targetColumn->id;
                    $updates['status'] = $targetColumn->slug;
                    $updates['pipeline'] = $targetColumn->pipeline;
                    $updates['stage_entered_at'] = now();
                }

                if ($lostReason !== null) {
                    $updates['lost_reason'] = $lostReason;
                }

                $contact->update($updates);

                return;
            }

            if ($contact->lead_order !== $index) {
                $contact->update(['lead_order' => $index]);
            }
        });
    }

    private function resolvePipeline(string $pipeline): string
    {
        $allowed = collect(LeadKanbanColumn::availablePipelines())
            ->pluck('key')
            ->values()
            ->all();

        if (! in_array($pipeline, $allowed, true)) {
            return LeadKanbanColumn::PIPE_COMERCIAL;
        }

        return $pipeline;
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

    private function ensureResponsibleOwner(ContactRequest $contactRequest, ?int $actorUserId): void
    {
        if (! $actorUserId) {
            return;
        }

        if (! $contactRequest->assigned_user_id && ! $contactRequest->responsible_closer_user_id) {
            $contactRequest->update([
                'assigned_user_id' => $actorUserId,
                'responsible_closer_user_id' => $actorUserId,
            ]);

            return;
        }

        if ($contactRequest->assigned_user_id && ! $contactRequest->responsible_closer_user_id) {
            $contactRequest->update([
                'responsible_closer_user_id' => $contactRequest->assigned_user_id,
            ]);
        }
    }
}
