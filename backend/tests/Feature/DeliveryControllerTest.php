<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DeliveryControllerTest extends TestCase
{
    use RefreshDatabase;

    protected bool $seed = true;

    public function test_administrator_assigns_delivery_and_courier_completes_it(): void
    {
        $customer = User::factory()->create();
        $customer->assignRole('cliente');
        $courier = User::role('repartidor')->firstOrFail();
        $administrator = User::role('administrador')->firstOrFail();
        $order = Order::create([
            'user_id' => $customer->id, 'number' => 'DE-DELIVERY-1', 'status' => 'ready', 'total' => 80,
            'delivery_date' => today(), 'delivery_method' => 'delivery', 'phone' => '999999999',
            'address' => 'Av. Dulce 123', 'placed_at' => now(),
        ]);

        $this->actingAs($administrator)->patchJson("/api/v1/admin/delivery/orders/{$order->id}/assign", [
            'delivery_user_id' => $courier->id,
        ])->assertOk()->assertJsonPath('data.courier.id', $courier->id);

        $this->actingAs($courier)->getJson('/api/v1/delivery/orders')
            ->assertOk()->assertJsonCount(1, 'data');
        $this->actingAs($courier)->patchJson("/api/v1/delivery/orders/{$order->id}", ['status' => 'out_for_delivery'])
            ->assertOk()->assertJsonPath('data.status', 'out_for_delivery');
        $this->actingAs($courier)->patchJson('/api/v1/delivery/location', [
            'latitude' => -12.0464,
            'longitude' => -77.0428,
        ])->assertOk();
        $this->actingAs($customer)->getJson('/api/v1/orders')
            ->assertOk()
            ->assertJsonPath('data.0.courier.id', $courier->id)
            ->assertJsonPath('data.0.courier.latitude', -12.0464)
            ->assertJsonPath('data.0.courier.longitude', -77.0428);
        $this->actingAs($courier)->patchJson("/api/v1/delivery/orders/{$order->id}/issue", [
            'issue' => 'delayed',
            'note' => 'Tráfico intenso en la ruta.',
        ])->assertOk()
            ->assertJsonPath('data.delivery_issue', 'delayed');
        $this->actingAs($customer)->getJson('/api/v1/orders')
            ->assertOk()
            ->assertJsonPath('data.0.delivery_issue', 'delayed')
            ->assertJsonPath('data.0.delivery_issue_note', 'Tráfico intenso en la ruta.');
        $this->actingAs($courier)->patchJson("/api/v1/delivery/orders/{$order->id}", ['status' => 'delivered'])
            ->assertOk()
            ->assertJsonPath('data.status', 'delivered')
            ->assertJsonPath('data.courier.latitude', null)
            ->assertJsonPath('data.delivery_issue', null);

        $this->assertNotNull($order->fresh()->dispatched_at);
        $this->assertNotNull($order->fresh()->delivered_at);
    }

    public function test_courier_cannot_update_another_couriers_order(): void
    {
        $customer = User::factory()->create();
        $customer->assignRole('cliente');
        $assigned = User::role('repartidor')->firstOrFail();
        $other = User::factory()->create();
        $other->assignRole('repartidor');
        $order = Order::create([
            'user_id' => $customer->id, 'delivery_user_id' => $assigned->id, 'number' => 'DE-DELIVERY-2',
            'status' => 'ready', 'total' => 40, 'delivery_date' => today(), 'delivery_method' => 'delivery',
            'phone' => '999999999', 'address' => 'Av. Dulce 123', 'placed_at' => now(),
        ]);

        $this->actingAs($other)->patchJson("/api/v1/delivery/orders/{$order->id}", ['status' => 'out_for_delivery'])
            ->assertNotFound();
        $this->actingAs($other)->patchJson("/api/v1/delivery/orders/{$order->id}/issue", [
            'issue' => 'delayed',
            'note' => 'Sin acceso.',
        ])->assertNotFound();
    }
}
