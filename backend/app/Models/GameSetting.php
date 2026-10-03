<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GameSetting extends Model
{
    protected $fillable = ['name', 'description', 'is_active', 'max_daily_attempts', 'max_daily_prizes', 'max_weekly_prizes', 'points_multiplier', 'initial_cake_health', 'messages'];

    protected function casts(): array
    {
        return ['is_active' => 'boolean', 'messages' => 'array', 'points_multiplier' => 'decimal:2'];
    }
}
