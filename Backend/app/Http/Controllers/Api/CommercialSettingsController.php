<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PricingProjectSetting;
use App\Models\PricingRuleItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class CommercialSettingsController extends Controller
{
    private const GENERAL_SETTING_KEYS = [
        'company_name',
        'contact_email',
        'contact_phone',
        'contact_whatsapp',
        'contact_whatsapp_url',
        'contact_address',
    ];
    private const SCORE_RULES_KEY = 'lead_score_rules';
    private const SOURCE_MAPPINGS_KEY = 'lead_source_mappings';

    public function publicGeneralSettings(): JsonResponse
    {
        return response()->json([
            'data' => $this->readGeneralSettings(),
        ]);
    }

    public function generalSettings(): JsonResponse
    {
        return response()->json([
            'data' => $this->readGeneralSettings(),
        ]);
    }

    public function updateGeneralSettings(Request $request): JsonResponse
    {
        if (! Schema::hasTable('general_settings')) {
            return response()->json([
                'message' => 'Tabela de configuracoes gerais ainda nao disponivel.',
            ], 422);
        }

        $payload = $request->validate([
            'company_name' => ['required', 'string', 'max:120'],
            'contact_email' => ['required', 'email', 'max:190'],
            'contact_phone' => ['nullable', 'string', 'max:40'],
            'contact_whatsapp' => ['nullable', 'string', 'max:40'],
            'contact_whatsapp_url' => ['nullable', 'url', 'max:220'],
            'contact_address' => ['nullable', 'string', 'max:255'],
        ]);

        DB::transaction(function () use ($payload): void {
            foreach (self::GENERAL_SETTING_KEYS as $key) {
                DB::table('general_settings')->updateOrInsert(
                    ['setting_key' => $key],
                    [
                        'setting_value' => trim((string) ($payload[$key] ?? '')),
                        'updated_at' => now(),
                        'created_at' => now(),
                    ],
                );
            }
        });

        return response()->json([
            'message' => 'Configuracoes gerais atualizadas.',
            'data' => $this->readGeneralSettings(),
        ]);
    }

    public function proposalSettings(): JsonResponse
    {
        $onboardingDeadlines = Schema::hasTable('onboarding_deadline_settings')
            ? DB::table('onboarding_deadline_settings')
                ->orderByRaw("case option_key when 'urgente' then 1 when 'mes' then 2 when '30-60' then 3 when 'sem-pressa' then 4 else 99 end")
                ->get()
            : collect();

        return response()->json([
            'data' => [
                'onboarding_deadlines' => $onboardingDeadlines,
            ],
        ]);
    }

    public function updateProposalDeadlines(Request $request): JsonResponse
    {
        if (! Schema::hasTable('onboarding_deadline_settings')) {
            return response()->json([
                'message' => 'Tabela de prazos internos ainda nao disponivel.',
            ], 422);
        }

        $payload = $request->validate([
            'deadlines' => ['required', 'array', 'min:1'],
            'deadlines.*.option_key' => ['required', 'string', 'in:urgente,mes,30-60,sem-pressa'],
            'deadlines.*.internal_days' => ['required', 'integer', 'min:1', 'max:365'],
        ]);

        DB::transaction(function () use ($payload): void {
            foreach ($payload['deadlines'] as $deadline) {
                DB::table('onboarding_deadline_settings')
                    ->where('option_key', $deadline['option_key'])
                    ->update([
                        'internal_days' => (int) $deadline['internal_days'],
                        'updated_at' => now(),
                    ]);
            }
        });

        return response()->json([
            'message' => 'Prazos internos do onboarding atualizados.',
        ]);
    }

    public function pricingSettings(): JsonResponse
    {
        $projectSettings = PricingProjectSetting::query()
            ->orderBy('project_type')
            ->get();

        $rules = PricingRuleItem::query()
            ->orderBy('project_type')
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get()
            ->groupBy('project_type');

        return response()->json([
            'data' => [
                'project_settings' => $projectSettings,
                'rules' => $rules,
            ],
        ]);
    }

    public function updatePricingSettings(Request $request): JsonResponse
    {
        $payload = $request->validate([
            'project_settings' => ['required', 'array', 'min:1'],
            'project_settings.*.project_type' => ['required', 'string', 'in:site,sistema,automacao'],
            'project_settings.*.max_discount_percent' => ['required', 'numeric', 'min:0', 'max:100'],
            'project_settings.*.requires_admin_validation' => ['required', 'boolean'],
            'rules' => ['required', 'array', 'min:1'],
            'rules.*.project_type' => ['required', 'string', 'in:site,sistema,automacao'],
            'rules.*.rule_key' => ['required', 'string', 'max:80'],
            'rules.*.label' => ['required', 'string', 'max:180'],
            'rules.*.amount' => ['required', 'numeric', 'min:-999999', 'max:999999'],
            'rules.*.sort_order' => ['nullable', 'integer', 'min:0', 'max:9999'],
            'rules.*.is_active' => ['nullable', 'boolean'],
        ]);

        DB::transaction(function () use ($payload): void {
            foreach ($payload['project_settings'] as $setting) {
                PricingProjectSetting::query()->updateOrCreate(
                    ['project_type' => $setting['project_type']],
                    [
                        'max_discount_percent' => (float) $setting['max_discount_percent'],
                        'requires_admin_validation' => (bool) $setting['requires_admin_validation'],
                    ],
                );
            }

            foreach ($payload['rules'] as $rule) {
                PricingRuleItem::query()->updateOrCreate(
                    [
                        'project_type' => $rule['project_type'],
                        'rule_key' => $rule['rule_key'],
                    ],
                    [
                        'label' => trim($rule['label']),
                        'amount' => (float) $rule['amount'],
                        'sort_order' => (int) ($rule['sort_order'] ?? 0),
                        'is_active' => (bool) ($rule['is_active'] ?? true),
                    ],
                );
            }
        });

        return response()->json([
            'message' => 'Configuracoes de precificacao atualizadas.',
        ]);
    }

    public function scoreRules(): JsonResponse
    {
        return response()->json([
            'data' => $this->readJsonSetting(self::SCORE_RULES_KEY, $this->defaultScoreRules()),
        ]);
    }

    public function updateScoreRules(Request $request): JsonResponse
    {
        $payload = $request->validate([
            'utm_source_bonus' => ['required', 'integer', 'min:0', 'max:200'],
            'page_view_weight' => ['required', 'integer', 'min:0', 'max:100'],
            'page_view_cap' => ['required', 'integer', 'min:0', 'max:500'],
            'contact_page_bonus' => ['required', 'integer', 'min:0', 'max:200'],
            'proposal_access_weight' => ['required', 'integer', 'min:0', 'max:200'],
            'proposal_access_cap' => ['required', 'integer', 'min:0', 'max:500'],
            'returned_after_proposal_bonus' => ['required', 'integer', 'min:0', 'max:300'],
            'form_submit_weight' => ['required', 'integer', 'min:0', 'max:200'],
            'form_submit_cap' => ['required', 'integer', 'min:0', 'max:500'],
            'whatsapp_click_weight' => ['required', 'integer', 'min:0', 'max:200'],
            'whatsapp_click_cap' => ['required', 'integer', 'min:0', 'max:500'],
            'cta_click_weight' => ['required', 'integer', 'min:0', 'max:200'],
            'cta_click_cap' => ['required', 'integer', 'min:0', 'max:500'],
            'whatsapp_form_weight' => ['required', 'integer', 'min:0', 'max:200'],
            'whatsapp_form_cap' => ['required', 'integer', 'min:0', 'max:500'],
            'onboarding_deadline_bonus_cap' => ['required', 'integer', 'min:0', 'max:200'],
            'low_activity_penalty' => ['required', 'integer', 'min:0', 'max:200'],
            'hot_min_score' => ['required', 'integer', 'min:0', 'max:1000'],
            'warm_min_score' => ['required', 'integer', 'min:0', 'max:1000'],
            'draft_max_score' => ['required', 'integer', 'min:0', 'max:1000'],
            'draft_score_band' => ['required', 'string', 'in:hot,warm,cold'],
            'inbound_whatsapp_score' => ['required', 'integer', 'min:0', 'max:1000'],
            'inbound_whatsapp_band' => ['required', 'string', 'in:hot,warm,cold'],
        ]);

        if ((int) $payload['warm_min_score'] > (int) $payload['hot_min_score']) {
            return response()->json([
                'message' => 'Warm nao pode ser maior que Hot.',
                'errors' => [
                    'warm_min_score' => ['Warm nao pode ser maior que Hot.'],
                ],
            ], 422);
        }

        $saved = $this->writeJsonSetting(self::SCORE_RULES_KEY, $payload);

        return response()->json([
            'message' => 'Regras de score atualizadas.',
            'data' => $saved,
        ]);
    }

    public function sourceMappings(): JsonResponse
    {
        return response()->json([
            'data' => $this->readJsonSetting(self::SOURCE_MAPPINGS_KEY, $this->defaultSourceMappings()),
        ]);
    }

    public function updateSourceMappings(Request $request): JsonResponse
    {
        $payload = $request->validate([
            'rules' => ['required', 'array', 'min:1'],
            'rules.*.contains' => ['required', 'string', 'max:80'],
            'rules.*.label' => ['required', 'string', 'max:80'],
            'rules.*.priority' => ['required', 'integer', 'min:0', 'max:999'],
            'rules.*.is_active' => ['required', 'boolean'],
        ]);

        $normalized = [
            'rules' => collect($payload['rules'])
                ->map(fn (array $item) => [
                    'contains' => strtolower(trim((string) ($item['contains'] ?? ''))),
                    'label' => trim((string) ($item['label'] ?? '')),
                    'priority' => (int) ($item['priority'] ?? 0),
                    'is_active' => (bool) ($item['is_active'] ?? true),
                ])
                ->filter(fn (array $item) => $item['contains'] !== '' && $item['label'] !== '')
                ->sortByDesc('priority')
                ->values()
                ->all(),
        ];

        $saved = $this->writeJsonSetting(self::SOURCE_MAPPINGS_KEY, $normalized);

        return response()->json([
            'message' => 'Mapeamentos de origem atualizados.',
            'data' => $saved,
        ]);
    }

    private function readGeneralSettings(): array
    {
        $defaults = [
            'company_name' => 'FortiCorp',
            'contact_email' => 'contato@forticorp.com.br',
            'contact_phone' => '',
            'contact_whatsapp' => '',
            'contact_whatsapp_url' => '',
            'contact_address' => '',
        ];

        if (! Schema::hasTable('general_settings')) {
            return $defaults;
        }

        $rows = DB::table('general_settings')
            ->whereIn('setting_key', self::GENERAL_SETTING_KEYS)
            ->pluck('setting_value', 'setting_key')
            ->toArray();

        return [
            'company_name' => (string) ($rows['company_name'] ?? $defaults['company_name']),
            'contact_email' => (string) ($rows['contact_email'] ?? $defaults['contact_email']),
            'contact_phone' => (string) ($rows['contact_phone'] ?? $defaults['contact_phone']),
            'contact_whatsapp' => (string) ($rows['contact_whatsapp'] ?? $defaults['contact_whatsapp']),
            'contact_whatsapp_url' => (string) ($rows['contact_whatsapp_url'] ?? $defaults['contact_whatsapp_url']),
            'contact_address' => (string) ($rows['contact_address'] ?? $defaults['contact_address']),
        ];
    }

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

    private function readJsonSetting(string $key, array $defaults): array
    {
        if (! Schema::hasTable('general_settings')) {
            return $defaults;
        }

        $raw = DB::table('general_settings')
            ->where('setting_key', $key)
            ->value('setting_value');

        if (! is_string($raw) || trim($raw) === '') {
            return $defaults;
        }

        $decoded = json_decode($raw, true);
        if (! is_array($decoded)) {
            return $defaults;
        }

        if ($this->isAssoc($defaults)) {
            return array_replace_recursive($defaults, $decoded);
        }

        return $decoded;
    }

    private function writeJsonSetting(string $key, array $payload): array
    {
        DB::table('general_settings')->updateOrInsert(
            ['setting_key' => $key],
            [
                'setting_value' => json_encode($payload, JSON_UNESCAPED_UNICODE),
                'updated_at' => now(),
                'created_at' => now(),
            ],
        );

        return $payload;
    }

    private function isAssoc(array $value): bool
    {
        if ($value === []) {
            return false;
        }

        return array_keys($value) !== range(0, count($value) - 1);
    }
}
