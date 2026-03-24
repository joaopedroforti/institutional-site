<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class WhatsAppMessage extends Model
{
    protected $table = 'whatsapp_messages';

    protected $fillable = [
        'whatsapp_instance_id',
        'whatsapp_conversation_id',
        'whatsapp_contact_id',
        'external_message_id',
        'remote_jid',
        'direction',
        'message_type',
        'body',
        'media_url',
        'media_mime',
        'media_filename',
        'media_size',
        'audio_duration',
        'from_me',
        'sender_name',
        'sender_phone',
        'sent_at',
        'delivered_at',
        'read_at',
        'status',
        'raw_payload',
    ];

    protected function casts(): array
    {
        return [
            'from_me' => 'boolean',
            'sent_at' => 'datetime',
            'delivered_at' => 'datetime',
            'read_at' => 'datetime',
            'raw_payload' => 'array',
        ];
    }

    public function instance(): BelongsTo
    {
        return $this->belongsTo(WhatsAppInstance::class, 'whatsapp_instance_id');
    }

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(WhatsAppConversation::class, 'whatsapp_conversation_id');
    }

    public function contact(): BelongsTo
    {
        return $this->belongsTo(WhatsAppContact::class, 'whatsapp_contact_id');
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(WhatsAppMessageAttachment::class, 'whatsapp_message_id');
    }
}
