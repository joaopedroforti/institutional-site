<?php

namespace App\Services\WhatsApp;

use App\Events\WhatsApp\WhatsAppMessageStored;
use App\Models\ContactRequest;
use App\Models\CrmTag;
use App\Models\LeadKanbanColumn;
use App\Models\User;
use App\Models\WhatsAppContact;
use App\Models\WhatsAppConversation;
use App\Models\WhatsAppInstance;
use App\Models\WhatsAppMessage;
use App\Models\WhatsAppMessageAttachment;
use App\Models\WhatsAppQuickReply;
use App\Models\WhatsAppSetting;
use App\Services\LeadDistributionService;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Support\Collection;

class WhatsAppConversationService
{
    public function __construct(
        private readonly EvolutionApiService $evolution,
        private readonly PhoneNormalizer $phoneNormalizer,
        private readonly LeadDistributionService $leadDistribution,
    ) {
    }

    public function activeInstance(): WhatsAppInstance
    {
        $instanceName = $this->evolution->instanceName();

        return WhatsAppInstance::query()->firstOrCreate(
            ['instance_name' => $instanceName],
            [
                'base_url' => config('evolution.base_url'),
                'status' => 'unknown',
                'is_active' => true,
            ],
        );
    }

    public function settings(): WhatsAppSetting
    {
        return WhatsAppSetting::query()->firstOrCreate(
            ['whatsapp_instance_id' => $this->activeInstance()->id],
            [
                'sign_messages' => false,
                'config_json' => [
                    'realtime_mode' => config('evolution.realtime_mode', 'polling'),
                    'polling_interval' => config('evolution.polling_interval', 10),
                ],
            ],
        );
    }

    public function listConversations(array $filters, int $authUserId): LengthAwarePaginator
    {
        $instanceId = $this->activeInstance()->id;
        $this->maybeConsolidateDuplicateConversations($instanceId);

        $query = WhatsAppConversation::query()
            ->with([
                'assignedUser:id,name',
                'lead:id,name,phone,phone_normalized,pipeline,status',
                'contact:id,display_name,push_name,phone,profile_picture_url',
                'tags:id,name,slug,color',
            ])
            ->where('whatsapp_instance_id', $instanceId)
            ->whereNotNull('phone')
            ->whereRaw("phone ~ '^[0-9]{10,11}$'")
            ->orderByDesc('last_message_at')
            ->orderByDesc('updated_at');

        $search = trim((string) ($filters['search'] ?? ''));
        if ($search !== '') {
            $query->where(function (Builder $builder) use ($search): void {
                $builder->where('phone', 'ilike', "%{$search}%")
                    ->orWhere('subject', 'ilike', "%{$search}%")
                    ->orWhereHas('contact', fn (Builder $q) => $q
                        ->where('display_name', 'ilike', "%{$search}%")
                        ->orWhere('push_name', 'ilike', "%{$search}%"))
                    ->orWhereHas('lead', fn (Builder $q) => $q
                        ->where('name', 'ilike', "%{$search}%")
                        ->orWhere('company', 'ilike', "%{$search}%"));
            });
        }

        if (($filters['filter'] ?? null) === 'unread') {
            $query->where('unread_count', '>', 0);
        }

        if (($filters['filter'] ?? null) === 'mine') {
            $query->where('assigned_user_id', $authUserId);
        }

        if (($filters['filter'] ?? null) === 'unassigned') {
            $query->whereNull('assigned_user_id');
        }

        if (($filters['with_media'] ?? null) === '1') {
            $query->whereHas('messages', fn (Builder $q) => $q->whereIn('message_type', ['image', 'audio', 'video', 'document']));
        }

        if (! empty($filters['assigned_user_id'])) {
            $query->where('assigned_user_id', (int) $filters['assigned_user_id']);
        }

        if (! empty($filters['lead_id'])) {
            $query->where('lead_id', (int) $filters['lead_id']);
        }

        if (! empty($filters['deal_id'])) {
            $query->where('deal_id', (int) $filters['deal_id']);
        }

        return $query->paginate((int) ($filters['per_page'] ?? 30));
    }

    public function conversationWithMessages(WhatsAppConversation $conversation, int $limit = 10): array
    {
        $conversation->load([
            'assignedUser:id,name',
            'lead:id,name,phone,email,company,pipeline,status,lead_kanban_column_id',
            'contact:id,display_name,push_name,phone,profile_picture_url',
            'tags:id,name,slug,color',
        ]);

        $messages = WhatsAppMessage::query()
            ->where('whatsapp_conversation_id', $conversation->id)
            ->orderByDesc('id')
            ->limit($limit)
            ->get()
            ->reverse()
            ->values();

        return [
            'conversation' => $conversation,
            'messages' => $messages,
        ];
    }

    public function messagesPaginated(WhatsAppConversation $conversation, array $filters): LengthAwarePaginator
    {
        $query = WhatsAppMessage::query()
            ->where('whatsapp_conversation_id', $conversation->id)
            ->orderByDesc('id');

        if (! empty($filters['after_id'])) {
            $query->where('id', '>', (int) $filters['after_id']);
        }

        if (! empty($filters['before_id'])) {
            $query->where('id', '<', (int) $filters['before_id']);
        }

        return $query->paginate((int) ($filters['per_page'] ?? 60));
    }

