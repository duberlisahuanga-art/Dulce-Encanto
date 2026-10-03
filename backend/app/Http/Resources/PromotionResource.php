<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class PromotionResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'description' => $this->description,
            'discount_type' => $this->discount_type,
            'discount_value' => $this->discount_value,
            'starts_at' => $this->starts_at?->format('Y-m-d'),
            'ends_at' => $this->ends_at?->format('Y-m-d'),
            'is_active' => $this->is_active,
            'applies_to_all' => $this->applies_to_all,
            'banner_url' => $this->banner_path ? url(Storage::disk('public')->url($this->banner_path)) : null,
            'accent_color' => $this->accent_color,
            'cta_label' => $this->cta_label,
            'coupon_code' => $this->coupon_code,
            'requires_coupon' => $this->requires_coupon,
            'minimum_purchase' => $this->minimum_purchase,
            'products' => ProductResource::collection($this->whenLoaded('products')),
        ];
    }
}
