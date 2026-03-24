<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ContactRequest;
use App\Models\CrmTag;
use App\Models\LeadHistory;
use App\Models\LeadKanbanColumn;
use App\Models\VisitorSession;
use App\Services\LeadAnalyticsService;
use App\Services\LeadDistributionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class ContactRequestController extends Controller
{
    public function store(
        Request $request,
        LeadAnalyticsService $leadAnalytics,
        LeadDistributionService $leadDistribution,
    ): JsonResponse
    {
        $payload = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'email' => ['nullable', 'string', 'max:255'],
            'company' => ['nullable', 'string', 'max:255'],
            'message' => ['nullable', 'string', 'max:5000'],
            'session_key' => ['nullable', 'string', 'max:64'],
            'source_url' => ['nullable', 'string', 'max:2048'],
            'referrer' => ['nullable', 'string', 'max:2048'],
            'metadata' => ['nullable', 'array'],
        ]);

        if (empty($payload['email']) && empty($payload['phone'])) {
            throw ValidationException::withMessages([
                'lead' => ['O lead precisa informar ao menos e-mail ou WhatsApp.'],
            ]);
        }

        if (! empty($payload['email']) && ! filter_var($payload['email'], FILTER_VALIDATE_EMAIL)) {
            throw ValidationException::withMessages([
                'email' => ['Informe um e-mail valido.'],
            ]);
        }

        $session = null;
        $captureKind = (string) data_get($payload, 'metadata.capture_kind', 'submitted');

        if (! empty($payload['session_key'])) {
            $session = VisitorSession::query()
                ->where('session_key', $payload['session_key'])
                ->first();
        }

        if ($session) {
            $session->forceFill([
                'identified_name' => $payload['name'],
                'identified_email' => $payload['email'] ?? $session->identified_email,
                'identified_phone' => $payload['phone'] ?? $session->identified_phone,
                'identified_company' => $payload['company'] ?? $session->identified_company,
                'last_seen_at' => now(),
            ])->save();
        }

        $existingLead = $this->findExistingLeadForCapture(
            $payload['email'] ?? null,
            $payload['phone'] ?? null,
            $session?->id,
        );

        if ($existingLead && $captureKind === 'draft') {
            $mergedMetadata = array_filter([
                ...(is_array($existingLead->metadata) ? $existingLead->metadata : []),
                ...($payload['metadata'] ?? []),
            ], fn ($value) => $value !== null && $value !== '');

            $existingLead->update([
                'name' => $existingLead->name ?: $payload['name'],
                'email' => $existingLead->email ?: ($payload['email'] ?? null),
                'phone' => $existingLead->phone ?: ($payload['phone'] ?? null),
                'company' => $existingLead->company ?: ($payload['company'] ?? null),
                'source_url' => $payload['source_url'] ?? $existingLead->source_url,
                'referrer' => $payload['referrer'] ?? $existingLead->referrer,
                'metadata' => $mergedMetadata,
            ]);

            $leadAnalytics->refreshLeadScore($existingLead);
            $existingLead->forceFill([
                'lead_score' => min((int) ($existingLead->lead_score ?? 10), 12),
                'score_band' => 'cold',
            ])->save();

            return response()->json([
                'message' => 'Lead de rascunho atualizado.',
                'contact_id' => $existingLead->id,
            ]);
        }

        if ($existingLead && $captureKind === 'submitted') {
            $mergedMetadata = array_filter([
                ...(is_array($existingLead->metadata) ? $existingLead->metadata : []),
                ...($payload['metadata'] ?? []),
            ], fn ($value) => $value !== null && $value !== '');

            $existingLead->update([
                'visitor_session_id' => $existingLead->visitor_session_id ?: $session?->id,
                'name' => $payload['name'],
                'phone' => $payload['phone'] ?? null,
                'email' => $payload['email'] ?? null,
                'company' => $payload['company'] ?? null,
                'message' => $payload['message'] ?? $existingLead->message,
                'source_url' => $payload['source_url'] ?? $existingLead->source_url,
                'referrer' => $payload['referrer'] ?? $existingLead->referrer,
                'metadata' => $mergedMetadata,
            ]);

            if (Schema::hasTable('lead_histories')) {
                LeadHistory::query()->create([
                    'contact_request_id' => $existingLead->id,
                    'event_type' => 'lead_form_submitted',
                    'event_label' => 'Lead finalizado via formulario',
                    'payload' => [
                        'source_url' => $existingLead->source_url,
                        'session_key' => $session?->session_key,
                    ],
                    'occurred_at' => now(),
                ]);
            }

            $leadAnalytics->refreshLeadScore($existingLead);

            return response()->json([
                'message' => 'Solicitacao atualizada com sucesso.',
                'contact_id' => $existingLead->id,
            ], 201);
        }

        $defaultColumn = LeadKanbanColumn::defaultColumn();
        $nextOrder = ContactRequest::query()
            ->where('pipeline', $defaultColumn->pipeline)
            ->where('lead_kanban_column_id', $defaultColumn->id)
            ->max('lead_order');

        $contact = ContactRequest::query()->create([
            'visitor_session_id' => $session?->id,
            'lead_kanban_column_id' => $defaultColumn->id,
            'name' => $payload['name'],
            'phone' => $payload['phone'] ?? null,
            'email' => $payload['email'] ?? null,
            'company' => $payload['company'] ?? null,
            'message' => $payload['message'] ?? '',
            'status' => $defaultColumn->slug,
            'pipeline' => $defaultColumn->pipeline,
            'lead_order' => ($nextOrder ?? -1) + 1,
            'stage_entered_at' => now(),
            'source_url' => $payload['source_url'] ?? null,
            'referrer' => $payload['referrer'] ?? null,
            'metadata' => $payload['metadata'] ?? null,
        ]);

        if (Schema::hasTable('lead_histories')) {
            LeadHistory::query()->create([
                'contact_request_id' => $contact->id,
                'event_type' => 'lead_created',
                'event_label' => 'Lead criado',
                'payload' => [
                    'source_url' => $contact->source_url,
                    'session_key' => $session?->session_key,
                ],
                'occurred_at' => now(),
            ]);
        }

        $leadDistribution->assignLead($contact);
        $leadAnalytics->refreshLeadScore($contact);

        if ($captureKind === 'draft') {
            $contact->forceFill([
                'lead_score' => min((int) ($contact->lead_score ?? 10), 12),
                'score_band' => 'cold',
            ])->save();
        }

        return response()->json([
            'message' => 'Solicitacao enviada com sucesso.',
            'contact_id' => $contact->id,
        ], 201);
    }

    public function index(Request $request, LeadAnalyticsService $leadAnalytics): JsonResponse
    {
        $contacts = ContactRequest::query()
            ->with(['visitorSession', 'kanbanColumn', 'assignedUser', 'responsibleCloserUser', 'tags'])
            ->orderByDesc('created_at')
            ->get();

        $includeTracking = $request->boolean('with_tracking', true);

        $data = $contacts->map(function (ContactRequest $contact) use ($leadAnalytics, $includeTracking) {
            $payload = $contact->toArray();
            $payload['tracking_summary'] = $includeTracking ? $leadAnalytics->buildLeadMetrics($contact) : null;

            return $payload;
        });

        return response()->json([
            'data' => $data,
        ]);
    }

    public function show(ContactRequest $contactRequest, LeadAnalyticsService $leadAnalytics): JsonResponse
    {
        $contact = $contactRequest->load(['visitorSession', 'kanbanColumn', 'assignedUser', 'responsibleCloserUser', 'tags']);
        $tracking = $leadAnalytics->buildLeadTracking($contactRequest);
        $metrics = $leadAnalytics->buildLeadMetrics($contactRequest);

        $history = Schema::hasTable('lead_histories')
            ? $contactRequest->histories()->with('actorUser')->get()
            : [];

        return response()->json([
            'data' => [
                ...$contact->toArray(),
                'tracking_summary' => $metrics,
                'tracking' => $tracking,
                'history' => $history,
            ],
        ]);
    }

    public function update(Request $request, ContactRequest $contactRequest, LeadAnalyticsService $leadAnalytics): JsonResponse
    {
        $payload = $request->validate([
            'status' => ['sometimes', 'required', 'string', 'max:50'],
            'contacted_at' => ['nullable', 'date'],
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'email' => ['nullable', 'string', 'max:255'],
            'company' => ['nullable', 'string', 'max:255'],
            'message' => ['nullable', 'string', 'max:5000'],
            'internal_notes' => ['nullable', 'string', 'max:10000'],
            'assigned_user_id' => ['nullable', 'integer', 'exists:users,id'],
            'responsible_closer_user_id' => ['nullable', 'integer', 'exists:users,id'],
        ]);

        $nextEmail = array_key_exists('email', $payload) ? $payload['email'] : $contactRequest->email;
        $nextPhone = array_key_exists('phone', $payload) ? $payload['phone'] : $contactRequest->phone;

        if (empty($nextEmail) && empty($nextPhone)) {
            throw ValidationException::withMessages([
                'lead' => ['O lead precisa manter ao menos e-mail ou WhatsApp.'],
            ]);
        }

        if (! empty($nextEmail) && ! filter_var($nextEmail, FILTER_VALIDATE_EMAIL)) {
            throw ValidationException::withMessages([
                'email' => ['Informe um e-mail valido.'],
            ]);
        }

        // Responsavel atual e de fechamento devem permanecer sincronizados no fluxo atual.
        if (array_key_exists('assigned_user_id', $payload) && ! array_key_exists('responsible_closer_user_id', $payload)) {
            $payload['responsible_closer_user_id'] = $payload['assigned_user_id'];
        }

        if (array_key_exists('responsible_closer_user_id', $payload) && ! array_key_exists('assigned_user_id', $payload)) {
            $payload['assigned_user_id'] = $payload['responsible_closer_user_id'];
        }

        if (array_key_exists('assigned_user_id', $payload) && array_key_exists('responsible_closer_user_id', $payload)) {
            $payload['responsible_closer_user_id'] = $payload['assigned_user_id'];
        }

        $original = $contactRequest->only([
            'status',
            'assigned_user_id',
            'responsible_closer_user_id',
            'internal_notes',
        ]);

        $contactRequest->update($payload);
        $leadAnalytics->refreshLeadScore($contactRequest);

        $changes = $contactRequest->getChanges();

        if (! empty($changes) && Schema::hasTable('lead_histories')) {
            LeadHistory::query()->create([
                'contact_request_id' => $contactRequest->id,
                'actor_user_id' => $request->user()?->id,
                'event_type' => 'lead_updated',
                'event_label' => 'Lead atualizado',
                'payload' => [
                    'before' => $original,
                    'after' => $contactRequest->only(array_keys($original)),
                    'changed_fields' => array_keys($changes),
                ],
                'occurred_at' => now(),
            ]);
        }

        return response()->json([
            'data' => $contactRequest->fresh(['visitorSession', 'kanbanColumn', 'assignedUser', 'responsibleCloserUser']),
        ]);
    }

    public function addInternalNote(Request $request, ContactRequest $contactRequest): JsonResponse
    {
        $payload = $request->validate([
            'note' => ['required', 'string', 'max:5000'],
        ]);

        $note = trim($payload['note']);

        if ($note === '') {
            throw ValidationException::withMessages([
                'note' => ['Informe uma anotacao valida.'],
            ]);
        }

        if (! Schema::hasTable('lead_histories')) {
            return response()->json([
                'message' => 'Historico indisponivel para registrar anotacoes.',
            ], 422);
        }

        LeadHistory::query()->create([
            'contact_request_id' => $contactRequest->id,
            'actor_user_id' => $request->user()?->id,
            'event_type' => 'internal_note_added',
            'event_label' => 'Anotacao interna adicionada',
            'payload' => [
                'note' => $note,
            ],
            'occurred_at' => now(),
        ]);

        return response()->json([
            'message' => 'Anotacao registrada com sucesso.',
        ], 201);
    }

    public function addTag(Request $request, ContactRequest $contactRequest): JsonResponse
    {
        $payload = $request->validate([
            'tag_id' => ['nullable', 'integer', 'exists:crm_tags,id'],
            'name' => ['nullable', 'string', 'max:120'],
            'color' => ['nullable', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
        ]);

        $tag = null;
        if (! empty($payload['tag_id'])) {
            $tag = CrmTag::query()->findOrFail((int) $payload['tag_id']);
        } else {
            $name = trim((string) ($payload['name'] ?? ''));
            if ($name === '') {
                throw ValidationException::withMessages([
                    'tag' => ['Informe uma tag existente ou nome para nova tag.'],
                ]);
            }

            $slugBase = Str::slug($name) ?: 'tag';
            $slug = $slugBase;
            $counter = 1;
            while (CrmTag::query()->where('slug', $slug)->exists()) {
                $counter++;
                $slug = "{$slugBase}-{$counter}";
            }

            $tag = CrmTag::query()->create([
                'name' => $name,
                'slug' => $slug,
                'color' => $payload['color'] ?? '#2563eb',
                'is_active' => true,
            ]);
        }

        $contactRequest->tags()->syncWithoutDetaching([$tag->id]);

        return response()->json([
            'message' => 'Tag adicionada ao lead.',
            'data' => $contactRequest->fresh(['tags']),
        ]);
    }

    public function removeTag(ContactRequest $contactRequest, CrmTag $tag): JsonResponse
    {
        $contactRequest->tags()->detach($tag->id);

        return response()->json([
            'message' => 'Tag removida do lead.',
            'data' => $contactRequest->fresh(['tags']),
        ]);
    }

    private function findExistingLeadForCapture(?string $email, ?string $phone, ?int $sessionId): ?ContactRequest
    {
        $hasFilter = false;

        $query = ContactRequest::query()
            ->where(function ($builder) use ($email, $phone, $sessionId, &$hasFilter): void {
                if ($sessionId) {
                    $builder->orWhere('visitor_session_id', $sessionId);
                    $hasFilter = true;
                }

                if (! empty($email)) {
                    $builder->orWhere('email', $email);
                    $hasFilter = true;
                }

                if (! empty($phone)) {
                    $builder->orWhere('phone', $phone);
                    $hasFilter = true;
                }
            })
            ->orderByDesc('id');

        if (! $hasFilter) {
            return null;
        }

        return $query->first();
    }
}
