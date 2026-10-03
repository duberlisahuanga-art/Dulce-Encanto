<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Product;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Storage;
use RuntimeException;

class DemoCatalogSeeder extends Seeder
{
    public function run(): void
    {
        if (! app()->environment(['local', 'testing'])) {
            throw new RuntimeException('El catálogo de prueba solo se puede cargar en local o testing.');
        }

        $catalog = json_decode(file_get_contents(database_path('seeders/assets/demo-catalog.json')), true, 512, JSON_THROW_ON_ERROR);

        foreach ($catalog['products'] as $entry) {
            if (Product::where('slug', $entry['slug'])->exists()) {
                continue;
            }

            $category = Category::where('slug', $entry['category'])->firstOrFail();
            $imagePath = 'products/demo/'.$entry['image'];
            $contents = file_get_contents(database_path('seeders/assets/products/'.$entry['image']));

            if (! Storage::disk('public')->put($imagePath, $contents)) {
                throw new RuntimeException('No se pudo guardar la imagen de prueba: '.$entry['image']);
            }

            Product::firstOrCreate(
                ['slug' => $entry['slug']],
                [
                    'category_id' => $category->id,
                    'name' => $entry['name'],
                    'description' => $entry['description'].' Producto de prueba; precio ficticio e imagen referencial.',
                    'price' => $entry['price'],
                    'image_path' => $imagePath,
                    'is_available' => true,
                    'is_active' => true,
                ],
            );
        }
    }
}
