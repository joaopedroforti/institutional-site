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
    ];

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

    private function readGeneralSettings(): array
    {
        $defaults = [
            'company_name' => 'FortiCorp',
            'contact_email' => 'contato@forticorp.com.br',
            'contact_phone' => '',
            'contact_whatsapp' => '',
            'contact_whatsapp_url' => '',
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
        ];
    }
}
