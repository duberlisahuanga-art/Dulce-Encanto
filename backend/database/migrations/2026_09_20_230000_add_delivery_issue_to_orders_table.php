<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table): void {
            $table->string('delivery_issue')->nullable()->after('delivered_at');
            $table->text('delivery_issue_note')->nullable()->after('delivery_issue');
            $table->timestamp('delivery_issue_at')->nullable()->after('delivery_issue_note');
        });
    }

    public function down(): void
    {
        Schema::table('orders', fn (Blueprint $table) => $table->dropColumn([
            'delivery_issue',
            'delivery_issue_note',
            'delivery_issue_at',
        ]));
    }
};
