<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\OrderResource;
use App\Models\Order;
use App\Models\OrderItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;

class AdminDashboardController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'date_from' => ['nullable', 'required_with:date_to', 'date_format:Y-m-d', 'before_or_equal:today'],
            'date_to' => ['nullable', 'required_with:date_from', 'date_format:Y-m-d', 'after_or_equal:date_from', 'before_or_equal:today'],
            'period' => ['nullable', 'integer', 'in:1,7,30,90'],
            'status' => ['nullable', 'string', 'in:all,pending,confirmed,preparing,ready,out_for_delivery,delivered,cancelled'],
        ]);
        $period = (int) ($validated['period'] ?? 7);
        $status = $validated['status'] ?? 'all';
        $from = isset($validated['date_from']) ? Carbon::parse($validated['date_from'])->startOfDay() : today()->subDays($period - 1);
        $to = isset($validated['date_to']) ? Carbon::parse($validated['date_to'])->endOfDay() : now();
        $period = (int) $from->diffInDays($to->copy()->startOfDay()) + 1;
        if ($period > 366) {
            throw ValidationException::withMessages(['date_to' => 'Selecciona un rango de hasta 366 días.']);
        }
        $filteredOrders = Order::query()
            ->whereBetween('placed_at', [$from->copy()->startOfDay(), $to])
            ->when($status !== 'all', fn ($query) => $query->where('status', $status));

        $dailyTotals = (clone $filteredOrders)->where('status', 'delivered')
            ->selectRaw('DATE(placed_at) as date, SUM(total) as total')
            ->groupByRaw('DATE(placed_at)')->pluck('total', 'date');
        $salesByDay = collect(range(0, $period - 1))->map(function (int $offset) use ($from, $dailyTotals): array {
            $date = $from->copy()->addDays($offset);

            return [
                'date' => $date->format('Y-m-d'),
                'label' => $date->translatedFormat('D'),
                'total' => number_format((float) ($dailyTotals[$date->format('Y-m-d')] ?? 0), 2, '.', ''),
            ];
        });

        $topProducts = OrderItem::query()
            ->selectRaw('name, SUM(quantity) as quantity, SUM(subtotal) as total')
            ->whereHas('order', fn ($query) => $query
                ->where('status', 'delivered')
                ->whereBetween('placed_at', [$from->copy()->startOfDay(), $to])
                ->when($status !== 'all' && $status !== 'delivered', fn ($query) => $query->whereRaw('1 = 0')))
            ->groupBy('name')
            ->orderByDesc('quantity')
            ->limit(5)
            ->get()
            ->map(fn (OrderItem $item): array => [
                'name' => $item->name,
                'quantity' => (int) $item->quantity,
                'total' => number_format((float) $item->total, 2, '.', ''),
            ]);

        return response()->json([
            'data' => [
                'orders_today' => Order::query()->whereDate('placed_at', today())->count(),
                'sales_today' => number_format((float) Order::query()
                    ->where('status', 'delivered')->whereDate('placed_at', today())->sum('total'), 2, '.', ''),
                'pending_orders' => (clone $filteredOrders)->whereIn('status', ['pending', 'confirmed', 'preparing'])->count(),
                'customers' => (clone $filteredOrders)->distinct()->count('user_id'),
                'orders_period' => (clone $filteredOrders)->count(),
                'sales_period' => number_format((float) (clone $filteredOrders)->where('status', 'delivered')->sum('total'), 2, '.', ''),
                'date_from' => $from->format('Y-m-d'),
                'date_to' => $to->format('Y-m-d'),
                'period_days' => $period,
                'status_filter' => $status,
                'sales_by_day' => $salesByDay,
                'top_products' => $topProducts,
                'recent_orders' => OrderResource::collection(
                    (clone $filteredOrders)->with(['user', 'items', 'payment'])->latest('placed_at')->limit(5)->get()
                ),
            ],
        ]);
    }
}
