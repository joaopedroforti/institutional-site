<?php

namespace App\Services\WhatsApp;

use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class EvolutionApiService
{
    public function instanceName(): string
    {
        return (string) config('evolution.instance', 'FortiCorp');
    }

    public function getInstanceStatus(): array
    {
        return $this->safeRequest('GET', "/instance/connectionState/{$this->instanceName()}");
    }

    public function getProfile(): array
    {
        $instance = $this->instanceName();

        $candidatePaths = [
            "/chat/fetchProfile/{$instance}",
            "/chat/profile/{$instance}",
            "/profile/{$instance}",
        ];

        return $this->firstSuccessful('GET', $candidatePaths);
    }

    public function updateProfile(array $payload): array
    {
        $instance = $this->instanceName();
        $candidatePaths = [
            "/chat/updateProfileName/{$instance}",
            "/profile/name/{$instance}",
        ];

        return $this->firstSuccessful('PUT', $candidatePaths, [
            'name' => Arr::get($payload, 'profile_name'),
            'status' => Arr::get($payload, 'profile_status'),
            'picture' => Arr::get($payload, 'profile_picture_base64'),
        ]);
    }

    public function sendText(string $remoteJid, string $text): array
    {
        $instance = $this->instanceName();

        $body = [
            'number' => $this->numberFromRemoteJid($remoteJid),
            'text' => $text,
            'linkPreview' => true,
            'delay' => 1200,
        ];

        $candidatePaths = [
            "/message/sendText/{$instance}",
            "/chat/sendText/{$instance}",
        ];

        return $this->firstSuccessful('POST', $candidatePaths, $body);
    }

    public function sendImage(string $remoteJid, string $base64, string $mime, ?string $filename, ?string $caption): array
    {
        $instance = $this->instanceName();

        $body = [
            'number' => $this->numberFromRemoteJid($remoteJid),
            'mediatype' => 'image',
            'mimetype' => $mime,
            'media' => $this->sanitizeBase64($base64),
            'fileName' => $filename ?? 'imagem.jpg',
            'caption' => $caption ?? '',
            'delay' => 1200,
        ];

        $candidatePaths = [
            "/message/sendMedia/{$instance}",
        ];

        return $this->firstSuccessful('POST', $candidatePaths, $body);
    }

    public function sendAudio(string $remoteJid, string $base64, string $mime, ?string $filename): array
    {
        $instance = $this->instanceName();

        $body = [
            'number' => $this->numberFromRemoteJid($remoteJid),
            'mediatype' => 'audio',
            'mimetype' => $mime,
            'media' => $this->sanitizeBase64($base64),
            'fileName' => $filename ?? 'audio.ogg',
            'delay' => 1200,
        ];

        $candidatePaths = [
            "/message/sendWhatsAppAudio/{$instance}",
            "/message/sendMedia/{$instance}",
        ];

        return $this->firstSuccessful('POST', $candidatePaths, $body);
    }

    public function sendDocument(string $remoteJid, string $base64, string $mime, ?string $filename, ?string $caption): array
    {
        $instance = $this->instanceName();

        $body = [
            'number' => $this->numberFromRemoteJid($remoteJid),
            'mediatype' => 'document',
            'mimetype' => $mime,
            'media' => $this->sanitizeBase64($base64),
            'fileName' => $filename ?? 'documento.pdf',
            'caption' => $caption ?? '',
            'delay' => 1200,
        ];

        $candidatePaths = [
            "/message/sendMedia/{$instance}",
        ];

        return $this->firstSuccessful('POST', $candidatePaths, $body);
    }

    public function findChats(): array
    {
        $instance = $this->instanceName();
        $candidatePaths = [
            "/chat/findChats/{$instance}",
            "/chat/fetchChats/{$instance}",
        ];

        return $this->firstSuccessful('GET', $candidatePaths);
    }

    public function fetchMessages(string $remoteJid, int $limit = 50): array
    {
        $instance = $this->instanceName();

        $candidatePaths = [
            "/chat/findMessages/{$instance}",
            "/chat/fetchMessages/{$instance}",
        ];

        return $this->firstSuccessful('POST', $candidatePaths, [
            'remoteJid' => $remoteJid,
            'limit' => $limit,
        ]);
    }

    public function fetchContactProfilePictureUrl(string $remoteJid): ?string
    {
        $instance = $this->instanceName();
        $number = $this->numberFromRemoteJid($remoteJid);

        $attempts = [
            ['POST', "/chat/fetchProfilePictureUrl/{$instance}", ['number' => $number]],
            ['POST', "/chat/fetchProfilePicture/{$instance}", ['number' => $number]],
            ['POST', "/chat/profilePictureUrl/{$instance}", ['number' => $number]],
            ['POST', "/chat/fetchProfilePictureUrl/{$instance}", ['remoteJid' => $remoteJid]],
            ['POST', "/chat/fetchProfilePicture/{$instance}", ['remoteJid' => $remoteJid]],
            ['GET', "/chat/fetchProfilePictureUrl/{$instance}?number={$number}", []],
        ];

        foreach ($attempts as [$method, $path, $payload]) {
            try {
                /** @var string $method */
                /** @var string $path */
                $response = $this->safeRequest($method, $path, is_array($payload) ? $payload : []);
                $url = $this->extractMediaUrl($response);
                if ($url) {
                    return $url;
                }
            } catch (\Throwable) {
                continue;
            }
        }

        return null;
    }

    public function setWebhook(string $url): array
    {
        $instance = $this->instanceName();
        $candidatePaths = [
            "/webhook/set/{$instance}",
            "/instance/webhook/{$instance}",
        ];

        $payloads = [
            [
                'webhook' => [
                    'enabled' => true,
                    'url' => $url,
                    'byEvents' => false,
                    'base64' => false,
                    'events' => ['MESSAGES_UPSERT', 'MESSAGES_UPDATE', 'CONNECTION_UPDATE'],
                ],
            ],
            [
                'url' => $url,
                'enabled' => true,
                'events' => ['messages.upsert', 'messages.update', 'connection.update'],
            ],
        ];

        $lastError = null;
        foreach ($payloads as $payload) {
            try {
                return $this->firstSuccessful('POST', $candidatePaths, $payload);
            } catch (RuntimeException $exception) {
                $lastError = $exception;
            }
        }

        throw $lastError ?? new RuntimeException('Falha ao configurar webhook na Evolution API.');
    }

    private function firstSuccessful(string $method, array $paths, array $payload = []): array
    {
        $lastError = null;

        foreach ($paths as $path) {
            try {
                return $this->safeRequest($method, $path, $payload);
            } catch (RuntimeException $exception) {
                $lastError = $exception;
            }
        }

        throw $lastError ?? new RuntimeException('Falha ao integrar com Evolution API.');
    }

    private function safeRequest(string $method, string $path, array $payload = []): array
    {
        $response = $this->request()->send($method, $path, [
            'json' => $payload,
        ]);

        if (! $response->successful()) {
            Log::warning('Evolution API request failed', [
                'method' => $method,
                'path' => $path,
                'status' => $response->status(),
                'body' => $response->body(),
            ]);

            throw new RuntimeException("Falha Evolution API ({$response->status()}) em {$path}");
        }

        return $response->json() ?? [];
    }

    private function request(): PendingRequest
    {
        $baseUrl = config('evolution.base_url');
        $apiKey = config('evolution.api_key');

        if (! $baseUrl || ! $apiKey) {
            throw new RuntimeException('Integracao Evolution API nao configurada. Defina EVOLUTION_API_URL e EVOLUTION_API_KEY.');
        }

        return Http::baseUrl($baseUrl)
            ->acceptJson()
            ->withHeaders([
                'apikey' => $apiKey,
            ])
            ->retry(2, 450, throw: false)
            ->connectTimeout((int) config('evolution.connect_timeout', 20))
            ->timeout((int) config('evolution.timeout', 20));
    }

    private function sanitizeBase64(string $value): string
    {
        if (str_starts_with($value, 'data:')) {
            $parts = explode(',', $value, 2);
            return $parts[1] ?? '';
        }

        return $value;
    }

    private function numberFromRemoteJid(string $remoteJid): string
    {
        $numberPart = explode('@', $remoteJid)[0] ?? '';
        $numberPart = explode(':', $numberPart)[0] ?? '';
        $number = preg_replace('/\D+/', '', $numberPart);
        if (! $number) {
            return '';
        }

        if (str_starts_with($number, '55') && strlen($number) > 13) {
            $number = substr($number, 0, 13);
        }

        if (! str_starts_with($number, '55') && strlen($number) <= 11) {
            return '55'.$number;
        }

        return $number;
    }

    private function extractMediaUrl(array $response): ?string
    {
        $candidateKeys = [
            'base64',
            'url',
            'profilePictureUrl',
            'profilePicUrl',
            'picture',
            'image',
            'data.url',
            'data.profilePictureUrl',
            'data.profilePicUrl',
            'data.picture',
        ];

        foreach ($candidateKeys as $key) {
            $value = Arr::get($response, $key);
            if (is_string($value) && ($value !== '')) {
                if (str_starts_with($value, 'http://') || str_starts_with($value, 'https://') || str_starts_with($value, 'data:image')) {
                    return $value;
                }
            }
        }

        $walker = function (mixed $node) use (&$walker): ?string {
            if (is_string($node) && $node !== '') {
                if (str_starts_with($node, 'http://') || str_starts_with($node, 'https://') || str_starts_with($node, 'data:image')) {
                    return $node;
                }
            }

            if (is_array($node)) {
                foreach ($node as $child) {
                    $found = $walker($child);
                    if ($found) {
                        return $found;
                    }
                }
            }

            return null;
        };

        return $walker($response);
    }
}
