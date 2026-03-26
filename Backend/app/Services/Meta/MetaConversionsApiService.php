<?php

namespace App\Services\Meta;

use App\Models\ContactRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class MetaConversionsApiService
{
    private const INTEGRATIONS_KEY = 'integrations_settings';
    private const DEFAULT_API_VERSION = 'v22.0';

    public function trackLead(Request $request, ContactRequest $contact, string $origin = 'contact_form_submit'): void
    {
        $this->send($request, [
            'event_name' => 'Lead',
            'event_id' => sprintf('lead_%d_%d', $contact->id, now()->timestamp),
            'event_source_url' => $contact->source_url ?: $request->headers->get('origin') ?: $request->fullUrl(),
            'user_data' => $this->buildUserData($request, [
                'email' => $contact->email,
                'phone' => $contact->phone,
                'name' => $contact->name,
                'external_id' => (string) $contact->id,
            ]),
            'custom_data' => array_filter([
                'origin' => $origin,
                'pipeline' => $contact->pipeline,
                'status' => $contact->status,
            ], fn ($value) => $value !== null && $value !== ''),
        ]);
    }

    public function trackOnboardingSubmit(Request $request, ContactRequest $contact, string $projectType): void
    {
        $this->send($request, [
            'event_name' => 'CompleteRegistration',
            'event_id' => sprintf('onboarding_%d_%d', $contact->id, now()->timestamp),
            'event_source_url' => $contact->source_url ?: $request->headers->get('origin') ?: $request->fullUrl(),
            'user_data' => $this->buildUserData($request, [
                'email' => $contact->email,
                'phone' => $contact->phone,
                'name' => $contact->name,
                'external_id' => (string) $contact->id,
            ]),
            'custom_data' => [
                'content_name' => 'onboarding_submit',
                'project_type' => $projectType,
            ],
        ]);
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function send(Request $request, array $payload): void
    {
        $settings = $this->metaSettings();

        if (! $this->isEnabled($settings)) {
            return;
        }

        $eventName = trim((string) ($payload['event_name'] ?? ''));
        if ($eventName === '') {
            return;
        }

        $pixelId = trim((string) ($settings['pixel_id'] ?? ''));
        $accessToken = trim((string) ($settings['access_token'] ?? ''));
        $apiVersion = trim((string) ($settings['api_version'] ?? self::DEFAULT_API_VERSION)) ?: self::DEFAULT_API_VERSION;
        $testEventCode = trim((string) ($settings['test_event_code'] ?? ''));

        $event = [
            'event_name' => $eventName,
            'event_time' => now()->timestamp,
            'action_source' => 'website',
            'event_id' => (string) ($payload['event_id'] ?? sprintf('%s_%d', Str::slug($eventName), now()->timestamp)),
            'event_source_url' => (string) ($payload['event_source_url'] ?? $request->fullUrl()),
            'user_data' => $payload['user_data'] ?? $this->buildUserData($request),
            'custom_data' => $payload['custom_data'] ?? [],
        ];

        $requestPayload = [
            'data' => [
                $event,
            ],
        ];

        if ($testEventCode !== '') {
            $requestPayload['test_event_code'] = $testEventCode;
        }

        try {
            Http::asJson()
                ->timeout(10)
                ->retry(1, 250)
                ->post(sprintf('https://graph.facebook.com/%s/%s/events', $apiVersion, $pixelId), [
                    ...$requestPayload,
                    'access_token' => $accessToken,
                ])
                ->throw();
        } catch (\Throwable $exception) {
            Log::warning('Meta Conversions API falhou ao enviar evento', [
                'event_name' => $eventName,
                'pixel_id' => $pixelId,
                'message' => $exception->getMessage(),
            ]);
        }
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function buildUserData(Request $request, array $data = []): array
    {
        $name = trim((string) ($data['name'] ?? ''));
        [$firstName, $lastName] = $this->splitName($name);

        return array_filter([
            'em' => $this->hashIfFilled((string) ($data['email'] ?? '')),
            'ph' => $this->hashIfFilled((string) ($data['phone'] ?? ''), true),
            'fn' => $this->hashIfFilled($firstName),
            'ln' => $this->hashIfFilled($lastName),
            'external_id' => $this->hashIfFilled((string) ($data['external_id'] ?? '')),
            'client_ip_address' => $request->ip(),
            'client_user_agent' => $request->userAgent(),
            'fbc' => $request->cookie('_fbc'),
            'fbp' => $request->cookie('_fbp'),
        ], fn ($value) => $value !== null && $value !== '' && $value !== []);
    }

    /**
     * @return array<int, string>
     */
    private function hashIfFilled(string $value, bool $digitsOnly = false): array
    {
        $normalized = trim(Str::lower($value));
        if ($digitsOnly) {
            $normalized = preg_replace('/\D+/', '', $normalized) ?? '';
        }

        if ($normalized === '') {
            return [];
        }

        return [hash('sha256', $normalized)];
    }

    /**
     * @return array{0: string, 1: string}
     */
    private function splitName(string $name): array
    {
        if ($name === '') {
            return ['', ''];
        }

        $parts = preg_split('/\s+/', $name) ?: [];
        $firstName = $parts[0] ?? '';
        $lastName = count($parts) > 1 ? $parts[count($parts) - 1] : '';

        return [$firstName, $lastName];
    }

    /**
     * @return array<string, mixed>
     */
    private function metaSettings(): array
    {
        $defaults = [
            'enabled' => false,
            'pixel_id' => '',
            'conversions_api_enabled' => false,
            'access_token' => '',
            'api_version' => self::DEFAULT_API_VERSION,
            'test_event_code' => '',
        ];

        if (! Schema::hasTable('general_settings')) {
            return $defaults;
        }

        $raw = DB::table('general_settings')
            ->where('setting_key', self::INTEGRATIONS_KEY)
            ->value('setting_value');

        if (! is_string($raw) || trim($raw) === '') {
            return $defaults;
        }

        $decoded = json_decode($raw, true);
        if (! is_array($decoded)) {
            return $defaults;
        }

        $meta = is_array($decoded['meta_pixel'] ?? null) ? $decoded['meta_pixel'] : [];
        return array_replace($defaults, $meta);
    }

    /**
     * @param  array<string, mixed>  $settings
     */
    private function isEnabled(array $settings): bool
    {
        return (bool) ($settings['enabled'] ?? false)
            && (bool) ($settings['conversions_api_enabled'] ?? false)
            && trim((string) ($settings['pixel_id'] ?? '')) !== ''
            && trim((string) ($settings['access_token'] ?? '')) !== '';
    }
}

