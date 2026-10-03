<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\CakeQuoteRequest;
use App\Http\Resources\CakeOptionResource;
use App\Models\CakeOption;
use Illuminate\Http\JsonResponse;

class CakeDesignerController extends Controller
{
    public function options(): JsonResponse
    {
        $options = CakeOption::query()
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get()
            ->groupBy('type')
            ->map(fn ($items) => CakeOptionResource::collection($items)->resolve());

        return response()->json(['data' => $options]);
    }

    public function quote(CakeQuoteRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $optionIds = [
            $validated['size_id'],
            $validated['flavor_id'],
            $validated['filling_id'],
            $validated['covering_id'],
            $validated['decoration_id'],
            ...($validated['extra_ids'] ?? []),
        ];
        $options = CakeOption::query()->whereKey($optionIds)->get();
        $totalInCents = $options->sum(
            fn (CakeOption $option): int => (int) round((float) $option->price_adjustment * 100)
        );

        return response()->json([
            'data' => [
                'total' => number_format($totalInCents / 100, 2, '.', ''),
                'currency' => 'PEN',
                'selections' => CakeOptionResource::collection($options)->resolve(),
                'color' => $validated['color'] ?? null,
                'secondary_color' => $validated['secondary_color'] ?? null,
                'detail_color' => $validated['detail_color'] ?? null,
                'shape' => $validated['shape'] ?? null,
                'product_type' => $validated['product_type'] ?? 'cake',
                'theme' => $validated['theme'] ?? null,
                'dedication' => $validated['dedication'] ?? null,
                'delivery_date' => $validated['delivery_date'],
            ],
        ]);
    }
}
