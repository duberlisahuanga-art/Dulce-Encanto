<?php

namespace Tests\Feature;

use App\Models\Promotion;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PromotionControllerTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);
    }

    public function test_public_endpoint_only_returns_current_active_promotions(): void
    {
        Promotion::factory()->create(['name' => 'Vigente']);
        Promotion::factory()->create(['name' => 'Inactiva', 'is_active' => false]);
        Promotion::factory()->create(['name' => 'Futura', 'starts_at' => now()->addDay(), 'ends_at' => now()->addWeek()]);

        $this->getJson('/api/v1/promotions')->assertOk()
            ->assertJsonFragment(['name' => 'Vigente', 'coupon_code' => null])
            ->assertJsonMissing(['name' => 'Inactiva'])
            ->assertJsonMissing(['name' => 'Futura']);
    }

    public function test_administrator_can_manage_promotions(): void
    {
        $administrator = User::factory()->create();
        $administrator->assignRole('administrador');
        $payload = [
            'name' => 'Semana dulce',
            'description' => 'Promoción de temporada.',
            'discount_type' => 'percentage',
            'discount_value' => 20,
            'starts_at' => now()->toDateString(),
            'ends_at' => now()->addWeek()->toDateString(),
            'is_active' => true,
            'applies_to_all' => true,
            'accent_color' => '#934258',
            'cta_label' => 'Ver promoción',
            'requires_coupon' => false,
            'minimum_purchase' => 0,
        ];

        $response = $this->actingAs($administrator)->postJson('/api/v1/admin/promotions', $payload)
            ->assertCreated()->assertJsonPath('data.name', 'Semana dulce');
        $id = $response->json('data.id');

        $this->actingAs($administrator)->putJson("/api/v1/admin/promotions/{$id}", [
            ...$payload, 'is_active' => false,
        ])->assertOk()->assertJsonPath('data.is_active', false);
        $this->actingAs($administrator)->deleteJson("/api/v1/admin/promotions/{$id}")->assertNoContent();
    }

    public function test_coupon_code_is_required_and_normalized_for_coupon_promotions(): void
    {
        $administrator = User::factory()->create();
        $administrator->assignRole('administrador');
        $payload = [
            'name' => 'Cupón dulce',
            'discount_type' => 'percentage',
            'discount_value' => 20,
            'starts_at' => now()->toDateString(),
            'ends_at' => now()->addWeek()->toDateString(),
            'is_active' => true,
            'applies_to_all' => true,
            'accent_color' => '#934258',
            'cta_label' => 'Comprar',
            'requires_coupon' => true,
            'minimum_purchase' => 50,
        ];

        $this->actingAs($administrator)->postJson('/api/v1/admin/promotions', $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors('coupon_code');

        $this->actingAs($administrator)->postJson('/api/v1/admin/promotions', [
            ...$payload,
            'coupon_code' => ' dulce20 ',
        ])->assertCreated()->assertJsonPath('data.coupon_code', 'DULCE20');
    }

    public function test_client_cannot_manage_promotions_and_invalid_dates_are_rejected(): void
    {
        $client = User::factory()->create();
        $this->actingAs($client)->getJson('/api/v1/admin/promotions')->assertForbidden();

        $administrator = User::factory()->create();
        $administrator->assignRole('administrador');
        $this->actingAs($administrator)->postJson('/api/v1/admin/promotions', [
            'name' => 'Inválida', 'discount_type' => 'percentage', 'discount_value' => 10,
            'starts_at' => now()->addWeek()->toDateString(), 'ends_at' => now()->toDateString(), 'is_active' => true,
        ])->assertUnprocessable()->assertJsonValidationErrors('ends_at');
    }
}
