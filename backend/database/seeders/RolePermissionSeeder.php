<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\PermissionRegistrar;

class RolePermissionSeeder extends Seeder
{
    public function run(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $this->call(PermissionsOnlySeeder::class);

        $superAdmin = User::updateOrCreate(
            ['email' => env('SUPER_ADMIN_EMAIL', 'admin@dulceencanto.test')],
            [
                'name' => env('SUPER_ADMIN_NAME', 'Propietario Dulce Encanto'),
                'password' => Hash::make(env('SUPER_ADMIN_PASSWORD', 'Cambiar123!')),
            ],
        );

        $superAdmin->syncRoles(['superadministrador']);

        $staffPassword = env('STAFF_DEFAULT_PASSWORD', 'Cambiar123!');
        $staffAccounts = [
            ['role' => 'administrador', 'name' => 'Administrador Dulce Encanto', 'email' => env('STAFF_ADMIN_EMAIL', 'administrador@dulceencanto.test')],
            ['role' => 'vendedor', 'name' => 'Vendedor Dulce Encanto', 'email' => env('STAFF_SELLER_EMAIL', 'vendedor@dulceencanto.test')],
            ['role' => 'repartidor', 'name' => 'Repartidor Dulce Encanto', 'email' => env('STAFF_COURIER_EMAIL', 'repartidor@dulceencanto.test')],
        ];

        foreach ($staffAccounts as $account) {
            $user = User::firstOrCreate(
                ['email' => $account['email']],
                ['name' => $account['name'], 'password' => Hash::make($staffPassword)],
            );
            $user->syncRoles([$account['role']]);
        }
    }
}
