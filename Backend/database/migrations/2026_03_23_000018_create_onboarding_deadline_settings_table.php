<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('onboarding_deadline_settings', function (Blueprint $table): void {
            $table->id();
            $table->string('option_key', 40)->unique();
            $table->string('label', 120);
            $table->unsignedInteger('internal_days');
            $table->timestamps();
        });

        DB::table('onboarding_deadline_settings')->insert([
            [
                'option_key' => 'urgente',
                'label' => 'Urgente',
                'internal_days' => 4,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'option_key' => 'mes',
                'label' => 'Ainda este mes',
                'internal_days' => 20,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'option_key' => '30-60',
                'label' => 'Entre 30 e 60 dias',
                'internal_days' => 40,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'option_key' => 'sem-pressa',
                'label' => 'Sem pressa',
                'internal_days' => 100,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('onboarding_deadline_settings');
    }
};

