<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GameRewardRedemption extends Model
{
    protected $fillable = ['user_id', 'game_reward_id', 'promotion_id', 'points_spent', 'status', 'redeemed_at'];

    protected function casts(): array
    {
        return ['redeemed_at' => 'datetime'];
    }

    public function promotion(): BelongsTo
    {
        return $this->belongsTo(Promotion::class);
    }

    public function reward(): BelongsTo
    {
        return $this->belongsTo(GameReward::class, 'game_reward_id');
    }
}
