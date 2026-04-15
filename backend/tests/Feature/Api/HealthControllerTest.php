<?php

namespace Tests\Feature\Api;

use Tests\TestCase;

class HealthControllerTest extends TestCase
{
    public function test_health_endpoint_returns_ok_json(): void
    {
        $response = $this->getJson('/api/health');

        $response->assertOk()
            ->assertJson([
                'status' => 'ok',
                'service' => 'icesi-virtual-backend',
            ])
            ->assertJsonStructure(['status', 'service', 'timestamp']);
    }
}
