<?php

namespace App\Services;

use App\Models\Cart;
use App\Models\DeliverySetting;
use Illuminate\Validation\ValidationException;

class PurchaseLimits
{
    public function values(): array
    {
        $settings = DeliverySetting::query()->first();

        return ['per_product' => (int) ($settings?->max_units_per_product ?? 10), 'per_order' => (int) ($settings?->max_units_per_order ?? 20)];
    }

    public function validateQuantity(Cart $cart, int $quantity, int $previous = 0): void
    {
        $limits = $this->values();
        if ($quantity > $limits['per_product']) {
            throw ValidationException::withMessages(['quantity' => ["Máximo {$limits['per_product']} unidades por producto."]]);
        }
        if ($cart->items()->sum('quantity') - $previous + $quantity > $limits['per_order']) {
            throw ValidationException::withMessages(['quantity' => ["Máximo {$limits['per_order']} unidades por compra."]]);
        }
    }

    public function validateCart(Cart $cart): void
    {
        foreach ($cart->items as $item) {
            $this->validateQuantity($cart, $item->quantity, $item->quantity);
            if ($item->product_id && (! $item->product?->is_active || ! $item->product?->is_available)) {
                throw ValidationException::withMessages(['cart' => ["{$item->name} ya no está disponible. Retíralo del carrito."]]);
            }
        }
    }
}
