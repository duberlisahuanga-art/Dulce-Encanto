import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { permissionGuard } from './core/auth/permission.guard';

export const routes: Routes = [
  {
    path: 'administracion',
    canActivate: [permissionGuard('reportes.ver')],
    loadComponent: () =>
      import('./features/admin/dashboard/dashboard').then((component) => component.Dashboard),
  },
  {
    path: 'catalogo',
    loadComponent: () =>
      import('./features/catalog/catalog').then((component) => component.Catalog),
  },
  {
    path: 'zona-fria',
    loadComponent: () =>
      import('./features/cold-zone/cold-zone').then((component) => component.ColdZone),
  },
  {
    path: 'entrega-dulce',
    canActivate: [authGuard],
    loadComponent: () => import('./features/game/game').then((component) => component.Game),
  },
  {
    path: 'catalogo/:slug',
    loadComponent: () =>
      import('./features/product-detail/product-detail').then(
        (component) => component.ProductDetail,
      ),
  },
  {
    path: 'disena-tu-torta',
    loadComponent: () =>
      import('./features/cake-designer/cake-designer').then((component) => component.CakeDesigner),
  },
  {
    path: '',
    loadComponent: () => import('./features/home/home').then((component) => component.Home),
  },
  {
    path: 'ingresar',
    loadComponent: () => import('./features/auth/login/login').then((component) => component.Login),
  },
  {
    path: 'registro',
    loadComponent: () =>
      import('./features/auth/register/register').then((component) => component.Register),
  },
  {
    path: 'recuperar-contrasena',
    loadComponent: () =>
      import('./features/auth/forgot-password/forgot-password').then(
        (component) => component.ForgotPassword,
      ),
  },
  {
    path: 'carrito',
    canActivate: [authGuard],
    loadComponent: () => import('./features/cart/cart').then((component) => component.Cart),
  },
  {
    path: 'finalizar-pedido',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/checkout/checkout').then((component) => component.Checkout),
  },
  {
    path: 'mis-pedidos',
    canActivate: [authGuard],
    loadComponent: () => import('./features/orders/orders').then((component) => component.Orders),
  },
  {
    path: 'favoritos',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/favorites/favorites').then((component) => component.Favorites),
  },
  {
    path: 'repartos',
    canActivate: [permissionGuard('delivery.ver')],
    loadComponent: () =>
      import('./features/delivery/delivery').then((component) => component.Delivery),
  },
  {
    path: 'cuenta',
    canActivate: [authGuard],
    data: { section: 'summary' },
    loadComponent: () =>
      import('./features/account/account').then((component) => component.Account),
  },
  {
    path: 'cuenta/perfil',
    canActivate: [authGuard],
    data: { section: 'profile' },
    loadComponent: () =>
      import('./features/account/account').then((component) => component.Account),
  },
  {
    path: 'cuenta/seguridad',
    canActivate: [authGuard],
    data: { section: 'security' },
    loadComponent: () =>
      import('./features/account/account').then((component) => component.Account),
  },
  {
    path: 'cuenta/direcciones',
    canActivate: [authGuard],
    data: { section: 'addresses' },
    loadComponent: () => import('./features/account/account').then((component) => component.Account),
  },
  {
    path: 'notificaciones',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/notifications/notifications').then((component) => component.Notifications),
  },
  {
    path: 'administracion/catalogo',
    canActivate: [permissionGuard('catalogo.gestionar')],
    data: { view: 'summary' },
    loadComponent: () =>
      import('./features/admin/catalog-admin/catalog-admin').then(
        (component) => component.CatalogAdmin,
      ),
  },
  {
    path: 'administracion/catalogo/categorias',
    canActivate: [permissionGuard('catalogo.gestionar')],
    data: { view: 'categories' },
    loadComponent: () =>
      import('./features/admin/catalog-admin/catalog-admin').then(
        (component) => component.CatalogAdmin,
      ),
  },
  {
    path: 'administracion/catalogo/categorias/:slug',
    canActivate: [permissionGuard('catalogo.gestionar')],
    data: { view: 'category-products' },
    loadComponent: () =>
      import('./features/admin/catalog-admin/catalog-admin').then(
        (component) => component.CatalogAdmin,
      ),
  },
  {
    path: 'administracion/catalogo/productos/nuevo',
    canActivate: [permissionGuard('catalogo.gestionar')],
    data: { view: 'product-editor' },
    loadComponent: () =>
      import('./features/admin/catalog-admin/catalog-admin').then(
        (component) => component.CatalogAdmin,
      ),
  },
  {
    path: 'administracion/catalogo/productos/:id',
    canActivate: [permissionGuard('catalogo.gestionar')],
    data: { view: 'product-editor' },
    loadComponent: () =>
      import('./features/admin/catalog-admin/catalog-admin').then(
        (component) => component.CatalogAdmin,
      ),
  },
  {
    path: 'administracion/opciones-torta',
    canActivate: [permissionGuard('tortas.gestionar')],
    loadComponent: () =>
      import('./features/admin/cake-options-admin/cake-options-admin').then(
        (component) => component.CakeOptionsAdmin,
      ),
  },
  {
    path: 'administracion/pedidos',
    canActivate: [permissionGuard('pedidos.ver')],
    loadComponent: () =>
      import('./features/admin/orders-admin/orders-admin').then(
        (component) => component.OrdersAdmin,
      ),
  },
  {
    path: 'administracion/pagos',
    canActivate: [permissionGuard('pagos.ver')],
    loadComponent: () =>
      import('./features/admin/payments-admin/payments-admin').then(
        (component) => component.PaymentsAdmin,
      ),
  },
  {
    path: 'administracion/promociones',
    canActivate: [permissionGuard('promociones.ver')],
    loadComponent: () =>
      import('./features/admin/promotions-admin/promotions-admin').then(
        (component) => component.PromotionsAdmin,
      ),
  },
  {
    path: 'administracion/clientes',
    canActivate: [permissionGuard('usuarios.ver')],
    loadComponent: () =>
      import('./features/admin/customers-admin/customers-admin').then(
        (component) => component.CustomersAdmin,
      ),
  },
  {
    path: 'administracion/equipo',
    canActivate: [permissionGuard('roles.gestionar')],
    loadComponent: () =>
      import('./features/admin/staff-users-admin/staff-users-admin').then(
        (component) => component.StaffUsersAdmin,
      ),
  },
  {
    path: 'administracion/entregas',
    canActivate: [permissionGuard('configuracion.editar')],
    loadComponent: () =>
      import('./features/admin/delivery-config-admin/delivery-config-admin').then(
        (component) => component.DeliveryConfigAdmin,
      ),
  },
  {
    path: 'administracion/juego',
    canActivate: [permissionGuard('juego.ver')],
    loadComponent: () => import('./features/admin/game-admin/game-admin').then((component) => component.GameAdmin),
  },
  { path: '**', redirectTo: '' },
];
