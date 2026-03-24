<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class WhatsAppContact extends Model
{
    protected $table = 'whatsapp_contacts';

    protected $fillable = [
        'whatsapp_instance_id',
        'remote_jid',
        'phone',
        'display_name',
        'push_name',
        'profile_picture_url',
        'is_group',
        'meta_json',
    ];

    protected function casts(): array
    {
        return [
            'is_group' => 'boolean',
            'meta_json' => 'array',
        ];
    }

    public function instance(): BelongsTo
    {
        return $this->belongsTo(WhatsAppInstance::class, 'whatsapp_instance_id');
    }

    public function conversations(): HasMany
    {
        return $this->hasMany(WhatsAppConversation::class, 'whatsapp_contact_id');
    }

    public function messages(): HasMany
    {
        return $this->hasMany(WhatsAppMessage::class, 'whatsapp_contact_id');
    }
}
