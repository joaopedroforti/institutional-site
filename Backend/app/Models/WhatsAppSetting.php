<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WhatsAppSetting extends Model
{
    protected $table = 'whatsapp_settings';

    protected $fillable = [
        'whatsapp_instance_id',
        'sign_messages',
        'config_json',
    ];

    protected function casts(): array
    {
        return [
            'sign_messages' => 'boolean',
            'config_json' => 'array',
        ];
    }

    public function instance(): BelongsTo
    {
        return $this->belongsTo(WhatsAppInstance::class, 'whatsapp_instance_id');
    }
}
