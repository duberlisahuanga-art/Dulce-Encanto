<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdatePaymentStatusRequest;
use App\Http\Resources\OrderResource;
use App\Models\Order;
use App\Models\Payment;
use App\Services\OrderWorkflow;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AdminPaymentController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        return OrderResource::collection(
            Order::query()->with(['user', 'items', 'payment'])->whereHas('payment')->latest('placed_at')->get()
        );
    }

    public function update(UpdatePaymentStatusRequest $request, Payment $payment): OrderResource
    {
        $order = DB::transaction(function () use ($request, $payment): Order {
            $validated = $request->validated();
            $lockedPayment = Payment::query()->lockForUpdate()->findOrFail($payment->id);

            if ($lockedPayment->status !== 'pending') {
                throw ValidationException::withMessages([
                    'status' => ['Este pago ya fue revisado y no puede modificarse nuevamente.'],
                ]);
            }

            $order = Order::query()->with('user')->lockForUpdate()->findOrFail($lockedPayment->order_id);
            $lockedPayment->update([
                ...$validated,
                'reviewed_at' => now(),
            ]);

            $status = $validated['status'];

            if ($status === 'approved' && $order->status === 'pending' && $request->user()->can('pedidos.confirmar')) {
                $order = app(OrderWorkflow::class)->transition($order, $request->user(), 'confirmed', 'Pago verificado y aprobado');
            } elseif ($status === 'rejected') {
                app(OrderWorkflow::class)->record($order, $request->user(), 'payment', 'pending', 'rejected', $validated['reference'] ?? null);
                $order->user->appNotifications()->create([
                    'type' => 'payment_rejected',
                    'title' => 'Pago no aprobado',
                    'message' => "El comprobante del pedido {$order->number} no pudo ser validado.",
                    'link' => '/mis-pedidos',
                ]);
            }

            return $order->refresh();
        });

        return new OrderResource($order->load(['user', 'items', 'payment']));
    }
}
