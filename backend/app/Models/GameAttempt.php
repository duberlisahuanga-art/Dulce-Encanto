<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GameAttempt extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';
    protected $fillable = ['id', 'user_id', 'game_level_id', 'started_at', 'finished_at', 'paused_at', 'paused_milliseconds', 'status', 'duration_seconds', 'cake_health', 'coins', 'final_score', 'dulce_points_earned', 'stars', 'scenario'];

    protected function casts(): array
    {
        return ['started_at' => 'datetime', 'finished_at' => 'datetime', 'paused_at' => 'datetime', 'scenario' => 'array'];
    }

    public function level(): BelongsTo
    {
        return $this->belongsTo(GameLevel::class, 'game_level_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
