<?php

namespace App\Listeners\WhatsApp;

use App\Events\WhatsApp\WhatsAppMessageStored;
use Illuminate\Support\Facades\Log;

class WhatsAppMessageStoredListener
{
    public function handle(WhatsAppMessageStored $event): void
    {
        Log::debug('WhatsApp message stored event', [
            'message_id' => $event->messageId,
            'conversation_id' => $event->conversationId,
            'direction' => $event->direction,
        ]);
    }
}
