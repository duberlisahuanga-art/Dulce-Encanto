<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Product;
use App\Models\Promotion;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CategoryControllerTest extends TestCase
{
    use RefreshDatabase;

    protected bool $seed = true;

    public function test_public_catalog_returns_only_active_categories_and_products(): void
    {
        $activeCategory = Category::factory()->create(['name' => 'Especiales', 'sort_order' => 0]);
        $inactiveCategory = Category::factory()->create(['is_active' => false]);
        Product::factory()->for($activeCategory)->create(['name' => 'Producto visible']);
        Product::factory()->for($activeCategory)->create(['name' => 'Producto oculto', 'is_active' => false]);
        Product::factory()->for($inactiveCategory)->create(['name' => 'Categoría oculta']);

        $this->getJson('/api/v1/catalog/categories')
            ->assertOk()
            ->assertJsonFragment(['name' => 'Especiales'])
            ->assertJsonPath('data.0.products_count', 1)
            ->assertJsonFragment(['name' => 'Producto visible'])
            ->assertJsonMissing(['name' => 'Producto oculto'])
            ->assertJsonMissing(['name' => 'Categoría oculta']);
    }

    public function test_public_catalog_exposes_automatic_and_coupon_promotions_visually(): void
    {
        $product = Product::factory()->create(['price' => 100]);
        $automatic = Promotion::factory()->create([
            'name' => 'Oferta automática',
            'discount_type' => 'percentage',
            'discount_value' => 15,
            'applies_to_all' => false,
            'requires_coupon' => false,
        ]);
        $coupon = Promotion::factory()->create([
            'name' => 'Cupón especial',
            'discount_type' => 'fixed',
            'discount_value' => 20,
            'applies_to_all' => false,
            'requires_coupon' => true,
            'coupon_code' => 'DULCE20',
            'minimum_purchase' => 80,
        ]);
        $automatic->products()->attach($product);
        $coupon->products()->attach($product);

        $response = $this->getJson('/api/v1/catalog/categories')->assertOk();

        $catalogProduct = collect($response->json('data'))
            ->flatMap(fn (array $category) => $category['products'])
            ->firstWhere('id', $product->id);

        $this->assertNotNull($catalogProduct);
        $this->assertSame('100.00', $catalogProduct['original_price']);
        $this->assertSame('85.00', $catalogProduct['discounted_price']);
        $this->assertSame('Oferta automática', $catalogProduct['promotion']['name']);
        $this->assertSame('15.00', $catalogProduct['promotion']['discount']);
        $this->assertSame('Cupón especial', $catalogProduct['coupon_promotion']['name']);
        $this->assertSame('DULCE20', $catalogProduct['coupon_promotion']['coupon_code']);
    }

    public function test_administrator_can_create_update_and_delete_an_empty_category(): void
    {
        $administrator = User::factory()->create();
        $administrator->assignRole('administrador');
        Sanctum::actingAs($administrator);

        $createResponse = $this->postJson('/api/v1/admin/categories', [
            'name' => 'Galletas',
            'slug' => 'galletas',
            'description' => 'Galletas artesanales.',
            'sort_order' => 5,
            'is_active' => true,
        ]);

        $createResponse->assertSuccessful()->assertJsonPath('data.slug', 'galletas');
        $category = Category::where('slug', 'galletas')->firstOrFail();
        $this->assertDatabaseHas('categories', ['id' => $category->id, 'name' => 'Galletas']);

        $this->putJson("/api/v1/admin/categories/{$category->id}", [
            'name' => 'Galletas premium',
            'slug' => 'galletas-premium',
            'description' => null,
            'sort_order' => 6,
            'is_active' => false,
        ])->assertOk()->assertJsonPath('data.is_active', false);

        $this->assertDatabaseHas('categories', [
            'id' => $category->id,
            'slug' => 'galletas-premium',
            'is_active' => false,
        ]);

        $this->deleteJson("/api/v1/admin/categories/{$category->id}")->assertNoContent();
        $this->assertDatabaseMissing('categories', ['id' => $category->id]);
    }

    public function test_client_receives_403_when_creating_a_category(): void
    {
        $client = User::factory()->create();
        $client->assignRole('cliente');
        Sanctum::actingAs($client);

        $this->postJson('/api/v1/admin/categories', [
            'name' => 'No autorizada',
            'slug' => 'no-autorizada',
            'sort_order' => 0,
            'is_active' => true,
        ])->assertForbidden();

        $this->assertDatabaseMissing('categories', ['slug' => 'no-autorizada']);
    }

    public function test_category_with_products_returns_422_when_deleted(): void
    {
        $administrator = User::factory()->create();
        $administrator->assignRole('administrador');
        Sanctum::actingAs($administrator);
        $category = Category::factory()->create();
        Product::factory()->for($category)->create();

        $this->deleteJson("/api/v1/admin/categories/{$category->id}")
            ->assertUnprocessable()
            ->assertJsonPath('message', 'No se puede eliminar una categoría que contiene productos.');

        $this->assertModelExists($category);
    }
}
