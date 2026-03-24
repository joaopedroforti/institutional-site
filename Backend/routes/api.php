<?php

use App\Http\Controllers\Api\AdminDashboardController;
use App\Http\Controllers\Api\AnalyticsController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ContactRequestController;
use App\Http\Controllers\Api\CommercialSettingsController;
use App\Http\Controllers\Api\KanbanController;
use App\Http\Controllers\Api\OnboardingController;
use App\Http\Controllers\Api\BudgetController;
use App\Http\Controllers\Api\PublicProposalController;
use App\Http\Controllers\Api\SellerController;
use App\Http\Controllers\Api\WhatsApp\WhatsAppController;
use App\Http\Controllers\Api\WhatsApp\WhatsAppWebhookController;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->group(function (): void {
    Route::post('/login', [AuthController::class, 'login']);

    Route::middleware('auth:sanctum')->group(function (): void {
        Route::get('/me', [AuthController::class, 'me']);
        Route::post('/logout', [AuthController::class, 'logout']);
    });
});

Route::post('/contacts', [ContactRequestController::class, 'store']);
Route::post('/onboarding/progress', [OnboardingController::class, 'progress']);
Route::post('/onboarding/submit', [OnboardingController::class, 'submit']);
Route::get('/proposals/{slug}', [PublicProposalController::class, 'show']);
Route::post('/proposals/{slug}/approve', [PublicProposalController::class, 'approve']);
Route::post('/proposals/{slug}/request-adjustment', [PublicProposalController::class, 'requestAdjustment']);
Route::get('/settings/general', [CommercialSettingsController::class, 'publicGeneralSettings']);
Route::post('/whatsapp/webhook', WhatsAppWebhookController::class);

Route::prefix('analytics')->group(function (): void {
    Route::post('/session', [AnalyticsController::class, 'syncSession']);
    Route::post('/page-view', [AnalyticsController::class, 'trackPageView']);
    Route::post('/event', [AnalyticsController::class, 'trackEvent']);
});

