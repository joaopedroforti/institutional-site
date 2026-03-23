<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProposalView extends Model
{
    protected $fillable = [
        'budget_id',
        'session_key',
        'ip_address',
        'user_agent',
        'is_internal',
        'viewed_at',
    ];

    protected function casts(): array
    {
        return [
            'is_internal' => 'boolean',
            'viewed_at' => 'datetime',
        ];
    }

    public function budget(): BelongsTo
    {
        return $this->belongsTo(Budget::class);
    }
}

