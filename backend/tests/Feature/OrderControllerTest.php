<?php

namespace Tests\Feature;

use App\Models\Cart;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use App\Models\DeliveryZone;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class OrderControllerTest extends TestCase
{
    use RefreshDatabase;

    protected bool $seed = true;

    public function test_client_converts_cart_into_an_immutable_order(): void
    {
        $user = User::factory()->create();
        $product = Product::factory()->create(['name' => 'Torta especial', 'price' => 25]);
        $cart = Cart::create(['user_id' => $user->id]);
        $cart->items()->create(['product_id' => $product->id, 'type' => 'product', 'name' => $product->name, 'unit_price' => 25, 'quantity' => 2]);
        $zone = DeliveryZone::firstOrCreate(['name' => 'Centro'], ['fee' => 5, 'is_active' => true]);

        $response = $this->actingAs($user)->postJson('/api/v1/orders', [
            'delivery_date' => now()->addDay()->toDateString(),
            'delivery_method' => 'delivery',
            'delivery_zone_id' => $zone->id,
            'phone' => '999888777',
            'address' => 'Av. Dulce 123',
            'latitude' => -12.0464,
            'longitude' => -77.0428,
            'notes' => 'Llamar antes de llegar.',
            'payment_method' => 'yape',
        ])->assertCreated()
            ->assertJsonPath('data.status', 'pending')
            ->assertJsonPath('data.total', '55.00')
            ->assertJsonPath('data.items.0.name', 'Torta especial');
        $response->assertJsonPath('data.payment.method', 'yape');

        $this->assertStringStartsWith('DE-', $response->json('data.number'));
        $this->assertDatabaseCount('cart_items', 0);
        $product->update(['name' => 'Nombre cambiado', 'price' => 90]);
        $this->assertDatabaseHas('order_items', ['name' => 'Torta especial', 'unit_price' => 25]);
    }

    public function test_empty_cart_and_invalid_delivery_are_rejected(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->postJson('/api/v1/orders', [
            'delivery_date' => now()->addDay()->toDateString(), 'delivery_method' => 'pickup', 'phone' => '999888777', 'payment_method' => 'cash',
        ])->assertUnprocessable()->assertJsonPath('message', 'El carrito está vacío.');

        $cart = Cart::create(['user_id' => $user->id]);
        $cart->items()->create(['type' => 'product', 'name' => 'Producto', 'unit_price' => 10, 'quantity' => 1]);
        $this->actingAs($user)->postJson('/api/v1/orders', [
            'delivery_date' => now()->addDay()->toDateString(), 'delivery_method' => 'delivery', 'phone' => '999888777', 'payment_method' => 'cash',
        ])->assertUnprocessable()->assertJsonValidationErrors('address');
    }

    public function test_checkout_rejects_missing_fields_and_non_numeric_phone(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->postJson('/api/v1/orders', [
            'delivery_date' => '',
            'delivery_method' => 'pickup',
            'phone' => '999ABC777',
            'payment_method' => '',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['delivery_date', 'phone', 'payment_method'])
            ->assertJsonPath('errors.phone.0', 'El teléfono debe tener exactamente 9 números.');
    }

    public function test_orders_are_private_and_administrator_can_change_status(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $order = Order::create([
            'user_id' => $owner->id, 'number' => 'DE-TEST-001', 'status' => 'pending', 'total' => 20,
            'delivery_date' => now()->addDay(), 'delivery_method' => 'pickup', 'phone' => '999888777', 'placed_at' => now(),
        ]);

        $this->actingAs($other)->getJson("/api/v1/orders/{$order->id}")->assertNotFound();
        $administrator = User::factory()->create();
        $administrator->assignRole('administrador');
        $this->actingAs($administrator)->patchJson("/api/v1/admin/orders/{$order->id}", ['status' => 'confirmed'])
            ->assertOk()->assertJsonPath('data.status', 'confirmed');
    }

    public function test_customer_receives_only_public_status_history_for_their_order(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $order = Order::create([
            'user_id' => $owner->id,
            'number' => 'DE-HISTORY-001',
            'status' => 'confirmed',
            'total' => 40,
            'delivery_date' => now()->addDay(),
            'delivery_method' => 'delivery',
            'phone' => '999888777',
            'address' => 'Av. Dulce 123',
            'placed_at' => now(),
        ]);
        DB::table('order_changes')->insert([
            [
                'order_id' => $order->id,
                'user_id' => null,
                'actor_name' => 'Dato interno',
                'field' => 'status',
                'old_value' => 'pending',
                'new_value' => 'confirmed',
                'reason' => 'Motivo interno',
                'created_at' => now(),
            ],
            [
                'order_id' => $order->id,
                'user_id' => null,
                'actor_name' => 'Dato interno',
                'field' => 'courier',
                'old_value' => null,
                'new_value' => 'Repartidor',
                'reason' => null,
                'created_at' => now(),
            ],
        ]);

        $this->actingAs($owner)->getJson('/api/v1/orders')
            ->assertOk()
            ->assertJsonPath('data.0.status_history.0.status', 'confirmed')
            ->assertJsonCount(1, 'data.0.status_history')
            ->assertJsonMissing(['actor_name' => 'Dato interno'])
            ->assertJsonMissing(['reason' => 'Motivo interno']);

        $this->actingAs($other)->getJson("/api/v1/orders/{$order->id}")->assertNotFound();
    }

    public function test_checkout_synchronizes_current_catalog_price(): void
    {
        $user = User::factory()->create();
        $product = Product::factory()->create(['name' => 'Pastel de fresa', 'price' => 30]);
        $cart = Cart::create(['user_id' => $user->id]);
        $cart->items()->create([
            'product_id' => $product->id,
            'type' => 'product',
            'name' => $product->name,
            'unit_price' => 20, // precio antiguo desactualizado en carrito
            'quantity' => 2,
        ]);

        $this->actingAs($user)->postJson('/api/v1/orders', [
            'delivery_date' => now()->addDay()->toDateString(),
            'delivery_method' => 'pickup',
            'phone' => '999888777',
            'payment_method' => 'cash',
        ])->assertCreated()
            ->assertJsonPath('data.total', '60.00')
            ->assertJsonPath('data.items.0.unit_price', '30.00');

        $this->assertDatabaseHas('order_items', ['unit_price' => 30]);
    }

    public function test_checkout_rejects_when_daily_capacity_is_reached(): void
    {
        $settings = \App\Models\DeliverySetting::firstOrCreate([], ['daily_capacity' => 1]);
        $settings->update(['daily_capacity' => 1]);

        $deliveryDate = now()->addDays(2)->toDateString();
        $user1 = User::factory()->create();
        Order::create([
            'user_id' => $user1->id,
            'number' => 'DE-CAP-001',
            'status' => 'pending',
            'total' => 20,
            'delivery_date' => $deliveryDate,
            'delivery_method' => 'pickup',
            'phone' => '999888777',
            'placed_at' => now(),
        ]);

        $user2 = User::factory()->create();
        $product = Product::factory()->create(['price' => 20]);
        $cart = Cart::create(['user_id' => $user2->id]);
        $cart->items()->create([
            'product_id' => $product->id,
            'type' => 'product',
            'name' => $product->name,
            'unit_price' => 20,
            'quantity' => 1,
        ]);

        $this->actingAs($user2)->postJson('/api/v1/orders', [
            'delivery_date' => $deliveryDate,
            'delivery_method' => 'pickup',
            'phone' => '999888777',
            'payment_method' => 'cash',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('delivery_date')
            ->assertJsonPath('errors.delivery_date.0', 'Ya se alcanzó la capacidad máxima para esa fecha.');
    }
}
