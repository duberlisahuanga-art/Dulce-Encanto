<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table): void {
            $table->foreignId('delivery_user_id')->nullable()->after('user_id')->constrained('users')->nullOnDelete();
            $table->timestamp('dispatched_at')->nullable()->after('placed_at');
            $table->timestamp('delivered_at')->nullable()->after('dispatched_at');
            $table->index(['delivery_user_id', 'delivery_date']);
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('delivery_user_id');
            $table->dropColumn(['dispatched_at', 'delivered_at']);
        });
    }
};
