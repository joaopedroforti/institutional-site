<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('general_settings', function (Blueprint $table): void {
            $table->id();
            $table->string('setting_key', 80)->unique();
            $table->text('setting_value')->nullable();
            $table->timestamps();
        });

        DB::table('general_settings')->insert([
            [
                'setting_key' => 'company_name',
                'setting_value' => 'FortiCorp',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'setting_key' => 'contact_email',
                'setting_value' => 'contato@forticorp.com.br',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'setting_key' => 'contact_phone',
                'setting_value' => '',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'setting_key' => 'contact_whatsapp',
                'setting_value' => '',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'setting_key' => 'contact_whatsapp_url',
                'setting_value' => '',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('general_settings');
    }
};
