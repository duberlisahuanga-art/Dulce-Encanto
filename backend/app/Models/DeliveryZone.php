<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DeliveryZone extends Model
{
    protected $fillable = ['latitude', 'longitude', 'radius_km', 'name', 'fee', 'is_active'];

    protected function casts(): array
    {
        return ['latitude' => 'float', 'longitude' => 'float', 'radius_km' => 'float', 'fee' => 'decimal:2', 'is_active' => 'boolean'];
    }

    public function covers(float $latitude, float $longitude): bool
    {
        if ($this->latitude === null || $this->longitude === null || $this->radius_km === null) {
            return false;
        }
        $a = sin(deg2rad($latitude - $this->latitude) / 2) ** 2 + cos(deg2rad($latitude)) * cos(deg2rad($this->latitude)) * sin(deg2rad($longitude - $this->longitude) / 2) ** 2;

        return 6371 * 2 * atan2(sqrt($a), sqrt(max(0, 1 - $a))) <= $this->radius_km;
    }
}
