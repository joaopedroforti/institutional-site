<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('budgets', function (Blueprint $table): void {
            $table->string('approved_person_name', 255)->nullable()->after('approved_at');
            $table->string('approved_person_cpf', 14)->nullable()->after('approved_person_name');
            $table->date('approved_person_birth_date')->nullable()->after('approved_person_cpf');
        });
    }

    public function down(): void
    {
        Schema::table('budgets', function (Blueprint $table): void {
            $table->dropColumn([
                'approved_person_birth_date',
                'approved_person_cpf',
                'approved_person_name',
            ]);
        });
    }
};
