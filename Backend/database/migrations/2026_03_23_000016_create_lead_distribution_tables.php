<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lead_distribution_settings', function (Blueprint $table): void {
            $table->id();
            $table->boolean('is_enabled')->default(true);
            $table->string('fallback_rule', 40)->default('unassigned');
            $table->foreignId('fallback_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->unsignedInteger('current_index')->default(0);
            $table->string('queue_hash', 120)->nullable();
            $table->timestamps();
        });

        Schema::create('lead_distribution_logs', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('contact_request_id')->nullable()->constrained('contact_requests')->nullOnDelete();
            $table->foreignId('assigned_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('mode', 30)->default('auto');
            $table->string('reason', 200)->nullable();
            $table->unsignedInteger('queue_position')->nullable();
            $table->timestamps();
        });

        DB::table('lead_distribution_settings')->insert([
            'is_enabled' => true,
            'fallback_rule' => 'unassigned',
            'current_index' => 0,
            'queue_hash' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('lead_distribution_logs');
        Schema::dropIfExists('lead_distribution_settings');
    }
};

