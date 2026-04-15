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
        $competencies = Competency::query()
            ->when(request('program_id'), function ($query, $programId) {
                $query->where('program_id', $programId);
            })
            ->when(request('objective_id'), function ($query, $objectiveId) {
                $query->whereHas('learningObjectives', function ($objectivesQuery) use ($objectiveId) {
                    $objectivesQuery->where('learning_objectives.id', $objectiveId);
                });
            })
            ->when(request('course_id'), function ($query, $courseId) {
                $query->whereHas('learningObjectives.courses', function ($coursesQuery) use ($courseId) {
                    $coursesQuery->where('courses.id', $courseId);
                });
            })
            ->with(['program', 'learningObjectives'])
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
        $objectives = LearningObjective::query()
            ->when(request('competency_id'), function ($query, $competencyId) {
                $query->where('competency_id', $competencyId);
            })
            ->when(request('program_id'), function ($query, $programId) {
                $query->whereHas('competency', function ($competencyQuery) use ($programId) {
                    $competencyQuery->where('program_id', $programId);
                });
            })
            ->when(request('course_id'), function ($query, $courseId) {
                $query->whereHas('courses', function ($coursesQuery) use ($courseId) {
                    $coursesQuery->where('courses.id', $courseId);
                });
            })
            ->when(request('contribution_level'), function ($query, $contributionLevel) {
                $query->whereHas('courses', function ($coursesQuery) use ($contributionLevel) {
                    $coursesQuery->where('course_objective_pivot.contribution_level', $contributionLevel);
                });
            })
            ->with(['competency.program', 'courses'])
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

        $objective = LearningObjective::create($validated)->load(['competency.program', 'courses']);

        return response()->json($objective, 201);
    }

    public function showObjective(LearningObjective $objective): JsonResponse
    {
        return response()->json($objective->load(['competency.program', 'courses']));
    }

    public function updateObjective(Request $request, LearningObjective $objective): JsonResponse
    {
        $validated = $request->validate([
            'description' => ['sometimes', 'required', 'string'],
            'competency_id' => ['sometimes', 'required', 'integer', 'exists:competencies,id'],
        ]);

        $objective->update($validated);

        return response()->json($objective->fresh()->load(['competency.program', 'courses']));
    }

    public function destroyObjective(LearningObjective $objective): JsonResponse
    {
        $objective->delete();

        return response()->json(null, 204);
    }
}
