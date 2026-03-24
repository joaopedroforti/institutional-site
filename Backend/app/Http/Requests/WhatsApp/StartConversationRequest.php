<?php

namespace App\Http\Requests\WhatsApp;

use Illuminate\Foundation\Http\FormRequest;

class StartConversationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user();
    }

    public function rules(): array
    {
        return [
            'phone' => ['required', 'string', 'max:40'],
            'display_name' => ['nullable', 'string', 'max:255'],
        ];
    }
}
