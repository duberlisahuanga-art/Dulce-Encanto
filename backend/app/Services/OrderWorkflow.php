<?php

namespace App\Services;

use App\Models\Order;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class OrderWorkflow
{
    public function transition(Order $order, User $actor, string $status, ?string $reason = null, ?string $expectedStatus = null): Order
    {
        return DB::transaction(function () use ($order, $actor, $status, $reason, $expectedStatus): Order {
            $order = Order::query()->lockForUpdate()->findOrFail($order->id);
            abort_if($expectedStatus !== null && $expectedStatus !== $order->status, 409, 'El pedido cambió en otra sesión. Actualiza la lista e inténtalo nuevamente.');
            if ($status === $order->status) {
                return $order;
            }
            $allowed = match ($order->status) {
                'pending' => ['confirmed', 'cancelled'],
                'confirmed' => ['preparing', 'cancelled'],
                'preparing' => ['ready', 'cancelled'],
                'ready' => [$order->delivery_method === 'pickup' ? 'delivered' : 'out_for_delivery', 'cancelled'],
                'out_for_delivery' => ['delivered', 'cancelled'],
                default => [],
            };
            if (! in_array($status, $allowed, true)) {
                throw ValidationException::withMessages(['status' => ['No se puede pasar a ese estado desde el estado actual.']]);
            }
            $permission = match ($status) {
                'confirmed' => 'pedidos.confirmar',
                'preparing', 'ready' => 'pedidos.preparar',
                'cancelled' => 'pedidos.cancelar',
                'delivered' => $order->delivery_method === 'pickup' ? 'pedidos.entregar_tienda' : 'delivery.actualizar',
                default => 'delivery.actualizar',
            };
            abort_unless($actor->can($permission), 403);
            if ($order->delivery_method === 'delivery' && in_array($status, ['out_for_delivery', 'delivered'], true)) {
                abort_unless($actor->can('delivery.asignar') || (int) $order->delivery_user_id === $actor->id, 403);
                if (! $order->delivery_user_id) {
                    throw ValidationException::withMessages(['status' => ['Asigna un repartidor antes de iniciar la entrega.']]);
                }
            }
            if ($status === 'cancelled' && ! trim($reason ?? '')) {
                throw ValidationException::withMessages(['reason' => ['Indica el motivo de cancelación.']]);
            }
            $old = $order->status;
            $order->update([
                'status' => $status,
                'dispatched_at' => $status === 'out_for_delivery' ? now() : $order->dispatched_at,
                'delivered_at' => $status === 'delivered' ? now() : $order->delivered_at,
                'delivery_issue' => $status === 'delivered' ? null : $order->delivery_issue,
                'delivery_issue_note' => $status === 'delivered' ? null : $order->delivery_issue_note,
                'delivery_issue_at' => $status === 'delivered' ? null : $order->delivery_issue_at,
                'cancellation_request' => $status === 'cancelled' ? null : $order->cancellation_request,
            ]);
            $this->record($order, $actor, 'status', $old, $status, $reason);
            $labels = ['confirmed' => 'confirmado', 'preparing' => 'en preparación', 'ready' => 'listo', 'out_for_delivery' => 'en ruta', 'delivered' => 'entregado', 'cancelled' => 'cancelado'];
            $order->user->appNotifications()->create(['type' => 'order_status', 'title' => 'Estado de tu pedido', 'message' => "Tu pedido {$order->number} está {$labels[$status]}.", 'link' => '/mis-pedidos']);

            return $order;
        });
    }

    public function record(Order $order, User $actor, string $field, ?string $old, ?string $new, ?string $reason = null): void
    {
        DB::table('order_changes')->insert(['order_id' => $order->id, 'user_id' => $actor->id, 'actor_name' => $actor->name, 'field' => $field, 'old_value' => $old, 'new_value' => $new, 'reason' => $reason, 'created_at' => now()]);
    }
}
