<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('budgets', function (Blueprint $table): void {
            $table->boolean('requires_admin_validation')->default(false)->after('status');
            $table->boolean('is_visible_to_seller')->default(true)->after('requires_admin_validation');
            $table->timestamp('admin_validated_at')->nullable()->after('approved_person_birth_date');
            $table->foreignId('admin_validated_by')->nullable()->after('admin_validated_at')->constrained('users')->nullOnDelete();
            $table->decimal('discount_percent', 5, 2)->default(0)->after('entry_amount');
            $table->decimal('discount_amount', 12, 2)->default(0)->after('discount_percent');
        });
    }

    public function down(): void
    {
        Schema::table('budgets', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('admin_validated_by');
            $table->dropColumn([
                'admin_validated_at',
                'discount_amount',
                'discount_percent',
                'is_visible_to_seller',
                'requires_admin_validation',
            ]);
        });
    }
};
