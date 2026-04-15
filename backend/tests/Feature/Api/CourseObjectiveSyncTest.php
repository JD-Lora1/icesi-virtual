<?php

namespace Tests\Feature\Api;

use App\Models\Competency;
use App\Models\Course;
use App\Models\LearningObjective;
use App\Models\Program;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CourseObjectiveSyncTest extends TestCase
{
    use RefreshDatabase;

    public function test_course_objectives_can_be_synced_with_contribution_levels(): void
    {
        $program = Program::create(['name' => 'Ingenieria de Sistemas']);
        $competency = Competency::create([
            'name' => 'Competencia 1',
            'program_id' => $program->id,
        ]);
        $objectiveOne = LearningObjective::create([
            'description' => 'Objetivo 1',
            'competency_id' => $competency->id,
        ]);
        $objectiveTwo = LearningObjective::create([
            'description' => 'Objetivo 2',
            'competency_id' => $competency->id,
        ]);
        $course = Course::create([
            'name' => 'Bases de Datos',
            'program_id' => $program->id,
        ]);

        $response = $this->postJson("/api/courses/{$course->id}/objectives", [
            'objective_assignments' => [
                [
                    'objective_id' => $objectiveOne->id,
                    'contribution_level' => 'I',
                ],
                [
                    'objective_id' => $objectiveTwo->id,
                    'contribution_level' => 'V',
                ],
            ],
        ]);

        $response->assertOk()
            ->assertJsonCount(2, 'learning_objectives')
            ->assertJsonPath('learning_objectives.0.pivot.contribution_level', 'I')
            ->assertJsonPath('learning_objectives.1.pivot.contribution_level', 'V');

        $this->assertDatabaseHas('course_objective_pivot', [
            'course_id' => $course->id,
            'objective_id' => $objectiveOne->id,
            'contribution_level' => 'I',
        ]);

        $this->assertDatabaseHas('course_objective_pivot', [
            'course_id' => $course->id,
            'objective_id' => $objectiveTwo->id,
            'contribution_level' => 'V',
        ]);
    }
}
