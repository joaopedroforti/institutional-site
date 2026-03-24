<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Casts\Attribute;

class ContactRequest extends Model
{
    protected $fillable = [
        'visitor_session_id',
        'assigned_user_id',
        'responsible_closer_user_id',
        'lead_kanban_column_id',
        'name',
        'phone',
        'phone_normalized',
        'email',
        'company',
        'message',
        'internal_notes',
        'status',
        'pipeline',
        'lead_order',
        'stage_entered_at',
        'lost_reason',
        'deal_value',
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
            'stage_entered_at' => 'datetime',
            'deal_value' => 'decimal:2',
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

    public function whatsappConversations(): HasMany
    {
        return $this->hasMany(WhatsAppConversation::class, 'lead_id');
    }

    public function tags(): BelongsToMany
    {
        return $this->belongsToMany(CrmTag::class, 'contact_request_tag')
            ->withTimestamps();
    }

    protected function phone(): Attribute
    {
        return Attribute::make(
            set: function (?string $value, array $attributes) {
                $normalized = preg_replace('/\D+/', '', (string) ($value ?? ''));
                if ($normalized !== '' && strlen($normalized) > 11 && str_starts_with($normalized, '55')) {
                    $normalized = substr($normalized, -11);
                }

                return [
                    'phone' => $value,
                    'phone_normalized' => $normalized !== '' ? $normalized : null,
                ];
            },
        );
    }
}
