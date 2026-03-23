<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PricingProjectSetting extends Model
{
    protected $fillable = [
        'project_type',
        'max_discount_percent',
        'requires_admin_validation',
    ];

    protected function casts(): array
    {
        return [
            'max_discount_percent' => 'decimal:2',
            'requires_admin_validation' => 'boolean',
        ];
    }
}
