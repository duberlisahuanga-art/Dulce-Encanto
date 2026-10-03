<?php

namespace App\Services;

use App\Models\Cart;
use App\Models\Promotion;
use Illuminate\Support\Collection;

class PromotionPricing
{
    private ?Collection $catalogPromotions = null;

    public function activePromotions(?Promotion $coupon = null): Collection
    {
        $automatic = $this->catalogPromotions ??= $this->currentPromotions()
            ->where('requires_coupon', false)
            ->values();

        return $coupon && $this->isCurrent($coupon)
            ? $automatic->concat([$coupon->loadMissing('products:id')])
            : $automatic;
    }

    public function catalogOffers(?int $productId, float $price): array
    {
        $promotions = ($this->catalogPromotions ??= $this->currentPromotions())->whereNull('owner_user_id');

        return [
            'automatic' => $this->bestFor(
                $productId,
                $price,
                $promotions->where('requires_coupon', false)
            ),
            'coupon' => $this->bestFor(
                $productId,
                $price,
                $promotions->where('requires_coupon', true)
            ),
        ];
    }

    public function cart(Cart $cart): array
    {
        $subtotal = $cart->items->sum(
            fn ($item): float => (float) $item->unit_price * $item->quantity
        );
        $coupon = $cart->promotion
            && app(CouponEligibility::class)->available($cart->promotion, (int) $cart->user_id)
            && $subtotal >= (float) $cart->promotion->minimum_purchase
            ? $cart->promotion
            : null;
        $discount = 0.0;
        $items = [];
        $orderLevelCoupon = $coupon?->is_game_reward && $coupon->discount_type === 'fixed' ? $coupon : null;
        $promotions = $this->activePromotions($orderLevelCoupon ? null : $coupon);
        foreach ($cart->items as $item) {
            $base = (float) $item->unit_price * $item->quantity;
            $best = $this->bestFor($item->product_id, (float) $item->unit_price, $promotions);
            $itemDiscount = $best ? min($base, $best['amount'] * $item->quantity) : 0.0;
            $discount += $itemDiscount;
            $items[$item->id] = ['discount' => $itemDiscount, 'promotion' => $best['promotion'] ?? null];
        }

        $couponDiscount = $orderLevelCoupon ? min((float) $orderLevelCoupon->discount_value, max(0, $subtotal - $discount)) : 0.0;
        $discount += $couponDiscount;

        return compact('subtotal', 'discount', 'items') + [
            'total' => max(0, $subtotal - $discount),
            'free_delivery' => $coupon?->discount_type === 'free_delivery',
            'coupon_discount' => $couponDiscount,
        ];
    }

    public function bestFor(?int $productId, float $price, Collection $promotions): ?array
    {
        if (! $productId) {
            return null;
        }

        return $promotions->filter(fn (Promotion $promotion) => $promotion->discount_type !== 'free_delivery' && ($promotion->applies_to_all || $promotion->products->contains('id', $productId)))
            ->map(function (Promotion $promotion) use ($price) {
                $amount = $promotion->discount_type === 'percentage' ? $price * ((float) $promotion->discount_value / 100) : (float) $promotion->discount_value;

                return ['amount' => min($price, $amount), 'promotion' => $promotion];
            })->sortByDesc('amount')->first();
    }

    private function currentPromotions(): Collection
    {
        return Promotion::query()
            ->with('products:id')
            ->where('is_active', true)
            ->whereDate('starts_at', '<=', today())
            ->whereDate('ends_at', '>=', today())
            ->get();
    }

    private function isCurrent(Promotion $promotion): bool
    {
        return $promotion->is_active
            && ! $promotion->starts_at->isFuture()
            && ! $promotion->ends_at->isPast();
    }
}
