<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ProposalTemplate extends Model
{
    protected $fillable = [
        'name',
        'template_key',
        'project_type',
        'is_active',
        'content',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'content' => 'array',
        ];
    }

    public function budgets(): HasMany
    {
        return $this->hasMany(Budget::class);
    }
}

