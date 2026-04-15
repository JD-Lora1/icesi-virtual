<?php

namespace Tests\Feature\Api;

use App\Models\Competency;
use App\Models\Course;
use App\Models\LearningObjective;
use App\Models\Program;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CourseControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_index_returns_courses_with_nested_relations(): void
    {
        $program = Program::create(['name' => 'Ingenieria de Sistemas']);
        $competency = Competency::create([
            'name' => 'Competencia 1',
            'program_id' => $program->id,
        ]);
        $objective = LearningObjective::create([
            'description' => 'Resolver problemas basicos.',
            'competency_id' => $competency->id,
        ]);
        $course = Course::create([
            'name' => 'Fundamentos de Programacion',
            'program_id' => $program->id,
        ]);
        $course->learningObjectives()->attach($objective->id, ['contribution_level' => 'I']);

        $response = $this->getJson('/api/courses');

        $response->assertOk()
            ->assertJsonCount(1)
            ->assertJsonStructure([
                '*' => [
                    'id',
                    'name',
                    'program' => ['id', 'name'],
                    'learningObjectives' => [
                        '*' => [
                            'id',
                            'description',
                            'competency' => ['id', 'name', 'program_id'],
                            'pivot' => ['course_id', 'objective_id', 'contribution_level'],
                        ],
                    ],
                ],
            ]);
    }

    public function test_store_update_and_destroy_course(): void
    {
        $program = Program::create(['name' => 'Ingenieria de Sistemas']);

        $createResponse = $this->postJson('/api/courses', [
            'name' => 'Bases de Datos',
            'program_id' => $program->id,
        ]);

        $createResponse->assertCreated()
            ->assertJsonPath('name', 'Bases de Datos');

        $courseId = $createResponse->json('id');

        $updateResponse = $this->patchJson("/api/courses/{$courseId}", [
            'name' => 'Bases de Datos I',
        ]);

        $updateResponse->assertOk()
            ->assertJsonPath('name', 'Bases de Datos I');

        $this->deleteJson("/api/courses/{$courseId}")
            ->assertNoContent();

        $this->assertDatabaseMissing('courses', [
            'id' => $courseId,
        ]);
    }
}
