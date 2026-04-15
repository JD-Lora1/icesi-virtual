<?php

use App\Http\Controllers\Api\AcademicController;
use App\Http\Controllers\Api\CourseController;
use App\Http\Controllers\Api\HealthController;
use App\Http\Controllers\Api\StatsController;
use Illuminate\Support\Facades\Route;

Route::get('/health', HealthController::class);

Route::apiResource('courses', CourseController::class);

Route::get('competencies', [AcademicController::class, 'competenciesIndex']);
Route::post('competencies', [AcademicController::class, 'storeCompetency']);
Route::get('competencies/{competency}', [AcademicController::class, 'showCompetency']);
Route::match(['put', 'patch'], 'competencies/{competency}', [AcademicController::class, 'updateCompetency']);
Route::delete('competencies/{competency}', [AcademicController::class, 'destroyCompetency']);

Route::get('learning-objectives', [AcademicController::class, 'objectivesIndex']);
Route::post('learning-objectives', [AcademicController::class, 'storeObjective']);
Route::get('learning-objectives/{objective}', [AcademicController::class, 'showObjective']);
Route::match(['put', 'patch'], 'learning-objectives/{objective}', [AcademicController::class, 'updateObjective']);
Route::delete('learning-objectives/{objective}', [AcademicController::class, 'destroyObjective']);

Route::get('stats', [StatsController::class, 'getStats']);
