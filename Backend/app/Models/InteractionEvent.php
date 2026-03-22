<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InteractionEvent extends Model
{
    protected $fillable = [
        'visitor_session_id',
        'page_visit_id',
        'event_type',
        'element',
        'label',
        'page_path',
        'occurred_at',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'occurred_at' => 'datetime',
            'metadata' => 'array',
        ];
    }

    public function visitorSession(): BelongsTo
    {
        return $this->belongsTo(VisitorSession::class);
    }

    public function pageVisit(): BelongsTo
    {
        return $this->belongsTo(PageVisit::class);
    }
}
