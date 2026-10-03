<?php

namespace App\Models;

use Database\Factories\CakeOptionFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['image_path', 'type', 'name', 'slug', 'description', 'price_adjustment', 'servings', 'available_colors', 'sort_order', 'is_active'])]
class CakeOption extends Model
{
    public const TYPES = [
        'size',
        'flavor',
        'filling',
        'covering',
        'decoration',
        'extra',
    ];

    /** @use HasFactory<CakeOptionFactory> */
    use HasFactory;

    protected function casts(): array
    {
        return [
            'price_adjustment' => 'decimal:2',
            'servings' => 'integer',
            'available_colors' => 'array',
            'sort_order' => 'integer',
            'is_active' => 'boolean',
        ];
    }
}
