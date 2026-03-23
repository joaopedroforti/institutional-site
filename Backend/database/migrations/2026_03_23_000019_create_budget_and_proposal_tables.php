<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('proposal_templates', function (Blueprint $table): void {
            $table->id();
            $table->string('name', 180);
            $table->string('template_key', 120)->unique();
            $table->string('project_type', 40)->default('site');
            $table->boolean('is_active')->default(true);
            $table->json('content')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('budgets', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('contact_request_id')->constrained('contact_requests')->cascadeOnDelete();
            $table->foreignId('responsible_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('proposal_template_id')->nullable()->constrained('proposal_templates')->nullOnDelete();
            $table->string('identifier', 60)->unique();
            $table->string('slug', 180)->unique();
            $table->string('status', 40)->default('draft');
            $table->string('project_type', 40)->default('site');
            $table->string('title', 220);
            $table->date('valid_until')->nullable();
            $table->date('internal_due_date')->nullable();
            $table->unsignedInteger('internal_deadline_days')->nullable();
            $table->string('internal_deadline_key', 40)->nullable();
            $table->string('client_name', 255);
            $table->string('client_company', 255)->nullable();
            $table->string('client_email', 255)->nullable();
            $table->string('client_phone', 60)->nullable();
            $table->string('objective', 255)->nullable();
            $table->string('visual_direction', 255)->nullable();
            $table->json('onboarding_answers')->nullable();
            $table->json('selected_pages')->nullable();
            $table->decimal('base_amount', 12, 2)->default(0);
            $table->decimal('addons_amount', 12, 2)->default(0);
            $table->decimal('timeline_adjustment', 12, 2)->default(0);
            $table->decimal('total_amount', 12, 2)->default(0);
            $table->decimal('entry_amount', 12, 2)->default(0);
            $table->timestamp('published_at')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->timestamp('adjustment_requested_at')->nullable();
            $table->text('adjustment_message')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();
        });

        Schema::create('budget_versions', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('budget_id')->constrained('budgets')->cascadeOnDelete();
            $table->unsignedInteger('version_number')->default(1);
            $table->json('snapshot');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('proposal_views', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('budget_id')->constrained('budgets')->cascadeOnDelete();
            $table->string('session_key', 120)->nullable();
            $table->string('ip_address', 80)->nullable();
            $table->text('user_agent')->nullable();
            $table->boolean('is_internal')->default(false);
            $table->timestamp('viewed_at');
            $table->timestamps();
        });

        Schema::create('admin_notifications', function (Blueprint $table): void {
            $table->id();
            $table->string('type', 80);
            $table->string('title', 180);
            $table->text('message');
            $table->json('payload')->nullable();
            $table->boolean('is_read')->default(false);
            $table->timestamp('read_at')->nullable();
            $table->timestamps();
        });

        DB::table('proposal_templates')->insert([
            'name' => 'Modelo Site v1',
            'template_key' => 'modelo-site-v1',
            'project_type' => 'site',
            'is_active' => true,
            'content' => json_encode([
                'name' => 'Modelo Site v1',
                'description' => 'Template inicial para propostas de site.',
            ]),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('admin_notifications');
        Schema::dropIfExists('proposal_views');
        Schema::dropIfExists('budget_versions');
        Schema::dropIfExists('budgets');
        Schema::dropIfExists('proposal_templates');
    }
};
