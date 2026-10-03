<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Address;
use App\Services\DeliveryCoverage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AccountController extends Controller
{
    public function updateProfile(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users')->ignore($request->user())],
            'phone' => ['nullable', 'string', 'max:30'],
            'birthday' => ['nullable', 'date', 'before_or_equal:today'],
        ]);
        $request->user()->update($data);

        return response()->json(['data' => $request->user()->only('id', 'name', 'email', 'phone', 'birthday')]);
    }

    public function addresses(Request $request): JsonResponse
    {
        return response()->json([
            'data' => $request->user()->addresses()->orderByDesc('is_default')->latest()->get(),
        ]);
    }

    public function storeAddress(Request $request): JsonResponse
    {
        $data = $this->addressData($request);
        if ($data['is_default']) {
            $request->user()->addresses()->update(['is_default' => false]);
        }

        return response()->json(['data' => $request->user()->addresses()->create($data)], 201);
    }

    public function updateAddress(Request $request, Address $address): JsonResponse
    {
        abort_unless($address->user_id === $request->user()->id, 404);
        $data = $this->addressData($request);
        if ($data['is_default']) {
            $request->user()->addresses()->whereKeyNot($address)->update(['is_default' => false]);
        }
        $address->update($data);

        return response()->json(['data' => $address]);
    }

    public function destroyAddress(Request $request, Address $address): JsonResponse
    {
        abort_unless($address->user_id === $request->user()->id, 404);
        $address->delete();

        return response()->noContent();
    }

    public function destroyOtherSessions(Request $request): JsonResponse
    {
        DB::table('sessions')
            ->where('user_id', $request->user()->id)
            ->where('id', '!=', $request->session()->getId())
            ->delete();

        $request->user()->setRememberToken(Str::random(60));
        $request->user()->save();

        return response()->json(['message' => 'Las demás sesiones se cerraron.']);
    }

    private function addressData(Request $request): array
    {
        $data = $request->validate([
            'label' => ['required', 'string', 'max:80'],
            'address' => ['required', 'string', 'max:255'],
            'reference' => ['nullable', 'string', 'max:255'],
            'latitude' => ['required', 'numeric', 'between:-90,90'],
            'longitude' => ['required', 'numeric', 'between:-180,180'],
            'is_default' => ['required', 'boolean'],
        ], [
            'latitude.required' => 'Selecciona la ubicación de la dirección en el mapa.',
            'longitude.required' => 'Selecciona la ubicación de la dirección en el mapa.',
        ]);

        $coverage = app(DeliveryCoverage::class);
        if (! $coverage->contains((float) $data['latitude'], (float) $data['longitude'])) {
            throw ValidationException::withMessages([
                'address' => ["Esta dirección está fuera del radio máximo de {$coverage->maximumDistanceKm()} km desde la tienda."],
            ]);
        }

        return $data;
    }
}
