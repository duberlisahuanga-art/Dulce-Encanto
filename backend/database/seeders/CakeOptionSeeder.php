<?php

namespace Database\Seeders;

use App\Models\CakeOption;
use Illuminate\Database\Seeder;

class CakeOptionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $options = [
            ['type' => 'size', 'name' => 'Personal', 'slug' => 'personal', 'description' => 'Para 2 personas.', 'price_adjustment' => 20, 'servings' => 2],
            ['type' => 'size', 'name' => 'Pequeña', 'slug' => 'pequena', 'description' => 'Para 8 personas.', 'price_adjustment' => 35, 'servings' => 8],
            ['type' => 'size', 'name' => 'Mediana', 'slug' => 'mediana', 'description' => 'Para 15 personas.', 'price_adjustment' => 50, 'servings' => 15],
            ['type' => 'size', 'name' => 'Grande', 'slug' => 'grande', 'description' => 'Para 25 personas.', 'price_adjustment' => 75, 'servings' => 25],

            ['type' => 'flavor', 'name' => 'Vainilla', 'slug' => 'vainilla', 'price_adjustment' => 0],
            ['type' => 'flavor', 'name' => 'Chocolate', 'slug' => 'chocolate', 'price_adjustment' => 5],
            ['type' => 'flavor', 'name' => 'Red Velvet', 'slug' => 'red-velvet', 'price_adjustment' => 8],
            ['type' => 'flavor', 'name' => 'Zanahoria', 'slug' => 'zanahoria', 'price_adjustment' => 6],
            ['type' => 'flavor', 'name' => 'Naranja', 'slug' => 'naranja', 'price_adjustment' => 4],

            ['type' => 'filling', 'name' => 'Manjar', 'slug' => 'manjar', 'price_adjustment' => 0],
            ['type' => 'filling', 'name' => 'Fudge', 'slug' => 'fudge', 'price_adjustment' => 4],
            ['type' => 'filling', 'name' => 'Oreo', 'slug' => 'oreo', 'price_adjustment' => 6],
            ['type' => 'filling', 'name' => 'Fresas con crema', 'slug' => 'fresas-con-crema', 'price_adjustment' => 8],
            ['type' => 'filling', 'name' => 'Mousse de chocolate', 'slug' => 'mousse-chocolate', 'price_adjustment' => 8],

            ['type' => 'covering', 'name' => 'Chantilly', 'slug' => 'chantilly', 'price_adjustment' => 0, 'available_colors' => ['Blanco', 'Rosado', 'Celeste', 'Lila', 'Amarillo']],
            ['type' => 'covering', 'name' => 'Buttercream', 'slug' => 'buttercream', 'price_adjustment' => 5, 'available_colors' => ['Blanco', 'Rosado', 'Celeste', 'Lila', 'Verde']],
            ['type' => 'covering', 'name' => 'Ganache', 'slug' => 'ganache', 'price_adjustment' => 7, 'available_colors' => ['Chocolate', 'Blanco']],
            ['type' => 'covering', 'name' => 'Fondant', 'slug' => 'fondant', 'price_adjustment' => 15, 'available_colors' => ['Blanco', 'Rosado', 'Celeste', 'Rojo', 'Negro', 'Dorado']],

            ['type' => 'decoration', 'name' => 'Simple', 'slug' => 'simple', 'price_adjustment' => 0],
            ['type' => 'decoration', 'name' => 'Floral', 'slug' => 'floral', 'price_adjustment' => 15],
            ['type' => 'decoration', 'name' => 'Infantil', 'slug' => 'infantil', 'price_adjustment' => 20],
            ['type' => 'decoration', 'name' => 'Fútbol', 'slug' => 'futbol', 'price_adjustment' => 18],
            ['type' => 'decoration', 'name' => 'Graduación', 'slug' => 'graduacion', 'price_adjustment' => 18],
            ['type' => 'decoration', 'name' => 'Matrimonio', 'slug' => 'matrimonio', 'price_adjustment' => 25],
            ['type' => 'decoration', 'name' => 'Elegante', 'slug' => 'elegante', 'price_adjustment' => 15],
            ['type' => 'decoration', 'name' => 'Personalizada', 'slug' => 'personalizada', 'price_adjustment' => 30],

            ['type' => 'extra', 'name' => 'Topper personalizado', 'slug' => 'topper-personalizado', 'price_adjustment' => 5],
            ['type' => 'extra', 'name' => 'Velas', 'slug' => 'velas', 'price_adjustment' => 3],
            ['type' => 'extra', 'name' => 'Fotografía comestible', 'slug' => 'fotografia-comestible', 'price_adjustment' => 15],
            ['type' => 'extra', 'name' => 'Flores naturales', 'slug' => 'flores-naturales', 'price_adjustment' => 20],
            ['type' => 'extra', 'name' => 'Chocolates', 'slug' => 'chocolates', 'price_adjustment' => 10],
            ['type' => 'extra', 'name' => 'Frutas', 'slug' => 'frutas', 'price_adjustment' => 12],
            ['type' => 'extra', 'name' => 'Macarons', 'slug' => 'macarons', 'price_adjustment' => 15],
        ];

        foreach ($options as $index => $option) {
            CakeOption::updateOrCreate(
                ['type' => $option['type'], 'slug' => $option['slug']],
                [
                    ...$option,
                    'description' => $option['description'] ?? null,
                    'servings' => $option['servings'] ?? null,
                    'available_colors' => $option['available_colors'] ?? null,
                    'sort_order' => $index,
                    'is_active' => true,
                ],
            );
        }
    }
}
