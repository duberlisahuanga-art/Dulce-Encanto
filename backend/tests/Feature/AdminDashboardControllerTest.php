<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use PHPUnit\Framework\Attributes\TestWith;
use Tests\TestCase;

class AdminDashboardControllerTest extends TestCase
{
    use RefreshDatabase;

    protected bool $seed = true;

    public function test_administrator_receives_real_dashboard_metrics(): void
    {
        $customer = User::factory()->create();
        $customer->assignRole('cliente');
        $delivered = Order::create([
            'user_id' => $customer->id, 'number' => 'DE-DASH-1', 'status' => 'delivered', 'total' => 120,
            'delivery_date' => now(), 'delivery_method' => 'pickup', 'phone' => '999999999', 'placed_at' => now(),
        ]);
        $delivered->items()->create([
            'type' => 'product', 'name' => 'Torta de chocolate', 'unit_price' => 60, 'quantity' => 2, 'subtotal' => 120,
        ]);
        Order::create([
            'user_id' => $customer->id, 'number' => 'DE-DASH-2', 'status' => 'pending', 'total' => 40,
            'delivery_date' => now(), 'delivery_method' => 'pickup', 'phone' => '999999999', 'placed_at' => now(),
        ]);
        $administrator = User::factory()->create();
        $administrator->assignRole('administrador');

        $this->actingAs($administrator)->getJson('/api/v1/admin/dashboard')->assertOk()
            ->assertJsonPath('data.orders_today', 2)
            ->assertJsonPath('data.sales_today', '120.00')
            ->assertJsonPath('data.pending_orders', 1)
            ->assertJsonPath('data.customers', 1)
            ->assertJsonPath('data.orders_period', 2)
            ->assertJsonPath('data.sales_period', '120.00')
            ->assertJsonPath('data.period_days', 7)
            ->assertJsonPath('data.top_products.0.quantity', 2)
            ->assertJsonCount(7, 'data.sales_by_day');
    }

    public function test_dashboard_filters_by_period_and_status(): void
    {
        $customer = User::factory()->create();
        $customer->assignRole('cliente');
        Order::create([
            'user_id' => $customer->id, 'number' => 'DE-FILTER-1', 'status' => 'pending', 'total' => 50,
            'delivery_date' => now(), 'delivery_method' => 'pickup', 'phone' => '999999999', 'placed_at' => now(),
        ]);
        Order::create([
            'user_id' => $customer->id, 'number' => 'DE-FILTER-OLD', 'status' => 'pending', 'total' => 90,
            'delivery_date' => now(), 'delivery_method' => 'pickup', 'phone' => '999999999', 'placed_at' => now()->subDays(10),
        ]);
        $administrator = User::factory()->create();
        $administrator->assignRole('administrador');

        $this->actingAs($administrator)->getJson('/api/v1/admin/dashboard?period=7&status=pending')
            ->assertOk()
            ->assertJsonPath('data.orders_period', 1)
            ->assertJsonPath('data.status_filter', 'pending')
            ->assertJsonPath('data.pending_orders', 1)
            ->assertJsonPath('data.customers', 1)
            ->assertJsonCount(1, 'data.recent_orders');
    }

    public function test_custom_dates_include_both_boundaries_and_scope_all_metrics(): void
    {
        $this->travelTo(Carbon::parse('2026-09-16 12:00:00'));
        $customer = User::factory()->create();
        $other = User::factory()->create();
        $administrator = User::factory()->create();
        $administrator->assignRole('administrador');
        foreach ([['DE-START', '2026-09-10 00:00:00', 'delivered', 100, $customer->id], ['DE-END', '2026-09-12 23:59:59', 'preparing', 40, $customer->id], ['DE-OUTSIDE', '2026-09-13 00:00:00', 'pending', 80, $other->id]] as [$number, $date, $status, $total, $userId]) {
            $order = Order::create(['user_id' => $userId, 'number' => $number, 'status' => $status, 'total' => $total, 'delivery_date' => now(), 'delivery_method' => 'pickup', 'phone' => '999999999', 'placed_at' => $date]);
            $order->items()->create(['type' => 'product', 'name' => 'Torta de prueba', 'unit_price' => $total, 'quantity' => 1, 'subtotal' => $total]);
        }

        $this->actingAs($administrator)->getJson('/api/v1/admin/dashboard?date_from=2026-09-10&date_to=2026-09-12')
            ->assertOk()->assertJsonPath('data.orders_period', 2)->assertJsonPath('data.customers', 1)
            ->assertJsonPath('data.pending_orders', 1)->assertJsonPath('data.sales_period', '100.00')
            ->assertJsonPath('data.date_from', '2026-09-10')->assertJsonPath('data.date_to', '2026-09-12')
            ->assertJsonPath('data.sales_by_day.0.total', '100.00')->assertJsonPath('data.sales_by_day.2.total', '0.00')
            ->assertJsonPath('data.top_products.0.quantity', 1)->assertJsonCount(3, 'data.sales_by_day')
            ->assertJsonCount(2, 'data.recent_orders');
    }

    public function test_delivered_filter_excludes_pending_orders_and_unrelated_customers(): void
    {
        $this->freezeTime();
        $administrator = User::factory()->create();
        $administrator->assignRole('administrador');
        $customer = User::factory()->create();
        Order::create(['user_id' => $customer->id, 'number' => 'DE-PENDING-ONLY', 'status' => 'pending', 'total' => 40, 'delivery_date' => now(), 'delivery_method' => 'pickup', 'phone' => '999999999', 'placed_at' => now()]);

        $this->actingAs($administrator)->getJson('/api/v1/admin/dashboard?status=delivered')
            ->assertOk()->assertJsonPath('data.orders_period', 0)->assertJsonPath('data.pending_orders', 0)
            ->assertJsonPath('data.customers', 0)->assertJsonPath('data.sales_period', '0.00');
    }

    #[TestWith(['date_from=2026-09-10', 'date_to'])]
    #[TestWith(['date_from=2026-09-12&date_to=2026-09-10', 'date_to'])]
    #[TestWith(['date_from=2026-09-10&date_to=2026-09-17', 'date_to'])]
    #[TestWith(['date_from=2020-01-01&date_to=2026-09-10', 'date_to'])]
    #[TestWith(['date_from=bad&date_to=2026-09-10', 'date_from'])]
    public function test_invalid_custom_dates_are_rejected(string $query, string $field): void
    {
        $this->travelTo(Carbon::parse('2026-09-16 12:00:00'));
        $administrator = User::factory()->create();
        $administrator->assignRole('administrador');

        $this->actingAs($administrator)->getJson('/api/v1/admin/dashboard?'.$query)
            ->assertUnprocessable()->assertJsonValidationErrors($field);
    }

    public function test_client_cannot_view_dashboard(): void
    {
        $client = User::factory()->create();
        $client->assignRole('cliente');

        $this->actingAs($client)->getJson('/api/v1/admin/dashboard')->assertForbidden();
    }
}
