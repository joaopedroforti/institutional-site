<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('contact_requests', function (Blueprint $table) {
            $table->unsignedInteger('lead_score')->default(0)->after('lead_order');
            $table->string('score_band', 20)->default('cold')->after('lead_score');
            $table->timestamp('last_activity_at')->nullable()->after('contacted_at');
            $table->foreignId('responsible_closer_user_id')
                ->nullable()
                ->after('assigned_user_id')
                ->constrained('users')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('contact_requests', function (Blueprint $table) {
            $table->dropConstrainedForeignId('responsible_closer_user_id');
            $table->dropColumn(['lead_score', 'score_band', 'last_activity_at']);
        });
    }
};

