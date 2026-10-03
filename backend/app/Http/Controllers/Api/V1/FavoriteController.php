<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProductResource;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class FavoriteController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $products = $request->user()
            ->favoriteProducts()
            ->where('is_active', true)
            ->where('is_available', true)
            ->whereHas('category', fn ($query) => $query->where('is_active', true))
            ->with('category')
            ->latest('product_user_favorites.created_at')
            ->get();

        return ProductResource::collection($products);
    }

    public function store(Request $request, Product $product): JsonResponse
    {
        abort_unless($product->is_active && $product->is_available, 404);

        $request->user()->favoriteProducts()->syncWithoutDetaching([$product->id]);

        return response()->json([
            'message' => 'Producto agregado a favoritos.',
            'product_id' => $product->id,
        ], 201);
    }

    public function destroy(Request $request, Product $product): JsonResponse
    {
        $request->user()->favoriteProducts()->detach($product->id);

        return response()->json([
            'message' => 'Producto retirado de favoritos.',
            'product_id' => $product->id,
        ]);
    }
}
