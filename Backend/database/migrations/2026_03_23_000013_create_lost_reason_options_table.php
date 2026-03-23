<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lost_reason_options', function (Blueprint $table) {
            $table->id();
            $table->string('name', 120)->unique();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        DB::table('lost_reason_options')->insert([
            ['name' => 'Preco alto', 'is_active' => true, 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Sem prioridade no momento', 'is_active' => true, 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Perdeu para concorrente', 'is_active' => true, 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Escopo nao aderente', 'is_active' => true, 'created_at' => now(), 'updated_at' => now()],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('lost_reason_options');
    }
};
