<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PageVisit extends Model
{
    protected $fillable = [
        'visitor_session_id',
        'path',
        'url',
        'title',
        'duration_seconds',
        'visited_at',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'visited_at' => 'datetime',
            'metadata' => 'array',
        ];
    }

    public function visitorSession(): BelongsTo
    {
        return $this->belongsTo(VisitorSession::class);
    }

    public function interactionEvents(): HasMany
    {
        return $this->hasMany(InteractionEvent::class);
    }
}
