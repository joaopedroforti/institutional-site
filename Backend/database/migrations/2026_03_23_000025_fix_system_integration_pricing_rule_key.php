<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $legacy = DB::table('pricing_rule_items')
            ->where('project_type', 'sistema')
            ->where('rule_key', 'integration_no')
            ->first();

        DB::table('pricing_rule_items')->updateOrInsert(
            [
                'project_type' => 'sistema',
                'rule_key' => 'integration_yes',
            ],
            [
                'label' => 'Sistema integracao: Sim (acrescimo)',
                'amount' => $legacy ? (float) $legacy->amount : 100,
                'sort_order' => 4,
                'is_active' => true,
                'updated_at' => now(),
                'created_at' => $legacy?->created_at ?? now(),
            ],
        );

        DB::table('pricing_rule_items')
            ->where('project_type', 'sistema')
            ->where('rule_key', 'integration_no')
            ->delete();
    }

    public function down(): void
    {
        $current = DB::table('pricing_rule_items')
            ->where('project_type', 'sistema')
            ->where('rule_key', 'integration_yes')
            ->first();

        DB::table('pricing_rule_items')->updateOrInsert(
            [
                'project_type' => 'sistema',
                'rule_key' => 'integration_no',
            ],
            [
                'label' => 'Sistema integracao: Nao (acrescimo)',
                'amount' => $current ? (float) $current->amount : 100,
                'sort_order' => 4,
                'is_active' => true,
                'updated_at' => now(),
                'created_at' => $current?->created_at ?? now(),
            ],
        );

        DB::table('pricing_rule_items')
            ->where('project_type', 'sistema')
            ->where('rule_key', 'integration_yes')
            ->delete();
    }
};
