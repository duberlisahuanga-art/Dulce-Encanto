<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PaymentControllerTest extends TestCase
{
    use RefreshDatabase;

    protected bool $seed = true;

    public function test_authorized_user_can_review_a_payment(): void
    {
        $customer = User::factory()->create();
        $order = Order::create([
            'user_id' => $customer->id, 'number' => 'DE-PAY-001', 'status' => 'pending', 'total' => 45,
            'delivery_date' => now()->addDay(), 'delivery_method' => 'pickup', 'phone' => '999999999', 'placed_at' => now(),
        ]);
        $payment = $order->payment()->create(['method' => 'yape', 'status' => 'pending', 'amount' => 45]);
        $administrator = User::factory()->create();
        $administrator->assignRole('administrador');

        $this->actingAs($administrator)->getJson('/api/v1/admin/payments')
            ->assertOk()->assertJsonPath('data.0.payment.method', 'yape');
        $this->actingAs($administrator)->patchJson("/api/v1/admin/payments/{$payment->id}", [
            'status' => 'approved', 'reference' => 'YAPE-123',
        ])->assertOk()
            ->assertJsonPath('data.payment.status', 'approved')
            ->assertJsonPath('data.status', 'confirmed');

        $this->assertDatabaseHas('payments', ['id' => $payment->id, 'status' => 'approved']);
        $this->assertSame('confirmed', $order->fresh()->status);
    }

    public function test_rejecting_payment_notifies_customer_and_records_audit(): void
    {
        $customer = User::factory()->create();
        $order = Order::create([
            'user_id' => $customer->id, 'number' => 'DE-PAY-REJ', 'status' => 'pending', 'total' => 30,
            'delivery_date' => now()->addDay(), 'delivery_method' => 'pickup', 'phone' => '999999999', 'placed_at' => now(),
        ]);
        $payment = $order->payment()->create(['method' => 'transfer', 'status' => 'pending', 'amount' => 30]);
        $administrator = User::factory()->create();
        $administrator->assignRole('administrador');

        $this->actingAs($administrator)->patchJson("/api/v1/admin/payments/{$payment->id}", [
            'status' => 'rejected', 'reference' => 'Comprobante ilegible',
        ])->assertOk()
            ->assertJsonPath('data.payment.status', 'rejected');

        $this->assertDatabaseHas('payments', ['id' => $payment->id, 'status' => 'rejected']);
        $this->assertDatabaseHas('app_notifications', [
            'user_id' => $customer->id,
            'type' => 'payment_rejected',
        ]);
    }

    public function test_a_reviewed_payment_cannot_be_changed_or_notify_twice(): void
    {
        $customer = User::factory()->create();
        $order = Order::create([
            'user_id' => $customer->id, 'number' => 'DE-PAY-FINAL', 'status' => 'pending', 'total' => 30,
            'delivery_date' => now()->addDay(), 'delivery_method' => 'pickup', 'phone' => '999999999', 'placed_at' => now(),
        ]);
        $payment = $order->payment()->create(['method' => 'transfer', 'status' => 'pending', 'amount' => 30]);
        $administrator = User::factory()->create();
        $administrator->assignRole('administrador');

        $this->actingAs($administrator)->patchJson("/api/v1/admin/payments/{$payment->id}", [
            'status' => 'rejected', 'reference' => 'Comprobante inválido',
        ])->assertOk();

        $this->actingAs($administrator)->patchJson("/api/v1/admin/payments/{$payment->id}", [
            'status' => 'approved', 'reference' => 'Segundo intento',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('status');

        $this->assertDatabaseHas('payments', ['id' => $payment->id, 'status' => 'rejected']);
        $this->assertDatabaseCount('app_notifications', 1);
    }

    public function test_customer_cannot_manage_payments(): void
    {
        $customer = User::factory()->create();

        $this->actingAs($customer)->getJson('/api/v1/admin/payments')->assertForbidden();
    }
}
