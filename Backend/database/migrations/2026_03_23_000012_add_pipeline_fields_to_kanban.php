<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('lead_kanban_columns', function (Blueprint $table) {
            $table->string('pipeline', 40)->default('comercial')->after('slug');
            $table->boolean('is_initial')->default(false)->after('is_default');
        });

        Schema::table('lead_kanban_columns', function (Blueprint $table) {
            $table->dropUnique(['slug']);
            $table->unique(['pipeline', 'slug']);
            $table->index(['pipeline', 'position']);
        });

        Schema::table('contact_requests', function (Blueprint $table) {
            $table->string('pipeline', 40)->default('comercial')->after('status');
            $table->timestamp('stage_entered_at')->nullable()->after('lead_order');
            $table->string('lost_reason', 255)->nullable()->after('internal_notes');
            $table->decimal('deal_value', 12, 2)->nullable()->after('lost_reason');
        });

        DB::table('contact_requests')
            ->whereNull('stage_entered_at')
            ->update([
                'stage_entered_at' => DB::raw('COALESCE(updated_at, created_at, NOW())'),
            ]);

        DB::statement('UPDATE contact_requests SET pipeline = lead_kanban_columns.pipeline FROM lead_kanban_columns WHERE contact_requests.lead_kanban_column_id = lead_kanban_columns.id');
    }

    public function down(): void
    {
        Schema::table('contact_requests', function (Blueprint $table) {
            $table->dropColumn(['pipeline', 'stage_entered_at', 'lost_reason', 'deal_value']);
        });

        Schema::table('lead_kanban_columns', function (Blueprint $table) {
            $table->dropIndex(['pipeline', 'position']);
            $table->dropUnique(['pipeline', 'slug']);
            $table->unique('slug');
            $table->dropColumn(['pipeline', 'is_initial']);
        });
    }
};
