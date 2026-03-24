<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('budgets', function (Blueprint $table): void {
            if (! Schema::hasColumn('budgets', 'description')) {
                $table->text('description')->nullable()->after('title');
            }
        });

        $now = now();

        $templates = [
            [
                'name' => 'Modelo Sistema v1',
                'template_key' => 'modelo-sistema-v1',
                'project_type' => 'sistema',
                'is_active' => true,
                'content' => json_encode([
                    'name' => 'Modelo Sistema v1',
                    'description' => 'Template inicial para propostas de sistema.',
                ]),
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'name' => 'Modelo Automacao v1',
                'template_key' => 'modelo-automacao-v1',
                'project_type' => 'automacao',
                'is_active' => true,
                'content' => json_encode([
                    'name' => 'Modelo Automacao v1',
                    'description' => 'Template inicial para propostas de automacao.',
                ]),
                'created_at' => $now,
                'updated_at' => $now,
            ],
        ];

        foreach ($templates as $template) {
            DB::table('proposal_templates')->updateOrInsert(
                ['template_key' => $template['template_key']],
                $template,
            );
        }
    }

    public function down(): void
    {
        Schema::table('budgets', function (Blueprint $table): void {
            if (Schema::hasColumn('budgets', 'description')) {
                $table->dropColumn('description');
            }
        });

        DB::table('proposal_templates')
            ->whereIn('template_key', ['modelo-sistema-v1', 'modelo-automacao-v1'])
            ->delete();
    }
};
