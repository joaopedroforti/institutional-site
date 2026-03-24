<?php

namespace App\Services;

use App\Models\Budget;
use App\Models\BudgetVersion;
use App\Models\ContactRequest;
use App\Models\PricingProjectSetting;
use App\Models\PricingRuleItem;
use App\Models\ProposalTemplate;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Schema;

class BudgetService
{
    /**
     * @param  array<string, mixed>  $onboarding
     * @param  array<string, mixed>|null  $onboardingInternal
     */
    public function createOrUpdateAutomaticBudget(
        ContactRequest $contact,
        array $onboarding,
        ?array $onboardingInternal = null,
    ): Budget {
        $projectType = (string) ($onboarding['project_type'] ?? 'site');
        $answers = is_array($onboarding['answers'] ?? null) ? $onboarding['answers'] : [];
        $isRequestOnly = $projectType !== 'site';

        $pricingSetting = PricingProjectSetting::query()
            ->where('project_type', $projectType)
            ->first();

        $ruleMap = $this->loadPricingRules($projectType);
        $pricing = $this->calculatePricing($projectType, $answers, $ruleMap);

        $needsValidation = (bool) ($pricingSetting?->requires_admin_validation ?? ($projectType !== 'site'));
        if ($projectType === 'sistema') {
            $aiNeed = (string) ($answers['systemAiNeed'] ?? '');
            $integrationNeed = (string) ($answers['systemIntegrationNeed'] ?? '');
            if ($aiNeed === 'sim' || $integrationNeed === 'sim') {
                $needsValidation = true;
            }
        }

        $isVisibleToSeller = $isRequestOnly ? false : ! $needsValidation;
        $status = $isRequestOnly ? 'request' : ($needsValidation ? 'pending_validation' : 'sent');

        $template = $this->resolveTemplateForProject($projectType);

        $companyOrName = trim((string) ($contact->company ?: $contact->name));
        $dateSuffix = now()->format('d-m-Y');
        $slugBase = Str::slug($companyOrName.'-'.$dateSuffix);
        $existingBudget = Budget::query()
            ->where('contact_request_id', $contact->id)
            ->where('project_type', $projectType)
            ->first();

        $slug = $existingBudget?->slug ?? $this->resolveUniqueSlug($slugBase ?: 'proposta-'.$dateSuffix, $contact->id);
        $identifier = $existingBudget?->identifier ?? $this->resolveIdentifier();

        $internalDays = isset($onboardingInternal['internal_days']) ? (int) $onboardingInternal['internal_days'] : null;
        $internalDueDate = isset($onboardingInternal['expected_due_date']) ? (string) $onboardingInternal['expected_due_date'] : null;
        $deadlineKey = isset($onboardingInternal['selection_key']) ? (string) $onboardingInternal['selection_key'] : null;

        $budgetData = [
            'responsible_user_id' => $contact->assigned_user_id,
            'proposal_template_id' => $template?->id,
            'identifier' => $identifier,
            'slug' => $slug,
            'status' => $status,
            'requires_admin_validation' => $needsValidation,
            'is_visible_to_seller' => $isVisibleToSeller,
            'title' => $isRequestOnly
                ? 'Solicitacao de proposta '.($contact->company ?: $contact->name)
                : 'Proposta comercial '.($contact->company ?: $contact->name),
            'valid_until' => now()->addDays(15)->toDateString(),
            'internal_due_date' => $internalDueDate,
            'internal_deadline_days' => $internalDays,
            'internal_deadline_key' => $deadlineKey,
            'client_name' => $contact->name,
            'client_company' => $contact->company,
            'client_email' => $contact->email,
            'client_phone' => $contact->phone,
            'objective' => $pricing['objective'],
            'visual_direction' => $pricing['visual_direction'],
            'onboarding_answers' => $answers,
            'selected_pages' => $pricing['selected_pages'],
            'base_amount' => $isRequestOnly ? 0 : $pricing['base_amount'],
            'addons_amount' => $isRequestOnly ? 0 : $pricing['addons_amount'],
            'timeline_adjustment' => $isRequestOnly ? 0 : $pricing['timeline_adjustment'],
            'total_amount' => $isRequestOnly ? 0 : $pricing['total_amount'],
            'entry_amount' => $isRequestOnly ? 0 : $pricing['entry_amount'],
            'discount_percent' => 0,
            'discount_amount' => 0,
            'published_at' => $isVisibleToSeller ? now() : null,
            'metadata' => [
                'auto_generated' => true,
                'source' => 'onboarding_submit',
                ...($isRequestOnly ? ['proposal_request_only' => true] : []),
                ...($needsValidation ? ['validation' => 'pending_admin'] : []),
            ],
        ];

        if (Schema::hasColumn('budgets', 'description')) {
            $budgetData['description'] = $isRequestOnly
                ? trim((string) ($answers['systemFeatures'] ?? $answers['automationDescription'] ?? 'Solicitacao recebida via onboarding.'))
                : null;
        }

        if ($existingBudget) {
            $existingBudget->update($budgetData);
            $budget = $existingBudget->fresh();
        } else {
            $budget = Budget::query()->create([
                'contact_request_id' => $contact->id,
                'project_type' => $projectType,
                ...$budgetData,
            ]);
        }

        $contactMetadata = is_array($contact->metadata) ? $contact->metadata : [];
        $contactMetadata['proposal_status'] = $status;

        if ($isVisibleToSeller) {
            $contactMetadata['proposal_slug'] = $budget->slug;
        } else {
            unset($contactMetadata['proposal_slug']);
        }

        $contact->forceFill([
            'deal_value' => $isRequestOnly ? 0 : $pricing['total_amount'],
            'metadata' => $contactMetadata,
        ])->save();

        $this->storeVersionSnapshot($budget, null);

        return $budget;
    }

