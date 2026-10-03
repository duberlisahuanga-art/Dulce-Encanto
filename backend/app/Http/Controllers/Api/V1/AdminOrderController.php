<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateOrderStatusRequest;
use App\Http\Resources\OrderResource;
use App\Models\Order;
use App\Services\OrderWorkflow;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;

class AdminOrderController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Order::query()->with(['items', 'user', 'payment', 'courier', 'deliveryZone'])->latest('placed_at');

        if ($request->filled('status')) {
            $query->where('status', $request->string('status')->toString());
        }

        return OrderResource::collection($query->get());
    }

    public function show(Order $order): OrderResource
    {
        return new OrderResource($order->load(['items', 'user', 'payment', 'courier']));
    }

    public function update(UpdateOrderStatusRequest $request, Order $order): OrderResource
    {
        $order = app(OrderWorkflow::class)->transition($order, $request->user(), $request->validated('status'), $request->validated('reason'), $request->validated('expected_status'));

        return new OrderResource($order->load(['items', 'user', 'payment', 'courier']));
    }

    public function history(Request $request, Order $order): JsonResponse
    {
        return response()->json(['data' => DB::table('order_changes')->where('order_id', $order->id)->orderByDesc('id')->get()]);
    }
}
