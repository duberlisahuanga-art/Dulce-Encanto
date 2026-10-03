<?php

namespace Tests\Feature;

use App\Models\CakeOption;
use App\Models\DeliverySetting;
use App\Models\DeliveryZone;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class PurchaseWorkflowTest extends TestCase
{
    use RefreshDatabase;

    protected bool $seed = true;

    private function staff(string $role): User
    {
        $user = User::factory()->create();
        $user->assignRole($role);

        return $user;
    }

    private function order(string $status = 'pending', string $method = 'delivery'): Order
    {
        return Order::create(['user_id' => User::factory()->create()->id, 'number' => 'TEST-'.uniqid(), 'status' => $status, 'delivery_method' => $method, 'total' => 60, 'delivery_date' => now()->addDays(2), 'phone' => '999888777', 'placed_at' => now()]);
    }

    public function test_changes_persist_across_roles_and_are_audited(): void
    {
        $owner = $this->staff('superadministrador');
        $admin = $this->staff('administrador');
        $courier = $this->staff('repartidor');
        $order = $this->order();
        $this->actingAs($owner)->patchJson("/api/v1/admin/orders/{$order->id}", ['status' => 'confirmed', 'expected_status' => 'pending'])->assertOk()->assertJsonPath('data.status', 'confirmed');
        $this->patchJson("/api/v1/admin/delivery/orders/{$order->id}/assign", ['delivery_user_id' => $courier->id, 'expected_courier_id' => null])->assertOk();
        $this->actingAs($admin)->getJson("/api/v1/admin/orders/{$order->id}")->assertOk()->assertJsonPath('data.status', 'confirmed')->assertJsonPath('data.courier.id', $courier->id);
        $this->assertDatabaseHas('orders', ['id' => $order->id, 'status' => 'confirmed', 'delivery_user_id' => $courier->id]);
        $this->getJson("/api/v1/admin/orders/{$order->id}/history")->assertOk()->assertJsonCount(2, 'data');
        $this->patchJson("/api/v1/admin/orders/{$order->id}", ['status' => 'preparing', 'expected_status' => 'pending'])->assertConflict();
        $this->assertDatabaseHas('orders', ['id' => $order->id, 'status' => 'confirmed']);
    }

    public function test_courier_cannot_assign_even_with_legacy_permission(): void
    {
        $courier = $this->staff('repartidor');
        $order = $this->order();
        Permission::findOrCreate('delivery.gestionar', 'web');
        $courier->givePermissionTo('delivery.gestionar');
        $this->actingAs($courier)->patchJson("/api/v1/admin/delivery/orders/{$order->id}/assign", ['delivery_user_id' => $courier->id])->assertForbidden();
        $this->assertDatabaseHas('orders', ['id' => $order->id, 'delivery_user_id' => null]);
    }

    public function test_vendor_manages_an_order_until_assigning_the_courier(): void
    {
        $vendor = $this->staff('vendedor');
        $courier = $this->staff('repartidor');
        $order = $this->order();

        $this->actingAs($vendor)->patchJson("/api/v1/admin/orders/{$order->id}", ['status' => 'confirmed'])->assertOk();
        $this->patchJson("/api/v1/admin/orders/{$order->id}", ['status' => 'preparing'])->assertOk();
        $this->patchJson("/api/v1/admin/orders/{$order->id}", ['status' => 'ready'])->assertOk();
        $this->patchJson("/api/v1/admin/delivery/orders/{$order->id}/assign", ['delivery_user_id' => $courier->id])
            ->assertOk()
            ->assertJsonPath('data.courier.id', $courier->id);
        $this->patchJson("/api/v1/admin/orders/{$order->id}", ['status' => 'out_for_delivery'])->assertForbidden();
        $this->assertDatabaseHas('orders', ['id' => $order->id, 'status' => 'ready', 'delivery_user_id' => $courier->id]);

        $payment = $order->payment()->create(['method' => 'cash', 'status' => 'pending', 'amount' => 60]);
        $this->patchJson("/api/v1/admin/payments/{$payment->id}", ['status' => 'approved'])->assertOk();
        $this->assertDatabaseHas('payments', ['id' => $payment->id, 'status' => 'approved']);
    }

    public function test_pickup_skips_route_and_cancellation_requires_reason(): void
    {
        $admin = $this->staff('administrador');
        $order = $this->order('ready', 'pickup');
        $this->actingAs($admin)->patchJson("/api/v1/admin/orders/{$order->id}", ['status' => 'out_for_delivery'])->assertUnprocessable();
        $this->patchJson("/api/v1/admin/orders/{$order->id}", ['status' => 'delivered'])->assertOk();
        $this->assertNotNull($order->fresh()->delivered_at);
        $pending = $this->order();
        $this->patchJson("/api/v1/admin/orders/{$pending->id}", ['status' => 'cancelled'])->assertUnprocessable()->assertJsonValidationErrors('reason');
        $this->patchJson("/api/v1/admin/orders/{$pending->id}", ['status' => 'cancelled', 'reason' => 'Solicitado por cliente'])->assertOk();
        $this->assertDatabaseHas('order_changes', ['order_id' => $pending->id, 'reason' => 'Solicitado por cliente']);
    }

    public function test_limits_reject_addition_and_update_without_silently_truncating(): void
    {
        $user = User::factory()->create();
        $product = Product::factory()->create();
        DeliverySetting::query()->firstOrFail()->update(['minimum_lead_days' => 0, 'daily_capacity' => 20, 'opening_time' => '09:00', 'closing_time' => '18:00', 'max_units_per_product' => 2, 'max_units_per_order' => 3]);
        $response = $this->actingAs($user)->postJson('/api/v1/cart/products', ['product_id' => $product->id, 'quantity' => 2])->assertOk()->assertJsonPath('data.items_count', 2);
        $item = $response->json('data.items.0.id');
        $this->postJson('/api/v1/cart/products', ['product_id' => $product->id, 'quantity' => 1])->assertUnprocessable();
        $this->patchJson("/api/v1/cart/items/{$item}", ['quantity' => 3])->assertUnprocessable();
        $second = Product::factory()->create();
        $this->postJson('/api/v1/cart/products', ['product_id' => $second->id, 'quantity' => 2])->assertUnprocessable();
        $this->getJson('/api/v1/cart')->assertJsonPath('data.items_count', 2)->assertJsonPath('data.limits.per_order', 3);
        $this->assertDatabaseHas('cart_items', ['id' => $item, 'quantity' => 2]);
    }

    public function test_checkout_revalidates_lowered_limits_and_saves_location(): void
    {
        $user = User::factory()->create();
        $product = Product::factory()->create();
        $this->actingAs($user)->postJson('/api/v1/cart/products', ['product_id' => $product->id, 'quantity' => 2])->assertOk();
        $setting = DeliverySetting::query()->firstOrFail();
        $setting->update(['minimum_lead_days' => 0, 'daily_capacity' => 20, 'opening_time' => '09:00', 'closing_time' => '18:00', 'max_units_per_product' => 1, 'max_units_per_order' => 20]);
        $zone = DeliveryZone::query()->firstOrCreate(['name' => 'Centro'], ['fee' => 5, 'is_active' => true]);
        $zone->update(['fee' => 5, 'is_active' => true, 'latitude' => -12.0464, 'longitude' => -77.0428, 'radius_km' => 2]);
        $payload = ['delivery_date' => now()->addDays(2)->toDateString(), 'delivery_method' => 'delivery', 'delivery_zone_id' => $zone->id, 'phone' => '999888777', 'address' => 'Centro', 'latitude' => -12.0464, 'longitude' => -77.0428, 'payment_method' => 'cash'];
        $this->postJson('/api/v1/orders', $payload)->assertUnprocessable();
        $setting->update(['max_units_per_product' => 10]);
        $this->postJson('/api/v1/orders', [...$payload, 'latitude' => -13])->assertUnprocessable()->assertJsonValidationErrors('address');
        $response = $this->postJson('/api/v1/orders', $payload)->assertCreated()->assertJsonPath('data.latitude', -12.0464);
        $this->assertDatabaseHas('orders', ['id' => $response->json('data.id'), 'latitude' => -12.0464, 'longitude' => -77.0428]);
    }

    public function test_image_upload_replacement_removal_and_public_visibility(): void
    {
        Storage::fake('public');
        $admin = $this->staff('administrador');
        $payload = ['type' => 'covering', 'name' => 'Cobertura', 'slug' => 'cobertura-test', 'price_adjustment' => 5, 'sort_order' => 0, 'is_active' => 1];
        $image = UploadedFile::fake()->createWithContent('reference.png', base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jX1sAAAAASUVORK5CYII='));
        $response = $this->actingAs($admin)->postJson('/api/v1/admin/cake-options', [...$payload, 'image' => $image])->assertCreated();
        $option = CakeOption::findOrFail($response->json('data.id'));
        $old = $option->image_path;
        Storage::disk('public')->assertExists($old);
        $this->getJson('/api/v1/cake-designer/options')->assertJsonPath('data.covering.0.image_url', Storage::disk('public')->url($old));
        $this->postJson("/api/v1/admin/cake-options/{$option->id}", [...$payload, '_method' => 'PUT', 'remove_image' => 1])->assertOk()->assertJsonPath('data.image_url', null);
        Storage::disk('public')->assertMissing($old);
        $this->postJson('/api/v1/admin/cake-options', [...$payload, 'slug' => 'invalid', 'image' => UploadedFile::fake()->create('bad.svg', 1, 'image/svg+xml')])->assertUnprocessable();
    }

    public function test_customer_can_only_request_cancellation_for_own_order(): void
    {
        $order = $this->order();
        $other = User::factory()->create();
        $this->actingAs($other)->postJson("/api/v1/orders/{$order->id}/cancellation-request", ['reason' => 'Cancelar'])->assertNotFound();
        $this->actingAs($order->user)->postJson("/api/v1/orders/{$order->id}/cancellation-request", ['reason' => 'Cambio de fecha'])->assertOk();
        $this->assertDatabaseHas('orders', ['id' => $order->id, 'status' => 'pending', 'cancellation_request' => 'Cambio de fecha']);
    }

    public function test_geocoding_is_cached_and_requires_authentication(): void
    {
        Http::preventStrayRequests();
        Http::fake(['nominatim.openstreetmap.org/*' => Http::response(['display_name' => 'Av. de prueba 123'])]);
        $this->getJson('/api/v1/location/reverse?latitude=-12&longitude=-77')->assertUnauthorized();
        $this->actingAs(User::factory()->create())->getJson('/api/v1/location/reverse?latitude=-12&longitude=-77')->assertOk()->assertJsonPath('data.address', 'Av. de prueba 123');
        $this->getJson('/api/v1/location/reverse?latitude=-12&longitude=-77')->assertOk();
        Http::assertSentCount(1);
    }
}
