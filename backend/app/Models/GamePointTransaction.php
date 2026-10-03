<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GamePointTransaction extends Model
{
    protected $fillable = ['user_id', 'game_attempt_id', 'type', 'points', 'balance_after', 'description'];
}
