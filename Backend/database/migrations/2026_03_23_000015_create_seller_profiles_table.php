<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('seller_profiles', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->boolean('is_active')->default(true);
            $table->boolean('receives_leads')->default(true);
            $table->unsignedInteger('distribution_weight')->default(1);
            $table->decimal('commission_percent', 5, 2)->default(0);
            $table->boolean('participates_in_commission')->default(true);
            $table->decimal('monthly_revenue_goal', 12, 2)->default(0);
            $table->unsignedInteger('monthly_sales_goal')->default(0);
            $table->timestamps();

            $table->unique('user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('seller_profiles');
    }
};
