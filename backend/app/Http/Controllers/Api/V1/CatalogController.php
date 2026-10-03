<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\CategoryResource;
use App\Http\Resources\ProductResource;
use App\Models\Category;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class CatalogController extends Controller
{
    public function categories(): AnonymousResourceCollection
    {
        $categories = Category::query()
            ->where('is_active', true)
            ->withCount(['products' => fn ($query) => $query
                ->where('is_active', true)
                ->where('is_available', true)])
            ->with(['products' => fn ($query) => $query
                ->where('is_active', true)
                ->where('is_available', true)
                ->latest()])
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();

        return CategoryResource::collection($categories);
    }

    public function products(): AnonymousResourceCollection
    {
        $products = Product::query()
            ->where('is_active', true)
            ->where('is_available', true)
            ->whereHas('category', fn ($query) => $query->where('is_active', true))
            ->with('category')
            ->latest()
            ->get();

        return ProductResource::collection($products);
    }

    public function product(Product $product): JsonResponse
    {
        $product->load('category');
        abort_unless($product->is_active && $product->is_available && $product->category?->is_active, 404);

        $related = Product::query()
            ->where('category_id', $product->category_id)
            ->whereKeyNot($product->id)
            ->where('is_active', true)
            ->where('is_available', true)
            ->with('category')
            ->latest()
            ->limit(4)
            ->get();

        return response()->json([
            'data' => (new ProductResource($product))->resolve(),
            'related' => ProductResource::collection($related)->resolve(),
        ]);
    }
}
