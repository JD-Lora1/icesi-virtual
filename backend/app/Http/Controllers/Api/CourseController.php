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
        $courses = Course::with(['program', 'learningObjectives.competency'])
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
}
