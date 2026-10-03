<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Spatie\Permission\Models\Permission;

class StaffUserController extends Controller
{
    private const ROLES = ['administrador', 'vendedor', 'repartidor'];

    public function index(): JsonResponse
    {
        $users = User::query()
            ->whereHas('roles', fn ($query) => $query->whereIn('name', self::ROLES))
            ->with('roles:id,name')
            ->orderBy('name')
            ->get();

        return response()->json(['data' => $users->map(fn (User $user) => $this->payload($user))]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
            'role' => ['required', Rule::in(self::ROLES)],
            'permissions' => ['nullable', 'array'],
            'permissions.*' => ['string', Rule::exists('permissions', 'name')->where('guard_name', 'web')],
        ]);

        $role = $validated['role'];
        $permissions = $validated['permissions'] ?? [];
        unset($validated['role'], $validated['password_confirmation'], $validated['permissions']);
        $user = User::create($validated);
        $user->assignRole($role);
        $user->syncPermissions($permissions);

        return response()->json(['data' => $this->payload($user->load('roles'))], 201);
    }

    public function update(Request $request, User $staffUser): JsonResponse
    {
        abort_unless($staffUser->hasAnyRole(self::ROLES), 404);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users')->ignore($staffUser)],
            'password' => ['nullable', 'string', 'min:8', 'confirmed'],
            'role' => ['required', Rule::in(self::ROLES)],
            'permissions' => ['nullable', 'array'],
            'permissions.*' => ['string', Rule::exists('permissions', 'name')->where('guard_name', 'web')],
        ]);

        $role = $validated['role'];
        $permissions = $validated['permissions'] ?? [];
        unset($validated['role'], $validated['password_confirmation'], $validated['permissions']);
        if (blank($validated['password'] ?? null)) {
            unset($validated['password']);
        }
        $staffUser->update($validated);
        $staffUser->syncRoles([$role]);
        $staffUser->syncPermissions($permissions);

        return response()->json(['data' => $this->payload($staffUser->load('roles'))]);
    }

    public function destroy(Request $request, User $staffUser): JsonResponse
    {
        abort_unless($staffUser->hasAnyRole(self::ROLES), 404);
        abort_if($staffUser->is($request->user()), 422, 'No puedes eliminar tu propia cuenta.');

        $staffUser->delete();

        return response()->noContent();
    }

    private function payload(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->roles->first()?->name,
            'permissions' => $user->getDirectPermissions()->pluck('name')->values(),
            'created_at' => $user->created_at,
        ];
    }
}
