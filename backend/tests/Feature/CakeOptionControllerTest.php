<?php

namespace Tests\Feature;

use App\Models\CakeOption;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CakeOptionControllerTest extends TestCase
{
    use RefreshDatabase;

    protected bool $seed = true;

    public function test_public_options_return_only_active_values_grouped_by_type(): void
    {
        CakeOption::factory()->create([
            'type' => 'flavor',
            'name' => 'Sabor visible',
            'slug' => 'sabor-visible',
        ]);
        CakeOption::factory()->create([
            'type' => 'flavor',
            'name' => 'Sabor oculto',
            'slug' => 'sabor-oculto',
            'is_active' => false,
        ]);

        $this->getJson('/api/v1/cake-designer/options')
            ->assertOk()
            ->assertJsonFragment(['name' => 'Sabor visible'])
            ->assertJsonMissing(['name' => 'Sabor oculto'])
            ->assertJsonStructure(['data' => ['size', 'flavor', 'filling', 'covering', 'decoration', 'extra']]);
    }

    public function test_administrator_can_create_update_and_delete_a_cake_option(): void
    {
        $administrator = User::factory()->create();
        $administrator->assignRole('administrador');
        Sanctum::actingAs($administrator);

        $createResponse = $this->postJson('/api/v1/admin/cake-options', [
            'type' => 'size',
            'name' => 'Familiar',
            'slug' => 'familiar',
            'description' => 'Para una celebración grande.',
            'price_adjustment' => 110,
            'servings' => 40,
            'available_colors' => null,
            'sort_order' => 10,
            'is_active' => true,
        ]);

        $createResponse->assertSuccessful()->assertJsonPath('data.servings', 40);
        $option = CakeOption::where('slug', 'familiar')->firstOrFail();
        $this->assertDatabaseHas('cake_options', ['id' => $option->id, 'type' => 'size']);

        $this->putJson("/api/v1/admin/cake-options/{$option->id}", [
            'type' => 'size',
            'name' => 'Familiar grande',
            'slug' => 'familiar-grande',
            'description' => null,
            'price_adjustment' => 120,
            'servings' => 45,
            'available_colors' => [],
            'sort_order' => 11,
            'is_active' => false,
        ])->assertOk()->assertJsonPath('data.is_active', false);

        $this->assertDatabaseHas('cake_options', [
            'id' => $option->id,
            'slug' => 'familiar-grande',
            'price_adjustment' => 120,
        ]);

        $this->deleteJson("/api/v1/admin/cake-options/{$option->id}")->assertNoContent();
        $this->assertDatabaseMissing('cake_options', ['id' => $option->id]);
    }

    public function test_client_receives_403_when_managing_cake_options(): void
    {
        $client = User::factory()->create();
        $client->assignRole('cliente');
        Sanctum::actingAs($client);

        $this->getJson('/api/v1/admin/cake-options')->assertForbidden();
    }
}
