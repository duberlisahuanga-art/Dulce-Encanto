<?php

namespace App\Http\Resources;

use App\Models\Promotion;
use App\Services\PromotionPricing;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class ProductResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $offers = app(PromotionPricing::class)->catalogOffers($this->id, (float) $this->price);
        $offer = $offers['automatic'];

        return [
            'id' => $this->id,
            'category_id' => $this->category_id,
            'category' => new CategoryResource($this->whenLoaded('category')),
            'name' => $this->name,
            'slug' => $this->slug,
            'description' => $this->description,
            'price' => $this->price,
            'original_price' => $this->price,
            'discounted_price' => number_format((float) $this->price - ($offer['amount'] ?? 0), 2, '.', ''),
            'promotion' => $this->promotionData($offer),
            'coupon_promotion' => $this->promotionData($offers['coupon']),
            'image_url' => $this->image_path
                ? url(Storage::disk('public')->url($this->image_path))
                : null,
            'is_available' => $this->is_available,
            'is_active' => $this->is_active,
        ];
    }

    private function promotionData(?array $offer): ?array
    {
        if (! $offer) {
            return null;
        }

        /** @var Promotion $promotion */
        $promotion = $offer['promotion'];

        return [
            'name' => $promotion->name,
            'discount_type' => $promotion->discount_type,
            'discount_value' => $promotion->discount_value,
            'discount' => number_format($offer['amount'], 2, '.', ''),
            'coupon_code' => $promotion->coupon_code,
            'minimum_purchase' => $promotion->minimum_purchase,
            'ends_at' => $promotion->ends_at?->format('Y-m-d'),
        ];
    }
}
