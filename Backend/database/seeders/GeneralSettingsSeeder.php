<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class GeneralSettingsSeeder extends Seeder
{
    /**
     * @var array<int, string>
     */
    private const GENERAL_KEYS = [
        'company_name',
        'contact_email',
        'contact_phone',
        'contact_whatsapp',
        'contact_whatsapp_url',
        'contact_address',
        'integrations_settings',
        'lead_score_rules',
        'lead_source_mappings',
    ];

    public function run(): void
    {
        if (! Schema::hasTable('general_settings')) {
            return;
        }

        $companyName = (string) env('SETTINGS_COMPANY_NAME', 'FortiCorp');
        $contactEmail = (string) env('SETTINGS_CONTACT_EMAIL', 'contato@forticorp.com.br');
        $contactPhone = (string) env('SETTINGS_CONTACT_PHONE', '');
        $contactWhatsapp = (string) env('SETTINGS_CONTACT_WHATSAPP', '');
        $contactWhatsappUrl = (string) env('SETTINGS_CONTACT_WHATSAPP_URL', '');
        $contactAddress = (string) env('SETTINGS_CONTACT_ADDRESS', '');

        $integrations = [
            'meta_pixel' => [
                'enabled' => filter_var(env('META_PIXEL_ENABLED', false), FILTER_VALIDATE_BOOL),
                'pixel_id' => trim((string) env('META_PIXEL_ID', '')),
                'automatic_advanced_matching' => filter_var(env('META_PIXEL_AUTO_ADVANCED_MATCHING', false), FILTER_VALIDATE_BOOL),
                'advanced_matching_fields' => [
                    'city_state_zip' => filter_var(env('META_PIXEL_MATCH_CITY_STATE_ZIP', false), FILTER_VALIDATE_BOOL),
                    'country' => filter_var(env('META_PIXEL_MATCH_COUNTRY', false), FILTER_VALIDATE_BOOL),
                    'birth_date' => filter_var(env('META_PIXEL_MATCH_BIRTH_DATE', false), FILTER_VALIDATE_BOOL),
                    'email' => filter_var(env('META_PIXEL_MATCH_EMAIL', true), FILTER_VALIDATE_BOOL),
                    'external_id' => filter_var(env('META_PIXEL_MATCH_EXTERNAL_ID', false), FILTER_VALIDATE_BOOL),
                    'gender' => filter_var(env('META_PIXEL_MATCH_GENDER', false), FILTER_VALIDATE_BOOL),
                    'first_name_last_name' => filter_var(env('META_PIXEL_MATCH_FIRST_LAST_NAME', true), FILTER_VALIDATE_BOOL),
                    'phone' => filter_var(env('META_PIXEL_MATCH_PHONE', true), FILTER_VALIDATE_BOOL),
                ],
                'conversions_api_enabled' => filter_var(env('META_CAPI_ENABLED', false), FILTER_VALIDATE_BOOL),
                'access_token' => trim((string) env('META_CAPI_ACCESS_TOKEN', '')),
                'api_version' => trim((string) env('META_CAPI_API_VERSION', 'v22.0')) ?: 'v22.0',
                'test_event_code' => trim((string) env('META_CAPI_TEST_EVENT_CODE', '')),
            ],
        ];

        $scoreRules = array_replace($this->defaultScoreRules(), $this->envJsonObject('SETTINGS_SCORE_RULES_JSON'));
        $sourceMappings = $this->defaultSourceMappings();
        $sourceMappingsOverride = $this->envJsonObject('SETTINGS_SOURCE_MAPPINGS_JSON');
        if (isset($sourceMappingsOverride['rules']) && is_array($sourceMappingsOverride['rules'])) {
            $sourceMappings['rules'] = $sourceMappingsOverride['rules'];
        }

        $settings = [
            'company_name' => $companyName,
            'contact_email' => $contactEmail,
            'contact_phone' => $contactPhone,
            'contact_whatsapp' => $contactWhatsapp,
            'contact_whatsapp_url' => $contactWhatsappUrl,
            'contact_address' => $contactAddress,
            'integrations_settings' => json_encode($integrations, JSON_UNESCAPED_UNICODE),
            'lead_score_rules' => json_encode($scoreRules, JSON_UNESCAPED_UNICODE),
            'lead_source_mappings' => json_encode($sourceMappings, JSON_UNESCAPED_UNICODE),
        ];

        $now = now();

        foreach (self::GENERAL_KEYS as $key) {
            $value = (string) ($settings[$key] ?? '');
            DB::table('general_settings')->updateOrInsert(
                ['setting_key' => $key],
                [
                    'setting_value' => $value,
                    'created_at' => $now,
                    'updated_at' => $now,
                ],
            );
        }

        $this->seedOnboardingDeadlines();
        $this->seedLeadDistributionSettings();
        $this->seedPricingSettings();
        $this->seedWhatsAppSettings();
    }

    private function seedOnboardingDeadlines(): void
    {
        if (! Schema::hasTable('onboarding_deadline_settings')) {
            return;
        }

        $defaults = [
            'urgente' => 4,
            'mes' => 20,
            '30-60' => 40,
            'sem-pressa' => 100,
        ];

        $overrides = $this->envJsonObject('SETTINGS_ONBOARDING_DEADLINES_JSON');
        foreach ($overrides as $key => $value) {
            if (array_key_exists($key, $defaults) && is_numeric($value)) {
                $defaults[$key] = max(1, (int) $value);
            }
        }

        foreach ($defaults as $optionKey => $days) {
            DB::table('onboarding_deadline_settings')->updateOrInsert(
                ['option_key' => $optionKey],
                [
                    'label' => match ($optionKey) {
                        'urgente' => 'Urgente',
                        'mes' => 'Ainda este mes',
                        '30-60' => 'Entre 30 e 60 dias',
                        default => 'Sem pressa',
                    },
                    'internal_days' => $days,
                    'updated_at' => now(),
                    'created_at' => now(),
                ],
            );
        }
    }

    private function seedLeadDistributionSettings(): void
    {
        if (! Schema::hasTable('lead_distribution_settings')) {
            return;
        }

        $fallbackUserIdRaw = env('SETTINGS_DISTRIBUTION_FALLBACK_USER_ID');
        $fallbackUserId = null;
        if ($fallbackUserIdRaw !== null && $fallbackUserIdRaw !== '') {
            $parsed = (int) $fallbackUserIdRaw;
            $fallbackUserId = $parsed > 0 ? $parsed : null;
        }

        DB::table('lead_distribution_settings')->updateOrInsert(
            ['id' => 1],
            [
                'is_enabled' => filter_var(env('SETTINGS_DISTRIBUTION_ENABLED', true), FILTER_VALIDATE_BOOL),
                'fallback_rule' => (string) env('SETTINGS_DISTRIBUTION_FALLBACK_RULE', 'unassigned'),
                'fallback_user_id' => $fallbackUserId,
                'current_index' => (int) env('SETTINGS_DISTRIBUTION_CURRENT_INDEX', 0),
                'queue_hash' => null,
                'updated_at' => now(),
                'created_at' => now(),
            ],
        );
    }

    private function seedPricingSettings(): void
    {
        if (! Schema::hasTable('pricing_project_settings') || ! Schema::hasTable('pricing_rule_items')) {
            return;
        }

        $projectSettings = $this->defaultPricingProjectSettings();
        $projectSettingsOverride = $this->envJsonArray('SETTINGS_PRICING_PROJECT_SETTINGS_JSON');
        if ($projectSettingsOverride !== []) {
            $projectSettings = $projectSettingsOverride;
        }

        foreach ($projectSettings as $setting) {
            if (! is_array($setting) || ! isset($setting['project_type'])) {
                continue;
            }

            DB::table('pricing_project_settings')->updateOrInsert(
                ['project_type' => (string) $setting['project_type']],
                [
                    'max_discount_percent' => (float) ($setting['max_discount_percent'] ?? 40),
                    'requires_admin_validation' => (bool) ($setting['requires_admin_validation'] ?? false),
                    'updated_at' => now(),
                    'created_at' => now(),
                ],
            );
        }

        $rules = $this->defaultPricingRules();
        $rulesOverride = $this->envJsonArray('SETTINGS_PRICING_RULE_ITEMS_JSON');
        if ($rulesOverride !== []) {
            $rules = $rulesOverride;
        }

        foreach ($rules as $rule) {
            if (! is_array($rule) || ! isset($rule['project_type'], $rule['rule_key'])) {
                continue;
            }

            DB::table('pricing_rule_items')->updateOrInsert(
                [
                    'project_type' => (string) $rule['project_type'],
                    'rule_key' => (string) $rule['rule_key'],
                ],
                [
                    'label' => (string) ($rule['label'] ?? ''),
                    'amount' => (float) ($rule['amount'] ?? 0),
                    'sort_order' => (int) ($rule['sort_order'] ?? 0),
                    'is_active' => (bool) ($rule['is_active'] ?? true),
                    'updated_at' => now(),
                    'created_at' => now(),
                ],
            );
        }
    }

    private function seedWhatsAppSettings(): void
    {
        if (! Schema::hasTable('whatsapp_settings') || ! Schema::hasTable('whatsapp_instances')) {
            return;
        }

        $instance = DB::table('whatsapp_instances')->orderBy('id')->first();
        if (! $instance) {
            return;
        }

        $signMessages = filter_var(env('WHATSAPP_SIGN_MESSAGES', false), FILTER_VALIDATE_BOOL);
        $configJson = [
            'realtime_mode' => (string) env('EVOLUTION_REALTIME_MODE', 'polling'),
            'polling_interval' => (int) env('EVOLUTION_POLLING_INTERVAL', 10),
        ];

        DB::table('whatsapp_settings')->updateOrInsert(
            ['whatsapp_instance_id' => (int) $instance->id],
            [
                'sign_messages' => $signMessages,
                'config_json' => json_encode($configJson, JSON_UNESCAPED_UNICODE),
                'updated_at' => now(),
                'created_at' => now(),
            ],
        );

        DB::table('whatsapp_instances')
            ->where('id', (int) $instance->id)
            ->update([
                'sign_messages' => $signMessages,
                'updated_at' => now(),
            ]);
    }

    /**
     * @return array<string, int|string>
     */
    private function defaultScoreRules(): array
    {
        return [
            'utm_source_bonus' => 10,
            'page_view_weight' => 2,
            'page_view_cap' => 20,
            'contact_page_bonus' => 15,
            'proposal_access_weight' => 15,
            'proposal_access_cap' => 30,
            'returned_after_proposal_bonus' => 10,
            'form_submit_weight' => 10,
            'form_submit_cap' => 20,
            'whatsapp_click_weight' => 8,
            'whatsapp_click_cap' => 16,
            'cta_click_weight' => 4,
            'cta_click_cap' => 12,
            'whatsapp_form_weight' => 10,
            'whatsapp_form_cap' => 20,
            'onboarding_deadline_bonus_cap' => 20,
            'low_activity_penalty' => 5,
            'hot_min_score' => 70,
            'warm_min_score' => 35,
            'draft_max_score' => 12,
            'draft_score_band' => 'cold',
            'inbound_whatsapp_score' => 80,
            'inbound_whatsapp_band' => 'hot',
        ];
    }

    /**
     * @return array{rules: array<int, array<string, mixed>>}
     */
    private function defaultSourceMappings(): array
    {
        return [
            'rules' => [
                ['contains' => 'whatsapp:inbound', 'label' => 'WhatsApp Direto', 'priority' => 100, 'is_active' => true],
                ['contains' => 'whatsapp', 'label' => 'Botao WhatsApp', 'priority' => 80, 'is_active' => true],
                ['contains' => 'zap', 'label' => 'Botao WhatsApp', 'priority' => 75, 'is_active' => true],
                ['contains' => 'wa.me', 'label' => 'Botao WhatsApp', 'priority' => 75, 'is_active' => true],
                ['contains' => 'contato', 'label' => 'Formulario de contato', 'priority' => 70, 'is_active' => true],
                ['contains' => 'contact', 'label' => 'Formulario de contato', 'priority' => 70, 'is_active' => true],
                ['contains' => 'onboarding', 'label' => 'Formulario onboarding', 'priority' => 60, 'is_active' => true],
            ],
        ];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function defaultPricingProjectSettings(): array
    {
        return [
            ['project_type' => 'site', 'max_discount_percent' => 40, 'requires_admin_validation' => false],
            ['project_type' => 'sistema', 'max_discount_percent' => 40, 'requires_admin_validation' => true],
            ['project_type' => 'automacao', 'max_discount_percent' => 40, 'requires_admin_validation' => true],
        ];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function defaultPricingRules(): array
    {
        return [
            ['project_type' => 'site', 'rule_key' => 'objective_apresentar', 'label' => 'Site objetivo: Apresentar minha empresa', 'amount' => 350, 'sort_order' => 1, 'is_active' => true],
            ['project_type' => 'site', 'rule_key' => 'objective_leads', 'label' => 'Site objetivo: Gerar leads', 'amount' => 350, 'sort_order' => 2, 'is_active' => true],
            ['project_type' => 'site', 'rule_key' => 'objective_portfolio', 'label' => 'Site objetivo: Mostrar portifolio', 'amount' => 350, 'sort_order' => 3, 'is_active' => true],
            ['project_type' => 'site', 'rule_key' => 'objective_vender', 'label' => 'Site objetivo: Vender online', 'amount' => 2500, 'sort_order' => 4, 'is_active' => true],
            ['project_type' => 'site', 'rule_key' => 'objective_agendamento', 'label' => 'Site objetivo: Receber agendamentos', 'amount' => 600, 'sort_order' => 5, 'is_active' => true],
            ['project_type' => 'site', 'rule_key' => 'page_home', 'label' => 'Site pagina: Home', 'amount' => 0, 'sort_order' => 10, 'is_active' => true],
            ['project_type' => 'site', 'rule_key' => 'page_servicos', 'label' => 'Site pagina: Servicos', 'amount' => 100, 'sort_order' => 11, 'is_active' => true],
            ['project_type' => 'site', 'rule_key' => 'page_sobre', 'label' => 'Site pagina: Sobre', 'amount' => 100, 'sort_order' => 12, 'is_active' => true],
            ['project_type' => 'site', 'rule_key' => 'page_depoimentos', 'label' => 'Site pagina: Depoimentos', 'amount' => 100, 'sort_order' => 13, 'is_active' => true],
            ['project_type' => 'site', 'rule_key' => 'page_blog', 'label' => 'Site pagina: Blog ou Conteudo', 'amount' => 300, 'sort_order' => 14, 'is_active' => true],
            ['project_type' => 'site', 'rule_key' => 'page_faq', 'label' => 'Site pagina: FAQ', 'amount' => 50, 'sort_order' => 15, 'is_active' => true],
            ['project_type' => 'site', 'rule_key' => 'page_contato', 'label' => 'Site pagina: Contato', 'amount' => 100, 'sort_order' => 16, 'is_active' => true],
            ['project_type' => 'site', 'rule_key' => 'deadline_urgente', 'label' => 'Site prazo: Urgente', 'amount' => 200, 'sort_order' => 20, 'is_active' => true],
            ['project_type' => 'site', 'rule_key' => 'deadline_mes', 'label' => 'Site prazo: Ainda este mes', 'amount' => 0, 'sort_order' => 21, 'is_active' => true],
            ['project_type' => 'site', 'rule_key' => 'deadline_30_60', 'label' => 'Site prazo: Entre 30 e 60 dias', 'amount' => -50, 'sort_order' => 22, 'is_active' => true],
            ['project_type' => 'site', 'rule_key' => 'deadline_sem_pressa', 'label' => 'Site prazo: Sem pressa', 'amount' => -100, 'sort_order' => 23, 'is_active' => true],
            ['project_type' => 'sistema', 'rule_key' => 'base', 'label' => 'Sistema valor base', 'amount' => 400, 'sort_order' => 1, 'is_active' => true],
            ['project_type' => 'sistema', 'rule_key' => 'type_web', 'label' => 'Sistema tipo: Web', 'amount' => 2500, 'sort_order' => 2, 'is_active' => true],
            ['project_type' => 'sistema', 'rule_key' => 'type_local', 'label' => 'Sistema tipo: Local', 'amount' => 4500, 'sort_order' => 3, 'is_active' => true],
            ['project_type' => 'sistema', 'rule_key' => 'integration_yes', 'label' => 'Sistema integracao: Sim (acrescimo)', 'amount' => 100, 'sort_order' => 4, 'is_active' => true],
            ['project_type' => 'sistema', 'rule_key' => 'asset_conteudo', 'label' => 'Sistema ativos: Conteudo das paginas', 'amount' => -50, 'sort_order' => 10, 'is_active' => true],
            ['project_type' => 'sistema', 'rule_key' => 'asset_logo', 'label' => 'Sistema ativos: Logo', 'amount' => -50, 'sort_order' => 11, 'is_active' => true],
            ['project_type' => 'sistema', 'rule_key' => 'asset_identidade', 'label' => 'Sistema ativos: Identidade visual', 'amount' => -150, 'sort_order' => 12, 'is_active' => true],
            ['project_type' => 'sistema', 'rule_key' => 'asset_referencia', 'label' => 'Sistema ativos: Sistema de referencia', 'amount' => -25, 'sort_order' => 13, 'is_active' => true],
            ['project_type' => 'sistema', 'rule_key' => 'asset_nada', 'label' => 'Sistema ativos: Ainda nao tenho nada', 'amount' => 450, 'sort_order' => 14, 'is_active' => true],
            ['project_type' => 'automacao', 'rule_key' => 'base', 'label' => 'Automacao valor base', 'amount' => 400, 'sort_order' => 1, 'is_active' => true],
            ['project_type' => 'automacao', 'rule_key' => 'type_sistema_sistema', 'label' => 'Automacao tipo: Sistema x Sistema', 'amount' => 800, 'sort_order' => 2, 'is_active' => true],
            ['project_type' => 'automacao', 'rule_key' => 'type_whatsapp', 'label' => 'Automacao tipo: WhatsApp', 'amount' => 600, 'sort_order' => 3, 'is_active' => true],
            ['project_type' => 'automacao', 'rule_key' => 'type_webhooks', 'label' => 'Automacao tipo: Webhooks', 'amount' => 700, 'sort_order' => 4, 'is_active' => true],
            ['project_type' => 'automacao', 'rule_key' => 'type_outro', 'label' => 'Automacao tipo: Outro', 'amount' => 500, 'sort_order' => 5, 'is_active' => true],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function envJsonObject(string $key): array
    {
        $raw = env($key);
        if (! is_string($raw) || trim($raw) === '') {
            return [];
        }

        $decoded = json_decode($raw, true);
        return is_array($decoded) ? $decoded : [];
    }

    /**
     * @return array<int, mixed>
     */
    private function envJsonArray(string $key): array
    {
        $decoded = $this->envJsonObject($key);
        if ($decoded === []) {
            $raw = env($key);
            if (! is_string($raw) || trim($raw) === '') {
                return [];
            }

            $arrayDecoded = json_decode($raw, true);
            return is_array($arrayDecoded) && array_is_list($arrayDecoded) ? $arrayDecoded : [];
        }

        return array_is_list($decoded) ? $decoded : [];
    }
}
