<?php

return [
    'base_url' => (static function (): string {
        $raw = trim((string) env('EVOLUTION_API_URL', ''));
        if ($raw === '') {
            return '';
        }

        if (! preg_match('/^https?:\/\//i', $raw)) {
            $raw = 'https://'.$raw;
        }

        return rtrim($raw, '/');
    })(),
    'api_key' => (string) env('EVOLUTION_API_KEY', ''),
    'instance' => (string) env('EVOLUTION_INSTANCE', 'FortiCorp'),
    'webhook_url' => (string) env('EVOLUTION_WEBHOOK_URL', ''),
    'realtime_mode' => (string) env('EVOLUTION_REALTIME_MODE', 'polling'),
    'polling_interval' => (int) env('EVOLUTION_POLLING_INTERVAL', 10),
    'fetch_profile_picture' => (bool) env('EVOLUTION_FETCH_PROFILE_PICTURE', true),
    'timeout' => (int) env('EVOLUTION_TIMEOUT', 20),
    'connect_timeout' => (int) env('EVOLUTION_CONNECT_TIMEOUT', 20),
    'profile_picture_retry_minutes' => (int) env('EVOLUTION_PROFILE_PICTURE_RETRY_MINUTES', 360),
    'duplicate_consolidation_cooldown_minutes' => (int) env('EVOLUTION_DUPLICATE_CONSOLIDATION_COOLDOWN_MINUTES', 10),
];
