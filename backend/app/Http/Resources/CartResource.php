<?php

namespace App\Http\Resources;

use App\Services\PromotionPricing;
use App\Services\PurchaseLimits;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CartResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $pricing = app(PromotionPricing::class)->cart($this->resource);
        $minimumPurchase = (float) ($this->promotion?->minimum_purchase ?? 0);
        $couponRemaining = max(0, $minimumPurchase - $pricing['subtotal']);

        return [
            'id' => $this->id,
            'limits' => app(PurchaseLimits::class)->values(),
            'items' => CartItemResource::collection($this->whenLoaded('items')),
            'items_count' => $this->items->sum('quantity'),
            'subtotal' => number_format($pricing['subtotal'], 2, '.', ''),
            'discount' => number_format($pricing['discount'], 2, '.', ''),
            'coupon_discount' => number_format($pricing['coupon_discount'], 2, '.', ''),
            'total' => number_format($pricing['total'], 2, '.', ''),
            'free_delivery' => $pricing['free_delivery'],
            'coupon' => $this->promotion ? [
                'code' => $this->promotion->coupon_code,
                'name' => $this->promotion->name,
                'minimum_purchase' => $this->promotion->minimum_purchase,
                'is_eligible' => $couponRemaining <= 0,
                'amount_remaining' => number_format($couponRemaining, 2, '.', ''),
            ] : null,
            'currency' => 'PEN',
        ];
    }
}