    public function startConversation(string $phoneOrJid, ?string $displayName, int $authUserId): WhatsAppConversation
    {
        $instance = $this->activeInstance();
        $normalized = str_contains($phoneOrJid, '@')
            ? $this->phoneNormalizer->fromRemoteJid($phoneOrJid)
            : $this->phoneNormalizer->normalize($phoneOrJid);

        if (! $normalized) {
            throw new \InvalidArgumentException('Numero de WhatsApp invalido.');
        }

        $remoteJid = $this->phoneNormalizer->toRemoteJid($normalized);

        return DB::transaction(function () use ($instance, $normalized, $remoteJid, $displayName, $authUserId): WhatsAppConversation {
            $contact = WhatsAppContact::query()->updateOrCreate(
                [
                    'whatsapp_instance_id' => $instance->id,
                    'remote_jid' => $remoteJid,
                ],
                [
                    'phone' => $normalized,
                    'display_name' => $displayName,
                    'push_name' => $displayName,
                    'is_group' => false,
                ],
            );

            $conversation = WhatsAppConversation::query()
                ->where('whatsapp_instance_id', $instance->id)
                ->where('phone', $normalized)
                ->orderByDesc('last_message_at')
                ->orderByDesc('id')
                ->first();

            if (! $conversation) {
                $conversation = WhatsAppConversation::query()->firstOrCreate(
                    [
                        'whatsapp_instance_id' => $instance->id,
                        'remote_jid' => $remoteJid,
                    ],
                    [
                        'whatsapp_contact_id' => $contact->id,
                        'phone' => $normalized,
                        'subject' => $displayName,
                        'unread_count' => 0,
                        'assigned_user_id' => $authUserId,
                        'status' => 'open',
                    ],
                );
            }

            if (! $conversation->assigned_user_id) {
                $conversation->assigned_user_id = $authUserId;
            }
            $conversation->remote_jid = $remoteJid;
            $conversation->whatsapp_contact_id = $contact->id;
            $conversation->phone = $normalized;
            if ($displayName && ! $conversation->subject) {
                $conversation->subject = $displayName;
            }

            $this->linkConversationToLead($conversation, $normalized, true);
            $this->mergeDuplicateConversationsByRemoteJid($conversation, $instance->id, $remoteJid);
            $this->mergeDuplicateConversationsByPhone($conversation, $instance->id, $normalized);
            $conversation->save();

            return $conversation;
        });
    }

    public function assignConversation(WhatsAppConversation $conversation, ?int $assignedUserId): WhatsAppConversation
    {
        $conversation->assigned_user_id = $assignedUserId;
        $conversation->save();

        return $conversation->fresh(['assignedUser:id,name']);
    }

    public function markAsRead(WhatsAppConversation $conversation): void
    {
        $conversation->forceFill([
            'unread_count' => 0,
        ])->save();
    }

