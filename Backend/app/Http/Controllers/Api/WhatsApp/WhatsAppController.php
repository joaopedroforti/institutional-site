<?php

namespace App\Http\Controllers\Api\WhatsApp;

use App\Http\Controllers\Controller;
use App\Http\Requests\WhatsApp\AssignConversationRequest;
use App\Http\Requests\WhatsApp\SendAudioMessageRequest;
use App\Http\Requests\WhatsApp\SendDocumentMessageRequest;
use App\Http\Requests\WhatsApp\SendImageMessageRequest;
use App\Http\Requests\WhatsApp\SendTextMessageRequest;
use App\Http\Requests\WhatsApp\StartConversationRequest;
use App\Http\Requests\WhatsApp\UpdateInstanceProfileRequest;
use App\Http\Requests\WhatsApp\UpdateWhatsAppSettingsRequest;
use App\Models\ContactRequest;
use App\Models\CrmTag;
use App\Models\User;
use App\Models\WhatsAppConversation;
use App\Models\WhatsAppInstance;
use App\Models\WhatsAppMessage;
use App\Services\Gemini\GeminiConversationInsightsService;
use App\Services\WhatsApp\EvolutionApiService;
use App\Services\WhatsApp\WhatsAppConversationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Arr;

class WhatsAppController extends Controller
{
    public function __construct(
        private readonly WhatsAppConversationService $service,
        private readonly EvolutionApiService $evolution,
        private readonly GeminiConversationInsightsService $geminiInsights,
    ) {
    }

    public function overview(Request $request): JsonResponse
    {
        $instance = $this->service->activeInstance();

        $totalConversations = WhatsAppConversation::query()
            ->where('whatsapp_instance_id', $instance->id)
            ->count();

        $unreadConversations = WhatsAppConversation::query()
            ->where('whatsapp_instance_id', $instance->id)
            ->where('unread_count', '>', 0)
            ->count();

        $messagesToday = WhatsAppMessage::query()
            ->where('whatsapp_instance_id', $instance->id)
            ->whereDate('created_at', now()->toDateString())
            ->count();

        return response()->json([
            'data' => [
                'instance' => $instance,
                'totals' => [
                    'conversations' => $totalConversations,
                    'unread_conversations' => $unreadConversations,
                    'messages_today' => $messagesToday,
                ],
            ],
        ]);
    }

