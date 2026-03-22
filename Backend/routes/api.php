<?php

use App\Http\Controllers\Api\AdminDashboardController;
use App\Http\Controllers\Api\AnalyticsController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ContactRequestController;
use App\Http\Controllers\Api\KanbanController;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->group(function (): void {
    Route::post('/login', [AuthController::class, 'login']);

    Route::middleware('auth:sanctum')->group(function (): void {
        Route::get('/me', [AuthController::class, 'me']);
        Route::post('/logout', [AuthController::class, 'logout']);
    });
});

Route::post('/contacts', [ContactRequestController::class, 'store']);

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
    Route::get('/leads', [ContactRequestController::class, 'index']);
    Route::get('/leads/{contactRequest}', [ContactRequestController::class, 'show']);
    Route::get('/sessions', [AdminDashboardController::class, 'sessions']);
    Route::get('/kanban', [KanbanController::class, 'board']);
    Route::post('/kanban/columns', [KanbanController::class, 'storeColumn']);
    Route::patch('/kanban/columns/{leadKanbanColumn}', [KanbanController::class, 'updateColumn']);
    Route::delete('/kanban/columns/{leadKanbanColumn}', [KanbanController::class, 'deleteColumn']);
    Route::patch('/kanban/contacts/{contactRequest}/move', [KanbanController::class, 'moveLead']);
});
