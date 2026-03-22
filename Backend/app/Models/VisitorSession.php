<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class VisitorSession extends Model
{
    protected $fillable = [
        'session_key',
        'ip_address',
        'user_agent',
        'referrer',
        'landing_page',
        'last_path',
        'identified_name',
        'identified_email',
        'identified_phone',
        'identified_company',
        'total_page_views',
        'total_interactions',
        'total_duration_seconds',
        'first_seen_at',
        'last_seen_at',
        'utm',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'first_seen_at' => 'datetime',
            'last_seen_at' => 'datetime',
            'utm' => 'array',
            'metadata' => 'array',
        ];
    }

    public function pageVisits(): HasMany
    {
        return $this->hasMany(PageVisit::class);
    }

    public function interactionEvents(): HasMany
    {
        return $this->hasMany(InteractionEvent::class);
    }

    public function contactRequests(): HasMany
    {
        return $this->hasMany(ContactRequest::class);
    }
}
