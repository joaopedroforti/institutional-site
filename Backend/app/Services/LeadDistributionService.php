<?php

namespace App\Services;

use App\Models\ContactRequest;
use Illuminate\Support\Facades\DB;

class LeadDistributionService
{
    public function assignLead(ContactRequest $contact): void
    {
        $settings = DB::table('lead_distribution_settings')->first();

        if (! $settings || ! $settings->is_enabled) {
            return;
        }

        $eligible = DB::table('seller_profiles')
            ->join('users', 'users.id', '=', 'seller_profiles.user_id')
            ->where('users.is_seller', true)
            ->where('seller_profiles.is_active', true)
            ->where('seller_profiles.receives_leads', true)
            ->where('seller_profiles.distribution_weight', '>', 0)
            ->orderBy('users.id')
            ->get([
                'users.id as user_id',
                'seller_profiles.distribution_weight',
            ]);

        $queue = [];
        foreach ($eligible as $seller) {
            $weight = max(0, (int) $seller->distribution_weight);
            for ($i = 0; $i < $weight; $i++) {
                $queue[] = (int) $seller->user_id;
            }
        }

        if (count($queue) === 0) {
            if ($settings->fallback_rule === 'default_user' && $settings->fallback_user_id) {
                $this->assignToUser($contact, (int) $settings->fallback_user_id, 'fallback', 'fallback_default_user', null);
            } else {
                $this->log($contact->id, null, 'fallback', 'fallback_unassigned', null);
            }

            return;
        }

        $hash = md5(json_encode($queue));
        $currentIndex = (int) $settings->current_index;

        if (($settings->queue_hash ?? null) !== $hash) {
            $currentIndex = 0;
        }

        $position = $currentIndex % count($queue);
        $userId = (int) $queue[$position];
        $nextIndex = ($position + 1) % count($queue);

        DB::table('lead_distribution_settings')
            ->where('id', $settings->id)
            ->update([
                'current_index' => $nextIndex,
                'queue_hash' => $hash,
                'updated_at' => now(),
            ]);

        $this->assignToUser($contact, $userId, 'auto', 'weighted_round_robin', $position);
    }

    private function assignToUser(ContactRequest $contact, int $userId, string $mode, string $reason, ?int $position): void
    {
        $contact->update([
            'assigned_user_id' => $userId,
            'responsible_closer_user_id' => $userId,
        ]);

        $this->log($contact->id, $userId, $mode, $reason, $position);
    }

    private function log(int $contactId, ?int $userId, string $mode, string $reason, ?int $position): void
    {
        DB::table('lead_distribution_logs')->insert([
            'contact_request_id' => $contactId,
            'assigned_user_id' => $userId,
            'mode' => $mode,
            'reason' => $reason,
            'queue_position' => $position,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
}

