<?php

namespace Tests\Feature;

use App\Models\GamePointTransaction;
use App\Models\GameReward;
use App\Models\GameSetting;
use App\Models\Product;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Routing\Middleware\ThrottleRequests;
use Tests\TestCase;

class GameControllerTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutMiddleware(ThrottleRequests::class);
        $this->seed(RolePermissionSeeder::class);
    }

    public function test_guest_cannot_play_and_client_cannot_manage_game(): void
    {
        $this->getJson('/api/v1/game/levels')->assertUnauthorized();
        $this->postJson('/api/v1/game/attempts/start', ['level_id' => 1])->assertUnauthorized();
        $this->actingAs(User::factory()->create())->getJson('/api/v1/admin/game/settings')->assertForbidden();
    }

    public function test_server_replays_the_route_awards_points_and_refuses_second_finish(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);
        $start = $this->postJson('/api/v1/game/attempts/start', ['level_id' => 1])
            ->assertCreated()
            ->assertJsonPath('data.status', 'started')
            ->assertJsonPath('data.scenario.mode', 'runner')
            ->assertJsonPath('data.scenario.width', 2400)
            ->assertJsonPath('data.scenario.obstacles.3.type', 'vehicle')
            ->assertJsonPath('data.scenario.obstacles.3.movement.speed', 2);
        $id = $start->json('data.id');
        $this->travel(38)->seconds();
        $finish = $this->postJson("/api/v1/game/attempts/{$id}/finish", ['inputs' => str_repeat('4', 365)])
            ->assertOk()->assertJsonPath('data.attempt.status', 'completed');
        $this->assertGreaterThan(0, $finish->json('data.attempt.final_score'));
        $this->assertGreaterThan(0, $finish->json('data.balance'));
        $this->actingAs($user)->getJson('/api/v1/game/history')->assertOk()
            ->assertJsonMissingPath('data.0.scenario');
        $this->postJson("/api/v1/game/attempts/{$id}/finish", ['inputs' => str_repeat('4', 365)])
            ->assertUnprocessable();
        $this->assertDatabaseCount('game_point_transactions', 1);
    }

    public function test_impossible_result_and_other_players_attempt_are_rejected(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $id = $this->actingAs($owner)->postJson('/api/v1/game/attempts/start', ['level_id' => 1])->json('data.id');
        $this->actingAs($other)->postJson("/api/v1/game/attempts/{$id}/finish", ['inputs' => str_repeat('4', 227)])->assertNotFound();
        $this->actingAs($owner)->postJson("/api/v1/game/attempts/{$id}/finish", ['inputs' => str_repeat('4', 365)])
            ->assertOk()->assertJsonPath('data.attempt.status', 'invalid');
        $this->assertDatabaseCount('game_point_transactions', 0);
    }

    public function test_daily_attempt_limit_and_pause_limit(): void
    {
        $user = User::factory()->create();
        GameSetting::query()->firstOrFail()->update(['max_daily_attempts' => 1]);
        $id = $this->actingAs($user)->postJson('/api/v1/game/attempts/start', ['level_id' => 1])->json('data.id');
        $this->actingAs($user)->postJson("/api/v1/game/attempts/{$id}/pause")->assertOk();
        $this->travel(31)->seconds();
        $this->actingAs($user)->postJson("/api/v1/game/attempts/{$id}/resume")->assertUnprocessable();
        $this->assertDatabaseHas('game_attempts', ['id' => $id, 'status' => 'expired']);
        $this->actingAs($user)->postJson('/api/v1/game/attempts/start', ['level_id' => 1])->assertUnprocessable();
    }

    public function test_reward_redemption_creates_private_single_use_coupon_and_debits_wallet_once(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        GamePointTransaction::create([
            'user_id' => $owner->id, 'type' => 'bonus', 'points' => 600,
            'balance_after' => 600, 'description' => 'Saldo de prueba',
        ]);
        $reward = GameReward::query()->where('reward_type', 'fixed_discount')->firstOrFail();
        $response = $this->actingAs($owner)->postJson("/api/v1/game/rewards/{$reward->id}/redeem")
            ->assertCreated()->assertJsonPath('data.balance', 100);
        $code = $response->json('data.redemption.promotion.coupon_code');
        $this->assertStringStartsWith('DULCE-', $code);
        $this->assertDatabaseHas('promotions', ['coupon_code' => $code, 'owner_user_id' => $owner->id, 'max_uses' => 1, 'is_game_reward' => true]);
        $product = Product::factory()->create(['price' => 25]);
        $this->actingAs($owner)->postJson('/api/v1/cart/products', ['product_id' => $product->id, 'quantity' => 2])->assertOk();
        $this->actingAs($owner)->postJson('/api/v1/cart/coupon', ['code' => $code])
            ->assertOk()->assertJsonPath('data.subtotal', '50.00')
            ->assertJsonPath('data.coupon_discount', '3.00')
            ->assertJsonPath('data.total', '47.00');
        $this->actingAs($owner)->postJson('/api/v1/orders', [
            'delivery_date' => now()->addDay()->toDateString(),
            'delivery_method' => 'pickup', 'phone' => '999888777', 'payment_method' => 'cash',
        ])->assertCreated()->assertJsonPath('data.total', '47.00');
        $this->assertDatabaseHas('promotions', ['coupon_code' => $code, 'uses_count' => 1]);
        $this->actingAs($owner)->postJson('/api/v1/cart/coupon', ['code' => $code])->assertUnprocessable();
        $this->actingAs($owner)->postJson("/api/v1/game/rewards/{$reward->id}/redeem")->assertUnprocessable();
        $this->actingAs($other)->postJson('/api/v1/cart/coupon', ['code' => $code])->assertUnprocessable();
        $this->assertDatabaseCount('game_reward_redemptions', 1);
    }

    public function test_administrator_can_edit_level_and_client_cannot(): void
    {
        $administrator = User::factory()->create();
        $administrator->assignRole('administrador');
        $this->actingAs($administrator)->getJson('/api/v1/admin/game/dashboard')
            ->assertOk()->assertJsonStructure(['data' => ['total_attempts', 'most_played_level']]);
        $payload = [
            'name' => 'Ruta Primavera', 'slug' => 'ruta-primavera', 'description' => 'Ruta especial',
            'difficulty' => 'facil', 'time_limit' => 50, 'initial_cake_health' => 100,
            'obstacle_count' => 5, 'completion_points' => 350, 'dulce_points_reward' => 100,
            'one_star_score' => 350, 'two_star_score' => 500, 'three_star_score' => 650,
            'sort_order' => 0, 'is_active' => true,
        ];
        $this->actingAs($administrator)->putJson('/api/v1/admin/game/levels/1', $payload)
            ->assertOk()->assertJsonPath('data.time_limit', 50);
        $this->actingAs(User::factory()->create())->putJson('/api/v1/admin/game/levels/1', $payload)->assertForbidden();
    }
}
