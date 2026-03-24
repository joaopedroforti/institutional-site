<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('whatsapp_instances', function (Blueprint $table): void {
            $table->id();
            $table->string('instance_name', 120)->unique();
            $table->string('base_url', 1024)->nullable();
            $table->string('status', 40)->default('unknown');
            $table->string('profile_name')->nullable();
            $table->string('profile_status')->nullable();
            $table->text('profile_picture_url')->nullable();
            $table->string('phone', 25)->nullable();
            $table->boolean('sign_messages')->default(false);
            $table->boolean('is_active')->default(true);
            $table->string('last_connection_state', 80)->nullable();
            $table->timestamp('last_synced_at')->nullable();
            $table->json('settings_json')->nullable();
            $table->timestamps();
        });

        Schema::create('whatsapp_contacts', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('whatsapp_instance_id')->constrained('whatsapp_instances')->cascadeOnDelete();
            $table->string('remote_jid', 255);
            $table->string('phone', 25)->nullable()->index();
            $table->string('display_name')->nullable();
            $table->string('push_name')->nullable();
            $table->text('profile_picture_url')->nullable();
            $table->boolean('is_group')->default(false);
            $table->json('meta_json')->nullable();
            $table->timestamps();
            $table->unique(['whatsapp_instance_id', 'remote_jid'], 'wa_contacts_instance_remote_unique');
        });

        Schema::create('whatsapp_conversations', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('whatsapp_instance_id')->constrained('whatsapp_instances')->cascadeOnDelete();
            $table->foreignId('whatsapp_contact_id')->nullable()->constrained('whatsapp_contacts')->nullOnDelete();
            $table->string('remote_jid', 255)->index();
            $table->string('phone', 25)->nullable()->index();
            $table->string('subject')->nullable();
            $table->timestamp('last_message_at')->nullable()->index();
            $table->text('last_message_preview')->nullable();
            $table->unsignedInteger('unread_count')->default(0);
            $table->foreignId('assigned_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('lead_id')->nullable()->constrained('contact_requests')->nullOnDelete();
            $table->unsignedBigInteger('deal_id')->nullable()->index();
            $table->string('status', 50)->nullable();
            $table->json('meta_json')->nullable();
            $table->timestamps();
            $table->unique(['whatsapp_instance_id', 'remote_jid'], 'wa_conversations_instance_remote_unique');
        });

        Schema::create('whatsapp_messages', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('whatsapp_instance_id')->constrained('whatsapp_instances')->cascadeOnDelete();
            $table->foreignId('whatsapp_conversation_id')->constrained('whatsapp_conversations')->cascadeOnDelete();
            $table->foreignId('whatsapp_contact_id')->nullable()->constrained('whatsapp_contacts')->nullOnDelete();
            $table->string('external_message_id', 255)->nullable()->index();
            $table->string('remote_jid', 255)->index();
            $table->enum('direction', ['inbound', 'outbound']);
            $table->enum('message_type', ['text', 'image', 'audio', 'document', 'video', 'sticker', 'unknown'])->default('unknown');
            $table->text('body')->nullable();
            $table->text('media_url')->nullable();
            $table->string('media_mime')->nullable();
            $table->string('media_filename')->nullable();
            $table->unsignedBigInteger('media_size')->nullable();
            $table->unsignedInteger('audio_duration')->nullable();
            $table->boolean('from_me')->default(false);
            $table->string('sender_name')->nullable();
            $table->string('sender_phone', 25)->nullable();
            $table->timestamp('sent_at')->nullable()->index();
            $table->timestamp('delivered_at')->nullable();
            $table->timestamp('read_at')->nullable();
            $table->string('status', 50)->nullable();
            $table->json('raw_payload')->nullable();
            $table->timestamps();
            $table->unique(['whatsapp_instance_id', 'external_message_id'], 'wa_messages_instance_external_unique');
        });

        Schema::create('whatsapp_message_attachments', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('whatsapp_message_id')->constrained('whatsapp_messages')->cascadeOnDelete();
            $table->string('type', 40);
            $table->text('url')->nullable();
            $table->string('mime', 120)->nullable();
            $table->string('filename')->nullable();
            $table->unsignedBigInteger('size')->nullable();
            $table->json('metadata_json')->nullable();
            $table->timestamps();
        });

        Schema::create('whatsapp_webhook_logs', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('whatsapp_instance_id')->nullable()->constrained('whatsapp_instances')->nullOnDelete();
            $table->string('event_name', 120)->nullable()->index();
            $table->json('payload');
            $table->boolean('processed')->default(false);
            $table->timestamp('processed_at')->nullable();
            $table->text('error_message')->nullable();
            $table->timestamps();
        });

        Schema::create('whatsapp_settings', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('whatsapp_instance_id')->constrained('whatsapp_instances')->cascadeOnDelete();
            $table->boolean('sign_messages')->default(false);
            $table->json('config_json')->nullable();
            $table->timestamps();
            $table->unique(['whatsapp_instance_id']);
        });

        $instanceName = config('evolution.instance', 'FortiCorp') ?: 'FortiCorp';
        $baseUrl = config('evolution.base_url');

        $instanceId = DB::table('whatsapp_instances')->insertGetId([
            'instance_name' => $instanceName,
            'base_url' => $baseUrl,
            'status' => 'unknown',
            'is_active' => true,
            'sign_messages' => false,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('whatsapp_settings')->insert([
            'whatsapp_instance_id' => $instanceId,
            'sign_messages' => false,
            'config_json' => json_encode([
                'realtime_mode' => config('evolution.realtime_mode', 'polling'),
                'polling_interval' => config('evolution.polling_interval', 10),
            ]),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('whatsapp_settings');
        Schema::dropIfExists('whatsapp_webhook_logs');
        Schema::dropIfExists('whatsapp_message_attachments');
        Schema::dropIfExists('whatsapp_messages');
        Schema::dropIfExists('whatsapp_conversations');
        Schema::dropIfExists('whatsapp_contacts');
        Schema::dropIfExists('whatsapp_instances');
    }
};
