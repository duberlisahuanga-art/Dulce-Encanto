<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('delivery_settings', function (Blueprint $table) {
            $table->unsignedInteger('max_units_per_product')->default(10);
            $table->unsignedInteger('max_units_per_order')->default(20);
        });
        Schema::table('cake_options', fn (Blueprint $table) => $table->string('image_path')->nullable());
        Schema::table('orders', function (Blueprint $table) {
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->text('cancellation_request')->nullable();
        });
        Schema::table('delivery_zones', function (Blueprint $table) {
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->decimal('radius_km', 8, 2)->nullable();
        });
        Schema::create('order_changes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('actor_name');
            $table->string('field');
            $table->text('old_value')->nullable();
            $table->text('new_value')->nullable();
            $table->text('reason')->nullable();
            $table->timestamp('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_changes');
        Schema::table('delivery_zones', fn (Blueprint $table) => $table->dropColumn(['latitude', 'longitude', 'radius_km']));
        Schema::table('orders', fn (Blueprint $table) => $table->dropColumn(['latitude', 'longitude', 'cancellation_request']));
        Schema::table('cake_options', fn (Blueprint $table) => $table->dropColumn('image_path'));
        Schema::table('delivery_settings', fn (Blueprint $table) => $table->dropColumn(['max_units_per_product', 'max_units_per_order']));
    }
};
