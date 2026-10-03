<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class CartItemResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $pricing = app(\App\Services\PromotionPricing::class)->cart($this->resource->cart->loadMissing(['items', 'promotion']));
        $discount = $pricing['items'][$this->id]['discount'] ?? 0;
        $promotion = $pricing['items'][$this->id]['promotion'] ?? null;
        return [
            'id' => $this->id,
            'type' => $this->type,
            'product_id' => $this->product_id,
            'name' => $this->name,
            'unit_price' => $this->unit_price,
            'quantity' => $this->quantity,
            'subtotal' => number_format((float) $this->unit_price * $this->quantity, 2, '.', ''),
            'discount' => number_format($discount, 2, '.', ''),
            'total' => number_format(((float) $this->unit_price * $this->quantity) - $discount, 2, '.', ''),
            'image_url' => $this->product?->image_path
                ? url(Storage::disk('public')->url($this->product->image_path))
                : null,
            'promotion' => $promotion ? [
                'name' => $promotion->name,
                'discount_type' => $promotion->discount_type,
                'discount_value' => $promotion->discount_value,
                'savings' => number_format($discount, 2, '.', ''),
            ] : null,
            'configuration' => $this->configuration,
        ];
    }
}
