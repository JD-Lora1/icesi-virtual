<?php

namespace Tests\Feature\Api;

use App\Models\Competency;
use App\Models\Course;
use App\Models\LearningObjective;
use App\Models\Program;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StatsControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_stats_endpoint_calculates_missing_relations_percentages(): void
    {
        $program = Program::create(['name' => 'Ingenieria de Sistemas']);

        $competencyWithObjectives = Competency::create([
            'name' => 'Competencia con objetivos',
            'program_id' => $program->id,
        ]);

        $competencyWithoutObjectives = Competency::create([
            'name' => 'Competencia sin objetivos',
            'program_id' => $program->id,
        ]);

        $objectiveWithCourse = LearningObjective::create([
            'description' => 'Objetivo asociado a curso.',
            'competency_id' => $competencyWithObjectives->id,
        ]);

        LearningObjective::create([
            'description' => 'Objetivo sin curso.',
            'competency_id' => $competencyWithObjectives->id,
        ]);

        $course = Course::create([
            'name' => 'Curso de prueba',
            'program_id' => $program->id,
        ]);

        $course->learningObjectives()->attach($objectiveWithCourse->id, [
            'contribution_level' => 'I',
        ]);

        $response = $this->getJson('/api/stats');

        $response->assertOk()
            ->assertJsonPath('objectives_without_courses.count', 1)
            ->assertJsonPath('objectives_without_courses.total', 2)
            ->assertJsonPath('objectives_without_courses.percentage', 50)
            ->assertJsonPath('competencies_without_objectives.count', 1)
            ->assertJsonPath('competencies_without_objectives.total', 2)
            ->assertJsonPath('competencies_without_objectives.percentage', 50);
    }
}
