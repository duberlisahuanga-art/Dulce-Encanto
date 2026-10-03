<?php

namespace Tests\Feature;

use App\Models\Product;
use Database\Seeders\DemoCatalogSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use Tests\TestCase;

class DemoCatalogSeederTest extends TestCase
{
    use RefreshDatabase;

    protected bool $seed = true;

    public function test_demo_catalog_is_public_and_keeps_edits_when_loaded_again(): void
    {
        Storage::fake('public');
        $existing = Product::factory()->create(['name' => 'Producto del negocio', 'price' => 123]);
        $productsBeforeImport = Product::count();

        $this->seed(DemoCatalogSeeder::class);

        $this->assertDatabaseCount('products', $productsBeforeImport + 25);
        $this->assertSame('123.00', $existing->fresh()->price);
        $this->getJson('/api/v1/catalog/products')
            ->assertOk()
            ->assertJsonFragment(['slug' => 'demo-torta-mousse-chocolate', 'price' => '88.00']);

        $product = Product::where('slug', 'demo-torta-mousse-chocolate')->firstOrFail();
        Storage::disk('public')->assertExists($product->image_path);
        $product->update(['name' => 'Mi torta editada', 'price' => 99, 'is_active' => false]);

        $this->seed(DemoCatalogSeeder::class);

        $this->assertDatabaseCount('products', $productsBeforeImport + 25);
        $this->assertSame('Mi torta editada', $product->fresh()->name);
        $this->assertSame('99.00', $product->fresh()->price);
        $this->assertFalse($product->fresh()->is_active);
    }

    public function test_demo_catalog_refuses_production(): void
    {
        $this->app->instance('env', 'production');

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('El catálogo de prueba solo se puede cargar en local o testing.');

        $this->app->make(DemoCatalogSeeder::class)->run();
    }
}
