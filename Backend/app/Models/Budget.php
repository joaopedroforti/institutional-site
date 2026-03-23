<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Budget extends Model
{
    protected $fillable = [
        'contact_request_id',
        'responsible_user_id',
        'proposal_template_id',
        'identifier',
        'slug',
        'status',
        'project_type',
        'title',
        'valid_until',
        'internal_due_date',
        'internal_deadline_days',
        'internal_deadline_key',
        'client_name',
        'client_company',
        'client_email',
        'client_phone',
        'objective',
        'visual_direction',
        'onboarding_answers',
        'selected_pages',
        'base_amount',
        'addons_amount',
        'timeline_adjustment',
        'total_amount',
        'entry_amount',
        'published_at',
        'approved_at',
        'adjustment_requested_at',
        'adjustment_message',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'valid_until' => 'date',
            'internal_due_date' => 'date',
            'published_at' => 'datetime',
            'approved_at' => 'datetime',
            'adjustment_requested_at' => 'datetime',
            'onboarding_answers' => 'array',
            'selected_pages' => 'array',
            'metadata' => 'array',
            'base_amount' => 'decimal:2',
            'addons_amount' => 'decimal:2',
            'timeline_adjustment' => 'decimal:2',
            'total_amount' => 'decimal:2',
            'entry_amount' => 'decimal:2',
        ];
    }

    public function contact(): BelongsTo
    {
        return $this->belongsTo(ContactRequest::class, 'contact_request_id');
    }

    public function responsibleUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'responsible_user_id');
    }

    public function template(): BelongsTo
    {
        return $this->belongsTo(ProposalTemplate::class, 'proposal_template_id');
    }

    public function versions(): HasMany
    {
        return $this->hasMany(BudgetVersion::class)->orderByDesc('version_number');
    }

    public function views(): HasMany
    {
        return $this->hasMany(ProposalView::class);
    }
}

