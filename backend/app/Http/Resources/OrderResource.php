<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OrderResource extends JsonResource
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
            'number' => $this->number,
            'status' => $this->status,
            'total' => $this->total,
            'delivery_fee' => $this->delivery_fee,
            'delivery_date' => $this->delivery_date?->format('Y-m-d'),
            'delivery_method' => $this->delivery_method,
            'phone' => $this->phone,
            'address' => $this->address,
            'notes' => $this->notes,
            'latitude' => $this->latitude,
            'longitude' => $this->longitude,
            'cancellation_request' => $this->cancellation_request,
            'placed_at' => $this->placed_at?->toISOString(),
            'dispatched_at' => $this->dispatched_at?->toISOString(),
            'delivered_at' => $this->delivered_at?->toISOString(),
            'delivery_issue' => $this->delivery_issue,
            'delivery_issue_note' => $this->delivery_issue_note,
            'delivery_issue_at' => $this->delivery_issue_at?->toISOString(),
            'status_history' => $this->whenLoaded('statusChanges', fn () => $this->statusChanges
                ->filter(fn ($change): bool => in_array($change->new_value, \App\Models\Order::STATUSES, true))
                ->map(fn ($change): array => [
                    'id' => $change->id,
                    'status' => $change->new_value,
                    'created_at' => $change->created_at?->toISOString(),
                ])->values()),
            'courier' => $this->whenLoaded('courier', fn (): ?array => $this->courier ? [
                'id' => $this->courier->id,
                'name' => $this->courier->name,
                'email' => $this->courier->email,
                'latitude' => $this->status === 'out_for_delivery' && $this->courier->last_latitude !== null ? (float) $this->courier->last_latitude : null,
                'longitude' => $this->status === 'out_for_delivery' && $this->courier->last_longitude !== null ? (float) $this->courier->last_longitude : null,
                'location_updated_at' => $this->status === 'out_for_delivery' ? $this->courier->location_updated_at?->toISOString() : null,
            ] : null),
            'delivery_zone' => $this->whenLoaded('deliveryZone', fn (): ?array => $this->deliveryZone ? ['id' => $this->deliveryZone->id, 'name' => $this->deliveryZone->name] : null),
            'payment' => $this->whenLoaded('payment', fn () => new PaymentResource($this->payment)),
            'customer' => $this->whenLoaded('user', fn (): array => [
                'id' => $this->user->id,
                'name' => $this->user->name,
                'email' => $this->user->email,
            ]),
            'items' => $this->whenLoaded('items', fn () => $this->items->map(fn ($item): array => [
                'id' => $item->id,
                'type' => $item->type,
                'product_id' => $item->product_id,
                'name' => $item->name,
                'unit_price' => $item->unit_price,
                'quantity' => $item->quantity,
                'subtotal' => $item->subtotal,
                'configuration' => $item->configuration,
            ])),
        ];
    }
}
