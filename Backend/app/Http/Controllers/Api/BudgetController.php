<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AdminNotification;
use App\Models\Budget;
use App\Models\ContactRequest;
use App\Models\LeadKanbanColumn;
use App\Models\PricingProjectSetting;
use App\Services\BudgetService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Schema;

class BudgetController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $isAdmin = (bool) ($user?->is_admin || $user?->is_super_admin);

        $budgetsQuery = Budget::query()
            ->with(['contact', 'responsibleUser', 'template', 'adminValidator'])
            ->orderByDesc('updated_at');

        if (! $isAdmin) {
            $budgetsQuery->where('is_visible_to_seller', true);
        }

        $budgets = $budgetsQuery->get();

        $notifications = $isAdmin
            ? AdminNotification::query()
                ->where('type', 'proposal_adjustment')
                ->where('is_read', false)
                ->orderByDesc('created_at')
                ->limit(20)
                ->get()
            : collect();

        $pricingSettings = PricingProjectSetting::query()
            ->orderBy('project_type')
            ->get()
            ->mapWithKeys(fn (PricingProjectSetting $setting) => [
                $setting->project_type => [
                    'max_discount_percent' => (float) $setting->max_discount_percent,
                    'requires_admin_validation' => (bool) $setting->requires_admin_validation,
                ],
            ]);

        return response()->json([
            'data' => [
                'budgets' => $budgets,
                'notifications' => $notifications,
                'pricing_settings' => $pricingSettings,
            ],
        ]);
    }

    public function markNotificationAsRead(AdminNotification $adminNotification): JsonResponse
    {
        $adminNotification->forceFill([
            'is_read' => true,
            'read_at' => now(),
        ])->save();

        return response()->json([
            'message' => 'Notificacao marcada como lida.',
        ]);
    }

    public function updatePendingBudget(Request $request, Budget $budget): JsonResponse
    {
        $payload = $request->validate([
            'total_amount' => ['required', 'numeric', 'min:0.01'],
            'internal_deadline_days' => ['required', 'integer', 'min:1', 'max:365'],
        ]);

        if ($budget->status !== 'pending_validation') {
            return response()->json([
                'message' => 'Somente propostas pendentes de validacao podem ser ajustadas.',
            ], 422);
        }

        if ($budget->status === 'approved') {
            return response()->json([
                'message' => 'Proposta aprovada nao pode mais ser alterada.',
            ], 422);
        }

        if ($budget->status === 'pending_validation') {
            $totalAmount = (float) ($payload['total_amount'] ?? 0);
            $deadlineDays = (int) ($payload['internal_deadline_days'] ?? 0);

            if ($totalAmount <= 0 || $deadlineDays <= 0) {
                return response()->json([
                    'message' => 'Preencha valor total e prazo interno validos antes de liberar para vendedor.',
                ], 422);
            }
        }

        $totalAmount = round((float) $payload['total_amount'], 2);
        $entryAmount = round($totalAmount * 0.5, 2);

        $budget->forceFill([
            'base_amount' => $totalAmount,
            'addons_amount' => 0,
            'timeline_adjustment' => 0,
            'total_amount' => $totalAmount,
            'entry_amount' => $entryAmount,
            'discount_percent' => 0,
            'discount_amount' => 0,
            'internal_deadline_days' => (int) $payload['internal_deadline_days'],
        ])->save();

        if ($budget->contact) {
            $budget->contact->forceFill([
                'deal_value' => $totalAmount,
            ])->save();
        }

        return response()->json([
            'message' => 'Valores da proposta atualizados com sucesso.',
            'data' => $budget->fresh(['contact', 'responsibleUser', 'template', 'adminValidator']),
        ]);
    }

    public function validateBudget(Request $request, Budget $budget): JsonResponse
    {
        $user = $request->user();
        $isAdmin = (bool) ($user?->is_admin || $user?->is_super_admin);

        if (! $isAdmin) {
            return response()->json([
                'message' => 'Somente administradores podem validar orcamentos pendentes.',
            ], 403);
        }

        if ($budget->status === 'approved') {
            return response()->json([
                'message' => 'Proposta aprovada nao pode mais ser alterada.',
            ], 422);
        }

        $budget->forceFill([
            'status' => $budget->status === 'pending_validation' ? 'sent' : $budget->status,
            'is_visible_to_seller' => true,
            'admin_validated_at' => now(),
            'admin_validated_by' => $user?->id,
            'published_at' => $budget->published_at ?? now(),
        ])->save();

        if ($budget->contact) {
            $metadata = is_array($budget->contact->metadata) ? $budget->contact->metadata : [];
            $metadata['proposal_status'] = 'sent';
            $metadata['proposal_slug'] = $budget->slug;

            $budget->contact->forceFill([
                'deal_value' => (float) $budget->total_amount,
                'metadata' => $metadata,
            ])->save();
        }

        return response()->json([
            'message' => 'Orcamento validado e liberado para vendedor.',
            'data' => $budget->fresh(['contact', 'responsibleUser', 'template', 'adminValidator']),
        ]);
    }

    public function applyDiscount(Request $request, Budget $budget, BudgetService $budgetService): JsonResponse
    {
        $payload = $request->validate([
            'discount_percent' => ['required', 'numeric', 'min:0', 'max:100'],
        ]);

        $user = $request->user();
        $isAdmin = (bool) ($user?->is_admin || $user?->is_super_admin);

        if (! $isAdmin && ! $budget->is_visible_to_seller) {
            return response()->json([
                'message' => 'Este orcamento ainda nao esta liberado para vendedores.',
            ], 403);
        }

        if ($budget->status === 'approved') {
            return response()->json([
                'message' => 'Proposta aprovada nao pode mais receber desconto.',
            ], 422);
        }

        $pricing = PricingProjectSetting::query()
            ->where('project_type', $budget->project_type)
            ->first();

        $maxPercent = (float) ($pricing?->max_discount_percent ?? 0);
        $requestedPercent = round((float) $payload['discount_percent'], 2);

        if ($requestedPercent > $maxPercent) {
            return response()->json([
                'message' => 'Desconto acima do limite autorizado para este tipo de projeto.',
            ], 422);
        }

        $baseAmount = (float) $budget->base_amount;
        $discountAmount = round($baseAmount * ($requestedPercent / 100), 2);
        $newTotal = max(0, round($baseAmount - $discountAmount, 2));
        $newEntry = round($newTotal * 0.5, 2);

        $metadata = is_array($budget->metadata) ? $budget->metadata : [];
        $metadata['discount'] = [
            'percent' => $requestedPercent,
            'amount' => $discountAmount,
            'applied_by' => $user?->id,
            'applied_at' => now()->toIso8601String(),
        ];

        $budget->forceFill([
            'total_amount' => $newTotal,
            'entry_amount' => $newEntry,
            'discount_percent' => $requestedPercent,
            'discount_amount' => $discountAmount,
            'metadata' => $metadata,
        ])->save();

        if ($budget->contact) {
            $budget->contact->forceFill([
                'deal_value' => $newTotal,
            ])->save();
        }

        $budgetService->storeVersionSnapshot($budget, $user?->id);

        return response()->json([
            'message' => 'Desconto aplicado com sucesso.',
            'data' => $budget->fresh(['contact', 'responsibleUser', 'template', 'adminValidator']),
        ]);
    }

    public function generateFromRequest(Request $request, Budget $budget, BudgetService $budgetService): JsonResponse
    {
        $payload = $request->validate([
            'title' => ['required', 'string', 'max:220'],
            'description' => ['nullable', 'string', 'max:10000'],
            'answers' => ['nullable', 'array'],
            'valid_until' => ['nullable', 'date'],
            'internal_deadline_days' => ['nullable', 'integer', 'min:1', 'max:365'],
            'total_amount' => ['nullable', 'numeric', 'min:0'],
        ]);

        $answers = is_array($payload['answers'] ?? null)
            ? $payload['answers']
            : (is_array($budget->onboarding_answers) ? $budget->onboarding_answers : []);

        $projectType = (string) $budget->project_type;

        if ($projectType !== 'site' && ! isset($payload['total_amount'])) {
            return response()->json([
                'message' => 'Para sistema ou automacao, informe o valor total para gerar a proposta.',
            ], 422);
        }

        $pricingSetting = PricingProjectSetting::query()
            ->where('project_type', $projectType)
            ->first();

        $requiresValidation = (bool) ($pricingSetting?->requires_admin_validation ?? ($projectType !== 'site'));

        $pricing = $projectType === 'site'
            ? $budgetService->calculatePricing($projectType, $answers)
            : [
                'objective' => trim((string) ($answers['systemFeatures'] ?? $answers['automationDescription'] ?? $payload['description'] ?? 'Escopo sob medida')),
                'visual_direction' => null,
                'selected_pages' => [],
                'base_amount' => (float) $payload['total_amount'],
                'addons_amount' => 0,
                'timeline_adjustment' => 0,
                'total_amount' => (float) $payload['total_amount'],
                'entry_amount' => round(((float) $payload['total_amount']) * 0.5, 2),
            ];

        $status = $requiresValidation ? 'pending_validation' : 'sent';
        $isVisibleToSeller = ! $requiresValidation;

        $updateData = [
            'proposal_template_id' => $budgetService->resolveTemplateForProject($projectType)?->id,
            'status' => $status,
            'is_visible_to_seller' => $isVisibleToSeller,
            'requires_admin_validation' => $requiresValidation,
            'title' => $payload['title'],
            'valid_until' => $payload['valid_until'] ?? now()->addDays(15)->toDateString(),
            'internal_deadline_days' => $payload['internal_deadline_days'] ?? $budget->internal_deadline_days,
            'objective' => $pricing['objective'],
            'visual_direction' => $pricing['visual_direction'],
            'onboarding_answers' => $answers,
            'selected_pages' => $pricing['selected_pages'],
            'base_amount' => $pricing['base_amount'],
            'addons_amount' => $pricing['addons_amount'],
            'timeline_adjustment' => $pricing['timeline_adjustment'],
            'total_amount' => $pricing['total_amount'],
            'entry_amount' => $pricing['entry_amount'],
            'published_at' => $isVisibleToSeller ? ($budget->published_at ?? now()) : null,
            'metadata' => [
                ...(is_array($budget->metadata) ? $budget->metadata : []),
                'generated_from_request' => true,
                'generated_at' => now()->toIso8601String(),
            ],
        ];

        if (Schema::hasColumn('budgets', 'description')) {
            $updateData['description'] = $payload['description'] ?? $budget->description;
        }

        $budget->forceFill($updateData)->save();

        if ($budget->contact) {
            $metadata = is_array($budget->contact->metadata) ? $budget->contact->metadata : [];
            $metadata['proposal_status'] = $status;
            if ($isVisibleToSeller) {
                $metadata['proposal_slug'] = $budget->slug;
            }

            $budget->contact->forceFill([
                'deal_value' => (float) $budget->total_amount,
                'metadata' => $metadata,
            ])->save();
        }

        $budgetService->storeVersionSnapshot($budget, $request->user()?->id);

        return response()->json([
            'message' => 'Proposta gerada com sucesso a partir da solicitacao.',
            'data' => $budget->fresh(['contact', 'responsibleUser', 'template', 'adminValidator']),
        ]);
    }

    public function storeManual(Request $request, BudgetService $budgetService): JsonResponse
    {
        $payload = $request->validate([
            'project_type' => ['required', 'string', 'in:site,sistema,automacao'],
            'mode' => ['nullable', 'string', 'in:request,proposal'],
            'contact_request_id' => ['nullable', 'integer', 'exists:contact_requests,id'],
            'contact' => ['nullable', 'array'],
            'contact.name' => ['nullable', 'string', 'max:255'],
            'contact.company' => ['nullable', 'string', 'max:255'],
            'contact.email' => ['nullable', 'string', 'max:255'],
            'contact.phone' => ['nullable', 'string', 'max:60'],
            'title' => ['required', 'string', 'max:220'],
            'description' => ['nullable', 'string', 'max:10000'],
            'answers' => ['nullable', 'array'],
            'valid_until' => ['nullable', 'date'],
            'internal_deadline_days' => ['nullable', 'integer', 'min:1', 'max:365'],
            'total_amount' => ['nullable', 'numeric', 'min:0'],
        ]);

        $projectType = (string) $payload['project_type'];
        $mode = (string) ($payload['mode'] ?? ($projectType === 'site' ? 'proposal' : 'request'));

        if ($mode === 'proposal' && $projectType !== 'site' && ! isset($payload['total_amount'])) {
            return response()->json([
                'message' => 'Para sistema ou automacao em modo proposta, informe o valor total.',
            ], 422);
        }

        $contact = $this->resolveContact($payload);
        if (! $contact) {
            return response()->json([
                'message' => 'Informe um contato valido para cadastrar a proposta manual.',
            ], 422);
        }

        $answers = is_array($payload['answers'] ?? null) ? $payload['answers'] : [];

        $pricingSetting = PricingProjectSetting::query()
            ->where('project_type', $projectType)
            ->first();

        $requiresValidation = $mode === 'request'
            ? false
            : (bool) ($pricingSetting?->requires_admin_validation ?? ($projectType !== 'site'));

        $status = $mode === 'request' ? 'request' : ($requiresValidation ? 'pending_validation' : 'sent');
        $isVisibleToSeller = $mode === 'proposal' && ! $requiresValidation;

        $pricing = $mode === 'request'
            ? [
                'objective' => trim((string) ($answers['systemFeatures'] ?? $answers['automationDescription'] ?? $payload['description'] ?? 'Solicitacao manual')),
                'visual_direction' => null,
                'selected_pages' => [],
                'base_amount' => 0,
                'addons_amount' => 0,
                'timeline_adjustment' => 0,
                'total_amount' => 0,
                'entry_amount' => 0,
            ]
            : ($projectType === 'site'
                ? $budgetService->calculatePricing($projectType, $answers)
                : [
                    'objective' => trim((string) ($answers['systemFeatures'] ?? $answers['automationDescription'] ?? $payload['description'] ?? 'Escopo sob medida')),
                    'visual_direction' => null,
                    'selected_pages' => [],
                    'base_amount' => (float) $payload['total_amount'],
                    'addons_amount' => 0,
                    'timeline_adjustment' => 0,
                    'total_amount' => (float) $payload['total_amount'],
                    'entry_amount' => round(((float) $payload['total_amount']) * 0.5, 2),
                ]);

        $dateSuffix = now()->format('d-m-Y');
        $slugBase = Str::slug(($contact->company ?: $contact->name).'-'.$dateSuffix);

        $createData = [
            'contact_request_id' => $contact->id,
            'responsible_user_id' => $contact->assigned_user_id,
            'proposal_template_id' => $budgetService->resolveTemplateForProject($projectType)?->id,
            'identifier' => $this->resolveIdentifier(),
            'slug' => $this->resolveUniqueSlug($slugBase ?: 'proposta-'.$dateSuffix, $contact->id),
            'status' => $status,
            'is_visible_to_seller' => $isVisibleToSeller,
            'requires_admin_validation' => $requiresValidation,
            'project_type' => $projectType,
            'title' => $payload['title'],
            'valid_until' => $payload['valid_until'] ?? now()->addDays(15)->toDateString(),
            'internal_deadline_days' => $payload['internal_deadline_days'] ?? null,
            'client_name' => $contact->name,
            'client_company' => $contact->company,
            'client_email' => $contact->email,
            'client_phone' => $contact->phone,
            'objective' => $pricing['objective'],
            'visual_direction' => $pricing['visual_direction'],
            'onboarding_answers' => $answers,
            'selected_pages' => $pricing['selected_pages'],
            'base_amount' => $pricing['base_amount'],
            'addons_amount' => $pricing['addons_amount'],
            'timeline_adjustment' => $pricing['timeline_adjustment'],
            'total_amount' => $pricing['total_amount'],
            'entry_amount' => $pricing['entry_amount'],
            'discount_percent' => 0,
            'discount_amount' => 0,
            'published_at' => $isVisibleToSeller ? now() : null,
            'metadata' => [
                'manual_created' => true,
                'manual_mode' => $mode,
            ],
        ];

        if (Schema::hasColumn('budgets', 'description')) {
            $createData['description'] = $payload['description'] ?? null;
        }

        $budget = Budget::query()->create($createData);

        $contactMetadata = is_array($contact->metadata) ? $contact->metadata : [];
        $contactMetadata['proposal_status'] = $status;
        if ($isVisibleToSeller) {
            $contactMetadata['proposal_slug'] = $budget->slug;
        }

        $contact->forceFill([
            'deal_value' => (float) $budget->total_amount,
            'metadata' => $contactMetadata,
        ])->save();

        $budgetService->storeVersionSnapshot($budget, $request->user()?->id);

        return response()->json([
            'message' => $mode === 'request' ? 'Solicitacao manual cadastrada com sucesso.' : 'Proposta manual cadastrada com sucesso.',
            'data' => $budget->fresh(['contact', 'responsibleUser', 'template', 'adminValidator']),
        ], 201);
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function resolveContact(array $payload): ?ContactRequest
    {
        if (! empty($payload['contact_request_id'])) {
            return ContactRequest::query()->find($payload['contact_request_id']);
        }

        $contactData = is_array($payload['contact'] ?? null) ? $payload['contact'] : [];
        $name = trim((string) ($contactData['name'] ?? ''));
        $email = trim((string) ($contactData['email'] ?? ''));
        $phone = trim((string) ($contactData['phone'] ?? ''));

        if ($name === '' && $email === '' && $phone === '') {
            return null;
        }

        if ($phone !== '') {
            $normalized = preg_replace('/\D+/', '', $phone) ?: null;
            if ($normalized) {
                $existingByPhone = ContactRequest::query()
                    ->where('phone_normalized', $normalized)
                    ->latest('id')
                    ->first();

                if ($existingByPhone) {
                    return $existingByPhone;
                }
            }
        }

        if ($email !== '') {
            $existingByEmail = ContactRequest::query()
                ->where('email', $email)
                ->latest('id')
                ->first();

            if ($existingByEmail) {
                return $existingByEmail;
            }
        }

        $targetColumn = LeadKanbanColumn::findByPipelineAndSlug(LeadKanbanColumn::PIPE_COMERCIAL, 'orcamento')
            ?? LeadKanbanColumn::defaultColumn(LeadKanbanColumn::PIPE_COMERCIAL);

        $nextOrder = ContactRequest::query()
            ->where('pipeline', LeadKanbanColumn::PIPE_COMERCIAL)
            ->where('lead_kanban_column_id', $targetColumn?->id)
            ->max('lead_order');

        return ContactRequest::query()->create([
            'name' => $name !== '' ? $name : 'Contato sem nome',
            'email' => $email !== '' ? $email : null,
            'phone' => $phone !== '' ? $phone : null,
            'company' => trim((string) ($contactData['company'] ?? '')) ?: null,
            'message' => 'Cadastro manual de proposta',
            'status' => $targetColumn?->slug ?? 'orcamento',
            'pipeline' => LeadKanbanColumn::PIPE_COMERCIAL,
            'lead_kanban_column_id' => $targetColumn?->id,
            'lead_order' => ($nextOrder ?? -1) + 1,
            'stage_entered_at' => now(),
            'metadata' => [
                'manual_proposal_contact' => true,
            ],
        ]);
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
}
