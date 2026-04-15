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

    public function test_index_can_filter_courses_by_program_and_level(): void
    {
        $programA = Program::create(['name' => 'Ingenieria de Sistemas']);
        $programB = Program::create(['name' => 'Administracion']);

        $competencyA = Competency::create([
            'name' => 'Competencia A',
            'program_id' => $programA->id,
        ]);

        $objectiveA = LearningObjective::create([
            'description' => 'Objetivo A',
            'competency_id' => $competencyA->id,
        ]);

        $courseA = Course::create([
            'name' => 'Curso Sistemas',
            'program_id' => $programA->id,
        ]);

        $courseB = Course::create([
            'name' => 'Curso Administracion',
            'program_id' => $programB->id,
        ]);

        $courseA->learningObjectives()->attach($objectiveA->id, ['contribution_level' => 'I']);
        $courseB->learningObjectives()->attach($objectiveA->id, ['contribution_level' => 'V']);

        $programFilterResponse = $this->getJson('/api/courses?program_id=' . $programA->id);
        $programFilterResponse->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.id', $courseA->id);

        $levelFilterResponse = $this->getJson('/api/courses?contribution_level=V');
        $levelFilterResponse->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.id', $courseB->id);
    }

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
                    'learning_objectives' => [
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
