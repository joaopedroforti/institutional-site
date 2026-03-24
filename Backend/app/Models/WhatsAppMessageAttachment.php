<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WhatsAppMessageAttachment extends Model
{
    protected $table = 'whatsapp_message_attachments';

    protected $fillable = [
        'whatsapp_message_id',
        'type',
        'url',
        'mime',
        'filename',
        'size',
        'metadata_json',
    ];

    protected function casts(): array
    {
        return [
            'metadata_json' => 'array',
        ];
    }

    public function message(): BelongsTo
    {
        return $this->belongsTo(WhatsAppMessage::class, 'whatsapp_message_id');
    }
}
