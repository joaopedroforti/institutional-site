<?php

namespace App\Http\Controllers\Api\WhatsApp;

use App\Http\Controllers\Controller;
use App\Models\WhatsAppWebhookLog;
use App\Services\WhatsApp\WhatsAppConversationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WhatsAppWebhookController extends Controller
{
    public function __construct(
        private readonly WhatsAppConversationService $service,
    ) {
    }

    public function __invoke(Request $request): JsonResponse
    {
        $payload = $request->all();
        $instance = $this->service->activeInstance();

        $log = WhatsAppWebhookLog::query()->create([
            'whatsapp_instance_id' => $instance->id,
            'event_name' => (string) ($payload['event'] ?? $payload['eventType'] ?? 'unknown'),
            'payload' => $payload,
            'processed' => false,
        ]);

        try {
            $this->service->processWebhookPayload($payload);
            $log->update([
                'processed' => true,
                'processed_at' => now(),
            ]);
        } catch (\Throwable $exception) {
            $log->update([
                'processed' => false,
                'processed_at' => now(),
                'error_message' => $exception->getMessage(),
            ]);

            return response()->json([
                'message' => 'Webhook recebido com erro de processamento.',
            ], 202);
        }

        return response()->json([
            'message' => 'Webhook processado com sucesso.',
        ]);
    }
}
