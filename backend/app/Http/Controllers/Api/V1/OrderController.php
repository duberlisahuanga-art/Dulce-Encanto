<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreOrderRequest;
use App\Http\Resources\OrderResource;
use App\Models\BlockedDeliveryDate;
use App\Models\Cart;
use App\Models\DeliverySetting;
use App\Models\DeliveryZone;
use App\Models\Order;
use App\Models\User;
use App\Services\OrderWorkflow;
use App\Services\DeliveryCoverage;
use App\Services\PromotionPricing;
use App\Services\CouponEligibility;
use App\Services\PurchaseLimits;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class OrderController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        return OrderResource::collection(
            Order::query()->where('user_id', $request->user()->id)->with(['items', 'payment', 'deliveryZone', 'courier', 'statusChanges'])->latest('placed_at')->get()
        );
    }

    public function show(Request $request, Order $order): OrderResource
    {
        abort_unless($order->user_id === $request->user()->id, 404);

        return new OrderResource($order->load(['items', 'payment', 'deliveryZone', 'courier', 'statusChanges']));
    }

    public function store(StoreOrderRequest $request): OrderResource|JsonResponse
    {
        $cart = Cart::query()->where('user_id', $request->user()->id)->with(['items.product', 'promotion'])->first();

        if (! $cart || $cart->items->isEmpty()) {
            return response()->json(['message' => 'El carrito está vacío.'], 422);
        }
        app(PurchaseLimits::class)->validateCart($cart);
        $validatedInput = $request->validated();
        $settings = DeliverySetting::query()->firstOrCreate([], ['minimum_lead_days' => 1, 'daily_capacity' => 20, 'opening_time' => '09:00', 'closing_time' => '18:00']);
        $deliveryDate = now()->parse($validatedInput['delivery_date'])->startOfDay();
        if ($deliveryDate->lt(today()->addDays($settings->minimum_lead_days))) {
            throw ValidationException::withMessages(['delivery_date' => ["Selecciona una fecha con al menos {$settings->minimum_lead_days} día(s) de anticipación."]]);
        }
        if (BlockedDeliveryDate::query()->whereDate('date', $deliveryDate)->exists()) {
            throw ValidationException::withMessages(['delivery_date' => ['La fecha seleccionada no está disponible.']]);
        }
        if (Order::query()->whereDate('delivery_date', $deliveryDate)->whereNotIn('status', ['cancelled'])->count() >= $settings->daily_capacity) {
            throw ValidationException::withMessages(['delivery_date' => ['Ya se alcanzó la capacidad máxima para esa fecha.']]);
        }
        $zone = null;
        if ($validatedInput['delivery_method'] === 'delivery') {
            $coverage = app(DeliveryCoverage::class);
            if (! $coverage->contains((float) $validatedInput['latitude'], (float) $validatedInput['longitude'])) {
                throw ValidationException::withMessages([
                    'address' => ["La dirección de entrega debe estar a un máximo de {$coverage->maximumDistanceKm()} km de la tienda."],
                ]);
            }
            $zone = DeliveryZone::query()->whereKey($validatedInput['delivery_zone_id'])->where('is_active', true)->first();
            if ($zone && $zone->radius_km !== null && (! isset($validatedInput['latitude'], $validatedInput['longitude']) || ! $zone->covers((float) $validatedInput['latitude'], (float) $validatedInput['longitude']))) {
                throw ValidationException::withMessages(['address' => ['Selecciona en el mapa un punto dentro de la zona de reparto elegida.']]);
            }
            if (! $zone) {
                throw ValidationException::withMessages(['delivery_zone_id' => ['Selecciona una zona de reparto disponible.']]);
            }
        }

        $order = DB::transaction(function () use ($request, $cart, $zone, $deliveryDate): Order {
            $lockedSettings = DeliverySetting::query()->lockForUpdate()->first()
                ?? DeliverySetting::query()->firstOrCreate([], ['minimum_lead_days' => 1, 'daily_capacity' => 20, 'opening_time' => '09:00', 'closing_time' => '18:00']);

            if (Order::query()->whereDate('delivery_date', $deliveryDate)->whereNotIn('status', ['cancelled'])->count() >= $lockedSettings->daily_capacity) {
                throw ValidationException::withMessages(['delivery_date' => ['Ya se alcanzó la capacidad máxima para esa fecha.']]);
            }

            foreach ($cart->items as $item) {
                if ($item->type === 'product' && $item->product) {
                    if (! $item->product->is_active || ! $item->product->is_available) {
                        throw ValidationException::withMessages([
                            'cart' => ["El producto '{$item->name}' ya no está disponible. Retíralo de tu carrito."],
                        ]);
                    }
                    if ((float) $item->unit_price !== (float) $item->product->price) {
                        $item->update([
                            'unit_price' => $item->product->price,
                            'name' => $item->product->name,
                        ]);
                    }
                }
            }

            if ($cart->promotion_id) {
                $coupon = \App\Models\Promotion::query()->whereKey($cart->promotion_id)->lockForUpdate()->first();
                if (! $coupon || ! app(CouponEligibility::class)->available($coupon, $request->user()->id)) {
                    throw ValidationException::withMessages(['coupon' => ['El cupón ya no está disponible para esta compra.']]);
                }
                $cart->setRelation('promotion', $coupon);
            }
            $pricing = app(PromotionPricing::class)->cart($cart);
            if ($cart->promotion_id && $pricing['subtotal'] < (float) $cart->promotion->minimum_purchase) {
                throw ValidationException::withMessages(['coupon' => ['El cupón requiere una compra mínima mayor.']]);
            }
            $validated = $request->validated();
            if ($cart->promotion?->discount_type === 'free_delivery' && $validated['delivery_method'] !== 'delivery') {
                throw ValidationException::withMessages(['coupon' => ['Este cupón se usa únicamente con delivery.']]);
            }
            $paymentMethod = $validated['payment_method'];
            unset($validated['payment_method']);
            if (! $zone) {
                unset($validated['delivery_zone_id']);
            }
            $deliveryFee = $pricing['free_delivery'] ? 0 : (float) ($zone?->fee ?? 0);
            $order = Order::create([
                ...$validated,
                'user_id' => $request->user()->id,
                'number' => 'DE-'.now()->format('Ymd').'-'.Str::upper(Str::random(6)),
                'status' => 'pending',
                'total' => $pricing['total'] + $deliveryFee,
                'delivery_fee' => $deliveryFee,
                'placed_at' => now(),
            ]);

            foreach ($cart->items as $item) {
                $order->items()->create([
                    'product_id' => $item->product_id,
                    'type' => $item->type,
                    'name' => $item->name,
                    'unit_price' => $item->unit_price,
                    'quantity' => $item->quantity,
                    'subtotal' => (float) $item->unit_price * $item->quantity,
                    'configuration' => $item->configuration,
                ]);
            }

            $order->payment()->create([
                'method' => $paymentMethod,
                'status' => 'pending',
                'amount' => $pricing['total'] + $deliveryFee,
            ]);

            if ($cart->promotion_id && $pricing['subtotal'] >= (float) $cart->promotion->minimum_purchase) {
                $cart->promotion->increment('uses_count');
            }

            $cart->items()->delete();
            $cart->update(['promotion_id' => null]);

            return $order;
        });
        User::permission('pedidos.ver')->get()->each(fn (User $user) => $user->appNotifications()->create([
            'type' => 'new_order', 'title' => 'Nuevo pedido', 'message' => "Se registró el pedido {$order->number}.", 'link' => '/administracion/pedidos',
        ]));

        return new OrderResource($order->load(['items', 'payment', 'deliveryZone']));
    }

    public function requestCancellation(Request $request, Order $order): OrderResource
    {
        abort_unless((int) $order->user_id === $request->user()->id || $request->user()->can('pedidos.ver'), 404);
        $data = $request->validate(['reason' => ['required', 'string', 'max:1000']]);
        $order = DB::transaction(function () use ($request, $order, $data) {
            $order = Order::query()->lockForUpdate()->findOrFail($order->id);
            abort_if(in_array($order->status, ['delivered', 'cancelled'], true), 422, 'El pedido ya finalizó.');
            $old = $order->cancellation_request;
            $order->update(['cancellation_request' => $data['reason']]);
            app(OrderWorkflow::class)->record($order, $request->user(), 'cancellation_request', $old, $data['reason']);

            return $order;
        });

        return new OrderResource($order->load(['items', 'payment']));
    }
}
