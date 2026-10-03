<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AccountAddressControllerTest extends TestCase
{
    use RefreshDatabase;

    protected bool $seed = true;

    public function test_customer_can_only_save_an_address_inside_store_coverage(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->postJson('/api/v1/addresses', [
            'label' => 'Casa',
            'address' => 'Cercado de Lima',
            'reference' => 'Puerta blanca',
            'latitude' => -12.0464,
            'longitude' => -77.0428,
            'is_default' => true,
        ])->assertCreated()
            ->assertJsonPath('data.latitude', -12.0464)
            ->assertJsonPath('data.longitude', -77.0428);

        $this->actingAs($user)->postJson('/api/v1/addresses', [
            'label' => 'Fuera de cobertura',
            'address' => 'Dirección distante',
            'latitude' => -12.5,
            'longitude' => -77.5,
            'is_default' => false,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('address');

        $this->assertDatabaseCount('addresses', 1);
    }

    public function test_address_requires_a_map_location(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->postJson('/api/v1/addresses', [
            'label' => 'Casa',
            'address' => 'Dirección sin mapa',
            'is_default' => true,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['latitude', 'longitude']);
    }
}
