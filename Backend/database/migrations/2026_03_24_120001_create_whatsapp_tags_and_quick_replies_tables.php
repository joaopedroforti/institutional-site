<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('crm_tags', function (Blueprint $table): void {
            $table->id();
            $table->string('name', 120);
            $table->string('slug', 140)->unique();
            $table->string('color', 20)->default('#2563eb');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('contact_request_tag', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('contact_request_id')->constrained('contact_requests')->cascadeOnDelete();
            $table->foreignId('crm_tag_id')->constrained('crm_tags')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['contact_request_id', 'crm_tag_id']);
        });

        Schema::create('whatsapp_conversation_tag', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('whatsapp_conversation_id')->constrained('whatsapp_conversations')->cascadeOnDelete();
            $table->foreignId('crm_tag_id')->constrained('crm_tags')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['whatsapp_conversation_id', 'crm_tag_id']);
        });

        Schema::create('whatsapp_quick_replies', function (Blueprint $table): void {
            $table->id();
            $table->string('title', 120);
            $table->text('content');
            $table->boolean('is_active')->default(true);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['is_active', 'updated_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('whatsapp_quick_replies');
        Schema::dropIfExists('whatsapp_conversation_tag');
        Schema::dropIfExists('contact_request_tag');
        Schema::dropIfExists('crm_tags');
    }
};
