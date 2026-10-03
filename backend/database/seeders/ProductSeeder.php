<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Product;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Storage;

class ProductSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $products = [
            ['category' => 'tortas', 'name' => 'Torta de chocolate clásica', 'slug' => 'torta-de-chocolate', 'description' => 'Bizcocho de chocolate con relleno de manjar y cobertura de fudge.', 'price' => 65, 'image' => 'category-cake.webp'],
            ['category' => 'tortas', 'name' => 'Torta Red Velvet', 'slug' => 'torta-red-velvet', 'description' => 'Capas de Red Velvet con frosting suave de queso crema.', 'price' => 78, 'image' => 'product-red-velvet-cake.webp'],
            ['category' => 'tortas', 'name' => 'Torta de vainilla y fresas', 'slug' => 'torta-vainilla-fresas', 'description' => 'Bizcocho de vainilla, crema ligera y fresas frescas.', 'price' => 72, 'image' => 'category-cake.webp'],
            ['category' => 'tortas', 'name' => 'Torta tres leches', 'slug' => 'torta-tres-leches', 'description' => 'Bizcocho húmedo bañado en tres leches y decorado con crema.', 'price' => 68, 'image' => 'category-cake.webp'],
            ['category' => 'tortas', 'name' => 'Torta de celebración', 'slug' => 'torta-celebracion', 'description' => 'Torta decorada para cumpleaños y momentos especiales.', 'price' => 85, 'image' => 'product-red-velvet-cake.webp'],
            ['category' => 'tortas', 'name' => 'Torta de chocolate intenso', 'slug' => 'torta-chocolate-intenso', 'description' => 'Chocolate oscuro, ganache y relleno cremoso de cacao.', 'price' => 82, 'image' => 'category-cake.webp'],

            ['category' => 'cupcakes', 'name' => 'Caja de 6 cupcakes surtidos', 'slug' => 'caja-6-cupcakes', 'description' => 'Seis cupcakes decorados con sabores variados.', 'price' => 35, 'image' => 'category-cupcakes.webp'],
            ['category' => 'cupcakes', 'name' => 'Cupcakes de vainilla', 'slug' => 'cupcakes-vainilla', 'description' => 'Seis cupcakes de vainilla con buttercream artesanal.', 'price' => 32, 'image' => 'category-cupcakes.webp'],
            ['category' => 'cupcakes', 'name' => 'Cupcakes de chocolate', 'slug' => 'cupcakes-chocolate', 'description' => 'Seis cupcakes de cacao con cobertura de chocolate.', 'price' => 38, 'image' => 'category-cupcakes.webp'],
            ['category' => 'cupcakes', 'name' => 'Cupcakes para cumpleaños', 'slug' => 'cupcakes-cumpleanos', 'description' => 'Seis cupcakes personalizados con colores de celebración.', 'price' => 42, 'image' => 'category-cupcakes.webp'],

            ['category' => 'postres', 'name' => 'Brownies artesanales', 'slug' => 'brownies-artesanales', 'description' => 'Caja de seis brownies húmedos con chocolate.', 'price' => 30, 'image' => 'category-brownies.webp'],
            ['category' => 'postres', 'name' => 'Galletas con chispas', 'slug' => 'galletas-con-chispas', 'description' => 'Caja de ocho galletas suaves con abundantes chispas de chocolate.', 'price' => 28, 'image' => 'category-cookies.webp'],
            ['category' => 'postres', 'name' => 'Donas glaseadas', 'slug' => 'donas-glaseadas', 'description' => 'Caja de seis donas con glaseados de diferentes sabores.', 'price' => 34, 'image' => 'catergory-donuts.webp'],
            ['category' => 'postres', 'name' => 'Postre de chocolate en vaso', 'slug' => 'postre-chocolate-vaso', 'description' => 'Capas de bizcocho, crema y chocolate listas para disfrutar.', 'price' => 14, 'image' => 'category-jar-cake.webp'],
            ['category' => 'postres', 'name' => 'Bombones de chocolate', 'slug' => 'bombones-chocolate', 'description' => 'Selección de doce bombones artesanales.', 'price' => 40, 'image' => 'category-chocolates.webp'],
            ['category' => 'postres', 'name' => 'Cheesecake de frutos rojos', 'slug' => 'cheesecake-frutos-rojos', 'description' => 'Cheesecake cremoso con salsa artesanal de frutos rojos.', 'price' => 55, 'image' => 'category-cake.webp'],

            ['category' => 'bocaditos', 'name' => 'Box dulce para compartir', 'slug' => 'box-dulce-compartir', 'description' => 'Surtido de brownies, galletas, chocolates y mini postres.', 'price' => 58, 'image' => 'category-gift-hampers.webp'],
            ['category' => 'bocaditos', 'name' => 'Mini brownies', 'slug' => 'mini-brownies', 'description' => 'Doce bocaditos de brownie ideales para reuniones.', 'price' => 32, 'image' => 'category-brownies.webp'],
            ['category' => 'bocaditos', 'name' => 'Mini donas surtidas', 'slug' => 'mini-donas-surtidas', 'description' => 'Doce mini donas con glaseados variados.', 'price' => 36, 'image' => 'catergory-donuts.webp'],
            ['category' => 'bocaditos', 'name' => 'Trufas de chocolate', 'slug' => 'trufas-chocolate', 'description' => 'Doce trufas suaves cubiertas con cacao y chocolate.', 'price' => 38, 'image' => 'category-chocolates.webp'],

            ['category' => 'zona-fria', 'name' => 'Helado cheesecake de fresa', 'slug' => 'helado-cheesecake-fresa', 'description' => 'Helado cremoso de cheesecake con fresas y crocante de galleta.', 'price' => 16, 'image' => 'zona-fria-helado-fresa.png'],
            ['category' => 'zona-fria', 'name' => 'Copa frutos rojos', 'slug' => 'copa-helada-frutos-rojos', 'description' => 'Copa fría de crema helada, salsa de frutos rojos y crumble artesanal.', 'price' => 18, 'image' => 'zona-fria-helado-fresa.png'],
            ['category' => 'zona-fria', 'name' => 'Frappé de maracuyá y mango', 'slug' => 'frappe-maracuya-mango', 'description' => 'Bebida frappé tropical con pulpa de maracuyá y mango.', 'price' => 14, 'image' => 'zona-fria-frappe-maracuya.png'],
            ['category' => 'zona-fria', 'name' => 'Frappé tropical para compartir', 'slug' => 'frappe-tropical-compartir', 'description' => 'Dos bebidas frías de mango y maracuyá para refrescar la tarde.', 'price' => 25, 'image' => 'zona-fria-frappe-maracuya.png'],
            ['category' => 'zona-fria', 'name' => 'Sándwich helado de brownie', 'slug' => 'sandwich-helado-brownie', 'description' => 'Helado de vainilla entre dos brownies intensos de chocolate.', 'price' => 15, 'image' => 'zona-fria-sandwich-helado.png'],
            ['category' => 'zona-fria', 'name' => 'Dúo de brownie con helado', 'slug' => 'duo-brownie-helado', 'description' => 'Dos sándwiches fríos de brownie y helado artesanal de vainilla.', 'price' => 27, 'image' => 'zona-fria-sandwich-helado.png'],
        ];

        foreach ($products as $product) {
            $category = Category::where('slug', $product['category'])->firstOrFail();
            $imagePath = 'products/demo/'.$product['image'];
            $sourcePath = database_path('seeders/assets/products/'.$product['image']);

            Storage::disk('public')->put($imagePath, file_get_contents($sourcePath));

            Product::updateOrCreate(
                ['slug' => $product['slug']],
                [
                    'category_id' => $category->id,
                    'name' => $product['name'],
                    'description' => $product['description'],
                    'price' => $product['price'],
                    'image_path' => $imagePath,
                    'is_available' => true,
                    'is_active' => true,
                ],
            );
        }
    }
}
