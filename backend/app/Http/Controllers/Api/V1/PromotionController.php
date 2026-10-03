<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StorePromotionRequest;
use App\Http\Requests\UpdatePromotionRequest;
use App\Http\Resources\PromotionResource;
use App\Models\Promotion;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class PromotionController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(): AnonymousResourceCollection
    {
        return PromotionResource::collection(Promotion::query()->with('products.category')->latest('starts_at')->get());
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StorePromotionRequest $request): PromotionResource
    {
        $promotion = DB::transaction(function () use ($request): Promotion {
            $data = $request->safe()->except(['product_ids', 'banner']);
            $data['banner_path'] = $request->file('banner')?->store('promotions', 'public');
            $promotion = Promotion::create($data);
            $promotion->products()->sync($data['applies_to_all'] ? [] : $request->input('product_ids', []));

            return $promotion;
        });

        return new PromotionResource($promotion->load('products.category'));
    }

    /**
     * Display the specified resource.
     */
    public function show(Promotion $promotion): PromotionResource
    {
        return new PromotionResource($promotion->load('products.category'));
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdatePromotionRequest $request, Promotion $promotion): PromotionResource
    {
        DB::transaction(function () use ($request, $promotion): void {
            $data = $request->safe()->except(['product_ids', 'banner']);

            if ($request->hasFile('banner')) {
                if ($promotion->banner_path) {
                    Storage::disk('public')->delete($promotion->banner_path);
                }
                $data['banner_path'] = $request->file('banner')->store('promotions', 'public');
            }

            $promotion->update($data);
            $promotion->products()->sync($data['applies_to_all'] ? [] : $request->input('product_ids', []));
        });

        return new PromotionResource($promotion->refresh()->load('products.category'));
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Promotion $promotion): Response
    {
        if ($promotion->banner_path) {
            Storage::disk('public')->delete($promotion->banner_path);
        }
        $promotion->delete();

        return response()->noContent();
    }
}
