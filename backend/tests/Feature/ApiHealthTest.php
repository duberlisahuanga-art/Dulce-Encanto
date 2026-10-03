<?php

namespace Tests\Feature;

use Tests\TestCase;

class ApiHealthTest extends TestCase
{
    public function test_the_api_reports_a_healthy_database_connection(): void
    {
        $response = $this->getJson('/api/v1/health');

        $response
            ->assertOk()
            ->assertJson([
                'status' => 'ok',
                'application' => 'Dulce Encanto API',
                'database' => 'connected',
            ]);
    }
}