    /**
     * @param  array<string, mixed>  $answers
     * @param  array<string, float>|null  $ruleMap
     * @return array<string, mixed>
     */
    public function calculatePricing(string $projectType, array $answers, ?array $ruleMap = null): array
    {
      $resolvedRuleMap = $ruleMap ?? $this->loadPricingRules($projectType);

      return match ($projectType) {
          'sistema' => $this->buildSystemPricing($answers, $resolvedRuleMap),
          'automacao' => $this->buildAutomationPricing($answers, $resolvedRuleMap),
          default => $this->buildSitePricing($answers, $resolvedRuleMap),
      };
    }

    /**
     * @return array<string, float>
     */
    public function loadPricingRules(string $projectType): array
    {
        return PricingRuleItem::query()
            ->where('project_type', $projectType)
            ->where('is_active', true)
            ->get()
            ->mapWithKeys(fn (PricingRuleItem $item) => [$item->rule_key => (float) $item->amount])
            ->all();
    }

    public function resolveTemplateForProject(string $projectType): ?ProposalTemplate
    {
        $templateKey = match ($projectType) {
            'sistema' => 'modelo-sistema-v1',
            'automacao' => 'modelo-automacao-v1',
            default => 'modelo-site-v1',
        };

        return ProposalTemplate::query()
            ->where('template_key', $templateKey)
            ->first()
            ?? ProposalTemplate::query()->where('template_key', 'modelo-site-v1')->first();
    }

    /**
     * @param  array<string, mixed>  $answers
     * @param  array<string, float>  $ruleMap
     * @return array<string, mixed>
     */
    private function buildSitePricing(array $answers, array $ruleMap): array
    {
        $objectiveValues = $this->extractObjectiveValues($answers['siteObjective'] ?? null);
        $selectedPages = $this->extractStringList($answers['sitePages'] ?? null);
        $siteDeadline = isset($answers['siteDeadline']) ? (string) $answers['siteDeadline'] : null;
        $visualDirection = isset($answers['siteVisual']) ? (string) $answers['siteVisual'] : null;

        $objectiveRuleMap = [
            'apresentar' => 'objective_apresentar',
            'leads' => 'objective_leads',
            'portfolio' => 'objective_portfolio',
            'vender' => 'objective_vender',
            'agendamento' => 'objective_agendamento',
        ];

        $pageRuleMap = [
            'home' => 'page_home',
            'servicos' => 'page_servicos',
            'sobre' => 'page_sobre',
            'depoimentos' => 'page_depoimentos',
            'blog-ou-conteudo' => 'page_blog',
            'faq' => 'page_faq',
            'contato' => 'page_contato',
        ];

        $deadlineRuleMap = [
            'urgente' => 'deadline_urgente',
            'mes' => 'deadline_mes',
            '30-60' => 'deadline_30_60',
            'sem-pressa' => 'deadline_sem_pressa',
        ];

        $baseAmount = 0.0;
        foreach ($objectiveValues as $objective) {
            $baseAmount += (float) ($ruleMap[$objectiveRuleMap[$objective] ?? ''] ?? 0);
        }

        $addonsAmount = 0.0;
        foreach ($selectedPages as $page) {
            $addonsAmount += (float) ($ruleMap[$pageRuleMap[Str::slug($page)] ?? ''] ?? 0);
        }

        $timelineAdjust = (float) ($ruleMap[$deadlineRuleMap[$siteDeadline ?? ''] ?? ''] ?? 0);
        $totalAmount = max(0, round($baseAmount + $addonsAmount + $timelineAdjust, 2));

        return [
            'objective' => implode(', ', $objectiveValues),
            'visual_direction' => $visualDirection,
            'selected_pages' => $selectedPages,
            'base_amount' => $baseAmount,
            'addons_amount' => $addonsAmount,
            'timeline_adjustment' => $timelineAdjust,
            'total_amount' => $totalAmount,
            'entry_amount' => round($totalAmount * 0.5, 2),
        ];
    }

