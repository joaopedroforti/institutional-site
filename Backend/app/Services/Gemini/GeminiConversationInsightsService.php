<?php

namespace App\Services\Gemini;

use App\Models\WhatsAppConversation;
use App\Models\WhatsAppMessage;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;

class GeminiConversationInsightsService
{
    private const INTEGRATIONS_KEY = 'integrations_settings';
    private const CACHE_KEY = 'gemini_insights_cache';
    private const CACHE_REPROCESS_THRESHOLD = 8;
    private const MAX_MESSAGES_FOR_SUMMARY = 30;

    /**
     * Resolve insights using cache stored in whatsapp_conversations.meta_json.
     * Reprocesses only when at least 8 new messages were added after last generation.
     *
     * @return array<string, mixed>
     */
    public function insightsForConversation(WhatsAppConversation $conversation): array
    {
        $conversation->loadMissing('contact:id,display_name,push_name,phone');

        $stats = WhatsAppMessage::query()
            ->where('whatsapp_conversation_id', $conversation->id)
            ->selectRaw('COUNT(*) as total_messages, COALESCE(MAX(id), 0) as last_message_id')
            ->first();

        $totalMessages = (int) ($stats?->total_messages ?? 0);
        $lastMessageId = (int) ($stats?->last_message_id ?? 0);

        $cached = $this->readCachedInsights($conversation);
        if ($cached !== null) {
            $cachedTotal = (int) ($cached['total_messages'] ?? 0);
            $newMessages = max(0, $totalMessages - $cachedTotal);
            $cachedPayload = $cached['payload'] ?? null;

            if (is_array($cachedPayload) && $newMessages < self::CACHE_REPROCESS_THRESHOLD) {
                return [
                    ...$this->normalizeInsightsPayload($cachedPayload),
                    'cache' => [
                        'hit' => true,
                        'new_messages' => $newMessages,
                        'threshold' => self::CACHE_REPROCESS_THRESHOLD,
                    ],
                ];
            }
        }

        $messages = WhatsAppMessage::query()
            ->where('whatsapp_conversation_id', $conversation->id)
            ->orderByDesc('sent_at')
            ->orderByDesc('id')
            ->limit(self::MAX_MESSAGES_FOR_SUMMARY)
            ->get()
            ->sortBy(fn (WhatsAppMessage $message) => [
                $message->sent_at?->timestamp ?? 0,
                $message->id,
            ])
            ->values()
            ->all();

        $generated = $this->buildInsights($conversation, $messages);
        $newMessages = max(0, $totalMessages - (int) ($cached['total_messages'] ?? 0));
        $payload = [
            ...$this->normalizeInsightsPayload($generated),
            'cache' => [
                'hit' => false,
                'new_messages' => $newMessages,
                'threshold' => self::CACHE_REPROCESS_THRESHOLD,
            ],
        ];

        $this->storeCachedInsights($conversation, [
            'generated_at' => now()->toIso8601String(),
            'last_message_id' => $lastMessageId,
            'total_messages' => $totalMessages,
            'messages_window' => self::MAX_MESSAGES_FOR_SUMMARY,
            'payload' => $payload,
        ]);

        return $payload;
    }

