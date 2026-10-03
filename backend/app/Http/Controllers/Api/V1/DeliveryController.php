<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\OrderResource;
use App\Models\Order;
use App\Models\User;
use App\Services\OrderWorkflow;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class DeliveryController extends Controller
{
    public function couriers(): JsonResponse
    {
        return response()->json(['data' => User::role('repartidor')->orderBy('name')->get(['id', 'name', 'email'])]);
    }

    public function assign(Request $request, Order $order): OrderResource
    {
        abort_unless($order->delivery_method === 'delivery', 422, 'Solo los pedidos con delivery pueden asignarse.');
        $validated = $request->validate(['delivery_user_id' => ['nullable', 'integer', 'exists:users,id']]);
        if ($validated['delivery_user_id'] !== null) {
            $courier = User::findOrFail($validated['delivery_user_id']);
            abort_unless($courier->hasRole('repartidor'), 422, 'El usuario seleccionado no es repartidor.');
        }
        $order = DB::transaction(function () use ($order, $request, $validated) {
            $order = Order::query()->lockForUpdate()->findOrFail($order->id);
            abort_if(in_array($order->status, ['delivered', 'cancelled', 'out_for_delivery'], true), 422, 'No se puede reasignar un pedido en ruta o finalizado.');
            if ($request->exists('expected_courier_id')) {
                abort_if((int) $request->input('expected_courier_id') !== (int) $order->delivery_user_id, 409, 'El repartidor cambió en otra sesión. Actualiza la lista.');
            }
            $old = $order->courier?->name;
            if ((int) $order->delivery_user_id !== (int) $validated['delivery_user_id']) {
                $order->update($validated);
                $order->unsetRelation('courier');
                app(OrderWorkflow::class)->record($order, $request->user(), 'courier', $old, $order->courier?->name);
                if ($order->courier) {
                    $order->courier->appNotifications()->create(['type' => 'delivery_assigned', 'title' => 'Nueva entrega asignada', 'message' => "Se te asignó el pedido {$order->number}.", 'link' => '/repartos']);
                }
            }

            return $order;
        });

        return new OrderResource($order->load(['items', 'user', 'payment', 'courier']));
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        return OrderResource::collection(Order::query()
            ->where('delivery_user_id', $request->user()->id)
            ->where('delivery_method', 'delivery')
            ->whereNotIn('status', ['cancelled'])
            ->with(['items', 'user', 'payment', 'courier', 'deliveryZone'])
            ->orderBy('delivery_date')->get());
    }

    public function update(Request $request, Order $order): OrderResource
    {
        abort_unless($order->delivery_user_id === $request->user()->id, 404);
        $validated = $request->validate(['status' => ['required', Rule::in(['out_for_delivery', 'delivered'])]]);
        $order = app(OrderWorkflow::class)->transition($order, $request->user(), $validated['status']);

        if ($validated['status'] === 'out_for_delivery') {
            $request->user()->update([
                'last_latitude' => null,
                'last_longitude' => null,
                'location_updated_at' => null,
            ]);
        }

        return new OrderResource($order->load(['items', 'user', 'payment', 'courier']));
    }

    public function updateLocation(Request $request): JsonResponse
    {
        abort_unless($request->user()->hasRole('repartidor'), 403);
        abort_unless(Order::query()->where('delivery_user_id', $request->user()->id)->where('status', 'out_for_delivery')->exists(), 422, 'No tienes una entrega activa.');

        $validated = $request->validate([
            'latitude' => ['required', 'numeric', 'between:-90,90'],
            'longitude' => ['required', 'numeric', 'between:-180,180'],
        ]);

        $request->user()->update([
            'last_latitude' => $validated['latitude'],
            'last_longitude' => $validated['longitude'],
            'location_updated_at' => now(),
        ]);

        return response()->json(['message' => 'Ubicación actualizada.']);
    }

    public function reportIssue(Request $request, Order $order): OrderResource
    {
        abort_unless($order->delivery_user_id === $request->user()->id, 404);
        abort_unless($order->status === 'out_for_delivery', 422, 'Solo puedes reportar incidencias durante el reparto.');
        $validated = $request->validate([
            'issue' => ['nullable', Rule::in(['delayed', 'customer_unreachable', 'address_problem'])],
            'note' => ['nullable', 'string', 'max:500', 'required_with:issue'],
        ]);

        $order = DB::transaction(function () use ($order, $request, $validated): Order {
            $order = Order::query()->lockForUpdate()->findOrFail($order->id);
            abort_unless($order->delivery_user_id === $request->user()->id, 404);
            abort_unless($order->status === 'out_for_delivery', 422, 'El pedido ya no está en reparto.');
            $old = $order->delivery_issue;
            $issue = $validated['issue'] ?? null;
            $note = $issue ? trim((string) ($validated['note'] ?? '')) : null;
            $order->update([
                'delivery_issue' => $issue,
                'delivery_issue_note' => $note,
                'delivery_issue_at' => $issue ? now() : null,
            ]);
            app(OrderWorkflow::class)->record($order, $request->user(), 'delivery_issue', $old, $issue, $note);

            if ($issue) {
                $labels = [
                    'delayed' => 'El reparto presenta una demora',
                    'customer_unreachable' => 'El repartidor no pudo comunicarse contigo',
                    'address_problem' => 'Hay un inconveniente con la dirección de entrega',
                ];
                $order->user->appNotifications()->create([
                    'type' => 'delivery_issue',
                    'title' => 'Actualización de tu entrega',
                    'message' => "{$labels[$issue]}. {$note}",
                    'link' => '/mis-pedidos',
                ]);
            }

            return $order;
        });

        return new OrderResource($order->load(['items', 'user', 'payment', 'courier']));
    }
}
