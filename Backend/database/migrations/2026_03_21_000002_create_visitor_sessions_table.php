<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('visitor_sessions', function (Blueprint $table) {
            $table->id();
            $table->string('session_key')->unique();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->text('referrer')->nullable();
            $table->string('landing_page')->nullable();
            $table->string('last_path')->nullable();
            $table->string('identified_name')->nullable();
            $table->string('identified_email')->nullable();
            $table->string('identified_phone')->nullable();
            $table->string('identified_company')->nullable();
            $table->unsignedInteger('total_page_views')->default(0);
            $table->unsignedInteger('total_interactions')->default(0);
            $table->unsignedInteger('total_duration_seconds')->default(0);
            $table->timestamp('first_seen_at')->nullable();
            $table->timestamp('last_seen_at')->nullable();
            $table->json('utm')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('visitor_sessions');
    }
};