Route::middleware('auth:sanctum')->prefix('admin')->group(function (): void {
    Route::get('/dashboard', [AdminDashboardController::class, 'dashboard']);
    Route::get('/contacts', [ContactRequestController::class, 'index']);
    Route::get('/contacts/{contactRequest}', [ContactRequestController::class, 'show']);
    Route::patch('/contacts/{contactRequest}', [ContactRequestController::class, 'update']);
    Route::post('/contacts/{contactRequest}/notes', [ContactRequestController::class, 'addInternalNote']);
    Route::post('/contacts/{contactRequest}/tags', [ContactRequestController::class, 'addTag']);
    Route::delete('/contacts/{contactRequest}/tags/{tag}', [ContactRequestController::class, 'removeTag']);
    Route::get('/leads', [ContactRequestController::class, 'index']);
    Route::get('/leads/{contactRequest}', [ContactRequestController::class, 'show']);
    Route::get('/sessions', [AdminDashboardController::class, 'sessions']);
    Route::get('/sellers', [SellerController::class, 'index']);
    Route::get('/sellers/analytics', [SellerController::class, 'analytics']);
    Route::post('/sellers', [SellerController::class, 'store']);
    Route::patch('/sellers/distribution/settings', [SellerController::class, 'updateDistribution']);
    Route::patch('/sellers/onboarding/deadlines', [SellerController::class, 'updateOnboardingDeadlines']);
    Route::patch('/sellers/{user}', [SellerController::class, 'update']);
    Route::get('/budgets', [BudgetController::class, 'index']);
    Route::patch('/budgets/{budget}', [BudgetController::class, 'updatePendingBudget']);
    Route::post('/budgets/manual', [BudgetController::class, 'storeManual']);
    Route::patch('/budgets/{budget}/generate', [BudgetController::class, 'generateFromRequest']);
    Route::patch('/budgets/{budget}/validate', [BudgetController::class, 'validateBudget']);
    Route::patch('/budgets/{budget}/discount', [BudgetController::class, 'applyDiscount']);
    Route::patch('/notifications/{adminNotification}/read', [BudgetController::class, 'markNotificationAsRead']);
    Route::get('/settings/proposals', [CommercialSettingsController::class, 'proposalSettings']);
    Route::patch('/settings/proposals/deadlines', [CommercialSettingsController::class, 'updateProposalDeadlines']);
    Route::get('/settings/general', [CommercialSettingsController::class, 'generalSettings']);
    Route::patch('/settings/general', [CommercialSettingsController::class, 'updateGeneralSettings']);
    Route::get('/settings/pricing', [CommercialSettingsController::class, 'pricingSettings']);
    Route::patch('/settings/pricing', [CommercialSettingsController::class, 'updatePricingSettings']);
    Route::get('/settings/score-rules', [CommercialSettingsController::class, 'scoreRules']);
    Route::patch('/settings/score-rules', [CommercialSettingsController::class, 'updateScoreRules']);
    Route::get('/settings/source-mappings', [CommercialSettingsController::class, 'sourceMappings']);
    Route::patch('/settings/source-mappings', [CommercialSettingsController::class, 'updateSourceMappings']);
    Route::get('/pipes', [KanbanController::class, 'pipes']);
    Route::get('/kanban', [KanbanController::class, 'board']);
    Route::post('/kanban/leads', [KanbanController::class, 'storeLead']);
    Route::post('/kanban/columns', [KanbanController::class, 'storeColumn']);
    Route::patch('/kanban/columns/reorder', [KanbanController::class, 'reorderColumns']);
    Route::patch('/kanban/columns/{leadKanbanColumn}', [KanbanController::class, 'updateColumn']);
    Route::delete('/kanban/columns/{leadKanbanColumn}', [KanbanController::class, 'deleteColumn']);
    Route::patch('/kanban/contacts/{contactRequest}/move', [KanbanController::class, 'moveLead']);
    Route::post('/kanban/contacts/{contactRequest}/transition', [KanbanController::class, 'transition']);
    Route::get('/kanban/lost-reasons', [KanbanController::class, 'lostReasons']);
    Route::post('/kanban/lost-reasons', [KanbanController::class, 'storeLostReason']);

    Route::prefix('whatsapp')->group(function (): void {
        Route::get('/overview', [WhatsAppController::class, 'overview']);
        Route::get('/conversations', [WhatsAppController::class, 'conversations']);
        Route::post('/conversations/start', [WhatsAppController::class, 'startConversation']);
        Route::get('/conversations/{conversation}', [WhatsAppController::class, 'showConversation']);
        Route::patch('/conversations/{conversation}', [WhatsAppController::class, 'updateConversation']);
        Route::delete('/conversations/{conversation}', [WhatsAppController::class, 'destroyConversation']);
        Route::post('/conversations/{conversation}/tags', [WhatsAppController::class, 'addConversationTag']);
        Route::delete('/conversations/{conversation}/tags/{tag}', [WhatsAppController::class, 'removeConversationTag']);
        Route::get('/conversations/{conversation}/messages', [WhatsAppController::class, 'conversationMessages']);
        Route::post('/conversations/{conversation}/messages/text', [WhatsAppController::class, 'sendText']);
        Route::post('/conversations/{conversation}/messages/image', [WhatsAppController::class, 'sendImage']);
        Route::post('/conversations/{conversation}/messages/audio', [WhatsAppController::class, 'sendAudio']);
        Route::post('/conversations/{conversation}/messages/document', [WhatsAppController::class, 'sendDocument']);
        Route::patch('/conversations/{conversation}/assign', [WhatsAppController::class, 'assignConversation']);
        Route::get('/tags', [WhatsAppController::class, 'tags']);
        Route::post('/tags', [WhatsAppController::class, 'storeTag']);
        Route::patch('/tags/{tag}', [WhatsAppController::class, 'updateTag']);
        Route::delete('/tags/{tag}', [WhatsAppController::class, 'destroyTag']);
        Route::get('/quick-replies', [WhatsAppController::class, 'quickReplies']);
        Route::post('/quick-replies', [WhatsAppController::class, 'storeQuickReply']);
        Route::patch('/quick-replies/{quickReply}', [WhatsAppController::class, 'updateQuickReply']);
        Route::delete('/quick-replies/{quickReply}', [WhatsAppController::class, 'destroyQuickReply']);
        Route::get('/leads/{contactRequest}/conversation', [WhatsAppController::class, 'leadConversation']);
        Route::get('/deals/{contactRequest}/conversation', [WhatsAppController::class, 'dealConversation']);
        Route::get('/settings', [WhatsAppController::class, 'settings']);
        Route::put('/settings', [WhatsAppController::class, 'updateSettings']);
        Route::get('/instance/profile', [WhatsAppController::class, 'instanceProfile']);
        Route::put('/instance/profile', [WhatsAppController::class, 'updateInstanceProfile']);
        Route::get('/messages/{message}/media', [WhatsAppController::class, 'media']);
        Route::post('/sync', [WhatsAppController::class, 'sync']);
        Route::post('/webhook/register', [WhatsAppController::class, 'registerWebhook']);
        Route::get('/realtime/updates', [WhatsAppController::class, 'realtimeUpdates']);
    });
});
