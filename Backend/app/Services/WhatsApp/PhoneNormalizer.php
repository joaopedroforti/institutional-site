<?php

namespace App\Services\WhatsApp;

class PhoneNormalizer
{
    public function normalize(?string $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $digits = preg_replace('/\D+/', '', $value);
        if (! $digits) {
            return null;
        }

        if (str_starts_with($digits, '55')) {
            $length = strlen($digits);
            if ($length === 12 || $length === 13) {
                $digits = substr($digits, 2);
            } elseif ($length > 13) {
                return null;
            }
        }

        if (! $this->isValidNationalNumber($digits)) {
            return null;
        }

        return $digits;
    }

    public function toRemoteJid(string $normalized): string
    {
        return $this->normalizeForWhatsApp($normalized).'@s.whatsapp.net';
    }

    public function fromRemoteJid(?string $jid): ?string
    {
        if (! $jid) {
            return null;
        }

        $number = explode('@', $jid)[0] ?? '';
        $number = explode(':', $number)[0] ?? '';

        return $this->normalize($number);
    }

    public function normalizeForWhatsApp(?string $value): ?string
    {
        $normalized = $this->normalize($value);
        if (! $normalized) {
            return null;
        }

        if (str_starts_with($normalized, '55')) {
            return $normalized;
        }

        return '55'.$normalized;
    }

    public function isValid(?string $value): bool
    {
        return $this->normalize($value) !== null;
    }

    public function isValidNormalized(?string $normalized): bool
    {
        if ($normalized === null) {
            return false;
        }

        return $this->isValidNationalNumber($normalized);
    }

    private function isValidNationalNumber(string $digits): bool
    {
        // DDD(2) + numero(8 ou 9) -> total 10 ou 11 digitos.
        // Exemplos validos: 1999324780 (fixo), 19999324780 (celular).
        if (! preg_match('/^[1-9]{2}(?:9\d{8}|[2-9]\d{7})$/', $digits)) {
            return false;
        }

        return true;
    }
}
