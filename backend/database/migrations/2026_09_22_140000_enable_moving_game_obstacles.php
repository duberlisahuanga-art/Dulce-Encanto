<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('game_obstacles')->where('type', 'vehicle')->update(['speed' => 2]);
    }

    public function down(): void
    {
        DB::table('game_obstacles')->where('type', 'vehicle')->update(['speed' => 0]);
    }
};