    public function conversations(Request $request): JsonResponse
    {
        $paginator = $this->service->listConversations($request->all(), (int) $request->user()->id);

        return response()->json([
            'data' => $paginator->items(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ]);
    }

    public function showConversation(WhatsAppConversation $conversation): JsonResponse
    {
        $this->assertConversationInstance($conversation);

        $payload = $this->service->conversationWithMessages($conversation);
        $this->service->markAsRead($conversation);

        return response()->json([
            'data' => $payload['conversation'],
            'messages' => $payload['messages'],
        ]);
    }

    public function conversationMessages(Request $request, WhatsAppConversation $conversation): JsonResponse
    {
        $this->assertConversationInstance($conversation);

        if ($request->boolean('mark_read', true)) {
            $this->service->markAsRead($conversation);
        }

        $paginator = $this->service->messagesPaginated($conversation, $request->all());

        return response()->json([
            'data' => $paginator->items(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ]);
    }

    public function sendText(SendTextMessageRequest $request, WhatsAppConversation $conversation): JsonResponse
    {
        $this->assertConversationInstance($conversation);
        try {
            $message = $this->service->sendText($conversation, (string) $request->validated('text'), $request->user());
        } catch (\InvalidArgumentException $exception) {
            return $this->invalidPhoneResponse($exception);
        }

        return response()->json([
            'data' => $message,
        ], 201);
    }

    public function sendImage(SendImageMessageRequest $request, WhatsAppConversation $conversation): JsonResponse
    {
        $this->assertConversationInstance($conversation);
        $payload = $request->validated();
        try {
            $message = $this->service->sendImage(
                $conversation,
                (string) $payload['media_base64'],
                (string) $payload['media_mime'],
                $payload['filename'] ?? null,
                $payload['caption'] ?? null,
                $request->user(),
            );
        } catch (\InvalidArgumentException $exception) {
            return $this->invalidPhoneResponse($exception);
        }

        return response()->json([
            'data' => $message,
        ], 201);
    }

    public function sendAudio(SendAudioMessageRequest $request, WhatsAppConversation $conversation): JsonResponse
    {
        $this->assertConversationInstance($conversation);
        $payload = $request->validated();
        try {
            $message = $this->service->sendAudio(
                $conversation,
                (string) $payload['media_base64'],
                (string) $payload['media_mime'],
                $payload['filename'] ?? null,
                $request->user(),
            );
        } catch (\InvalidArgumentException $exception) {
            return $this->invalidPhoneResponse($exception);
        }

        return response()->json([
            'data' => $message,
        ], 201);
    }

    public function sendDocument(SendDocumentMessageRequest $request, WhatsAppConversation $conversation): JsonResponse
    {
        $this->assertConversationInstance($conversation);
        $payload = $request->validated();
        try {
            $message = $this->service->sendDocument(
                $conversation,
                (string) $payload['media_base64'],
                (string) $payload['media_mime'],
                $payload['filename'] ?? null,
                $payload['caption'] ?? null,
                $request->user(),
            );
        } catch (\InvalidArgumentException $exception) {
            return $this->invalidPhoneResponse($exception);
        }

        return response()->json([
            'data' => $message,
        ], 201);
    }

    public function startConversation(StartConversationRequest $request): JsonResponse
    {
        $payload = $request->validated();
        try {
            $conversation = $this->service->startConversation(
                (string) $payload['phone'],
                $payload['display_name'] ?? null,
                (int) $request->user()->id,
            );
        } catch (\InvalidArgumentException $exception) {
            return $this->invalidPhoneResponse($exception);
        }

        return response()->json([
            'data' => $conversation->load(['assignedUser:id,name', 'lead:id,name,phone,email,pipeline,status', 'tags:id,name,slug,color']),
        ], 201);
    }

    public function assignConversation(AssignConversationRequest $request, WhatsAppConversation $conversation): JsonResponse
    {
        $this->assertConversationInstance($conversation);
        $assignedUserId = $request->validated('assigned_user_id');

        if ($assignedUserId !== null) {
            User::query()->findOrFail((int) $assignedUserId);
        }

        $conversation = $this->service->assignConversation($conversation, $assignedUserId ? (int) $assignedUserId : null);

        return response()->json([
            'data' => $conversation,
        ]);
    }

    public function updateConversation(Request $request, WhatsAppConversation $conversation): JsonResponse
    {
        $this->assertConversationInstance($conversation);

        $payload = $request->validate([
            'display_name' => ['nullable', 'string', 'max:255'],
        ]);

        $displayName = trim((string) ($payload['display_name'] ?? ''));
        $displayName = $displayName !== '' ? $displayName : null;

        if ($conversation->contact) {
            $conversation->contact->update([
                'display_name' => $displayName,
                'push_name' => $displayName ?: $conversation->contact->push_name,
            ]);
        }

        $conversation->update([
            'subject' => $displayName,
        ]);

        return response()->json([
            'message' => 'Conversa atualizada com sucesso.',
            'data' => $conversation->fresh(['assignedUser:id,name', 'lead:id,name,phone,pipeline,status', 'contact:id,display_name,push_name,phone,profile_picture_url', 'tags:id,name,slug,color']),
        ]);
    }

    public function destroyConversation(WhatsAppConversation $conversation): JsonResponse
    {
        $this->assertConversationInstance($conversation);

        $conversation->delete();

        return response()->json([
            'message' => 'Conversa removida com sucesso.',
        ]);
    }

    public function leadConversation(ContactRequest $contactRequest): JsonResponse
    {
        $conversation = WhatsAppConversation::query()
            ->where('whatsapp_instance_id', $this->service->activeInstance()->id)
            ->where(function ($query) use ($contactRequest): void {
                $query->where('lead_id', $contactRequest->id);

                if ($contactRequest->phone_normalized) {
                    $query->orWhere('phone', $contactRequest->phone_normalized);
                }
            })
            ->orderByDesc('last_message_at')
            ->first();

        return response()->json([
            'data' => $conversation,
        ]);
    }

    public function dealConversation(ContactRequest $contactRequest): JsonResponse
    {
        $conversation = WhatsAppConversation::query()
            ->where('whatsapp_instance_id', $this->service->activeInstance()->id)
            ->where(function ($query) use ($contactRequest): void {
                $query->where('deal_id', $contactRequest->id)
                    ->orWhere('lead_id', $contactRequest->id);

                if ($contactRequest->phone_normalized) {
                    $query->orWhere('phone', $contactRequest->phone_normalized);
                }
            })
            ->orderByDesc('last_message_at')
            ->first();

        return response()->json([
            'data' => $conversation,
        ]);
    }

    public function settings(): JsonResponse
    {
        $instance = $this->service->activeInstance()->load('settings');
        $settings = $this->service->settings();

        return response()->json([
            'data' => [
                'instance' => $instance,
                'settings' => $settings,
                'evolution' => [
                    'instance' => $this->evolution->instanceName(),
                    'base_url' => config('evolution.base_url'),
                    'realtime_mode' => config('evolution.realtime_mode', 'polling'),
                    'polling_interval' => (int) config('evolution.polling_interval', 10),
                    'webhook_url' => config('evolution.webhook_url'),
                ],
            ],
        ]);
    }

    public function tags(): JsonResponse
    {
        return response()->json([
            'data' => $this->service->listTags(),
        ]);
    }

    public function storeTag(Request $request): JsonResponse
    {
        $payload = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'color' => ['required', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
        ]);

        $tag = $this->service->createTag($payload);

        return response()->json([
            'message' => 'Tag criada com sucesso.',
            'data' => $tag,
        ], 201);
    }

    public function updateTag(Request $request, CrmTag $tag): JsonResponse
    {
        $payload = $request->validate([
            'name' => ['sometimes', 'string', 'max:120'],
            'color' => ['sometimes', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
        ]);

        $updated = $this->service->updateTag((int) $tag->id, $payload);

        return response()->json([
            'message' => 'Tag atualizada com sucesso.',
            'data' => $updated,
        ]);
    }

    public function destroyTag(CrmTag $tag): JsonResponse
    {
        $this->service->deleteTag((int) $tag->id);

        return response()->json([
            'message' => 'Tag removida com sucesso.',
        ]);
    }

    public function addConversationTag(Request $request, WhatsAppConversation $conversation): JsonResponse
    {
        $this->assertConversationInstance($conversation);
        $payload = $request->validate([
            'tag_id' => ['nullable', 'integer', 'exists:crm_tags,id'],
            'name' => ['nullable', 'string', 'max:120'],
        ]);

        $tag = $payload['tag_id'] ?? null;
        if (! $tag && empty($payload['name'])) {
            return response()->json(['message' => 'Informe uma tag existente ou um nome para nova tag.'], 422);
        }

        $updated = $this->service->attachTagToConversation($conversation, $tag ?: (string) $payload['name']);

        return response()->json([
            'message' => 'Tag adicionada com sucesso.',
            'data' => $updated,
        ]);
    }

    public function removeConversationTag(WhatsAppConversation $conversation, CrmTag $tag): JsonResponse
    {
        $this->assertConversationInstance($conversation);
        $updated = $this->service->detachTagFromConversation($conversation, (int) $tag->id);

        return response()->json([
            'message' => 'Tag removida com sucesso.',
            'data' => $updated,
        ]);
    }

    public function quickReplies(): JsonResponse
    {
        return response()->json([
            'data' => $this->service->listQuickReplies(),
        ]);
    }

    public function storeQuickReply(Request $request): JsonResponse
    {
        $payload = $request->validate([
            'title' => ['required', 'string', 'max:120'],
            'content' => ['required', 'string', 'max:2000'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $reply = $this->service->createQuickReply($payload, (int) $request->user()->id);

        return response()->json([
            'message' => 'Resposta rapida cadastrada.',
            'data' => $reply,
        ], 201);
    }

    public function updateQuickReply(Request $request, int $quickReply): JsonResponse
    {
        $payload = $request->validate([
            'title' => ['sometimes', 'string', 'max:120'],
            'content' => ['sometimes', 'string', 'max:2000'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $reply = $this->service->updateQuickReply($quickReply, $payload);

        return response()->json([
            'message' => 'Resposta rapida atualizada.',
            'data' => $reply,
        ]);
    }

    public function destroyQuickReply(int $quickReply): JsonResponse
    {
        $this->service->deleteQuickReply($quickReply);

        return response()->json([
            'message' => 'Resposta rapida removida.',
        ]);
    }

    public function updateSettings(UpdateWhatsAppSettingsRequest $request): JsonResponse
    {
        $payload = $request->validated();

        $settings = $this->service->settings();
        $settings->update([
            'sign_messages' => (bool) $payload['sign_messages'],
            'config_json' => $payload['config_json'] ?? $settings->config_json,
        ]);

        $instance = $this->service->activeInstance();
        $instance->update([
            'sign_messages' => (bool) $settings->sign_messages,
        ]);

        return response()->json([
            'message' => 'Configuracoes do WhatsApp atualizadas.',
            'data' => [
                'instance' => $instance->fresh(),
                'settings' => $settings->fresh(),
            ],
        ]);
    }

    public function instanceProfile(): JsonResponse
    {
        $instance = $this->service->activeInstance();
        $status = [];
        $profile = [];

        try {
            $status = $this->evolution->getInstanceStatus();
            $profile = $this->evolution->getProfile();

            $instance->forceFill([
                'status' => (string) (Arr::get($status, 'instance.state') ?? Arr::get($status, 'state') ?? $instance->status),
                'last_connection_state' => (string) (Arr::get($status, 'state') ?? Arr::get($status, 'instance.state') ?? ''),
                'profile_name' => Arr::get($profile, 'name') ?? Arr::get($profile, 'profileName') ?? $instance->profile_name,
                'profile_status' => Arr::get($profile, 'status') ?? Arr::get($profile, 'profileStatus') ?? $instance->profile_status,
                'profile_picture_url' => Arr::get($profile, 'picture') ?? Arr::get($profile, 'profilePictureUrl') ?? $instance->profile_picture_url,
                'phone' => Arr::get($profile, 'number') ?? Arr::get($profile, 'phone') ?? $instance->phone,
                'last_synced_at' => now(),
            ])->save();
        } catch (\Throwable $exception) {
            // mantém dados locais mesmo em falha remota
        }

        return response()->json([
            'data' => [
                'instance' => $instance->fresh(),
                'remote_status' => $status,
                'remote_profile' => $profile,
            ],
        ]);
    }

    public function updateInstanceProfile(UpdateInstanceProfileRequest $request): JsonResponse
    {
        $payload = $request->validated();
        $instance = $this->service->activeInstance();

        $response = $this->evolution->updateProfile($payload);

        $instance->forceFill([
            'profile_name' => $payload['profile_name'] ?? $instance->profile_name,
            'profile_status' => $payload['profile_status'] ?? $instance->profile_status,
            'last_synced_at' => now(),
        ])->save();

        return response()->json([
            'message' => 'Perfil da instancia atualizado.',
            'data' => [
                'instance' => $instance->fresh(),
                'remote_response' => $response,
            ],
        ]);
    }

    public function sync(Request $request): JsonResponse
    {
        $result = $this->service->syncFromEvolution($request->integer('limit'));

        return response()->json([
            'message' => 'Sincronizacao concluida.',
            'data' => $result,
        ]);
    }

    public function registerWebhook(): JsonResponse
    {
        $webhookUrl = (string) config('evolution.webhook_url', '');
        if ($webhookUrl === '') {
            abort(422, 'EVOLUTION_WEBHOOK_URL nao configurada.');
        }

        try {
            $response = $this->evolution->setWebhook($webhookUrl);
            $instance = $this->service->activeInstance();
            $instance->forceFill([
                'last_synced_at' => now(),
                'settings_json' => array_merge((array) $instance->settings_json, [
                    'webhook_registered_at' => now()->toIso8601String(),
                    'webhook_url' => $webhookUrl,
                ]),
            ])->save();

            return response()->json([
                'message' => 'Webhook registrado na Evolution.',
                'data' => [
                    'webhook_url' => $webhookUrl,
                    'remote_response' => $response,
                ],
            ]);
        } catch (\Throwable $exception) {
            return response()->json([
                'message' => "Nao foi possivel registrar webhook: {$exception->getMessage()}",
            ], 422);
        }
    }

    public function realtimeUpdates(Request $request): JsonResponse
    {
        $instanceId = $this->service->activeInstance()->id;

        $afterMessageId = (int) $request->query('after_message_id', 0);
        $conversationId = $request->query('conversation_id');

        if ($conversationId) {
            $selectedConversation = WhatsAppConversation::query()
                ->where('whatsapp_instance_id', $instanceId)
                ->where('id', (int) $conversationId)
                ->first();

            if ($selectedConversation) {
                $this->service->markAsRead($selectedConversation);
            }
        }

        $messagesQuery = WhatsAppMessage::query()
            ->where('whatsapp_instance_id', $instanceId)
            ->where('id', '>', $afterMessageId)
            ->orderBy('id');

        if ($conversationId) {
            $messagesQuery->where('whatsapp_conversation_id', (int) $conversationId);
        }

        $messages = $messagesQuery->limit(200)->get();

        $conversationIds = $messages->pluck('whatsapp_conversation_id')->unique()->values();
        if ($conversationId) {
            $conversationIds->push((int) $conversationId);
        }

        $conversations = WhatsAppConversation::query()
            ->with(['assignedUser:id,name', 'lead:id,name,phone,pipeline,status', 'contact:id,display_name,push_name,phone,profile_picture_url', 'tags:id,name,slug,color'])
            ->where('whatsapp_instance_id', $instanceId)
            ->whereIn('id', $conversationIds->all())
            ->get();

        return response()->json([
            'data' => [
                'messages' => $messages,
                'conversations' => $conversations,
                'last_message_id' => (int) ($messages->max('id') ?? $afterMessageId),
            ],
        ]);
    }

    public function conversationGeminiInsights(WhatsAppConversation $conversation): JsonResponse
    {
        $this->assertConversationInstance($conversation);
        $insights = $this->geminiInsights->insightsForConversation($conversation);

        return response()->json([
            'data' => [
                'conversation_id' => $conversation->id,
                ...$insights,
            ],
        ]);
    }

    public function media(Request $request, WhatsAppMessage $message): Response|JsonResponse
    {
        $instance = $this->service->activeInstance();
        abort_if((int) $message->whatsapp_instance_id !== (int) $instance->id, 404, 'Midia nao encontrada.');

        $mediaUrl = (string) ($message->media_url ?? '');
        if ($mediaUrl === '') {
            return response()->json(['message' => 'Midia nao disponivel.'], 404);
        }

        if (str_starts_with($mediaUrl, 'data:')) {
            if (! preg_match('/^data:([^;]+);base64,(.*)$/', $mediaUrl, $matches)) {
                return response()->json(['message' => 'Formato de midia invalido.'], 422);
            }

            $mime = $matches[1] ?? 'application/octet-stream';
            $raw = base64_decode((string) ($matches[2] ?? ''), true);
            if ($raw === false) {
                return response()->json(['message' => 'Falha ao decodificar midia.'], 422);
            }

            return response($raw, 200, [
                'Content-Type' => $mime,
                'Cache-Control' => 'private, max-age=3600',
            ]);
        }

        try {
            $remote = Http::timeout((int) config('evolution.timeout', 20))
                ->connectTimeout((int) config('evolution.connect_timeout', 20))
                ->withHeaders([
                    'User-Agent' => 'FortiCorp-Admin-MediaProxy/1.0',
                ])
                ->get($mediaUrl);

            if (! $remote->successful()) {
                return response()->json(['message' => 'Falha ao baixar midia remota.'], 404);
            }

            return response($remote->body(), 200, [
                'Content-Type' => $remote->header('Content-Type', 'application/octet-stream'),
                'Cache-Control' => 'private, max-age=300',
            ]);
        } catch (\Throwable $exception) {
            return response()->json(['message' => "Falha ao carregar midia: {$exception->getMessage()}"], 422);
        }
    }

    private function assertConversationInstance(WhatsAppConversation $conversation): void
    {
        $instance = $this->service->activeInstance();

        abort_if((int) $conversation->whatsapp_instance_id !== (int) $instance->id, 404, 'Conversa nao encontrada para esta instancia.');
    }

    private function invalidPhoneResponse(\InvalidArgumentException $exception): JsonResponse
    {
        return response()->json([
            'message' => $exception->getMessage(),
        ], 422);
    }
}
