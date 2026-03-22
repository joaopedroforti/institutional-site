<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ContactRequest extends Model
{
    protected $fillable = [
        'visitor_session_id',
        'assigned_user_id',
        'responsible_closer_user_id',
        'lead_kanban_column_id',
        'name',
        'phone',
        'email',
        'company',
        'message',
        'internal_notes',
        'status',
        'lead_order',
        'lead_score',
        'score_band',
        'source_url',
        'referrer',
        'contacted_at',
        'last_activity_at',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'contacted_at' => 'datetime',
            'last_activity_at' => 'datetime',
            'lead_score' => 'integer',
            'metadata' => 'array',
        ];
    }

    public function visitorSession(): BelongsTo
    {
        return $this->belongsTo(VisitorSession::class);
    }

    public function assignedUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_user_id');
    }

    public function responsibleCloserUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'responsible_closer_user_id');
    }

    public function kanbanColumn(): BelongsTo
    {
        return $this->belongsTo(LeadKanbanColumn::class, 'lead_kanban_column_id');
    }

    public function histories(): HasMany
    {
        return $this->hasMany(LeadHistory::class)->orderByDesc('occurred_at');
    }
}