    /**
     * @param  array<int, WhatsAppMessage>  $messages
     * @return array<string, mixed>
     */
    public function buildInsights(WhatsAppConversation $conversation, array $messages): array
    {
        $settings = $this->geminiSettings();

        if (! ($settings['enabled'] ?? false)) {
            return [
                'enabled' => false,
                'summary' => 'Integracao Gemini desativada.',
                'productivity_score' => 0,
                'productivity_band' => 'vermelha',
                'recommended_formality' => 'equilibrado',
                'language_guidance' => [],
                'next_steps' => [],
                'risk_flags' => [],
            ];
        }

        $apiKey = trim((string) ($settings['api_key'] ?? ''));
        if ($apiKey === '') {
            return [
                'enabled' => true,
                'summary' => 'API key do Gemini nao configurada.',
                'productivity_score' => 0,
                'productivity_band' => 'vermelha',
                'recommended_formality' => 'equilibrado',
                'language_guidance' => [],
                'next_steps' => [],
                'risk_flags' => ['Configurar API key do Gemini nas integracoes.'],
            ];
        }

        $configuredModel = $this->normalizeModelName((string) ($settings['model'] ?? 'gemini-1.5-flash'));
        $systemPrompt = trim((string) ($settings['system_prompt'] ?? ''));

        $transcript = $this->formatTranscript($conversation, $messages);

        $instruction = <<<TXT
Retorne APENAS JSON valido com este formato:
{
  "summary": "resumo em pt-BR",
  "productivity_score": 0,
  "recommended_formality": "formal|equilibrado|informal",
  "language_guidance": ["..."],
  "next_steps": ["..."],
  "risk_flags": ["..."]
}

Regras:
- Linguagem em pt-BR.
- Seja objetivo e comercial.
- Nao inclua markdown.
- Nao inclua texto fora do JSON.
- "productivity_score" deve ser inteiro de 0 a 100, onde:
  0-39 = conversa pouco produtiva (vermelha),
  40-69 = conversa mediana (laranja),
  70-100 = conversa produtiva (verde).
TXT;

        $prompt = trim($systemPrompt . "\n\n" . $instruction . "\n\nCONVERSA:\n" . $transcript);

        $response = null;
        $usedModel = $configuredModel;
        $usedApiVersion = 'v1beta';
        $lastErrorDetail = '';

        $modelsToTry = collect([
            $configuredModel,
            'gemini-2.5-flash',
            'gemini-2.0-flash',
            'gemini-1.5-flash',
        ])->map(fn (string $model) => $this->normalizeModelName($model))
            ->filter(fn (string $model) => $model !== '')
            ->unique()
            ->values()
            ->all();

        $apiVersionsToTry = ['v1beta', 'v1'];

        foreach ($apiVersionsToTry as $apiVersion) {
            foreach ($modelsToTry as $model) {
                $candidateResponse = Http::timeout(25)
                    ->connectTimeout(10)
                    ->acceptJson()
                    ->withQueryParameters([
                        'key' => $apiKey,
                    ])
                    ->post("https://generativelanguage.googleapis.com/{$apiVersion}/models/{$model}:generateContent", [
                        'contents' => [
                            [
                                'role' => 'user',
                                'parts' => [
                                    ['text' => $prompt],
                                ],
                            ],
                        ],
                    ]);

                if ($candidateResponse->successful()) {
                    $response = $candidateResponse;
                    $usedModel = $model;
                    $usedApiVersion = $apiVersion;
                    break 2;
                }

                $errorMessage = (string) data_get($candidateResponse->json(), 'error.message', '');
                if ($errorMessage !== '') {
                    $lastErrorDetail = $errorMessage;
                } else {
                    $lastErrorDetail = trim($candidateResponse->body());
                }

                // 404 costuma indicar modelo/versionamento inválido; tenta próximos candidatos.
                if ($candidateResponse->status() === 404) {
                    continue;
                }

                return [
                    'enabled' => true,
                    'summary' => 'Falha ao consultar Gemini para gerar insights.',
                    'productivity_score' => 0,
                    'productivity_band' => 'vermelha',
                    'recommended_formality' => 'equilibrado',
                    'language_guidance' => [],
                    'next_steps' => [],
                    'risk_flags' => [
                        'Gemini retornou erro HTTP '.$candidateResponse->status().'.',
                        $lastErrorDetail !== '' ? mb_substr($lastErrorDetail, 0, 220) : 'Sem detalhes adicionais do provedor.',
                    ],
                ];
            }
        }

        if (! $response || ! $response->successful()) {
            return [
                'enabled' => true,
                'summary' => 'Falha ao consultar Gemini para gerar insights.',
                'productivity_score' => 0,
                'productivity_band' => 'vermelha',
                'recommended_formality' => 'equilibrado',
                'language_guidance' => [],
                'next_steps' => [],
                'risk_flags' => [
                    'Gemini retornou erro HTTP 404.',
                    'Modelo/versao nao encontrado. Confira o campo "Model" nas integracoes.',
                    $lastErrorDetail !== '' ? mb_substr($lastErrorDetail, 0, 220) : "Modelos testados: ".implode(', ', $modelsToTry)." em ".implode(', ', $apiVersionsToTry).".",
                ],
            ];
        }

        $raw = (string) data_get($response->json(), 'candidates.0.content.parts.0.text', '');
        $decoded = $this->extractJson($raw);

        if (! is_array($decoded)) {
            return [
                'enabled' => true,
                'summary' => 'Gemini respondeu em formato inesperado.',
                'productivity_score' => 0,
                'productivity_band' => 'vermelha',
                'recommended_formality' => 'equilibrado',
                'language_guidance' => [],
                'next_steps' => [],
                'risk_flags' => ['Resposta nao estruturada do Gemini.'],
            ];
        }

        $productivityScore = $this->normalizeProductivityScore($decoded['productivity_score'] ?? null);

        return [
            'enabled' => true,
            'summary' => trim((string) ($decoded['summary'] ?? 'Sem resumo disponivel.')),
            'productivity_score' => $productivityScore,
            'productivity_band' => $this->productivityBand($productivityScore),
            'recommended_formality' => $this->normalizeFormality((string) ($decoded['recommended_formality'] ?? 'equilibrado')),
            'language_guidance' => $this->normalizeStringList($decoded['language_guidance'] ?? []),
            'next_steps' => $this->sanitizeUserFacingList($this->normalizeStringList($decoded['next_steps'] ?? [])),
            'risk_flags' => $this->normalizeStringList($decoded['risk_flags'] ?? []),
        ];
    }

