<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::transaction(function (): void {
            DB::table('lead_kanban_columns')->delete();

            $now = now();

            $columns = [
                ['pipeline' => 'comercial', 'name' => 'Lead', 'slug' => 'lead', 'color' => '#4F7CFF', 'position' => 0, 'is_default' => true, 'is_initial' => true, 'is_locked' => true],
                ['pipeline' => 'comercial', 'name' => 'Contato', 'slug' => 'contato', 'color' => '#52b4ff', 'position' => 1, 'is_default' => false, 'is_initial' => false, 'is_locked' => true],
                ['pipeline' => 'comercial', 'name' => 'Onboarding', 'slug' => 'onboarding', 'color' => '#8a7dff', 'position' => 2, 'is_default' => false, 'is_initial' => false, 'is_locked' => false],
                ['pipeline' => 'comercial', 'name' => 'Orcamento', 'slug' => 'orcamento', 'color' => '#ffb347', 'position' => 3, 'is_default' => false, 'is_initial' => false, 'is_locked' => false],

                ['pipeline' => 'desenvolvimento', 'name' => 'Contrato', 'slug' => 'contrato', 'color' => '#4F7CFF', 'position' => 0, 'is_default' => true, 'is_initial' => true, 'is_locked' => true],
                ['pipeline' => 'desenvolvimento', 'name' => 'Planejamento', 'slug' => 'planejamento', 'color' => '#6EA8FE', 'position' => 1, 'is_default' => false, 'is_initial' => false, 'is_locked' => true],
                ['pipeline' => 'desenvolvimento', 'name' => 'Desenvolvimento', 'slug' => 'desenvolvimento', 'color' => '#7CC4FA', 'position' => 2, 'is_default' => false, 'is_initial' => false, 'is_locked' => true],
                ['pipeline' => 'desenvolvimento', 'name' => 'Deploy', 'slug' => 'deploy', 'color' => '#9AD29A', 'position' => 3, 'is_default' => false, 'is_initial' => false, 'is_locked' => true],
                ['pipeline' => 'desenvolvimento', 'name' => 'Entrega', 'slug' => 'entrega', 'color' => '#39c98d', 'position' => 4, 'is_default' => false, 'is_initial' => false, 'is_locked' => true],

                ['pipeline' => 'followup', 'name' => 'Em espera', 'slug' => 'em-espera', 'color' => '#93A4BD', 'position' => 0, 'is_default' => true, 'is_initial' => true, 'is_locked' => true],
                ['pipeline' => 'followup', 'name' => 'Recebendo', 'slug' => 'recebendo', 'color' => '#A7B4C7', 'position' => 1, 'is_default' => false, 'is_initial' => false, 'is_locked' => true],
                ['pipeline' => 'followup', 'name' => 'Descadastrado', 'slug' => 'descadastrado', 'color' => '#B8C2D1', 'position' => 2, 'is_default' => false, 'is_initial' => false, 'is_locked' => true],

                ['pipeline' => 'cs', 'name' => 'Projeto Entregue', 'slug' => 'projeto-entregue', 'color' => '#2FB188', 'position' => 0, 'is_default' => true, 'is_initial' => true, 'is_locked' => true],
                ['pipeline' => 'cs', 'name' => 'Em acompanhamento', 'slug' => 'em-acompanhamento', 'color' => '#5AC8A6', 'position' => 1, 'is_default' => false, 'is_initial' => false, 'is_locked' => true],
                ['pipeline' => 'cs', 'name' => 'Projeto finalizado', 'slug' => 'projeto-finalizado', 'color' => '#70D5B7', 'position' => 2, 'is_default' => false, 'is_initial' => false, 'is_locked' => true],
            ];

            foreach ($columns as $column) {
                DB::table('lead_kanban_columns')->insert([
                    ...$column,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }

            $defaultColumns = DB::table('lead_kanban_columns')
                ->where('is_initial', true)
                ->get()
                ->keyBy('pipeline');

            $contacts = DB::table('contact_requests')->get();

            foreach ($contacts as $contact) {
                $pipeline = in_array($contact->pipeline, ['comercial', 'desenvolvimento', 'followup', 'cs'], true)
                    ? $contact->pipeline
                    : 'comercial';

                $defaultColumn = $defaultColumns[$pipeline] ?? $defaultColumns['comercial'];

                DB::table('contact_requests')
                    ->where('id', $contact->id)
                    ->update([
                        'pipeline' => $pipeline,
                        'lead_kanban_column_id' => $defaultColumn->id,
                        'status' => $defaultColumn->slug,
                        'lead_order' => 0,
                        'stage_entered_at' => $now,
                        'updated_at' => $now,
                    ]);
            }
        });
    }

    public function down(): void
    {
        // sem rollback destrutivo desta normalizacao
    }
};
