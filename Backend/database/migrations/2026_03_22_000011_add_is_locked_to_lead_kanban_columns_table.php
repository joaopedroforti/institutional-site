<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('lead_kanban_columns', function (Blueprint $table) {
            $table->boolean('is_locked')->default(false)->after('is_default');
        });
    }

    public function down(): void
    {
        Schema::table('lead_kanban_columns', function (Blueprint $table) {
            $table->dropColumn('is_locked');
        });
    }
};

