<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StaffUserControllerTest extends TestCase
{
    use RefreshDatabase;

    protected bool $seed = true;

    public function test_superadministrator_can_create_and_update_staff(): void
    {
        $owner = User::role('superadministrador')->firstOrFail();

        $response = $this->actingAs($owner)->postJson('/api/v1/admin/staff-users', [
            'name' => 'María Ventas',
            'email' => 'maria@example.test',
            'password' => 'Clave1234',
            'password_confirmation' => 'Clave1234',
            'role' => 'vendedor',
        ])->assertCreated()->assertJsonPath('data.role', 'vendedor');

        $id = $response->json('data.id');
        $this->actingAs($owner)->putJson("/api/v1/admin/staff-users/{$id}", [
            'name' => 'María Administración',
            'email' => 'maria@example.test',
            'role' => 'administrador',
        ])->assertOk()->assertJsonPath('data.role', 'administrador');
    }

    public function test_other_roles_cannot_manage_staff(): void
    {
        $administrator = User::role('administrador')->firstOrFail();
        $this->actingAs($administrator)->getJson('/api/v1/admin/staff-users')->assertForbidden();
    }
}
