<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreCartCakeRequest;
use App\Http\Requests\StoreCartProductRequest;
use App\Http\Requests\UpdateCartItemRequest;
use App\Http\Resources\CartResource;
use App\Models\CakeOption;
use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Product;
use App\Models\Promotion;
use App\Services\CouponEligibility;
use App\Services\PurchaseLimits;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class CartController extends Controller
{
    public function show(Request $request): CartResource
    {
        return $this->resource($this->cart($request));
    }

    public function storeProduct(StoreCartProductRequest $request): CartResource|JsonResponse
    {
        $validated = $request->validated();
        $product = Product::query()->findOrFail($validated['product_id']);

        if (! $product->is_active || ! $product->is_available) {
            return response()->json(['message' => 'El producto no está disponible.'], 422);
        }

        $cart = $this->cart($request);
        $item = $cart->items()->firstOrNew(['product_id' => $product->id]);
        $quantity = ($item->exists ? $item->quantity : 0) + $validated['quantity'];
        app(PurchaseLimits::class)->validateQuantity($cart, $quantity, $item->exists ? $item->quantity : 0);
        $item->fill([
            'type' => 'product',
            'name' => $product->name,
            'unit_price' => $product->price,
            'quantity' => $quantity,
            'configuration' => null,
        ])->save();

        return $this->resource($cart);
    }

    public function storeCake(StoreCartCakeRequest $request): CartResource
    {
        $validated = $request->validated();
        $ids = [$validated['size_id'], $validated['flavor_id'], $validated['filling_id'], $validated['covering_id'], $validated['decoration_id'], ...($validated['extra_ids'] ?? [])];
        $options = CakeOption::query()->whereKey($ids)->get();
        $totalInCents = $options->sum(fn (CakeOption $option): int => (int) round((float) $option->price_adjustment * 100));
        $configuration = [...$validated, 'selections' => $options->map(fn (CakeOption $option): array => ['id' => $option->id, 'type' => $option->type, 'name' => $option->name])->values()->all()];

        app(PurchaseLimits::class)->validateQuantity($this->cart($request), 1);
        $this->cart($request)->items()->create([
            'type' => 'custom_cake',
            'name' => 'Torta personalizada',
            'unit_price' => $totalInCents / 100,
            'quantity' => 1,
            'configuration' => $configuration,
        ]);

        return $this->resource($this->cart($request));
    }

    public function update(UpdateCartItemRequest $request, CartItem $cartItem): CartResource
    {
        $cart = $this->ownedCart($request, $cartItem);
        app(PurchaseLimits::class)->validateQuantity($cart, $request->integer('quantity'), $cartItem->quantity);
        $cartItem->update($request->validated());

        return $this->resource($cart);
    }

    public function destroy(Request $request, CartItem $cartItem): CartResource
    {
        $cart = $this->ownedCart($request, $cartItem);
        $cartItem->delete();

        return $this->resource($cart);
    }

    public function clear(Request $request): JsonResponse
    {
        $cart = $this->cart($request);
        $cart->items()->delete();
        $cart->update(['promotion_id' => null]);

        return response()->json(status: 204);
    }

    public function applyCoupon(Request $request): CartResource
    {
        $data = $request->validate(['code' => ['required', 'string', 'max:40']]);
        $promotion = Promotion::query()->where('coupon_code', strtoupper(trim($data['code'])))->first();
        if (! $promotion || ! app(CouponEligibility::class)->available($promotion, $request->user()->id)) {
            throw ValidationException::withMessages(['code' => ['El código no es válido o ya venció.']]);
        }
        $cart = $this->cart($request)->load('items');
        $subtotal = $cart->items->sum(
            fn ($item): float => (float) $item->unit_price * $item->quantity
        );
        if ($subtotal < (float) $promotion->minimum_purchase) {
            throw ValidationException::withMessages([
                'code' => ['Este cupón requiere una compra mínima de S/ '.number_format((float) $promotion->minimum_purchase, 2)],
            ]);
        }
        $cart->update(['promotion_id' => $promotion->id]);

        return $this->resource($cart);
    }

    public function removeCoupon(Request $request): CartResource
    {
        $cart = $this->cart($request);
        $cart->update(['promotion_id' => null]);

        return $this->resource($cart);
    }

    private function cart(Request $request): Cart
    {
        return Cart::query()->firstOrCreate(['user_id' => $request->user()->id]);
    }

    private function ownedCart(Request $request, CartItem $cartItem): Cart
    {
        $cart = $this->cart($request);
        abort_unless($cartItem->cart_id === $cart->id, 404);

        return $cart;
    }

    private function resource(Cart $cart): CartResource
    {
        $cart->wasRecentlyCreated = false;

        return new CartResource($cart->refresh()->load(['items.cart', 'items.product', 'promotion']));
    }
}
