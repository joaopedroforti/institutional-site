<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SellerProfile extends Model
{
    protected $fillable = [
        'user_id',
        'is_active',
        'receives_leads',
        'distribution_weight',
        'commission_percent',
        'participates_in_commission',
        'monthly_revenue_goal',
        'monthly_sales_goal',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'receives_leads' => 'boolean',
            'distribution_weight' => 'integer',
            'commission_percent' => 'decimal:2',
            'participates_in_commission' => 'boolean',
            'monthly_revenue_goal' => 'decimal:2',
            'monthly_sales_goal' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}

