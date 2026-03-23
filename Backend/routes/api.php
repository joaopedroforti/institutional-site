<?php

use App\Http\Controllers\Api\AdminDashboardController;
use App\Http\Controllers\Api\AnalyticsController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ContactRequestController;
use App\Http\Controllers\Api\KanbanController;
use App\Http\Controllers\Api\OnboardingController;
use App\Http\Controllers\Api\SellerController;
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
    Route::get('/leads', [ContactRequestController::class, 'index']);
    Route::get('/leads/{contactRequest}', [ContactRequestController::class, 'show']);
    Route::get('/sessions', [AdminDashboardController::class, 'sessions']);
    Route::get('/sellers', [SellerController::class, 'index']);
    Route::post('/sellers', [SellerController::class, 'store']);
    Route::patch('/sellers/distribution/settings', [SellerController::class, 'updateDistribution']);
    Route::patch('/sellers/onboarding/deadlines', [SellerController::class, 'updateOnboardingDeadlines']);
    Route::patch('/sellers/{user}', [SellerController::class, 'update']);
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
});
