<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminCustomerControllerTest extends TestCase
{
    use RefreshDatabase;

    protected bool $seed = true;

    public function test_administrator_can_search_clients_and_view_purchase_history(): void
    {
        $customer = User::factory()->create(['name' => 'Ana Dulce', 'email' => 'ana@example.test']);
        $customer->assignRole('cliente');
        Order::create([
            'user_id' => $customer->id, 'number' => 'DE-CLIENT-1', 'status' => 'delivered', 'total' => 80,
            'delivery_date' => now(), 'delivery_method' => 'pickup', 'phone' => '999999999', 'placed_at' => now(),
        ]);
        $internal = User::factory()->create(['name' => 'Usuario interno']);
        $internal->assignRole('vendedor');
        $administrator = User::factory()->create();
        $administrator->assignRole('administrador');

        $this->actingAs($administrator)->getJson('/api/v1/admin/customers?search=Ana')
            ->assertOk()->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.orders_count', 1)
            ->assertJsonPath('data.0.total_spent', '80.00');
        $this->actingAs($administrator)->getJson("/api/v1/admin/customers/{$customer->id}")
            ->assertOk()->assertJsonPath('data.orders.0.number', 'DE-CLIENT-1');
        $this->actingAs($administrator)->getJson("/api/v1/admin/customers/{$internal->id}")->assertNotFound();
    }

    public function test_client_cannot_list_customers(): void
    {
        $customer = User::factory()->create();
        $customer->assignRole('cliente');

        $this->actingAs($customer)->getJson('/api/v1/admin/customers')->assertForbidden();
    }
}
