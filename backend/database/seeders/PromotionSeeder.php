<?php

namespace Database\Seeders;

use App\Models\Product;
use App\Models\Promotion;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Storage;

class PromotionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $bannerPath = 'promotions/demo/verano-bajo-cero.png';
        Storage::disk('public')->put(
            $bannerPath,
            file_get_contents(database_path('seeders/assets/products/zona-fria-frappe-maracuya.png')),
        );

        $automatic = Promotion::updateOrCreate(
            ['name' => 'Verano bajo cero'],
            [
                'description' => 'Disfruta un descuento especial en los favoritos de Zona fría.',
                'discount_type' => 'percentage',
                'discount_value' => 15,
                'starts_at' => today(),
                'ends_at' => today()->addMonths(3),
                'is_active' => true,
                'applies_to_all' => false,
                'banner_path' => $bannerPath,
                'accent_color' => '#087a9b',
                'cta_label' => 'Ver productos fríos',
                'coupon_code' => null,
                'requires_coupon' => false,
                'minimum_purchase' => 0,
            ],
        );
        $automatic->products()->sync(
            Product::whereIn('slug', [
                'helado-cheesecake-fresa',
                'frappe-maracuya-mango',
                'sandwich-helado-brownie',
            ])->pluck('id'),
        );

        $coupon = Promotion::updateOrCreate(
            ['name' => 'Dúo refrescante'],
            [
                'description' => 'Ahorra S/ 5 en productos fríos seleccionados usando el cupón.',
                'discount_type' => 'fixed',
                'discount_value' => 5,
                'starts_at' => today(),
                'ends_at' => today()->addMonths(3),
                'is_active' => true,
                'applies_to_all' => false,
                'banner_path' => $bannerPath,
                'accent_color' => '#064f72',
                'cta_label' => 'Elegir mi dúo',
                'coupon_code' => 'ZONAFRIA5',
                'requires_coupon' => true,
                'minimum_purchase' => 25,
            ],
        );
        $coupon->products()->sync(
            Product::whereIn('slug', [
                'frappe-tropical-compartir',
                'duo-brownie-helado',
            ])->pluck('id'),
        );
    }
}
