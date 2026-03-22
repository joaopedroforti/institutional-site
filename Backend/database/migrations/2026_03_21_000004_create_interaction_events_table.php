<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('interaction_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('visitor_session_id')->constrained()->cascadeOnDelete();
            $table->foreignId('page_visit_id')->nullable()->constrained()->nullOnDelete();
            $table->string('event_type');
            $table->string('element')->nullable();
            $table->string('label')->nullable();
            $table->string('page_path')->nullable();
            $table->timestamp('occurred_at');
            $table->json('metadata')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('interaction_events');
    }
};
