<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('contact_requests', function (Blueprint $table) {
            $table->foreignId('lead_kanban_column_id')->nullable()->after('assigned_user_id')->constrained('lead_kanban_columns')->nullOnDelete();
            $table->unsignedInteger('lead_order')->default(0)->after('status');
            $table->text('internal_notes')->nullable()->after('message');
        });
    }

    public function down(): void
    {
        Schema::table('contact_requests', function (Blueprint $table) {
            $table->dropConstrainedForeignId('lead_kanban_column_id');
            $table->dropColumn(['lead_order', 'internal_notes']);
        });
    }
};
