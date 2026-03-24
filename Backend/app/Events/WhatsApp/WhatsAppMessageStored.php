<?php

namespace App\Events\WhatsApp;

class WhatsAppMessageStored
{
    public function __construct(
        public readonly int $messageId,
        public readonly int $conversationId,
        public readonly string $direction,
    ) {
    }
}
