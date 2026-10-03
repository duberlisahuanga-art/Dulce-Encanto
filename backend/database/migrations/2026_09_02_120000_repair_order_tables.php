<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('orders', 'user_id')) {
            Schema::table('orders', function (Blueprint $table): void {
                $table->foreignId('user_id')->after('id')->constrained()->cascadeOnDelete();
                $table->string('number', 30)->after('user_id')->unique();
                $table->string('status', 30)->after('number')->default('pending');
                $table->decimal('total', 10, 2)->after('status');
                $table->date('delivery_date')->after('total');
                $table->string('delivery_method', 20)->after('delivery_date');
                $table->string('phone', 30)->after('delivery_method');
                $table->string('address')->after('phone')->nullable();
                $table->text('notes')->after('address')->nullable();
                $table->timestamp('placed_at')->after('notes');
                $table->index(['status', 'delivery_date']);
            });
        }

        if (! Schema::hasColumn('order_items', 'order_id')) {
            Schema::table('order_items', function (Blueprint $table): void {
                $table->foreignId('order_id')->after('id')->constrained()->cascadeOnDelete();
                $table->foreignId('product_id')->after('order_id')->nullable()->constrained()->nullOnDelete();
                $table->string('type', 20)->after('product_id');
                $table->string('name')->after('type');
                $table->decimal('unit_price', 10, 2)->after('name');
                $table->unsignedSmallInteger('quantity')->after('unit_price');
                $table->decimal('subtotal', 10, 2)->after('quantity');
                $table->json('configuration')->after('subtotal')->nullable();
            });
        }
    }

    public function down(): void
    {
        // This migration repairs tables that were already marked as migrated.
        // Rolling it back must not recreate the invalid schema.
    }
};
