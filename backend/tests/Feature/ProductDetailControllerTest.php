<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProductDetailControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_product_detail_includes_category_and_related_products(): void
    {
        $category = Category::factory()->create(['is_active' => true]);
        $product = Product::factory()->for($category)->create(['slug' => 'torta-principal']);
        $related = Product::factory()->for($category)->create(['name' => 'Torta relacionada']);
        Product::factory()->for($category)->create(['is_active' => false]);

        $this->getJson('/api/v1/catalog/products/torta-principal')
            ->assertOk()
            ->assertJsonPath('data.id', $product->id)
            ->assertJsonPath('data.category.id', $category->id)
            ->assertJsonPath('related.0.id', $related->id)
            ->assertJsonCount(1, 'related');
    }

    public function test_hidden_unavailable_or_inactive_category_product_returns_not_found(): void
    {
        $hidden = Product::factory()->create(['slug' => 'producto-oculto', 'is_active' => false]);
        $unavailable = Product::factory()->create(['slug' => 'producto-agotado', 'is_available' => false]);
        $inactiveCategory = Category::factory()->create(['is_active' => false]);
        $categoryProduct = Product::factory()->for($inactiveCategory)->create(['slug' => 'categoria-oculta']);

        foreach ([$hidden, $unavailable, $categoryProduct] as $product) {
            $this->getJson("/api/v1/catalog/products/{$product->slug}")->assertNotFound();
        }
    }
}