    public function listTags(): Collection
    {
        return CrmTag::query()
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'slug', 'color']);
    }

    public function createTag(array $payload): CrmTag
    {
        $name = trim((string) ($payload['name'] ?? ''));
        if ($name === '') {
            throw new \InvalidArgumentException('Nome da tag invalido.');
        }

        $color = trim((string) ($payload['color'] ?? '#2563eb'));
        if (! preg_match('/^#[0-9A-Fa-f]{6}$/', $color)) {
            $color = '#2563eb';
        }

        $slugBase = Str::slug($name) ?: 'tag';
        $slug = $slugBase;
        $counter = 1;
        while (CrmTag::query()->where('slug', $slug)->exists()) {
            $counter++;
            $slug = "{$slugBase}-{$counter}";
        }

        return CrmTag::query()->create([
            'name' => $name,
            'slug' => $slug,
            'color' => $color,
            'is_active' => true,
        ]);
    }

    public function updateTag(int $tagId, array $payload): CrmTag
    {
        $tag = CrmTag::query()->findOrFail($tagId);

        $name = array_key_exists('name', $payload) ? trim((string) $payload['name']) : $tag->name;
        if ($name === '') {
            $name = $tag->name;
        }

        $color = array_key_exists('color', $payload) ? trim((string) $payload['color']) : $tag->color;
        if (! preg_match('/^#[0-9A-Fa-f]{6}$/', $color)) {
            $color = $tag->color;
        }

        $slug = $tag->slug;
        if ($name !== $tag->name) {
            $slugBase = Str::slug($name) ?: 'tag';
            $slugCandidate = $slugBase;
            $counter = 1;
            while (CrmTag::query()->where('slug', $slugCandidate)->where('id', '!=', $tag->id)->exists()) {
                $counter++;
                $slugCandidate = "{$slugBase}-{$counter}";
            }
            $slug = $slugCandidate;
        }

        $tag->update([
            'name' => $name,
            'slug' => $slug,
            'color' => $color,
        ]);

        return $tag->fresh();
    }

    public function deleteTag(int $tagId): void
    {
        CrmTag::query()->findOrFail($tagId)->delete();
    }

    public function attachTagToConversation(WhatsAppConversation $conversation, string|int $tag): WhatsAppConversation
    {
        $tagModel = is_numeric($tag)
            ? CrmTag::query()->findOrFail((int) $tag)
            : $this->findOrCreateTag((string) $tag);

        $conversation->tags()->syncWithoutDetaching([$tagModel->id]);

        if ($conversation->lead_id) {
            ContactRequest::query()->where('id', $conversation->lead_id)->first()?->tags()->syncWithoutDetaching([$tagModel->id]);
        }

        return $conversation->fresh(['tags:id,name,slug,color']);
    }

    public function detachTagFromConversation(WhatsAppConversation $conversation, int $tagId): WhatsAppConversation
    {
        $conversation->tags()->detach($tagId);

        return $conversation->fresh(['tags:id,name,slug,color']);
    }

    public function listQuickReplies(): Collection
    {
        return WhatsAppQuickReply::query()
            ->where('is_active', true)
            ->orderBy('title')
            ->get(['id', 'title', 'content', 'is_active', 'created_by', 'created_at', 'updated_at']);
    }

    public function createQuickReply(array $payload, int $userId): WhatsAppQuickReply
    {
        return WhatsAppQuickReply::query()->create([
            'title' => trim((string) $payload['title']),
            'content' => trim((string) $payload['content']),
            'is_active' => (bool) ($payload['is_active'] ?? true),
            'created_by' => $userId,
        ]);
    }

    public function updateQuickReply(int $id, array $payload): WhatsAppQuickReply
    {
        $reply = WhatsAppQuickReply::query()->findOrFail($id);
        $reply->update([
            'title' => array_key_exists('title', $payload) ? trim((string) $payload['title']) : $reply->title,
            'content' => array_key_exists('content', $payload) ? trim((string) $payload['content']) : $reply->content,
            'is_active' => array_key_exists('is_active', $payload) ? (bool) $payload['is_active'] : $reply->is_active,
        ]);

        return $reply->fresh();
    }

    public function deleteQuickReply(int $id): void
    {
        WhatsAppQuickReply::query()->findOrFail($id)->delete();
    }

    public function sendText(WhatsAppConversation $conversation, string $text, User $user): WhatsAppMessage
    {
        $this->assertConversationPhoneIsValid($conversation);
        $processedText = $this->replaceTemplateVariables($conversation, $text);
        $finalText = $this->applySignatureIfNeeded($processedText, $user);
        $response = $this->evolution->sendText($conversation->remote_jid, $finalText);
        $message = $this->storeOutboundMessage($conversation, 'text', [
            'body' => $finalText,
            'status' => 'sent',
            'external_message_id' => $this->extractExternalMessageId($response),
            'raw_payload' => $response,
        ]);

        $this->refreshConversationContactProfilePictureOnce($conversation);

        return $message;
    }

    public function sendImage(
        WhatsAppConversation $conversation,
        string $base64,
        string $mime,
        ?string $filename,
        ?string $caption,
        User $user,
    ): WhatsAppMessage {
        $this->assertConversationPhoneIsValid($conversation);
        $processedCaption = $caption ? $this->replaceTemplateVariables($conversation, $caption) : null;
        $finalCaption = $processedCaption ? $this->applySignatureIfNeeded($processedCaption, $user) : null;
        $response = $this->evolution->sendImage($conversation->remote_jid, $base64, $mime, $filename, $finalCaption);

        $message = $this->storeOutboundMessage($conversation, 'image', [
            'body' => $finalCaption,
            'media_mime' => $mime,
            'media_filename' => $filename,
            'media_url' => $this->buildInlineDataUrl($base64, $mime),
            'status' => 'sent',
            'external_message_id' => $this->extractExternalMessageId($response),
            'raw_payload' => $response,
        ]);

        $message->attachments()->create([
            'type' => 'image',
            'url' => $message->media_url,
            'mime' => $mime,
            'filename' => $filename,
            'metadata_json' => [
                'source' => 'outbound',
            ],
        ]);

        $this->refreshConversationContactProfilePictureOnce($conversation);

        return $message;
    }

    public function sendAudio(
        WhatsAppConversation $conversation,
        string $base64,
        string $mime,
        ?string $filename,
        User $user,
    ): WhatsAppMessage {
        $this->assertConversationPhoneIsValid($conversation);
        $response = $this->evolution->sendAudio($conversation->remote_jid, $base64, $mime, $filename);

        $message = $this->storeOutboundMessage($conversation, 'audio', [
            'body' => null,
            'media_mime' => $mime,
            'media_filename' => $filename,
            'media_url' => $this->extractMediaUrl($response, 'audio'),
            'status' => 'sent',
            'external_message_id' => $this->extractExternalMessageId($response),
            'raw_payload' => $response,
        ]);

        $message->attachments()->create([
            'type' => 'audio',
            'url' => $message->media_url,
            'mime' => $mime,
            'filename' => $filename,
            'metadata_json' => [
                'source' => 'outbound',
            ],
        ]);

        $this->refreshConversationContactProfilePictureOnce($conversation);

        return $message;
    }

    public function sendDocument(
        WhatsAppConversation $conversation,
        string $base64,
        string $mime,
        ?string $filename,
        ?string $caption,
        User $user,
    ): WhatsAppMessage {
        $this->assertConversationPhoneIsValid($conversation);
        $processedCaption = $caption ? $this->replaceTemplateVariables($conversation, $caption) : null;
        $finalCaption = $processedCaption ? $this->applySignatureIfNeeded($processedCaption, $user) : null;
        $response = $this->evolution->sendDocument($conversation->remote_jid, $base64, $mime, $filename, $finalCaption);

        $message = $this->storeOutboundMessage($conversation, 'document', [
            'body' => $finalCaption,
            'media_mime' => $mime,
            'media_filename' => $filename,
            'media_url' => $this->buildInlineDataUrl($base64, $mime),
            'status' => 'sent',
            'external_message_id' => $this->extractExternalMessageId($response),
            'raw_payload' => $response,
        ]);

        $message->attachments()->create([
            'type' => 'document',
            'url' => $message->media_url,
            'mime' => $mime,
            'filename' => $filename,
            'metadata_json' => [
                'source' => 'outbound',
            ],
        ]);

        $this->refreshConversationContactProfilePictureOnce($conversation);

        return $message;
    }

    public function syncFromEvolution(?int $limit = null): array
    {
        $instance = $this->activeInstance();
        $synced = [
            'conversations' => 0,
            'messages' => 0,
        ];

        try {
            $chatsResponse = $this->evolution->findChats();
            $chats = Arr::get($chatsResponse, 'chats', Arr::get($chatsResponse, 'data', []));

            if (! is_array($chats)) {
                $chats = [];
            }

            foreach (array_slice($chats, 0, $limit ?? 50) as $chat) {
                $remoteJid = (string) (Arr::get($chat, 'remoteJid') ?? Arr::get($chat, 'id') ?? '');
                if ($remoteJid === '' || ! str_contains($remoteJid, '@')) {
                    continue;
                }

                $conversation = $this->upsertConversationFromRemote($instance, $remoteJid, $chat);
                $synced['conversations']++;

                try {
                    $messagesResponse = $this->evolution->fetchMessages($remoteJid, 40);
                    $messages = Arr::get($messagesResponse, 'messages', Arr::get($messagesResponse, 'data', []));
                    if (! is_array($messages)) {
                        $messages = [];
                    }

                    foreach ($messages as $messagePayload) {
                        $stored = $this->persistInboundOrOutboundMessage($instance, $conversation, $messagePayload);
                        if ($stored) {
                            $synced['messages']++;
                        }
                    }
                } catch (\Throwable $messageError) {
                    Log::warning('Falha ao sincronizar mensagens da conversa', [
                        'remote_jid' => $remoteJid,
                        'error' => $messageError->getMessage(),
                    ]);
                }
            }
        } finally {
            $instance->forceFill([
                'last_synced_at' => now(),
            ])->save();
        }

        return $synced;
    }

    public function processWebhookPayload(array $payload): ?WhatsAppMessage
    {
        $instance = $this->activeInstance();

        $event = (string) (Arr::get($payload, 'event') ?? Arr::get($payload, 'eventType') ?? 'unknown');
        $data = Arr::get($payload, 'data', $payload);

        if (in_array($event, ['connection.update', 'qrcode.updated'], true)) {
            $instance->forceFill([
                'status' => (string) (Arr::get($data, 'state') ?? Arr::get($data, 'status') ?? $instance->status),
                'last_connection_state' => (string) (Arr::get($data, 'state') ?? Arr::get($data, 'status') ?? ''),
                'last_synced_at' => now(),
            ])->save();

            return null;
        }

        $isSingleMessagePayload = is_array($data)
            && (
                Arr::has($data, 'key.remoteJid')
                || Arr::has($data, 'remoteJid')
                || Arr::has($data, 'key.id')
            );

        $messagePayload = $isSingleMessagePayload
            ? $data
            : Arr::get($data, 'messages.0', Arr::get($data, 'message', $data));

        if (! is_array($messagePayload)) {
            return null;
        }

        $remoteJid = (string) (
            Arr::get($messagePayload, 'key.remoteJid')
            ?? Arr::get($messagePayload, 'remoteJid')
            ?? Arr::get($data, 'remoteJid')
            ?? Arr::get($payload, 'sender')
            ?? ''
        );
        if (! str_contains($remoteJid, '@')) {
            return null;
        }

        $conversation = $this->upsertConversationFromRemote($instance, $remoteJid, $data);

        return $this->persistInboundOrOutboundMessage($instance, $conversation, $messagePayload);
    }

    private function upsertConversationFromRemote(WhatsAppInstance $instance, string $remoteJid, array $payload): WhatsAppConversation
    {
        $normalizedPhone = $this->phoneNormalizer->fromRemoteJid($remoteJid);
        $isGroup = str_contains($remoteJid, '@g.us');

        $incomingProfileUrl = Arr::get($payload, 'profilePicUrl') ?? Arr::get($payload, 'profilePictureUrl');
        $contactValues = [
            'phone' => $normalizedPhone,
            'display_name' => Arr::get($payload, 'name') ?? Arr::get($payload, 'notifyName'),
            'push_name' => Arr::get($payload, 'pushName') ?? Arr::get($payload, 'subject'),
            'is_group' => $isGroup,
            'meta_json' => $payload,
        ];

        if (is_string($incomingProfileUrl) && trim($incomingProfileUrl) !== '') {
            $contactValues['profile_picture_url'] = $incomingProfileUrl;
        }

        $contact = WhatsAppContact::query()->updateOrCreate(
            [
                'whatsapp_instance_id' => $instance->id,
                'remote_jid' => $remoteJid,
            ],
            $contactValues,
        );

        $conversation = null;
        if ($normalizedPhone && ! $isGroup) {
            $conversation = WhatsAppConversation::query()
                ->where('whatsapp_instance_id', $instance->id)
                ->where('phone', $normalizedPhone)
                ->orderByDesc('last_message_at')
                ->orderByDesc('id')
                ->first();
        }

        if (! $conversation) {
            $conversation = WhatsAppConversation::query()->firstOrCreate(
                [
                    'whatsapp_instance_id' => $instance->id,
                    'remote_jid' => $remoteJid,
                ],
                [
                    'whatsapp_contact_id' => $contact->id,
                    'phone' => $normalizedPhone,
                    'subject' => Arr::get($payload, 'subject') ?? Arr::get($payload, 'name'),
                    'status' => 'open',
                    'unread_count' => 0,
                ],
            );
        }

        $conversation->remote_jid = $remoteJid;
        $conversation->whatsapp_contact_id = $contact->id;
        $conversation->phone = $normalizedPhone;

        if (! $conversation->subject) {
            $conversation->subject = $contact->display_name ?: $contact->push_name;
        }

        if ($normalizedPhone && ! $isGroup) {
            $this->linkConversationToLead($conversation, $normalizedPhone, true);
            $this->mergeDuplicateConversationsByRemoteJid($conversation, $instance->id, $remoteJid);
            $this->mergeDuplicateConversationsByPhone($conversation, $instance->id, $normalizedPhone);
        }

        $conversation->save();

        return $conversation;
    }

    private function mergeDuplicateConversationsByPhone(
        WhatsAppConversation $conversation,
        int $instanceId,
        ?string $normalizedPhone,
    ): void {
        if (! $normalizedPhone) {
            return;
        }

        $duplicates = WhatsAppConversation::query()
            ->where('whatsapp_instance_id', $instanceId)
            ->where('phone', $normalizedPhone)
            ->where('id', '!=', $conversation->id)
            ->get();

        if ($duplicates->isEmpty()) {
            return;
        }

        foreach ($duplicates as $duplicate) {
            if (! $conversation->lead_id && $duplicate->lead_id) {
                $conversation->lead_id = $duplicate->lead_id;
            }
            if (! $conversation->deal_id && $duplicate->deal_id) {
                $conversation->deal_id = $duplicate->deal_id;
            }
            if (! $conversation->assigned_user_id && $duplicate->assigned_user_id) {
                $conversation->assigned_user_id = $duplicate->assigned_user_id;
            }
            if (! $conversation->subject && $duplicate->subject) {
                $conversation->subject = $duplicate->subject;
            }
            if (! $conversation->whatsapp_contact_id && $duplicate->whatsapp_contact_id) {
                $conversation->whatsapp_contact_id = $duplicate->whatsapp_contact_id;
            }
            if ((int) $duplicate->unread_count > 0) {
                $conversation->unread_count = (int) $conversation->unread_count + (int) $duplicate->unread_count;
            }
            if (
                $duplicate->last_message_at
                && (! $conversation->last_message_at || $duplicate->last_message_at->gt($conversation->last_message_at))
            ) {
                $conversation->last_message_at = $duplicate->last_message_at;
                $conversation->last_message_preview = $duplicate->last_message_preview;
            }

            if (method_exists($duplicate, 'tags')) {
                $tagIds = $duplicate->tags()->pluck('crm_tags.id')->all();
                if (! empty($tagIds)) {
                    $conversation->tags()->syncWithoutDetaching($tagIds);
                }
            }

            WhatsAppMessage::query()
                ->where('whatsapp_conversation_id', $duplicate->id)
                ->update([
                    'whatsapp_conversation_id' => $conversation->id,
                    'whatsapp_contact_id' => $conversation->whatsapp_contact_id,
                ]);

            $duplicate->delete();
        }
    }

    private function mergeDuplicateConversationsByRemoteJid(
        WhatsAppConversation $conversation,
        int $instanceId,
        string $remoteJid,
    ): void {
        $duplicates = WhatsAppConversation::query()
            ->where('whatsapp_instance_id', $instanceId)
            ->where('remote_jid', $remoteJid)
            ->where('id', '!=', $conversation->id)
            ->get();

        if ($duplicates->isEmpty()) {
            return;
        }

        foreach ($duplicates as $duplicate) {
            if (! $conversation->phone && $duplicate->phone) {
                $conversation->phone = $duplicate->phone;
            }
            if (! $conversation->lead_id && $duplicate->lead_id) {
                $conversation->lead_id = $duplicate->lead_id;
            }
            if (! $conversation->deal_id && $duplicate->deal_id) {
                $conversation->deal_id = $duplicate->deal_id;
            }
            if (! $conversation->assigned_user_id && $duplicate->assigned_user_id) {
                $conversation->assigned_user_id = $duplicate->assigned_user_id;
            }
            if (! $conversation->subject && $duplicate->subject) {
                $conversation->subject = $duplicate->subject;
            }
            if (! $conversation->whatsapp_contact_id && $duplicate->whatsapp_contact_id) {
                $conversation->whatsapp_contact_id = $duplicate->whatsapp_contact_id;
            }
            if ((int) $duplicate->unread_count > 0) {
                $conversation->unread_count = (int) $conversation->unread_count + (int) $duplicate->unread_count;
            }
            if (
                $duplicate->last_message_at
                && (! $conversation->last_message_at || $duplicate->last_message_at->gt($conversation->last_message_at))
            ) {
                $conversation->last_message_at = $duplicate->last_message_at;
                $conversation->last_message_preview = $duplicate->last_message_preview;
            }

            $tagIds = $duplicate->tags()->pluck('crm_tags.id')->all();
            if (! empty($tagIds)) {
                $conversation->tags()->syncWithoutDetaching($tagIds);
            }

            WhatsAppMessage::query()
                ->where('whatsapp_conversation_id', $duplicate->id)
                ->update([
                    'whatsapp_conversation_id' => $conversation->id,
                    'whatsapp_contact_id' => $conversation->whatsapp_contact_id,
                ]);

            $duplicate->delete();
        }
    }

    private function consolidateDuplicateConversationsForInstance(int $instanceId): void
    {
        $duplicatePhones = WhatsAppConversation::query()
            ->select('phone')
            ->where('whatsapp_instance_id', $instanceId)
            ->whereNotNull('phone')
            ->groupBy('phone')
            ->havingRaw('COUNT(*) > 1')
            ->pluck('phone');

        foreach ($duplicatePhones as $phone) {
            $primary = WhatsAppConversation::query()
                ->where('whatsapp_instance_id', $instanceId)
                ->where('phone', $phone)
                ->orderByDesc('last_message_at')
                ->orderByDesc('id')
                ->first();

            if ($primary) {
                $this->mergeDuplicateConversationsByPhone($primary, $instanceId, (string) $phone);
                $primary->save();
            }
        }
    }

    private function refreshContactProfilePictureIfDue(WhatsAppContact $contact, string $remoteJid): void
    {
        if (! (bool) config('evolution.fetch_profile_picture', false)) {
            return;
        }

        // Busca de foto acontece apenas uma vez por contato:
        // na primeira mensagem recebida ou no primeiro envio manual.
        if ($this->shouldSkipProfilePictureRefresh($contact)) {
            return;
        }

        $meta = is_array($contact->meta_json) ? $contact->meta_json : [];
        $meta['profile_picture_lookup_done'] = true;

        try {
            $pictureUrl = $this->evolution->fetchContactProfilePictureUrl($remoteJid);
            if ($pictureUrl && $pictureUrl !== $contact->profile_picture_url) {
                $contact->profile_picture_url = $pictureUrl;
                $meta['profile_picture_updated_at'] = now()->toIso8601String();
            }
        } catch (\Throwable $exception) {
            Log::info('Nao foi possivel atualizar foto de perfil do contato WhatsApp.', [
                'contact_id' => $contact->id,
                'remote_jid' => $remoteJid,
                'error' => $exception->getMessage(),
            ]);
        }

        $meta['profile_picture_checked_at'] = now()->toIso8601String();
        $contact->meta_json = $meta;
        $contact->save();
    }

    private function shouldSkipProfilePictureRefresh(WhatsAppContact $contact): bool
    {
        if ($contact->profile_picture_url) {
            return true;
        }

        $meta = is_array($contact->meta_json) ? $contact->meta_json : [];
        return (bool) Arr::get($meta, 'profile_picture_lookup_done', false);
    }

    private function maybeConsolidateDuplicateConversations(int $instanceId): void
    {
        $cacheKey = "wa:duplicates:consolidated:instance:{$instanceId}";
        $cooldownMinutes = max((int) config('evolution.duplicate_consolidation_cooldown_minutes', 10), 1);

        if (! Cache::add($cacheKey, 1, now()->addMinutes($cooldownMinutes))) {
            return;
        }

        try {
            $this->consolidateDuplicateConversationsForInstance($instanceId);
        } catch (\Throwable $exception) {
            Log::warning('Falha ao consolidar conversas duplicadas de WhatsApp.', [
                'instance_id' => $instanceId,
                'error' => $exception->getMessage(),
            ]);
        }
    }

    private function persistInboundOrOutboundMessage(
        WhatsAppInstance $instance,
        WhatsAppConversation $conversation,
        array $messagePayload,
    ): ?WhatsAppMessage {
        $normalizedRemotePhone = $this->phoneNormalizer->fromRemoteJid($conversation->remote_jid);
        if (! $this->phoneNormalizer->isValidNormalized($normalizedRemotePhone)) {
            return null;
        }

        $externalId = (string) (Arr::get($messagePayload, 'key.id') ?? Arr::get($messagePayload, 'id') ?? Arr::get($messagePayload, 'messageId') ?? '');

        if ($externalId !== '') {
            $existing = WhatsAppMessage::query()
                ->where('whatsapp_instance_id', $instance->id)
                ->where('external_message_id', $externalId)
                ->first();

            if ($existing) {
                return null;
            }
        }

        $fromMe = (bool) (Arr::get($messagePayload, 'key.fromMe') ?? Arr::get($messagePayload, 'fromMe') ?? false);
        $direction = $fromMe ? 'outbound' : 'inbound';

        $messageType = 'unknown';
        $body = null;
        $mediaUrl = null;
        $mediaMime = null;
        $mediaFilename = null;
        $audioDuration = null;

        $messageNode = Arr::get($messagePayload, 'message', Arr::get($messagePayload, 'content', []));
        if (is_string($messageNode)) {
            $body = $messageNode;
            $messageType = 'text';
        }

        if (is_array($messageNode)) {
            if (isset($messageNode['conversation']) || isset($messageNode['extendedTextMessage'])) {
                $messageType = 'text';
                $body = (string) ($messageNode['conversation'] ?? Arr::get($messageNode, 'extendedTextMessage.text') ?? '');
            } elseif (isset($messageNode['imageMessage'])) {
                $messageType = 'image';
                $body = Arr::get($messageNode, 'imageMessage.caption');
                $mediaUrl = Arr::get($messageNode, 'imageMessage.url');
                $mediaMime = Arr::get($messageNode, 'imageMessage.mimetype');
                $mediaFilename = Arr::get($messageNode, 'imageMessage.fileName');
            } elseif (isset($messageNode['audioMessage'])) {
                $messageType = 'audio';
                $mediaUrl = Arr::get($messageNode, 'audioMessage.url');
                $mediaMime = Arr::get($messageNode, 'audioMessage.mimetype');
                $audioDuration = Arr::get($messageNode, 'audioMessage.seconds');
            } elseif (isset($messageNode['documentMessage'])) {
                $messageType = 'document';
                $mediaUrl = Arr::get($messageNode, 'documentMessage.url');
                $mediaMime = Arr::get($messageNode, 'documentMessage.mimetype');
                $mediaFilename = Arr::get($messageNode, 'documentMessage.fileName');
            } elseif (isset($messageNode['videoMessage'])) {
                $messageType = 'video';
                $body = Arr::get($messageNode, 'videoMessage.caption');
                $mediaUrl = Arr::get($messageNode, 'videoMessage.url');
                $mediaMime = Arr::get($messageNode, 'videoMessage.mimetype');
            } elseif (isset($messageNode['stickerMessage'])) {
                $messageType = 'sticker';
                $mediaUrl = Arr::get($messageNode, 'stickerMessage.url');
                $mediaMime = Arr::get($messageNode, 'stickerMessage.mimetype');
            }
        }

        // Ignore webhook/status payloads that are not a real message (prevents ghost [UNKNOWN] bubbles).
        $hasBodyContent = is_string($body) && trim($body) !== '';
        $hasMediaData = (is_string($mediaUrl) && trim($mediaUrl) !== '')
            || (is_string($mediaMime) && trim($mediaMime) !== '')
            || (is_string($mediaFilename) && trim($mediaFilename) !== '');

        if ($messageType === 'unknown' && ! $hasBodyContent && ! $hasMediaData) {
            return null;
        }

        $sentAt = Arr::get($messagePayload, 'messageTimestamp');
        if (is_numeric($sentAt)) {
            $sentAt = now()->setTimestamp((int) $sentAt);
        } else {
            $sentAt = now();
        }

        $message = WhatsAppMessage::query()->create([
            'whatsapp_instance_id' => $instance->id,
            'whatsapp_conversation_id' => $conversation->id,
            'whatsapp_contact_id' => $conversation->whatsapp_contact_id,
            'external_message_id' => $externalId !== '' ? $externalId : null,
            'remote_jid' => $conversation->remote_jid,
            'direction' => $direction,
            'message_type' => $messageType,
            'body' => $body,
            'media_url' => $mediaUrl,
            'media_mime' => $mediaMime,
            'media_filename' => $mediaFilename,
            'audio_duration' => $audioDuration,
            'from_me' => $fromMe,
            'sender_name' => Arr::get($messagePayload, 'pushName') ?? Arr::get($messagePayload, 'notifyName'),
            'sender_phone' => $normalizedRemotePhone,
            'sent_at' => $sentAt,
            'status' => Arr::get($messagePayload, 'status') ?? 'received',
            'raw_payload' => $messagePayload,
        ]);

        if (in_array($messageType, ['image', 'audio', 'video', 'document'], true)) {
            WhatsAppMessageAttachment::query()->create([
                'whatsapp_message_id' => $message->id,
                'type' => $messageType,
                'url' => $mediaUrl,
                'mime' => $mediaMime,
                'filename' => $mediaFilename,
                'metadata_json' => [
                    'payload' => $messagePayload,
                ],
            ]);
        }

        $conversation->last_message_at = $message->sent_at ?? now();
        $conversation->last_message_preview = $this->buildPreview($messageType, $body);
        if (! $fromMe) {
            $conversation->unread_count = (int) $conversation->unread_count + 1;
        }
        $conversation->save();
        $this->refreshConversationContactProfilePictureOnce($conversation);

        event(new WhatsAppMessageStored($message->id, $conversation->id, $message->direction));

        return $message;
    }

    private function storeOutboundMessage(WhatsAppConversation $conversation, string $type, array $attributes): WhatsAppMessage
    {
        $message = WhatsAppMessage::query()->create([
            'whatsapp_instance_id' => $conversation->whatsapp_instance_id,
            'whatsapp_conversation_id' => $conversation->id,
            'whatsapp_contact_id' => $conversation->whatsapp_contact_id,
            'external_message_id' => $attributes['external_message_id'] ?? null,
            'remote_jid' => $conversation->remote_jid,
            'direction' => 'outbound',
            'message_type' => $type,
            'body' => $attributes['body'] ?? null,
            'media_url' => $attributes['media_url'] ?? null,
            'media_mime' => $attributes['media_mime'] ?? null,
            'media_filename' => $attributes['media_filename'] ?? null,
            'audio_duration' => $attributes['audio_duration'] ?? null,
            'from_me' => true,
            'sender_name' => null,
            'sender_phone' => null,
            'sent_at' => now(),
            'status' => $attributes['status'] ?? 'sent',
            'raw_payload' => $attributes['raw_payload'] ?? null,
        ]);

        $conversation->last_message_at = $message->sent_at;
        $conversation->last_message_preview = $this->buildPreview($type, $message->body);
        $conversation->save();

        event(new WhatsAppMessageStored($message->id, $conversation->id, $message->direction));

        return $message;
    }

    private function refreshConversationContactProfilePictureOnce(WhatsAppConversation $conversation): void
    {
        if (! $conversation->remote_jid || ! $conversation->whatsapp_contact_id) {
            return;
        }

        $contact = WhatsAppContact::query()->find($conversation->whatsapp_contact_id);
        if (! $contact) {
            return;
        }

        $this->refreshContactProfilePictureIfDue($contact, $conversation->remote_jid);
    }

    private function assertConversationPhoneIsValid(WhatsAppConversation $conversation): void
    {
        $normalized = $this->phoneNormalizer->fromRemoteJid($conversation->remote_jid);
        if (! $this->phoneNormalizer->isValidNormalized($normalized)) {
            throw new \InvalidArgumentException('Numero de WhatsApp invalido. Informe DDD + telefone (ex.: 19999324780).');
        }
    }

    private function buildPreview(string $messageType, ?string $body): string
    {
        if ($messageType === 'text' && $body) {
            $oneLine = preg_replace('/\s+/u', ' ', trim($body)) ?: '';
            return mb_substr($oneLine, 0, 140);
        }

        return match ($messageType) {
            'image' => 'Imagem',
            'audio' => 'Áudio',
            'video' => 'Vídeo',
            'document' => 'Documento',
            'sticker' => 'Sticker',
            default => 'Mensagem',
        };
    }

    private function linkConversationToLead(WhatsAppConversation $conversation, string $normalizedPhone, bool $createIfMissing = false): void
    {
        $lead = $this->resolveLeadByPhone($normalizedPhone);
        if (! $lead && $createIfMissing) {
            $lead = $this->createLeadFromConversation($conversation, $normalizedPhone);
        }

        if (! $lead) {
            return;
        }

        $conversation->lead_id = $lead->id;
        $conversation->deal_id = $lead->id;

        if (! $conversation->assigned_user_id && $lead->assigned_user_id) {
            $conversation->assigned_user_id = $lead->assigned_user_id;
        }

        $this->syncConversationTagsToLead($conversation, $lead);
    }

    private function resolveLeadByPhone(string $normalizedPhone): ?ContactRequest
    {
        $leads = ContactRequest::query()
            ->where('phone_normalized', $normalizedPhone)
            ->orderByDesc('updated_at')
            ->get();

        if ($leads->isEmpty()) {
            return null;
        }

        $preferred = $leads->firstWhere('pipeline', 'comercial') ?? $leads->first();

        if ($leads->count() > 1) {
            $duplicates = $leads
                ->where('id', '!=', $preferred?->id)
                ->where('pipeline', 'comercial');

            foreach ($duplicates as $duplicate) {
                $meta = is_array($duplicate->metadata) ? $duplicate->metadata : [];
                $meta['duplicate_phone_reassigned_at'] = now()->toIso8601String();
                $meta['duplicate_phone_original'] = $duplicate->phone;
                $duplicate->update([
                    'phone' => null,
                    'phone_normalized' => null,
                    'metadata' => $meta,
                ]);
            }
        }

        return $preferred;
    }

    private function findOrCreateTag(string $name): CrmTag
    {
        $cleanName = trim($name);
        if ($cleanName === '') {
            throw new \InvalidArgumentException('Nome da tag invalido.');
        }

        $slug = Str::slug($cleanName);
        if ($slug === '') {
            $slug = 'tag-' . Str::random(8);
        }

        $existing = CrmTag::query()->where('slug', $slug)->first();
        if ($existing) {
            return $existing;
        }

        return CrmTag::query()->create([
            'name' => $cleanName,
            'slug' => $slug,
            'color' => '#2563eb',
            'is_active' => true,
        ]);
    }

    private function createLeadFromConversation(WhatsAppConversation $conversation, string $normalizedPhone): ContactRequest
    {
        $column = LeadKanbanColumn::findByPipelineAndSlug(LeadKanbanColumn::PIPE_COMERCIAL, 'contato')
            ?? LeadKanbanColumn::defaultColumn(LeadKanbanColumn::PIPE_COMERCIAL);

        $nextOrder = (ContactRequest::query()
            ->where('pipeline', LeadKanbanColumn::PIPE_COMERCIAL)
            ->where('lead_kanban_column_id', $column->id)
            ->max('lead_order') ?? -1) + 1;

        $lead = ContactRequest::query()->create([
            'name' => $this->inferLeadName($conversation, $normalizedPhone),
            'phone' => $normalizedPhone,
            'status' => $column->slug,
            'pipeline' => LeadKanbanColumn::PIPE_COMERCIAL,
            'lead_kanban_column_id' => $column->id,
            'lead_order' => $nextOrder,
            'lead_score' => 80,
            'score_band' => 'hot',
            'last_activity_at' => now(),
            'stage_entered_at' => now(),
            'source_url' => 'whatsapp:inbound',
            'message' => 'Lead criado automaticamente a partir de nova conversa de WhatsApp.',
            'metadata' => [
                'auto_created_from_whatsapp' => true,
                'remote_jid' => $conversation->remote_jid,
            ],
        ]);

        $this->leadDistribution->assignLead($lead);

        return $lead->fresh();
    }

    private function inferLeadName(WhatsAppConversation $conversation, string $normalizedPhone): string
    {
        $candidate = trim((string) (
            $conversation->contact?->display_name
            ?? $conversation->contact?->push_name
            ?? $conversation->subject
            ?? ''
        ));

        if ($candidate !== '') {
            return $candidate;
        }

        return "Contato {$normalizedPhone}";
    }

    private function syncConversationTagsToLead(WhatsAppConversation $conversation, ContactRequest $lead): void
    {
        $tagIds = $conversation->tags()->pluck('crm_tags.id')->all();
        if (empty($tagIds)) {
            return;
        }

        $lead->tags()->syncWithoutDetaching($tagIds);
    }

    private function applySignatureIfNeeded(string $text, User $user): string
    {
        $settings = $this->settings();
        if (! $settings->sign_messages) {
            return $text;
        }

        $name = trim($user->name ?: 'Usuario');

        return "*{$name}*\n{$text}";
    }

    private function replaceTemplateVariables(WhatsAppConversation $conversation, string $text): string
    {
        $conversation->loadMissing(['lead:id,name', 'contact:id,display_name,push_name']);

        $fullName = trim((string) (
            $conversation->lead?->name
            ?? $conversation->contact?->display_name
            ?? $conversation->contact?->push_name
            ?? $conversation->subject
            ?? ''
        ));
        $firstName = $fullName !== '' ? Str::of($fullName)->trim()->explode(' ')->first() : '';

        $replacements = [
            '{{primeiro_nome}}' => (string) $firstName,
            '{{nome_completo}}' => $fullName,
            '{primeiro_nome}' => (string) $firstName,
            '{nome_completo}' => $fullName,
        ];

        return strtr($text, $replacements);
    }

    private function extractExternalMessageId(array $response): ?string
    {
        $value = Arr::get($response, 'key.id')
            ?? Arr::get($response, 'id')
            ?? Arr::get($response, 'message.id')
            ?? Arr::get($response, 'data.key.id');

        if (! $value) {
            return null;
        }

        return (string) $value;
    }

    private function extractMediaUrl(array $response, string $kind): ?string
    {
        $direct = Arr::get($response, 'mediaUrl')
            ?? Arr::get($response, 'url')
            ?? Arr::get($response, 'message.url');

        if ($direct) {
            return (string) $direct;
        }

        return match ($kind) {
            'image' => Arr::get($response, 'message.imageMessage.url'),
            'audio' => Arr::get($response, 'message.audioMessage.url'),
            default => null,
        };
    }

    private function buildInlineDataUrl(string $base64, string $mime): ?string
    {
        $trimmed = trim($base64);
        if ($trimmed === '') {
            return null;
        }

        if (str_starts_with($trimmed, 'data:')) {
            return $trimmed;
        }

        return "data:{$mime};base64,{$trimmed}";
    }
}
