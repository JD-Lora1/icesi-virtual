<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Program;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProgramController extends Controller
{
    public function index(): JsonResponse
    {
        $programs = Program::query()
            ->withCount(['courses', 'competencies'])
            ->orderBy('id')
            ->get();

        return response()->json($programs);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', 'unique:programs,name'],
        ]);

        $program = Program::create($validated)->loadCount(['courses', 'competencies']);

        return response()->json($program, 201);
    }

    public function show(Program $program): JsonResponse
    {
        return response()->json(
            $program->load(['courses:id,name,program_id', 'competencies:id,name,program_id'])
                ->loadCount(['courses', 'competencies'])
        );
    }

    public function update(Request $request, Program $program): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255', 'unique:programs,name,' . $program->id],
        ]);

        $program->update($validated);

        return response()->json($program->fresh()->loadCount(['courses', 'competencies']));
    }

    public function destroy(Program $program): JsonResponse
    {
        $program->delete();

        return response()->json(null, 204);
    }
}