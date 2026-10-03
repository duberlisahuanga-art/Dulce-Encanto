<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GameReward extends Model
{
    protected $fillable = ['name', 'description', 'points_required', 'reward_type', 'reward_value', 'minimum_purchase', 'expiration_days', 'max_redemptions', 'max_per_user', 'is_active'];

    protected function casts(): array
    {
        return ['is_active' => 'boolean', 'reward_value' => 'decimal:2', 'minimum_purchase' => 'decimal:2'];
    }
}
