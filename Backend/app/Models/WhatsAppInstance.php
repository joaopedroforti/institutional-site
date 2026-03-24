<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class WhatsAppInstance extends Model
{
    protected $table = 'whatsapp_instances';

    protected $fillable = [
        'instance_name',
        'base_url',
        'status',
        'profile_name',
        'profile_status',
        'profile_picture_url',
        'phone',
        'sign_messages',
        'is_active',
        'last_connection_state',
        'last_synced_at',
        'settings_json',
    ];

    protected function casts(): array
    {
        return [
            'sign_messages' => 'boolean',
            'is_active' => 'boolean',
            'last_synced_at' => 'datetime',
            'settings_json' => 'array',
        ];
    }

    public function contacts(): HasMany
    {
        return $this->hasMany(WhatsAppContact::class, 'whatsapp_instance_id');
    }

    public function conversations(): HasMany
    {
        return $this->hasMany(WhatsAppConversation::class, 'whatsapp_instance_id');
    }

    public function messages(): HasMany
    {
        return $this->hasMany(WhatsAppMessage::class, 'whatsapp_instance_id');
    }

    public function settings(): HasOne
    {
        return $this->hasOne(WhatsAppSetting::class, 'whatsapp_instance_id');
    }
}
