<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\PromotionResource;
use App\Models\Promotion;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class PublicPromotionController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        return PromotionResource::collection(
            Promotion::query()->whereNull('owner_user_id')
                ->where('is_active', true)
                ->whereDate('starts_at', '<=', today())
                ->whereDate('ends_at', '>=', today())
                ->with('products.category')
                ->latest('starts_at')
                ->get()
        );
    }
}
