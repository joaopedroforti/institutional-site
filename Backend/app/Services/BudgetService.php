<?php

namespace App\Services;

use App\Models\Budget;
use App\Models\BudgetVersion;
use App\Models\ContactRequest;
use App\Models\ProposalTemplate;
use Illuminate\Support\Str;

class BudgetService
{
    /**
     * @param  array<string, mixed>  $onboarding
     * @param  array<string, mixed>|null  $onboardingInternal
     */
    public function createOrUpdateAutomaticSiteBudget(
        ContactRequest $contact,
        array $onboarding,
        ?array $onboardingInternal = null,
    ): Budget {
        $answers = is_array($onboarding['answers'] ?? null) ? $onboarding['answers'] : [];
        $objectiveValues = $this->extractObjectiveValues($answers['siteObjective'] ?? null);
        $selectedPages = $this->extractStringList($answers['sitePages'] ?? null);
        $siteDeadline = isset($answers['siteDeadline']) ? (string) $answers['siteDeadline'] : null;
        $visualDirection = isset($answers['siteVisual']) ? (string) $answers['siteVisual'] : null;

        $objectiveBaseMap = [
            'apresentar' => 350,
            'leads' => 350,
            'portfolio' => 350,
            'vender' => 2500,
            'agendamento' => 600,
        ];
        $pageAddonsMap = [
            'home' => 0,
            'sobre' => 100,
            'servicos' => 100,
            'portfolio-ou-cases' => 0,
            'depoimentos' => 100,
            'blog-ou-conteudo' => 300,
            'faq' => 50,
            'contato' => 100,
        ];
        $timelineAdjustMap = [
            'urgente' => 200,
            'mes' => 0,
            '30-60' => -50,
            'sem-pressa' => -100,
        ];

        $baseAmount = 0.0;
        foreach ($objectiveValues as $objective) {
            $baseAmount += (float) ($objectiveBaseMap[$objective] ?? 0);
        }

        $addonsAmount = 0.0;
        foreach ($selectedPages as $page) {
            $addonsAmount += (float) ($pageAddonsMap[Str::slug($page)] ?? 0);
        }

        $timelineAdjust = (float) ($timelineAdjustMap[$siteDeadline ?? ''] ?? 0);
        $totalAmount = max(0, $baseAmount + $addonsAmount + $timelineAdjust);
        $entryAmount = round($totalAmount * 0.5, 2);

        $template = ProposalTemplate::query()
            ->where('template_key', 'modelo-site-v1')
            ->first();

        $companyOrName = trim((string) ($contact->company ?: $contact->name));
        $dateSuffix = now()->format('d-m-Y');
        $slugBase = Str::slug($companyOrName.'-'.$dateSuffix);
        $existingBudget = Budget::query()
            ->where('contact_request_id', $contact->id)
            ->where('project_type', 'site')
            ->first();
        $slug = $existingBudget?->slug ?? $this->resolveUniqueSlug($slugBase ?: 'proposta-'.$dateSuffix, $contact->id);
        $identifier = $existingBudget?->identifier ?? $this->resolveIdentifier();

        $internalDays = isset($onboardingInternal['internal_days']) ? (int) $onboardingInternal['internal_days'] : null;
        $internalDueDate = isset($onboardingInternal['expected_due_date']) ? (string) $onboardingInternal['expected_due_date'] : null;
        $deadlineKey = isset($onboardingInternal['selection_key']) ? (string) $onboardingInternal['selection_key'] : $siteDeadline;

        $budgetData = [
                'responsible_user_id' => $contact->assigned_user_id,
                'proposal_template_id' => $template?->id,
                'identifier' => $identifier,
                'slug' => $slug,
                'status' => 'sent',
                'title' => 'Proposta comercial '.($contact->company ?: $contact->name),
                'valid_until' => now()->addDays(15)->toDateString(),
                'internal_due_date' => $internalDueDate,
                'internal_deadline_days' => $internalDays,
                'internal_deadline_key' => $deadlineKey,
                'client_name' => $contact->name,
                'client_company' => $contact->company,
                'client_email' => $contact->email,
                'client_phone' => $contact->phone,
                'objective' => implode(', ', $objectiveValues),
                'visual_direction' => $visualDirection,
                'onboarding_answers' => $answers,
                'selected_pages' => $selectedPages,
                'base_amount' => $baseAmount,
                'addons_amount' => $addonsAmount,
                'timeline_adjustment' => $timelineAdjust,
                'total_amount' => $totalAmount,
                'entry_amount' => $entryAmount,
                'published_at' => now(),
                'metadata' => [
                    'auto_generated' => true,
                    'source' => 'onboarding_submit',
                ],
            ];

        if ($existingBudget) {
            $existingBudget->update($budgetData);
            $budget = $existingBudget->fresh();
        } else {
            $budget = Budget::query()->create([
                'contact_request_id' => $contact->id,
                'project_type' => 'site',
                ...$budgetData,
            ]);
        }

        $metadata = is_array($contact->metadata) ? $contact->metadata : [];
        $metadata['proposal_status'] = 'sent';
        $metadata['proposal_slug'] = $budget->slug;

        $contact->forceFill([
            'deal_value' => $totalAmount,
            'metadata' => $metadata,
        ])->save();

        $this->storeVersionSnapshot($budget, null);

        return $budget;
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

    private function storeVersionSnapshot(Budget $budget, ?int $actorId): void
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
