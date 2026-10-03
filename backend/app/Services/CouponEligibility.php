<?php

namespace App\Services;

use App\Models\Promotion;

class CouponEligibility
{
    public function available(Promotion $promotion, int $userId): bool
    {
        return $promotion->is_active
            && $promotion->requires_coupon
            && ! $promotion->starts_at->isFuture()
            && ! $promotion->ends_at->isPast()
            && ($promotion->owner_user_id === null || (int) $promotion->owner_user_id === $userId)
            && ($promotion->max_uses === null || $promotion->uses_count < $promotion->max_uses);
    }
}
