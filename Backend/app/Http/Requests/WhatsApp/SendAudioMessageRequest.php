<?php

namespace App\Http\Requests\WhatsApp;

use Illuminate\Foundation\Http\FormRequest;

class SendAudioMessageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user();
    }

    public function rules(): array
    {
        return [
            'media_base64' => ['required', 'string'],
            'media_mime' => ['required', 'string', 'max:120'],
            'filename' => ['nullable', 'string', 'max:255'],
        ];
    }
}
