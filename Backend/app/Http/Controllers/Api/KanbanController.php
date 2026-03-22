<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ContactRequest;
use App\Models\LeadHistory;
use App\Models\LeadKanbanColumn;
use App\Services\LeadAnalyticsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class KanbanController extends Controller
{
    public function board(): JsonResponse
    {
        LeadKanbanColumn::seedDefaults();

        $columns = LeadKanbanColumn::query()
            ->with([
                'contacts' => fn ($query) => $query
                    ->with(['visitorSession', 'kanbanColumn'])
                    ->orderBy('lead_order')
                    ->orderBy('created_at'),
            ])
            ->orderBy('position')
            ->get();

        return response()->json([
            'data' => $columns,
        ]);
    }

    public function storeColumn(Request $request): JsonResponse
    {
        $payload = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'color' => ['nullable', 'string', 'max:30'],
        ]);

        $position = (LeadKanbanColumn::query()->max('position') ?? -1) + 1;

        $column = LeadKanbanColumn::query()->create([
            'name' => $payload['name'],
            'slug' => LeadKanbanColumn::generateUniqueSlug($payload['name']),
            'color' => $payload['color'] ?? '#5b6ef1',
            'position' => $position,
            'is_default' => false,
            'is_locked' => false,
        ]);

        return response()->json([
            'data' => $column,
        ], 201);
    }

    public function updateColumn(Request $request, LeadKanbanColumn $leadKanbanColumn): JsonResponse
    {
        if ($leadKanbanColumn->is_locked) {
            return response()->json([
                'message' => 'Esta etapa e fixa e nao pode ser editada.',
            ], 422);
        }

        $payload = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'color' => ['nullable', 'string', 'max:30'],
        ]);

        $previousSlug = $leadKanbanColumn->slug;
        $newSlug = LeadKanbanColumn::generateUniqueSlug($payload['name'], $leadKanbanColumn->id);

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
        LeadKanbanColumn::seedDefaults();

        if ($leadKanbanColumn->is_locked) {
            return response()->json([
                'message' => 'Esta etapa e fixa e nao pode ser removida.',
            ], 422);
        }

        DB::transaction(function () use ($leadKanbanColumn): void {
            $fallbackColumn = LeadKanbanColumn::query()
                ->where('id', '!=', $leadKanbanColumn->id)
                ->orderByDesc('is_default')
                ->orderBy('position')
                ->first();

            if (! $fallbackColumn) {
                $fallbackColumn = LeadKanbanColumn::query()->create([
                    'name' => 'Backlog',
                    'slug' => LeadKanbanColumn::generateUniqueSlug('Backlog'),
                    'color' => '#5b6ef1',
                    'position' => 0,
                    'is_default' => true,
                ]);
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
                    'lead_order' => $startOrder + $index,
                    'status' => $fallbackColumn->slug,
                ]);
            }

            $leadKanbanColumn->delete();

            LeadKanbanColumn::query()
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
            'lead_order' => ['required', 'integer', 'min:0'],
        ]);

        $fromColumn = $contactRequest->kanbanColumn?->name ?? $contactRequest->status;

        DB::transaction(function () use ($contactRequest, $payload): void {
            $targetColumn = LeadKanbanColumn::query()->findOrFail($payload['lead_kanban_column_id']);

            $sourceContacts = ContactRequest::query()
                ->where('lead_kanban_column_id', $contactRequest->lead_kanban_column_id)
                ->where('id', '!=', $contactRequest->id)
                ->orderBy('lead_order')
                ->get()
                ->values();

            $sourceContacts->each(fn (ContactRequest $contact, int $index) => $contact->update(['lead_order' => $index]));

            $targetContacts = ContactRequest::query()
                ->where('lead_kanban_column_id', $targetColumn->id)
                ->where('id', '!=', $contactRequest->id)
                ->orderBy('lead_order')
                ->get()
                ->values();

            $insertIndex = min($payload['lead_order'], $targetContacts->count());
            $targetContacts->splice($insertIndex, 0, [$contactRequest]);

            $targetContacts->values()->each(function (ContactRequest $contact, int $index) use ($targetColumn): void {
                $contact->update([
                    'lead_kanban_column_id' => $targetColumn->id,
                    'lead_order' => $index,
                    'status' => $targetColumn->slug,
                ]);
            });
        });

        $freshContact = $contactRequest->fresh(['visitorSession', 'kanbanColumn']);
        $leadAnalytics->refreshLeadScore($freshContact);

        LeadHistory::query()->create([
            'contact_request_id' => $contactRequest->id,
            'actor_user_id' => $request->user()?->id,
            'event_type' => 'kanban_moved',
            'event_label' => 'Lead movido no kanban',
            'payload' => [
                'from' => $fromColumn,
                'to' => $freshContact->kanbanColumn?->name ?? $freshContact->status,
            ],
            'occurred_at' => now(),
        ]);

        return response()->json([
            'data' => $freshContact,
        ]);
    }
}
