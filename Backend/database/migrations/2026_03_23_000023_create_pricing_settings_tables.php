<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pricing_project_settings', function (Blueprint $table): void {
            $table->id();
            $table->string('project_type', 40)->unique();
            $table->decimal('max_discount_percent', 5, 2)->default(0);
            $table->boolean('requires_admin_validation')->default(false);
            $table->timestamps();
        });

        Schema::create('pricing_rule_items', function (Blueprint $table): void {
            $table->id();
            $table->string('project_type', 40);
            $table->string('rule_key', 80);
            $table->string('label', 180);
            $table->decimal('amount', 12, 2)->default(0);
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['project_type', 'rule_key']);
            $table->index(['project_type', 'sort_order']);
        });

        DB::table('pricing_project_settings')->insert([
            [
                'project_type' => 'site',
                'max_discount_percent' => 40,
                'requires_admin_validation' => false,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'project_type' => 'sistema',
                'max_discount_percent' => 40,
                'requires_admin_validation' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'project_type' => 'automacao',
                'max_discount_percent' => 40,
                'requires_admin_validation' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);

        $rules = [
            // Site
            ['project_type' => 'site', 'rule_key' => 'objective_apresentar', 'label' => 'Site objetivo: Apresentar minha empresa', 'amount' => 350, 'sort_order' => 1],
            ['project_type' => 'site', 'rule_key' => 'objective_leads', 'label' => 'Site objetivo: Gerar leads', 'amount' => 350, 'sort_order' => 2],
            ['project_type' => 'site', 'rule_key' => 'objective_portfolio', 'label' => 'Site objetivo: Mostrar portifolio', 'amount' => 350, 'sort_order' => 3],
            ['project_type' => 'site', 'rule_key' => 'objective_vender', 'label' => 'Site objetivo: Vender online', 'amount' => 2500, 'sort_order' => 4],
            ['project_type' => 'site', 'rule_key' => 'objective_agendamento', 'label' => 'Site objetivo: Receber agendamentos', 'amount' => 600, 'sort_order' => 5],
            ['project_type' => 'site', 'rule_key' => 'page_home', 'label' => 'Site pagina: Home', 'amount' => 0, 'sort_order' => 10],
            ['project_type' => 'site', 'rule_key' => 'page_servicos', 'label' => 'Site pagina: Servicos', 'amount' => 100, 'sort_order' => 11],
            ['project_type' => 'site', 'rule_key' => 'page_sobre', 'label' => 'Site pagina: Sobre', 'amount' => 100, 'sort_order' => 12],
            ['project_type' => 'site', 'rule_key' => 'page_depoimentos', 'label' => 'Site pagina: Depoimentos', 'amount' => 100, 'sort_order' => 13],
            ['project_type' => 'site', 'rule_key' => 'page_blog', 'label' => 'Site pagina: Blog ou Conteudo', 'amount' => 300, 'sort_order' => 14],
            ['project_type' => 'site', 'rule_key' => 'page_faq', 'label' => 'Site pagina: FAQ', 'amount' => 50, 'sort_order' => 15],
            ['project_type' => 'site', 'rule_key' => 'page_contato', 'label' => 'Site pagina: Contato', 'amount' => 100, 'sort_order' => 16],
            ['project_type' => 'site', 'rule_key' => 'deadline_urgente', 'label' => 'Site prazo: Urgente', 'amount' => 200, 'sort_order' => 20],
            ['project_type' => 'site', 'rule_key' => 'deadline_mes', 'label' => 'Site prazo: Ainda este mes', 'amount' => 0, 'sort_order' => 21],
            ['project_type' => 'site', 'rule_key' => 'deadline_30_60', 'label' => 'Site prazo: Entre 30 e 60 dias', 'amount' => -50, 'sort_order' => 22],
            ['project_type' => 'site', 'rule_key' => 'deadline_sem_pressa', 'label' => 'Site prazo: Sem pressa', 'amount' => -100, 'sort_order' => 23],

            // Sistema
            ['project_type' => 'sistema', 'rule_key' => 'base', 'label' => 'Sistema valor base', 'amount' => 400, 'sort_order' => 1],
            ['project_type' => 'sistema', 'rule_key' => 'type_web', 'label' => 'Sistema tipo: Web', 'amount' => 2500, 'sort_order' => 2],
            ['project_type' => 'sistema', 'rule_key' => 'type_local', 'label' => 'Sistema tipo: Local', 'amount' => 4500, 'sort_order' => 3],
            ['project_type' => 'sistema', 'rule_key' => 'integration_yes', 'label' => 'Sistema integracao: Sim (acrescimo)', 'amount' => 100, 'sort_order' => 4],
            ['project_type' => 'sistema', 'rule_key' => 'asset_conteudo', 'label' => 'Sistema ativos: Conteudo das paginas', 'amount' => -50, 'sort_order' => 10],
            ['project_type' => 'sistema', 'rule_key' => 'asset_logo', 'label' => 'Sistema ativos: Logo', 'amount' => -50, 'sort_order' => 11],
            ['project_type' => 'sistema', 'rule_key' => 'asset_identidade', 'label' => 'Sistema ativos: Identidade visual', 'amount' => -150, 'sort_order' => 12],
            ['project_type' => 'sistema', 'rule_key' => 'asset_referencia', 'label' => 'Sistema ativos: Sistema de referencia', 'amount' => -25, 'sort_order' => 13],
            ['project_type' => 'sistema', 'rule_key' => 'asset_nada', 'label' => 'Sistema ativos: Ainda nao tenho nada', 'amount' => 450, 'sort_order' => 14],

            // Automacao
            ['project_type' => 'automacao', 'rule_key' => 'base', 'label' => 'Automacao valor base', 'amount' => 400, 'sort_order' => 1],
            ['project_type' => 'automacao', 'rule_key' => 'type_sistema_sistema', 'label' => 'Automacao tipo: Sistema x Sistema', 'amount' => 800, 'sort_order' => 2],
            ['project_type' => 'automacao', 'rule_key' => 'type_whatsapp', 'label' => 'Automacao tipo: WhatsApp', 'amount' => 600, 'sort_order' => 3],
            ['project_type' => 'automacao', 'rule_key' => 'type_webhooks', 'label' => 'Automacao tipo: Webhooks', 'amount' => 700, 'sort_order' => 4],
            ['project_type' => 'automacao', 'rule_key' => 'type_outro', 'label' => 'Automacao tipo: Outro', 'amount' => 500, 'sort_order' => 5],
        ];

        DB::table('pricing_rule_items')->insert(array_map(
            static fn (array $item): array => [
                ...$item,
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            $rules,
        ));
    }

    public function down(): void
    {
        Schema::dropIfExists('pricing_rule_items');
        Schema::dropIfExists('pricing_project_settings');
    }
};
