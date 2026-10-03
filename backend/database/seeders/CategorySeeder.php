<?php

namespace Database\Seeders;

use App\Models\Category;
use Illuminate\Database\Seeder;

class CategorySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $categories = [
            ['name' => 'Tortas', 'slug' => 'tortas', 'description' => 'Tortas para toda ocasión.', 'sort_order' => 1],
            ['name' => 'Cupcakes', 'slug' => 'cupcakes', 'description' => 'Cupcakes decorados y personalizados.', 'sort_order' => 2],
            ['name' => 'Postres', 'slug' => 'postres', 'description' => 'Postres artesanales para compartir.', 'sort_order' => 3],
            ['name' => 'Bocaditos', 'slug' => 'bocaditos', 'description' => 'Opciones dulces para eventos.', 'sort_order' => 4],
            ['name' => 'Zona fría', 'slug' => 'zona-fria', 'description' => 'Helados, bebidas y postres para disfrutar bien fríos.', 'sort_order' => 5],
        ];

        foreach ($categories as $category) {
            Category::updateOrCreate(
                ['slug' => $category['slug']],
                [...$category, 'is_active' => true],
            );
        }
    }
}
