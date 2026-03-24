<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class WhatsAppConversation extends Model
{
    protected $table = 'whatsapp_conversations';

    protected $fillable = [
        'whatsapp_instance_id',
        'whatsapp_contact_id',
        'remote_jid',
        'phone',
        'subject',
        'last_message_at',
        'last_message_preview',
        'unread_count',
        'assigned_user_id',
        'lead_id',
        'deal_id',
        'status',
        'meta_json',
    ];

    protected function casts(): array
    {
        return [
            'last_message_at' => 'datetime',
            'meta_json' => 'array',
        ];
    }

    public function instance(): BelongsTo
    {
        return $this->belongsTo(WhatsAppInstance::class, 'whatsapp_instance_id');
    }

    public function contact(): BelongsTo
    {
        return $this->belongsTo(WhatsAppContact::class, 'whatsapp_contact_id');
    }

    public function assignedUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_user_id');
    }

    public function lead(): BelongsTo
    {
        return $this->belongsTo(ContactRequest::class, 'lead_id');
    }

    public function messages(): HasMany
    {
        return $this->hasMany(WhatsAppMessage::class, 'whatsapp_conversation_id')->orderBy('sent_at');
    }

    public function tags(): BelongsToMany
    {
        return $this->belongsToMany(
            CrmTag::class,
            'whatsapp_conversation_tag',
            'whatsapp_conversation_id',
            'crm_tag_id',
        )
            ->withTimestamps();
    }
}
