<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Course;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CourseController extends Controller
{
    public function index(): JsonResponse
    {
        $courses = Course::query()
            ->when(request('program_id'), function ($query, $programId) {
                $query->where('program_id', $programId);
            })
            ->when(request('competency_id'), function ($query, $competencyId) {
                $query->whereHas('learningObjectives', function ($objectivesQuery) use ($competencyId) {
                    $objectivesQuery->where('competency_id', $competencyId);
                });
            })
            ->when(request('objective_id'), function ($query, $objectiveId) {
                $query->whereHas('learningObjectives', function ($objectivesQuery) use ($objectiveId) {
                    $objectivesQuery->where('learning_objectives.id', $objectiveId);
                });
            })
            ->when(request('contribution_level'), function ($query, $contributionLevel) {
                $query->whereHas('learningObjectives', function ($objectivesQuery) use ($contributionLevel) {
                    $objectivesQuery->where('course_objective_pivot.contribution_level', $contributionLevel);
                });
            })
            ->with(['program', 'learningObjectives.competency'])
            ->orderBy('id')
            ->get();

        return response()->json($courses);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'program_id' => ['required', 'integer', 'exists:programs,id'],
        ]);

        $course = Course::create($validated)->load(['program', 'learningObjectives.competency']);

        return response()->json($course, 201);
    }

    public function show(Course $course): JsonResponse
    {
        return response()->json($course->load(['program', 'learningObjectives.competency']));
    }

    public function update(Request $request, Course $course): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'program_id' => ['sometimes', 'required', 'integer', 'exists:programs,id'],
        ]);

        $course->update($validated);

        return response()->json($course->fresh()->load(['program', 'learningObjectives.competency']));
    }

    public function destroy(Course $course): JsonResponse
    {
        $course->delete();

        return response()->json(null, 204);
    }

    public function syncObjectives(Request $request, Course $course): JsonResponse
    {
        $validated = $request->validate([
            'objective_assignments' => ['present', 'array'],
            'objective_assignments.*.objective_id' => ['required', 'integer', 'exists:learning_objectives,id'],
            'objective_assignments.*.contribution_level' => ['required', 'in:I,F,V'],
        ]);

        $syncPayload = collect($validated['objective_assignments'])
            ->mapWithKeys(function (array $assignment) {
                return [
                    $assignment['objective_id'] => ['contribution_level' => $assignment['contribution_level']],
                ];
            })
            ->all();

        $course->learningObjectives()->sync($syncPayload);

        return response()->json(
            $course->fresh()->load(['program', 'learningObjectives.competency']),
            200
        );
    }
}
