<?php

namespace Tests\Feature;

use App\Models\User;
use App\Notifications\ResetPasswordNotification;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Illuminate\Routing\Middleware\ThrottleRequests;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    protected bool $seed = true;

    protected function setUp(): void
    {
        parent::setUp();

        // Mantiene la sesión stateful de Sanctum, como la SPA Angular.
        // CSRF se verifica en pruebas de navegador, no en estas pruebas de API.
        $this->withHeader('Origin', 'http://localhost:4200')
            ->withoutMiddleware([
                ValidateCsrfToken::class,
                ThrottleRequests::class,
            ]);
    }

    public function test_public_registration_always_creates_a_client(): void
    {
        $response = $this->postJson('/api/v1/auth/register', [
            'name' => 'Cliente Prueba',
            'email' => 'cliente-registro@example.test',
            'password' => 'Clave1234',
            'password_confirmation' => 'Clave1234',
            'role' => 'superadministrador',
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('user.roles.0', 'cliente');

        $user = User::where('email', 'cliente-registro@example.test')->firstOrFail();

        $this->assertTrue($user->hasExactRoles('cliente'));
        $this->assertFalse($user->hasRole('superadministrador'));
    }

    public function test_a_user_can_login_read_their_profile_and_logout(): void
    {
        $user = User::factory()->create([
            'email' => 'cliente-login@example.test',
            'password' => 'Clave1234',
        ]);
        $user->assignRole('cliente');

        $this->postJson('/api/v1/auth/login', [
            'email' => 'cliente-login@example.test',
            'password' => 'Clave1234',
        ])->assertOk();

        $this->getJson('/api/v1/auth/me')
            ->assertOk()
            ->assertJsonPath('user.email', 'cliente-login@example.test');

        $this->postJson('/api/v1/auth/logout')->assertOk();
        $this->assertGuest('web');
    }

    public function test_customer_can_request_a_persistent_login(): void
    {
        $user = User::factory()->create([
            'email' => 'cliente-recordado@example.test',
            'password' => 'Clave1234',
            'remember_token' => null,
        ]);
        $user->assignRole('cliente');

        $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'Clave1234',
            'remember' => true,
        ])->assertOk();

        $this->assertNotNull($user->fresh()->remember_token);
        $this->assertSame(43200, config('auth.remember_duration'));
    }

    public function test_staff_cannot_create_a_persistent_login(): void
    {
        $user = User::factory()->create([
            'email' => 'vendedor-no-recordado@example.test',
            'password' => 'Clave1234',
            'remember_token' => null,
        ]);
        $user->assignRole('vendedor');

        $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'Clave1234',
            'remember' => true,
        ])->assertOk();

        $this->assertNull($user->fresh()->remember_token);
    }

    public function test_profile_requires_authentication(): void
    {
        $this->getJson('/api/v1/auth/me')->assertUnauthorized();
    }

    public function test_login_rejects_invalid_credentials(): void
    {
        $this->postJson('/api/v1/auth/login', [
            'email' => 'nadie@example.test',
            'password' => 'incorrecta',
        ])->assertUnprocessable();
    }

    public function test_authenticated_user_can_change_password(): void
    {
        $user = User::factory()->create([
            'password' => 'Clave1234',
            'remember_token' => 'old-remember-token',
        ]);

        $this->actingAs($user)->putJson('/api/v1/auth/password', [
            'current_password' => 'Clave1234',
            'password' => 'NuevaClave5678',
            'password_confirmation' => 'NuevaClave5678',
        ])->assertOk();

        $this->assertTrue(Hash::check('NuevaClave5678', $user->fresh()->password));
        $this->assertNotSame('old-remember-token', $user->fresh()->remember_token);
    }

    public function test_closing_other_sessions_revokes_database_sessions_and_remembered_access(): void
    {
        $user = User::factory()->create(['remember_token' => 'old-remember-token']);
        DB::table('sessions')->insert([
            'id' => 'another-device-session',
            'user_id' => $user->id,
            'ip_address' => '127.0.0.1',
            'user_agent' => 'Feature test',
            'payload' => '',
            'last_activity' => now()->timestamp,
        ]);

        $this->actingAs($user)
            ->deleteJson('/api/v1/auth/other-sessions')
            ->assertOk();

        $this->assertDatabaseMissing('sessions', ['id' => 'another-device-session']);
        $this->assertNotSame('old-remember-token', $user->fresh()->remember_token);
    }

    public function test_password_change_rejects_wrong_current_password(): void
    {
        $user = User::factory()->create(['password' => 'Clave1234']);

        $this->actingAs($user)->putJson('/api/v1/auth/password', [
            'current_password' => 'Incorrecta123',
            'password' => 'NuevaClave5678',
            'password_confirmation' => 'NuevaClave5678',
        ])->assertUnprocessable()->assertJsonValidationErrors('current_password');
    }

    public function test_forgot_password_sends_notification_and_stores_hashed_token(): void
    {
        Notification::fake();
        $user = User::factory()->create(['email' => 'olvido@example.test']);

        $this->postJson('/api/v1/auth/forgot-password', [
            'email' => 'olvido@example.test',
        ])->assertOk()
            ->assertJsonPath('message', 'Si el correo existe, enviaremos instrucciones para recuperar la contraseña.');

        Notification::assertSentTo($user, function (ResetPasswordNotification $notification): bool {
            return $notification instanceof ShouldQueue && $notification->connection === 'deferred';
        });
        $this->assertDatabaseHas('password_reset_tokens', ['email' => 'olvido@example.test']);
    }

    public function test_reset_password_updates_password_and_clears_token(): void
    {
        $user = User::factory()->create(['email' => 'reset@example.test', 'password' => Hash::make('ClaveVieja1')]);
        $plainToken = Str::random(64);
        DB::table('password_reset_tokens')->insert([
            'email' => $user->email,
            'token' => Hash::make($plainToken),
            'created_at' => now(),
        ]);

        $this->postJson('/api/v1/auth/reset-password', [
            'email' => 'reset@example.test',
            'token' => $plainToken,
            'password' => 'NuevaClave123',
            'password_confirmation' => 'NuevaClave123',
        ])->assertOk()
            ->assertJsonPath('message', 'Tu contraseña ha sido restablecida correctamente. Ya puedes iniciar sesión.');

        $this->assertTrue(Hash::check('NuevaClave123', $user->fresh()->password));
        $this->assertDatabaseMissing('password_reset_tokens', ['email' => 'reset@example.test']);

        $this->postJson('/api/v1/auth/reset-password', [
            'email' => 'reset@example.test',
            'token' => $plainToken,
            'password' => 'OtraClave456',
            'password_confirmation' => 'OtraClave456',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('token');

        $this->assertTrue(Hash::check('NuevaClave123', $user->fresh()->password));
    }

    public function test_reset_password_rejects_invalid_token(): void
    {
        $user = User::factory()->create(['email' => 'bad-token@example.test']);
        DB::table('password_reset_tokens')->insert([
            'email' => $user->email,
            'token' => Hash::make('token-correcto'),
            'created_at' => now(),
        ]);

        $this->postJson('/api/v1/auth/reset-password', [
            'email' => 'bad-token@example.test',
            'token' => 'token-incorrecto',
            'password' => 'NuevaClave123',
            'password_confirmation' => 'NuevaClave123',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('token');
    }
}
