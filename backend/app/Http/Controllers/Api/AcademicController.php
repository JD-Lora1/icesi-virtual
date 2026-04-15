<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Competency;
use App\Models\LearningObjective;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AcademicController extends Controller
{
    public function competenciesIndex(): JsonResponse
    {
        $competencies = Competency::with(['program', 'learningObjectives'])
            ->orderBy('id')
            ->get();

        return response()->json($competencies);
    }

    public function storeCompetency(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'program_id' => ['required', 'integer', 'exists:programs,id'],
        ]);

        $competency = Competency::create($validated)->load(['program', 'learningObjectives']);

        return response()->json($competency, 201);
    }

    public function showCompetency(Competency $competency): JsonResponse
    {
        return response()->json($competency->load(['program', 'learningObjectives']));
    }

    public function updateCompetency(Request $request, Competency $competency): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'program_id' => ['sometimes', 'required', 'integer', 'exists:programs,id'],
        ]);

        $competency->update($validated);

        return response()->json($competency->fresh()->load(['program', 'learningObjectives']));
    }

    public function destroyCompetency(Competency $competency): JsonResponse
    {
        $competency->delete();

        return response()->json(null, 204);
    }

    public function objectivesIndex(): JsonResponse
    {
        $objectives = LearningObjective::with(['competency', 'courses'])
            ->orderBy('id')
            ->get();

        return response()->json($objectives);
    }

    public function storeObjective(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'description' => ['required', 'string'],
            'competency_id' => ['required', 'integer', 'exists:competencies,id'],
        ]);

        $objective = LearningObjective::create($validated)->load(['competency', 'courses']);

        return response()->json($objective, 201);
    }

    public function showObjective(LearningObjective $objective): JsonResponse
    {
        return response()->json($objective->load(['competency', 'courses']));
    }

    public function updateObjective(Request $request, LearningObjective $objective): JsonResponse
    {
        $validated = $request->validate([
            'description' => ['sometimes', 'required', 'string'],
            'competency_id' => ['sometimes', 'required', 'integer', 'exists:competencies,id'],
        ]);

        $objective->update($validated);

        return response()->json($objective->fresh()->load(['competency', 'courses']));
    }

    public function destroyObjective(LearningObjective $objective): JsonResponse
    {
        $objective->delete();

        return response()->json(null, 204);
    }
}
