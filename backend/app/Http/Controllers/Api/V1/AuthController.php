<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Models\User;
use App\Notifications\ResetPasswordNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    private const STAFF_ROLES = ['superadministrador', 'administrador', 'vendedor', 'repartidor'];

    public function register(RegisterRequest $request): JsonResponse
    {
        $user = DB::transaction(function () use ($request): User {
            $user = User::create($request->validated());
            $user->assignRole('cliente');

            return $user;
        });

        Auth::login($user);
        $user->update(['last_login_at' => now()]);
        $request->session()->regenerate();
        $request->user()->update(['last_login_at' => now()]);

        return response()->json([
            'message' => 'Cuenta creada correctamente.',
            'user' => $this->userPayload($user),
        ], 201);
    }

    public function login(LoginRequest $request): JsonResponse
    {
        $credentials = $request->safe()->only(['email', 'password']);
        $candidate = User::query()->where('email', $credentials['email'])->first();
        $remember = $request->boolean('remember')
            && $candidate !== null
            && ! $candidate->hasAnyRole(self::STAFF_ROLES);

        if (! Auth::attempt($credentials, $remember)) {
            throw ValidationException::withMessages([
                'email' => ['Las credenciales ingresadas no son correctas.'],
            ]);
        }

        $request->session()->regenerate();

        return response()->json([
            'message' => 'Sesión iniciada correctamente.',
            'user' => $this->userPayload($request->user()),
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'user' => $this->userPayload($request->user()),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json([
            'message' => 'Sesión cerrada correctamente.',
        ]);
    }

    public function updatePassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'current_password' => ['required', 'current_password'],
            'password' => ['required', 'confirmed', Password::min(8)->letters()->numbers()],
        ]);

        $request->user()->update([
            'password' => Hash::make($validated['password']),
        ]);
        $request->user()->setRememberToken(Str::random(60));
        $request->user()->save();
        DB::table('sessions')
            ->where('user_id', $request->user()->id)
            ->where('id', '!=', $request->session()->getId())
            ->delete();
        $request->session()->regenerate();

        return response()->json(['message' => 'Contraseña actualizada correctamente.']);
    }

    public function forgotPassword(Request $request): JsonResponse
    {
        $validated = $request->validate(['email' => ['required', 'email']]);

        $user = User::query()->where('email', $validated['email'])->first();
        if ($user) {
            $token = Str::random(64);
            DB::table('password_reset_tokens')->updateOrInsert(
                ['email' => $user->email],
                ['token' => Hash::make($token), 'created_at' => now()]
            );

            $user->notify(new ResetPasswordNotification($token));
        }

        return response()->json([
            'message' => 'Si el correo existe, enviaremos instrucciones para recuperar la contraseña.',
        ]);
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'token' => ['required', 'string'],
            'email' => ['required', 'email'],
            'password' => ['required', 'confirmed', Password::min(8)->letters()->numbers()],
        ]);

        DB::transaction(function () use ($validated): void {
            $record = DB::table('password_reset_tokens')
                ->where('email', $validated['email'])
                ->lockForUpdate()
                ->first();

            if (! $record || ! Hash::check($validated['token'], $record->token)) {
                throw ValidationException::withMessages([
                    'token' => ['El enlace de recuperación es inválido o ha expirado.'],
                ]);
            }

            if (Carbon::parse($record->created_at)->addMinutes(60)->isPast()) {
                throw ValidationException::withMessages([
                    'token' => ['El enlace de recuperación ha expirado. Solicita uno nuevo.'],
                ]);
            }

            $user = User::query()->where('email', $validated['email'])->lockForUpdate()->first();
            if (! $user) {
                throw ValidationException::withMessages([
                    'email' => ['No encontramos un usuario con ese correo electrónico.'],
                ]);
            }

            $user->update([
                'password' => Hash::make($validated['password']),
            ]);
            $user->setRememberToken(Str::random(60));
            $user->save();

            DB::table('password_reset_tokens')->where('email', $validated['email'])->delete();
            DB::table('sessions')->where('user_id', $user->id)->delete();
        });

        return response()->json([
            'message' => 'Tu contraseña ha sido restablecida correctamente. Ya puedes iniciar sesión.',
        ]);
    }

    private function userPayload(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'phone' => $user->phone,
            'birthday' => $user->birthday?->toDateString(),
            'last_login_at' => $user->last_login_at?->toISOString(),
            'roles' => $user->getRoleNames()->values(),
            'permissions' => $user->getAllPermissions()->pluck('name')->values(),
        ];
    }
}
