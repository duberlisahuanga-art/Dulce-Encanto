<?php

namespace App\Models;

use Database\Factories\PromotionFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Promotion extends Model
{
    /** @use HasFactory<PromotionFactory> */
    use HasFactory;

    protected $fillable = [
        'name', 'description', 'discount_type', 'discount_value', 'starts_at', 'ends_at', 'is_active',
        'applies_to_all', 'banner_path', 'accent_color', 'cta_label', 'coupon_code', 'requires_coupon', 'minimum_purchase',
        'owner_user_id', 'max_uses', 'uses_count', 'is_game_reward',
    ];

    protected function casts(): array
    {
        return [
            'discount_value' => 'decimal:2',
            'starts_at' => 'date',
            'ends_at' => 'date',
            'is_active' => 'boolean',
            'applies_to_all' => 'boolean',
            'requires_coupon' => 'boolean',
            'minimum_purchase' => 'decimal:2',
            'is_game_reward' => 'boolean',
        ];
    }

    public function products(): BelongsToMany
    {
        return $this->belongsToMany(Product::class, 'promotion_product');
    }
}
