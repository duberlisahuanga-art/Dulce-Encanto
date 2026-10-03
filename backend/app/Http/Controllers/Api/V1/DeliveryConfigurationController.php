<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\BlockedDeliveryDate;
use App\Models\DeliverySetting;
use App\Models\DeliveryZone;
use App\Services\DeliveryCoverage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class DeliveryConfigurationController extends Controller
{
    public function public(): JsonResponse
    {
        return $this->response(false);
    }

    public function admin(): JsonResponse
    {
        return $this->response(true);
    }

    public function updateSettings(Request $request): JsonResponse
    {
        $data = $request->validate(['max_units_per_product' => ['sometimes', 'integer', 'min:1', 'max:500'], 'max_units_per_order' => ['sometimes', 'integer', 'min:1', 'max:500'], 'minimum_lead_days' => ['required', 'integer', 'min:0', 'max:30'], 'daily_capacity' => ['required', 'integer', 'min:1', 'max:500'], 'opening_time' => ['required', 'date_format:H:i'], 'closing_time' => ['required', 'date_format:H:i', 'after:opening_time']]);
        DeliverySetting::query()->firstOrCreate()->update($data);

        return $this->response(true);
    }

    public function storeZone(Request $request): JsonResponse
    {
        $zone = DeliveryZone::create($request->validate([...$this->coverageRules(), 'name' => ['required', 'string', 'max:100', 'unique:delivery_zones'], 'fee' => ['required', 'numeric', 'min:0', 'max:9999'], 'is_active' => ['boolean']]));

        return response()->json(['data' => $zone], 201);
    }

    public function updateZone(Request $request, DeliveryZone $zone): JsonResponse
    {
        $zone->update($request->validate([...$this->coverageRules(), 'name' => ['required', 'string', 'max:100', Rule::unique('delivery_zones')->ignore($zone)], 'fee' => ['required', 'numeric', 'min:0', 'max:9999'], 'is_active' => ['required', 'boolean']]));

        return response()->json(['data' => $zone]);
    }

    public function blockDate(Request $request): JsonResponse
    {
        $date = BlockedDeliveryDate::updateOrCreate(['date' => $request->validate(['date' => ['required', 'date', 'after_or_equal:today'], 'reason' => ['nullable', 'string', 'max:255']])['date']], ['reason' => $request->input('reason')]);

        return response()->json(['data' => $date], 201);
    }

    public function unblockDate(BlockedDeliveryDate $blockedDate): JsonResponse
    {
        $blockedDate->delete();

        return response()->json([], 204);
    }

    private function response(bool $includeInactive): JsonResponse
    {
        $settings = DeliverySetting::query()->firstOrCreate([], ['minimum_lead_days' => 1, 'daily_capacity' => 20, 'opening_time' => '09:00', 'closing_time' => '18:00']);

        return response()->json(['data' => ['settings' => [
            'max_units_per_product' => (int) ($settings->max_units_per_product ?? 10), 'max_units_per_order' => (int) ($settings->max_units_per_order ?? 20),
            'minimum_lead_days' => (int) $settings->minimum_lead_days, 'daily_capacity' => (int) $settings->daily_capacity,
            'opening_time' => substr($settings->opening_time, 0, 5), 'closing_time' => substr($settings->closing_time, 0, 5),
        ], 'store' => app(DeliveryCoverage::class)->publicConfiguration(), 'zones' => DeliveryZone::query()->when(! $includeInactive, fn ($q) => $q->where('is_active', true))->orderBy('name')->get(), 'blocked_dates' => BlockedDeliveryDate::query()->whereDate('date', '>=', today())->orderBy('date')->get()]]);
    }

    private function coverageRules(): array
    {
        return ['latitude' => ['nullable', 'required_with:longitude,radius_km', 'numeric', 'between:-90,90'], 'longitude' => ['nullable', 'required_with:latitude,radius_km', 'numeric', 'between:-180,180'], 'radius_km' => ['nullable', 'required_with:latitude,longitude', 'numeric', 'min:0.1', 'max:200']];
    }
}
