<?php

namespace App\Http\Requests\WhatsApp;

use Illuminate\Foundation\Http\FormRequest;

class UpdateInstanceProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user();
    }

    public function rules(): array
    {
        return [
            'profile_name' => ['nullable', 'string', 'max:255'],
            'profile_status' => ['nullable', 'string', 'max:255'],
            'profile_picture_base64' => ['nullable', 'string'],
        ];
    }
}
