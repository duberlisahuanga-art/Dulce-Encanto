<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('delivery_zones', function (Blueprint $table) {
            $table->id(); $table->string('name')->unique(); $table->decimal('fee', 10, 2)->default(0);
            $table->boolean('is_active')->default(true); $table->timestamps();
        });
        Schema::create('delivery_settings', function (Blueprint $table) {
            $table->id(); $table->unsignedSmallInteger('minimum_lead_days')->default(1);
            $table->unsignedSmallInteger('daily_capacity')->default(20);
            $table->time('opening_time')->default('09:00'); $table->time('closing_time')->default('18:00'); $table->timestamps();
        });
        Schema::create('blocked_delivery_dates', function (Blueprint $table) {
            $table->id(); $table->date('date')->unique(); $table->string('reason')->nullable(); $table->timestamps();
        });
        Schema::table('orders', function (Blueprint $table) {
            $table->foreignId('delivery_zone_id')->nullable()->after('delivery_user_id')->constrained()->nullOnDelete();
            $table->decimal('delivery_fee', 10, 2)->default(0)->after('total');
        });
    }
    public function down(): void
    {
        Schema::table('orders', fn (Blueprint $table) => $table->dropConstrainedForeignId('delivery_zone_id'));
        Schema::dropIfExists('blocked_delivery_dates'); Schema::dropIfExists('delivery_settings'); Schema::dropIfExists('delivery_zones');
    }
};
