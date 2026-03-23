<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->boolean('is_admin')->default(false)->after('is_super_admin');
            $table->boolean('is_seller')->default(false)->after('is_admin');
        });

        DB::table('users')
            ->where('is_super_admin', true)
            ->update([
                'is_admin' => true,
                'is_seller' => true,
            ]);

        DB::table('users')
            ->where('is_super_admin', false)
            ->update([
                'is_seller' => true,
            ]);
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn(['is_admin', 'is_seller']);
        });
    }
};

