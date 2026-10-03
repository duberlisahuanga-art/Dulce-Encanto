<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

class LocationController extends Controller
{
    public function reverse(Request $request): JsonResponse
    {
        $data = $request->validate(['latitude' => ['required', 'numeric', 'between:-90,90'], 'longitude' => ['required', 'numeric', 'between:-180,180']]);
        $lat = round((float) $data['latitude'], 5);
        $lon = round((float) $data['longitude'], 5);
        $key = "location:{$lat}:{$lon}";
        $address = Cache::get($key);
        if ($address === null) {
            $lock = Cache::lock('location-provider', 10);
            abort_unless($lock->get(), 429, 'Espera un momento y vuelve a buscar la dirección.');
            try {
                abort_unless(Cache::add('location-provider-rate', true, 2), 429, 'Espera un momento y vuelve a buscar la dirección.');
                $response = Http::withUserAgent('DulceEncanto/1.0 (delivery address picker)')->connectTimeout(3)->timeout(6)->get(config('services.geocoding.url', 'https://nominatim.openstreetmap.org').'/reverse', ['lat' => $lat, 'lon' => $lon, 'format' => 'jsonv2', 'accept-language' => 'es', 'zoom' => 18]);
                abort_unless($response->successful(), 503, 'No pudimos obtener la dirección. Puedes escribirla manualmente.');
                $address = mb_substr($response->json('display_name') ?? '', 0, 255);
                Cache::put($key, $address, now()->addDays(7));
            } catch (ConnectionException $exception) {
                abort(503, 'No pudimos obtener la dirección. Puedes escribirla manualmente.');
            } finally {
                $lock->release();
            }
        }

        return response()->json(['data' => ['address' => $address, 'latitude' => $lat, 'longitude' => $lon]]);
    }
}