    /**
     * @param  array<string, mixed>  $answers
     * @param  array<string, float>  $ruleMap
     * @return array<string, mixed>
     */
    private function buildSystemPricing(array $answers, array $ruleMap): array
    {
        $systemType = (string) ($answers['systemType'] ?? '');
        $integrationNeed = (string) ($answers['systemIntegrationNeed'] ?? '');
        $assets = $this->extractStringList($answers['systemAssets'] ?? null);

        $typeRule = $systemType === 'local' ? 'type_local' : 'type_web';

        $baseAmount = (float) ($ruleMap['base'] ?? 0);
        $addonsAmount = (float) ($ruleMap[$typeRule] ?? 0);

        if ($integrationNeed === 'sim') {
            $addonsAmount += (float) ($ruleMap['integration_yes'] ?? 0);
        }

        $assetSlugMap = [
            'conteudo-das-paginas' => 'asset_conteudo',
            'logo' => 'asset_logo',
            'identidade-visual' => 'asset_identidade',
            'sistemas-de-referencia' => 'asset_referencia',
            'ainda-nao-tenho-nada' => 'asset_nada',
        ];

        if (count($assets) === 0) {
            $addonsAmount += (float) ($ruleMap['asset_nada'] ?? 0);
        }

        foreach ($assets as $asset) {
            $addonsAmount += (float) ($ruleMap[$assetSlugMap[Str::slug($asset)] ?? ''] ?? 0);
        }

        $totalAmount = max(0, round($baseAmount + $addonsAmount, 2));

        return [
            'objective' => trim((string) ($answers['systemFeatures'] ?? 'Sistema sob medida')),
            'visual_direction' => null,
            'selected_pages' => [],
            'base_amount' => $baseAmount,
            'addons_amount' => $addonsAmount,
            'timeline_adjustment' => 0,
            'total_amount' => $totalAmount,
            'entry_amount' => round($totalAmount * 0.5, 2),
        ];
    }

    /**
     * @param  array<string, mixed>  $answers
     * @param  array<string, float>  $ruleMap
     * @return array<string, mixed>
     */
    private function buildAutomationPricing(array $answers, array $ruleMap): array
    {
        $automationType = (string) ($answers['automationType'] ?? '');

        $typeRuleMap = [
            'sistema-sistema' => 'type_sistema_sistema',
            'whatsapp' => 'type_whatsapp',
            'webhooks' => 'type_webhooks',
            'outro' => 'type_outro',
        ];

        $baseAmount = (float) ($ruleMap['base'] ?? 0);
        $addonsAmount = (float) ($ruleMap[$typeRuleMap[$automationType] ?? ''] ?? 0);

        $totalAmount = max(0, round($baseAmount + $addonsAmount, 2));

        return [
            'objective' => trim((string) ($answers['automationDescription'] ?? 'Automacao de processo')),
            'visual_direction' => null,
            'selected_pages' => [],
            'base_amount' => $baseAmount,
            'addons_amount' => $addonsAmount,
            'timeline_adjustment' => 0,
            'total_amount' => $totalAmount,
            'entry_amount' => round($totalAmount * 0.5, 2),
        ];
    }

    private function resolveIdentifier(): string
    {
        do {
            $identifier = 'ORC-'.strtoupper(Str::random(8));
        } while (Budget::query()->where('identifier', $identifier)->exists());

        return $identifier;
    }

    private function resolveUniqueSlug(string $base, int $contactId): string
    {
        $slug = $base;
        $index = 1;

        while (
            Budget::query()
                ->where('slug', $slug)
                ->where('contact_request_id', '!=', $contactId)
                ->exists()
        ) {
            $slug = $base.'-'.$index;
            $index++;
        }

        return $slug;
    }

    /**
     * @param  mixed  $value
     * @return array<int, string>
     */
    private function extractObjectiveValues(mixed $value): array
    {
        $list = [];

        if (is_array($value)) {
            $list = $value;
        } elseif (is_string($value) && $value !== '') {
            $list = [$value];
        }

        return collect($list)
            ->map(fn ($item) => (string) $item)
            ->filter()
            ->unique()
            ->values()
            ->all();
    }

    /**
     * @param  mixed  $value
     * @return array<int, string>
     */
    private function extractStringList(mixed $value): array
    {
        if (! is_array($value)) {
            return [];
        }

        return collect($value)
            ->map(fn ($item) => trim((string) $item))
            ->filter()
            ->unique()
            ->values()
            ->all();
    }

    public function storeVersionSnapshot(Budget $budget, ?int $actorId): void
    {
        $nextVersion = ((int) $budget->versions()->max('version_number')) + 1;

        BudgetVersion::query()->create([
            'budget_id' => $budget->id,
            'version_number' => $nextVersion,
            'snapshot' => $budget->toArray(),
            'created_by' => $actorId,
        ]);
    }
}
