<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreCakeOptionRequest;
use App\Http\Requests\UpdateCakeOptionRequest;
use App\Http\Resources\CakeOptionResource;
use App\Models\CakeOption;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Storage;

class CakeOptionController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(): AnonymousResourceCollection
    {
        return CakeOptionResource::collection(
            CakeOption::query()->orderBy('type')->orderBy('sort_order')->orderBy('name')->get()
        );
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreCakeOptionRequest $request): CakeOptionResource
    {
        return new CakeOptionResource(CakeOption::create($this->attributes($request)));
    }

    /**
     * Display the specified resource.
     */
    public function show(CakeOption $cakeOption): CakeOptionResource
    {
        return new CakeOptionResource($cakeOption);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateCakeOptionRequest $request, CakeOption $cakeOption): CakeOptionResource
    {
        $old = $cakeOption->image_path;
        $cakeOption->update($this->attributes($request));
        if ($old && $old !== $cakeOption->image_path) {
            Storage::disk('public')->delete($old);
        }

        return new CakeOptionResource($cakeOption->refresh());
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(CakeOption $cakeOption): JsonResponse
    {
        $old = $cakeOption->image_path;
        $cakeOption->delete();
        if ($old) {
            Storage::disk('public')->delete($old);
        }

        return response()->json(status: 204);
    }

    private function attributes(StoreCakeOptionRequest|UpdateCakeOptionRequest $request): array
    {
        $data = $request->safe()->except(['image', 'remove_image']);
        if ($request->boolean('remove_image')) {
            $data['image_path'] = null;
        }
        if ($request->hasFile('image')) {
            $data['image_path'] = $request->file('image')->store('cake-options', 'public');
        }

        return $data;
    }
}
