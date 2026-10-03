<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class GameLevel extends Model
{
    protected $fillable = ['name', 'slug', 'description', 'difficulty', 'time_limit', 'initial_cake_health', 'obstacle_count', 'completion_points', 'dulce_points_reward', 'one_star_score', 'two_star_score', 'three_star_score', 'sort_order', 'is_active'];

    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }

    public function attempts(): HasMany
    {
        return $this->hasMany(GameAttempt::class);
    }
}
