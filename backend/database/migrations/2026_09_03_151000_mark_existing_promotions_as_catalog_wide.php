<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('promotions')
            ->whereNotExists(function ($query): void {
                $query->selectRaw('1')
                    ->from('promotion_product')
                    ->whereColumn('promotion_product.promotion_id', 'promotions.id');
            })
            ->update(['applies_to_all' => true]);
    }

    public function down(): void
    {
        // Existing campaigns cannot safely be distinguished after this update.
    }
};
