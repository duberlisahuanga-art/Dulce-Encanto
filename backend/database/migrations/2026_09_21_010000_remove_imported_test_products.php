<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Remove the temporary Open Food Facts catalog used during development.
     */
    public function up(): void
    {
        $testProductSlugs = [
            'off-cookie-dough-ice-cream',
            'off-glace-au-nutella',
            'off-vanilla-ice-cream',
            'off-magnum-mini-almond',
            'off-macadamia-nut-brittle',
            'off-half-baked-ice-cream',
            'off-snickers-ice-cream',
            'off-kinder-chocolate-ice-cream',
        ];

        $productIds = DB::table('products')
            ->whereIn('slug', $testProductSlugs)
            ->pluck('id');

        if ($productIds->isEmpty()) {
            return;
        }

        DB::transaction(function () use ($productIds): void {
            DB::table('cart_items')->whereIn('product_id', $productIds)->delete();
            DB::table('products')->whereIn('id', $productIds)->delete();
        });
    }

    /**
     * Removed test catalog data is intentionally not recreated.
     */
    public function down(): void
    {
        // No action required.
    }
};
