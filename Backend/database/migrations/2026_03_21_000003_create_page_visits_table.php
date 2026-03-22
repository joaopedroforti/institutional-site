<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('page_visits', function (Blueprint $table) {
            $table->id();
            $table->foreignId('visitor_session_id')->constrained()->cascadeOnDelete();
            $table->string('path');
            $table->text('url')->nullable();
            $table->string('title')->nullable();
            $table->unsignedInteger('duration_seconds')->default(0);
            $table->timestamp('visited_at');
            $table->json('metadata')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('page_visits');
    }
};
