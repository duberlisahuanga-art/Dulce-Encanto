<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('promotions', function (Blueprint $table): void {
            $table->boolean('applies_to_all')->default(false)->after('is_active');
            $table->string('banner_path')->nullable()->after('applies_to_all');
            $table->string('accent_color', 7)->default('#934258')->after('banner_path');
            $table->string('cta_label', 60)->default('Ver promoción')->after('accent_color');
        });

        Schema::create('promotion_product', function (Blueprint $table): void {
            $table->foreignId('promotion_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->primary(['promotion_id', 'product_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('promotion_product');
        Schema::table('promotions', function (Blueprint $table): void {
            $table->dropColumn(['applies_to_all', 'banner_path', 'accent_color', 'cta_label']);
        });
    }
};