    /**
     * @param  array<int, WhatsAppMessage>  $messages
     */
    private function formatTranscript(WhatsAppConversation $conversation, array $messages): string
    {
        if (count($messages) === 0) {
            return 'Sem mensagens no historico.';
        }

        $lines = [];
        $contactName = trim((string) ($conversation->contact?->display_name ?: $conversation->subject ?: $conversation->phone ?: 'Contato'));

        foreach ($messages as $message) {
            $sentAt = $message->sent_at?->format('d/m/Y H:i') ?? '-';
            $speaker = $message->from_me ? 'Atendente' : $contactName;
            $body = trim((string) ($message->body ?? ''));
            $type = (string) ($message->message_type ?? 'text');

            if ($body === '') {
                $body = "[mensagem {$type}]";
            }

            $lines[] = "[{$sentAt}] {$speaker}: {$body}";
        }

        return implode("\n", $lines);
    }

    /**
     * @return array<string, mixed>
     */
    private function geminiSettings(): array
    {
        $raw = DB::table('general_settings')
            ->where('setting_key', self::INTEGRATIONS_KEY)
            ->value('setting_value');

        if (! is_string($raw) || trim($raw) === '') {
            return $this->defaults();
        }

        $decoded = json_decode($raw, true);
        if (! is_array($decoded)) {
            return $this->defaults();
        }

        $gemini = is_array($decoded['gemini'] ?? null) ? $decoded['gemini'] : [];

        return array_replace($this->defaults(), $gemini);
    }

    /**
     * @return array<string, mixed>
     */
    private function defaults(): array
    {
        return [
            'enabled' => false,
            'api_key' => '',
            'model' => 'gemini-1.5-flash',
            'system_prompt' => 'Voce e um assistente comercial para WhatsApp. Gere resumo e orientacoes de abordagem.',
        ];
    }

    private function normalizeModelName(string $model): string
    {
        $normalized = trim($model);
        $normalized = preg_replace('#^models/#', '', $normalized) ?? $normalized;
        return trim($normalized);
    }

    /**
     * @return array<string, mixed>|null
     */
    private function readCachedInsights(WhatsAppConversation $conversation): ?array
    {
        $meta = is_array($conversation->meta_json) ? $conversation->meta_json : [];
        $cache = $meta[self::CACHE_KEY] ?? null;

        return is_array($cache) ? $cache : null;
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function storeCachedInsights(WhatsAppConversation $conversation, array $payload): void
    {
        $meta = is_array($conversation->meta_json) ? $conversation->meta_json : [];
        $meta[self::CACHE_KEY] = $payload;
        $conversation->forceFill(['meta_json' => $meta])->save();
    }

    /**
     * @return array<string, mixed>|null
     */
    private function extractJson(string $raw): ?array
    {
        $trimmed = trim($raw);
        $decoded = json_decode($trimmed, true);
        if (is_array($decoded)) {
            return $decoded;
        }

        if (preg_match('/\{[\s\S]*\}/', $trimmed, $matches) !== 1) {
            return null;
        }

        $decoded = json_decode((string) $matches[0], true);
        return is_array($decoded) ? $decoded : null;
    }

    /**
     * @param  mixed  $value
     * @return array<int, string>
     */
    private function normalizeStringList(mixed $value): array
    {
        if (! is_array($value)) {
            return [];
        }

        return collect($value)
            ->map(fn ($item) => trim((string) $item))
            ->filter(fn (string $item) => $item !== '')
            ->values()
            ->all();
    }

    private function normalizeFormality(string $value): string
    {
        $normalized = strtolower(trim($value));

        return in_array($normalized, ['formal', 'equilibrado', 'informal'], true)
            ? $normalized
            : 'equilibrado';
    }

    private function normalizeProductivityScore(mixed $value): int
    {
        if (is_numeric($value)) {
            return max(0, min(100, (int) round((float) $value)));
        }

        return 50;
    }

    private function productivityBand(int $score): string
    {
        if ($score <= 39) {
            return 'vermelha';
        }

        if ($score <= 69) {
            return 'laranja';
        }

        return 'verde';
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    private function normalizeInsightsPayload(array $payload): array
    {
        $score = $this->normalizeProductivityScore($payload['productivity_score'] ?? null);

        return [
            ...$payload,
            'productivity_score' => $score,
            'productivity_band' => $this->productivityBand($score),
            'next_steps' => $this->sanitizeUserFacingList($this->normalizeStringList($payload['next_steps'] ?? [])),
        ];
    }

    /**
     * @param  array<int, string>  $items
     * @return array<int, string>
     */
    private function sanitizeUserFacingList(array $items): array
    {
        return collect($items)
            ->map(fn (string $item) => trim($item))
            ->filter(fn (string $item) => $item !== '')
            ->reject(fn (string $item) => str_starts_with(strtolower($item), 'modelo utilizado:'))
            ->values()
            ->all();
    }
}
