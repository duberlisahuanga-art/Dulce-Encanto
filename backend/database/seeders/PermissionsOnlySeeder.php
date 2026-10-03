<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class PermissionsOnlySeeder extends Seeder
{
    public function run(): void
    {
        $admin = ['configuracion.ver', 'configuracion.editar', 'usuarios.ver', 'catalogo.ver', 'catalogo.gestionar', 'tortas.gestionar', 'pedidos.ver', 'pedidos.gestionar', 'pedidos.confirmar', 'pedidos.preparar', 'pedidos.cancelar', 'pedidos.entregar_tienda', 'pagos.ver', 'pagos.aprobar', 'promociones.ver', 'promociones.gestionar', 'delivery.ver', 'delivery.asignar', 'delivery.actualizar', 'reportes.ver', 'juego.ver', 'juego.gestionar'];
        $roles = [
            'superadministrador' => [...$admin, 'usuarios.gestionar', 'roles.gestionar'],
            'administrador' => $admin,
            'vendedor' => ['catalogo.ver', 'pedidos.ver', 'pedidos.confirmar', 'pedidos.preparar', 'pedidos.cancelar', 'pedidos.entregar_tienda', 'delivery.asignar', 'pagos.ver', 'pagos.aprobar', 'promociones.ver'],
            'repartidor' => ['delivery.ver', 'delivery.actualizar'],
            'cliente' => [],
        ];
        app(PermissionRegistrar::class)->forgetCachedPermissions();
        foreach (array_unique(array_merge(...array_values($roles))) as $permission) {
            Permission::findOrCreate($permission, 'web');
        }

        foreach (array_keys($roles) as $role) {
            Role::findOrCreate($role, 'web');
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();

        foreach ($roles as $role => $permissions) {
            Role::findByName($role, 'web')->syncPermissions($permissions);
        }
        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
}
