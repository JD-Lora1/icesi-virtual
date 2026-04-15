<?php

namespace Tests\Feature\Api;

use App\Models\Program;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProgramControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_program_crud_flow(): void
    {
        $createResponse = $this->postJson('/api/programs', [
            'name' => 'Ingenieria Industrial',
        ]);

        $createResponse->assertCreated()
            ->assertJsonPath('name', 'Ingenieria Industrial');

        $programId = $createResponse->json('id');

        $this->patchJson("/api/programs/{$programId}", [
            'name' => 'Ingenieria Industrial y de Sistemas',
        ])->assertOk()
            ->assertJsonPath('name', 'Ingenieria Industrial y de Sistemas');

        $this->deleteJson("/api/programs/{$programId}")
            ->assertNoContent();

        $this->assertDatabaseMissing('programs', [
            'id' => $programId,
        ]);
    }
}