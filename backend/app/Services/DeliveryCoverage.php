<?php

namespace App\Services;

class DeliveryCoverage
{
    public function storeLatitude(): float
    {
        return (float) config('delivery.store_latitude');
    }

    public function storeLongitude(): float
    {
        return (float) config('delivery.store_longitude');
    }

    public function maximumDistanceKm(): float
    {
        return min(15, max(1, (float) config('delivery.maximum_distance_km')));
    }

    public function distanceFromStore(float $latitude, float $longitude): float
    {
        $latitudeDelta = deg2rad($latitude - $this->storeLatitude());
        $longitudeDelta = deg2rad($longitude - $this->storeLongitude());
        $a = sin($latitudeDelta / 2) ** 2
            + cos(deg2rad($this->storeLatitude())) * cos(deg2rad($latitude))
            * sin($longitudeDelta / 2) ** 2;

        return 6371 * 2 * atan2(sqrt($a), sqrt(max(0, 1 - $a)));
    }

    public function contains(float $latitude, float $longitude): bool
    {
        return $this->distanceFromStore($latitude, $longitude) <= $this->maximumDistanceKm();
    }

    /** @return array{latitude: float, longitude: float, maximum_distance_km: float} */
    public function publicConfiguration(): array
    {
        return [
            'latitude' => $this->storeLatitude(),
            'longitude' => $this->storeLongitude(),
            'maximum_distance_km' => $this->maximumDistanceKm(),
        ];
    }
}
