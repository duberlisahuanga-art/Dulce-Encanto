<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CustomerResource extends JsonResource
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
            'email' => $this->email,
            'registered_at' => $this->created_at?->toISOString(),
            'orders_count' => $this->whenCounted('orders'),
            'total_spent' => number_format((float) ($this->total_spent ?? 0), 2, '.', ''),
            'orders' => OrderResource::collection($this->whenLoaded('orders')),
        ];
    }
}
