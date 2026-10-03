<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('promotions', function (Blueprint $table): void {
            $table->string('coupon_code', 40)->nullable()->unique()->after('cta_label');
            $table->boolean('requires_coupon')->default(false)->after('coupon_code');
            $table->decimal('minimum_purchase', 10, 2)->default(0)->after('requires_coupon');
        });
        Schema::table('carts', function (Blueprint $table): void {
            $table->foreignId('promotion_id')->nullable()->after('user_id')->constrained()->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('carts', fn (Blueprint $table) => $table->dropConstrainedForeignId('promotion_id'));
        Schema::table('promotions', fn (Blueprint $table) => $table->dropColumn(['coupon_code', 'requires_coupon', 'minimum_purchase']));
    }
};
