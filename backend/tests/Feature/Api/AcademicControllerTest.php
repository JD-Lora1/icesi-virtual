<?php

namespace Tests\Feature\Api;

use App\Models\Competency;
use App\Models\LearningObjective;
use App\Models\Program;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AcademicControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_competency_crud_flow(): void
    {
        $program = Program::create(['name' => 'Ingenieria de Sistemas']);

        $createResponse = $this->postJson('/api/competencies', [
            'name' => 'Competencia 1',
            'program_id' => $program->id,
        ]);

        $createResponse->assertCreated()
            ->assertJsonPath('name', 'Competencia 1');

        $competencyId = $createResponse->json('id');

        $this->patchJson("/api/competencies/{$competencyId}", [
            'name' => 'Competencia 1 Actualizada',
        ])->assertOk()
            ->assertJsonPath('name', 'Competencia 1 Actualizada');

        $this->deleteJson("/api/competencies/{$competencyId}")
            ->assertNoContent();

        $this->assertDatabaseMissing('competencies', [
            'id' => $competencyId,
        ]);
    }

    public function test_objective_requires_existing_competency(): void
    {
        $this->postJson('/api/learning-objectives', [
            'description' => 'Objetivo invalido',
            'competency_id' => 9999,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['competency_id']);
    }

    public function test_objective_crud_flow(): void
    {
        $program = Program::create(['name' => 'Ingenieria de Sistemas']);
        $competency = Competency::create([
            'name' => 'Competencia 1',
            'program_id' => $program->id,
        ]);

        $createResponse = $this->postJson('/api/learning-objectives', [
            'description' => 'Construir algoritmos simples.',
            'competency_id' => $competency->id,
        ]);

        $createResponse->assertCreated()
            ->assertJsonPath('description', 'Construir algoritmos simples.');

        $objectiveId = $createResponse->json('id');

        $this->patchJson("/api/learning-objectives/{$objectiveId}", [
            'description' => 'Construir algoritmos robustos.',
        ])->assertOk()
            ->assertJsonPath('description', 'Construir algoritmos robustos.');

        $this->deleteJson("/api/learning-objectives/{$objectiveId}")
            ->assertNoContent();

        $this->assertDatabaseMissing('learning_objectives', [
            'id' => $objectiveId,
        ]);
    }
}
