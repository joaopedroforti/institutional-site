<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PricingRuleItem extends Model
{
    protected $fillable = [
        'project_type',
        'rule_key',
        'label',
        'amount',
        'sort_order',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'sort_order' => 'integer',
            'is_active' => 'boolean',
        ];
    }
}
