<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class CrmTag extends Model
{
    protected $fillable = [
        'name',
        'slug',
        'color',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    public function leads(): BelongsToMany
    {
        return $this->belongsToMany(ContactRequest::class, 'contact_request_tag')
            ->withTimestamps();
    }

    public function conversations(): BelongsToMany
    {
        return $this->belongsToMany(
            WhatsAppConversation::class,
            'whatsapp_conversation_tag',
            'crm_tag_id',
            'whatsapp_conversation_id',
        )
            ->withTimestamps();
    }
}
