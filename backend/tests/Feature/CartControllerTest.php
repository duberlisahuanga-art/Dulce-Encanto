<?php

namespace Tests\Feature;

use App\Models\CakeOption;
use App\Models\CartItem;
use App\Models\Product;
use App\Models\Promotion;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CartControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_client_can_add_update_and_remove_an_available_product(): void
    {
        $user = User::factory()->create();
        $product = Product::factory()->create(['name' => 'Cupcake', 'price' => 12.50]);

        $this->actingAs($user)->postJson('/api/v1/cart/products', ['product_id' => $product->id, 'quantity' => 2])
            ->assertOk()->assertJsonPath('data.total', '25.00')->assertJsonPath('data.items_count', 2);
        $item = CartItem::query()->firstOrFail();
        $this->actingAs($user)->patchJson("/api/v1/cart/items/{$item->id}", ['quantity' => 3])
            ->assertOk()->assertJsonPath('data.total', '37.50');
        $this->actingAs($user)->deleteJson("/api/v1/cart/items/{$item->id}")
            ->assertOk()->assertJsonCount(0, 'data.items');
    }

    public function test_server_rejects_unavailable_product(): void
    {
        $product = Product::factory()->create(['is_available' => false]);
        $this->actingAs(User::factory()->create())->postJson('/api/v1/cart/products', [
            'product_id' => $product->id, 'quantity' => 1,
        ])->assertUnprocessable();
    }

    public function test_client_can_add_a_custom_cake_with_server_calculated_price(): void
    {
        $options = collect(['size' => 50, 'flavor' => 5, 'filling' => 4, 'covering' => 7, 'decoration' => 15])
            ->mapWithKeys(fn (int $price, string $type): array => [$type => CakeOption::factory()->create([
                'type' => $type, 'slug' => "$type-cart-test", 'price_adjustment' => $price,
            ])]);
        $this->actingAs(User::factory()->create())->postJson('/api/v1/cart/custom-cakes', [
            'size_id' => $options['size']->id, 'flavor_id' => $options['flavor']->id,
            'filling_id' => $options['filling']->id, 'covering_id' => $options['covering']->id,
            'decoration_id' => $options['decoration']->id, 'delivery_date' => now()->toDateString(),
            'theme' => 'Flores',
        ])->assertOk()->assertJsonPath('data.total', '81.00')
            ->assertJsonPath('data.items.0.type', 'custom_cake')
            ->assertJsonPath('data.items.0.configuration.theme', 'Flores');
    }

    public function test_cart_requires_authentication_and_items_are_private(): void
    {
        $this->getJson('/api/v1/cart')->assertUnauthorized();
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $product = Product::factory()->create();
        $this->actingAs($owner)->postJson('/api/v1/cart/products', ['product_id' => $product->id, 'quantity' => 1]);
        $item = CartItem::query()->firstOrFail();
        $this->actingAs($other)->deleteJson("/api/v1/cart/items/{$item->id}")->assertNotFound();
    }

    public function test_ineligible_coupon_does_not_remove_an_automatic_discount(): void
    {
        $user = User::factory()->create();
        $product = Product::factory()->create(['price' => 100]);
        $automaticPromotion = Promotion::factory()->create([
            'discount_value' => 10,
            'applies_to_all' => true,
            'requires_coupon' => false,
        ]);
        Promotion::factory()->create([
            'discount_value' => 50,
            'applies_to_all' => true,
            'requires_coupon' => true,
            'coupon_code' => 'DULCE50',
            'minimum_purchase' => 200,
        ]);

        $this->actingAs($user)->postJson('/api/v1/cart/products', [
            'product_id' => $product->id,
            'quantity' => 2,
        ])->assertOk()
            ->assertJsonPath('data.total', '180.00')
            ->assertJsonPath('data.items.0.promotion.name', $automaticPromotion->name)
            ->assertJsonPath('data.items.0.promotion.savings', '20.00');

        $this->actingAs($user)->postJson('/api/v1/cart/coupon', ['code' => 'dulce50'])
            ->assertOk()
            ->assertJsonPath('data.discount', '100.00')
            ->assertJsonPath('data.total', '100.00')
            ->assertJsonPath('data.coupon.is_eligible', true)
            ->assertJsonPath('data.coupon.amount_remaining', '0.00');

        $item = CartItem::query()->firstOrFail();
        $this->actingAs($user)->patchJson("/api/v1/cart/items/{$item->id}", ['quantity' => 1])
            ->assertOk()
            ->assertJsonPath('data.discount', '10.00')
            ->assertJsonPath('data.total', '90.00')
            ->assertJsonPath('data.coupon.is_eligible', false)
            ->assertJsonPath('data.coupon.amount_remaining', '100.00');
    }
}
