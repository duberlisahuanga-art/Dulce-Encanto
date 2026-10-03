<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ProductControllerTest extends TestCase
{
    use RefreshDatabase;

    protected bool $seed = true;

    public function test_administrator_can_create_a_product_with_a_valid_image(): void
    {
        Storage::fake('public');
        $administrator = User::factory()->create();
        $administrator->assignRole('administrador');
        Sanctum::actingAs($administrator);
        $category = Category::factory()->create();
        $image = UploadedFile::fake()->createWithContent(
            'torta.png',
            base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='),
        );

        $response = $this->post('/api/v1/admin/products', [
            'category_id' => $category->id,
            'name' => 'Torta floral',
            'slug' => 'torta-floral',
            'description' => 'Torta decorada con flores.',
            'price' => '89.90',
            'image' => $image,
            'is_available' => '1',
            'is_active' => '1',
        ], ['Accept' => 'application/json']);

        $response->assertSuccessful()->assertJsonPath('data.slug', 'torta-floral');
        $product = Product::where('slug', 'torta-floral')->firstOrFail();
        $this->assertDatabaseHas('products', [
            'id' => $product->id,
            'category_id' => $category->id,
            'price' => 89.90,
        ]);
        Storage::disk('public')->assertExists($product->image_path);
    }

    public function test_product_rejects_an_invalid_payload(): void
    {
        $administrator = User::factory()->create();
        $administrator->assignRole('administrador');
        Sanctum::actingAs($administrator);

        $this->postJson('/api/v1/admin/products', [
            'name' => '',
            'slug' => 'slug con espacios',
            'price' => -1,
        ])->assertUnprocessable()->assertJsonValidationErrors([
            'category_id',
            'name',
            'slug',
            'price',
            'is_available',
            'is_active',
        ]);

        $this->assertDatabaseMissing('products', ['slug' => 'slug con espacios']);
    }

    public function test_inactive_or_unavailable_products_are_hidden_from_public_catalog(): void
    {
        $category = Category::factory()->create();
        Product::factory()->for($category)->create(['name' => 'Visible']);
        Product::factory()->for($category)->create(['name' => 'Inactivo', 'is_active' => false]);
        Product::factory()->for($category)->create(['name' => 'Agotado', 'is_available' => false]);

        $this->getJson('/api/v1/catalog/products')
            ->assertOk()
            ->assertJsonFragment(['name' => 'Visible'])
            ->assertJsonMissing(['name' => 'Inactivo'])
            ->assertJsonMissing(['name' => 'Agotado']);
    }
}
