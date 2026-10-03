<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GameObstacle extends Model
{
    protected $fillable = ['name', 'type', 'damage', 'score_penalty', 'speed', 'sprite', 'is_active'];

    protected function casts(): array
    {
        return ['is_active' => 'boolean', 'speed' => 'decimal:2'];
    }
}
