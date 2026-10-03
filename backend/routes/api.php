<?php

use App\Http\Controllers\Api\V1\AccountController;
use App\Http\Controllers\Api\V1\AdminCustomerController;
use App\Http\Controllers\Api\V1\AdminDashboardController;
use App\Http\Controllers\Api\V1\AdminOrderController;
use App\Http\Controllers\Api\V1\AdminPaymentController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\CakeDesignerController;
use App\Http\Controllers\Api\V1\CakeImageController;
use App\Http\Controllers\Api\V1\CakeOptionController;
use App\Http\Controllers\Api\V1\CartController;
use App\Http\Controllers\Api\V1\CatalogController;
use App\Http\Controllers\Api\V1\CategoryController;
use App\Http\Controllers\Api\V1\DeliveryConfigurationController;
use App\Http\Controllers\Api\V1\DeliveryController;
use App\Http\Controllers\Api\V1\FavoriteController;
use App\Http\Controllers\Api\V1\LocationController;
use App\Http\Controllers\Api\V1\NotificationController;
use App\Http\Controllers\Api\V1\OrderController;
use App\Http\Controllers\Api\V1\ProductController;
use App\Http\Controllers\Api\V1\PromotionController;
use App\Http\Controllers\Api\V1\PublicPromotionController;
use App\Http\Controllers\Api\V1\StaffUserController;
use App\Http\Controllers\Api\V1\ShoppingAssistantController;
use App\Http\Controllers\Api\V1\GameController;
use App\Http\Controllers\Api\V1\AdminGameController;
use App\Http\Middleware\LockPurchase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function (): void {
    Route::get('/health', function () {
        DB::select('SELECT 1');

        return response()->json([
            'status' => 'ok',
            'application' => config('app.name'),
            'database' => 'connected',
            'php' => PHP_VERSION,
        ]);
    });

    Route::get('/catalog/categories', [CatalogController::class, 'categories']);
    Route::get('/catalog/products', [CatalogController::class, 'products']);
    Route::get('/catalog/products/{product:slug}', [CatalogController::class, 'product']);
    Route::post('/catalog/recommendations', ShoppingAssistantController::class)
        ->middleware('throttle:shopping-assistant');
    Route::get('/promotions', [PublicPromotionController::class, 'index']);
    Route::get('/delivery-configuration', [DeliveryConfigurationController::class, 'public']);
    Route::get('/cake-designer/options', [CakeDesignerController::class, 'options']);
    Route::post('/cake-designer/quote', [CakeDesignerController::class, 'quote'])
        ->middleware('throttle:30,1');

    Route::middleware('guest')->group(function (): void {
        Route::post('/auth/register', [AuthController::class, 'register'])
            ->middleware('throttle:6,1');
        Route::post('/auth/login', [AuthController::class, 'login'])
            ->middleware('throttle:6,1');
        Route::post('/auth/forgot-password', [AuthController::class, 'forgotPassword'])
            ->middleware('throttle:6,1');
        Route::post('/auth/reset-password', [AuthController::class, 'resetPassword'])
            ->middleware('throttle:6,1');
    });

    Route::middleware('auth:sanctum')->group(function (): void {
        Route::prefix('game')->middleware('throttle:120,1')->group(function (): void {
            Route::get('/config', [GameController::class, 'config']);
            Route::get('/levels', [GameController::class, 'levels']);
            Route::post('/attempts/start', [GameController::class, 'start'])->middleware('throttle:game-actions');
            Route::post('/attempts/{attempt}/finish', [GameController::class, 'finish'])->middleware('throttle:game-actions');
            Route::post('/attempts/{attempt}/pause', [GameController::class, 'pause'])->middleware('throttle:game-actions');
            Route::post('/attempts/{attempt}/resume', [GameController::class, 'resume'])->middleware('throttle:game-actions');
            Route::post('/attempts/{attempt}/abandon', [GameController::class, 'abandon'])->middleware('throttle:game-actions');
            Route::get('/profile', [GameController::class, 'profile']);
            Route::get('/history', [GameController::class, 'history']);
            Route::get('/rewards', [GameController::class, 'rewards']);
            Route::post('/rewards/{reward}/redeem', [GameController::class, 'redeem'])->middleware('throttle:game-actions');
            Route::get('/coupons', [GameController::class, 'coupons']);
        });

        Route::prefix('admin/game')->middleware('can:juego.ver')->group(function (): void {
            Route::get('/dashboard', [AdminGameController::class, 'dashboard']);
            Route::get('/settings', [AdminGameController::class, 'settings']);
            Route::get('/levels', [AdminGameController::class, 'levels']);
            Route::get('/obstacles', [AdminGameController::class, 'obstacles']);
            Route::get('/rewards', [AdminGameController::class, 'rewards']);
            Route::get('/attempts', [AdminGameController::class, 'attempts']);
            Route::get('/coupons', [AdminGameController::class, 'coupons']);
            Route::middleware('can:juego.gestionar')->group(function (): void {
                Route::put('/settings', [AdminGameController::class, 'updateSettings']);
                Route::post('/levels', [AdminGameController::class, 'saveLevel']);
                Route::put('/levels/{level}', [AdminGameController::class, 'saveLevel']);
                Route::post('/obstacles', [AdminGameController::class, 'saveObstacle']);
                Route::put('/obstacles/{obstacle}', [AdminGameController::class, 'saveObstacle']);
                Route::post('/rewards', [AdminGameController::class, 'saveReward']);
                Route::put('/rewards/{reward}', [AdminGameController::class, 'saveReward']);
            });
        });
        Route::get('/auth/me', [AuthController::class, 'me']);
        Route::post('/auth/logout', [AuthController::class, 'logout']);
        Route::put('/account/profile', [AccountController::class, 'updateProfile']);
        Route::delete('/auth/other-sessions', [AccountController::class, 'destroyOtherSessions']);
        Route::get('/addresses', [AccountController::class, 'addresses']);
        Route::post('/addresses', [AccountController::class, 'storeAddress']);
        Route::put('/addresses/{address}', [AccountController::class, 'updateAddress']);
        Route::delete('/addresses/{address}', [AccountController::class, 'destroyAddress']);
        Route::put('/auth/password', [AuthController::class, 'updatePassword'])
            ->middleware('throttle:6,1');
        Route::get('/notifications', [NotificationController::class, 'index']);
        Route::patch('/notifications/read-all', [NotificationController::class, 'readAll']);
        Route::patch('/notifications/{notification}/read', [NotificationController::class, 'read']);
        Route::post('/cake-designer/image', [CakeImageController::class, 'store'])
            ->middleware('throttle:3,60');
        Route::get('/cart', [CartController::class, 'show']);
        Route::post('/cart/products', [CartController::class, 'storeProduct'])->middleware(LockPurchase::class);
        Route::post('/cart/custom-cakes', [CartController::class, 'storeCake'])->middleware(LockPurchase::class);
        Route::patch('/cart/items/{cartItem}', [CartController::class, 'update'])->middleware(LockPurchase::class);
        Route::delete('/cart/items/{cartItem}', [CartController::class, 'destroy'])->middleware(LockPurchase::class);
        Route::delete('/cart', [CartController::class, 'clear'])->middleware(LockPurchase::class);
        Route::post('/cart/coupon', [CartController::class, 'applyCoupon'])->middleware(LockPurchase::class);
        Route::delete('/cart/coupon', [CartController::class, 'removeCoupon'])->middleware(LockPurchase::class);
        Route::get('/orders', [OrderController::class, 'index']);
        Route::post('/orders', [OrderController::class, 'store'])->middleware(LockPurchase::class);
        Route::get('/orders/{order}', [OrderController::class, 'show']);
        Route::post('/orders/{order}/cancellation-request', [OrderController::class, 'requestCancellation']);
        Route::get('/favorites', [FavoriteController::class, 'index']);
        Route::post('/favorites/{product}', [FavoriteController::class, 'store']);
        Route::delete('/favorites/{product}', [FavoriteController::class, 'destroy']);
        Route::get('/location/reverse', [LocationController::class, 'reverse'])->middleware('throttle:30,1');

        Route::get('/admin/dashboard', AdminDashboardController::class)
            ->middleware('can:reportes.ver');

        Route::prefix('admin')->middleware('can:pedidos.ver')->group(function (): void {
            Route::get('/orders', [AdminOrderController::class, 'index']);
            Route::get('/orders/{order}', [AdminOrderController::class, 'show']);
            Route::get('/orders/{order}/history', [AdminOrderController::class, 'history']);
            Route::patch('/orders/{order}', [AdminOrderController::class, 'update']);
        });

        Route::prefix('admin')->middleware('can:pagos.ver')->group(function (): void {
            Route::get('/payments', [AdminPaymentController::class, 'index']);
            Route::patch('/payments/{payment}', [AdminPaymentController::class, 'update'])
                ->middleware('can:pagos.aprobar');
        });

        Route::prefix('admin')->middleware('can:catalogo.gestionar')->group(function (): void {
            Route::apiResource('categories', CategoryController::class);
            Route::apiResource('products', ProductController::class);
        });

        Route::prefix('admin')->middleware('can:tortas.gestionar')->group(function (): void {
            Route::apiResource('cake-options', CakeOptionController::class);
        });

        Route::prefix('admin')->middleware('can:promociones.ver')->group(function (): void {
            Route::get('/promotions', [PromotionController::class, 'index']);
            Route::get('/promotions/{promotion}', [PromotionController::class, 'show']);
            Route::middleware('can:promociones.gestionar')->group(function (): void {
                Route::post('/promotions', [PromotionController::class, 'store']);
                Route::put('/promotions/{promotion}', [PromotionController::class, 'update']);
                Route::delete('/promotions/{promotion}', [PromotionController::class, 'destroy']);
            });
        });

        Route::prefix('admin')->middleware('can:usuarios.ver')->group(function (): void {
            Route::get('/customers', [AdminCustomerController::class, 'index']);
            Route::get('/customers/{customer}', [AdminCustomerController::class, 'show']);
        });

        Route::prefix('admin/delivery')->middleware('can:delivery.asignar')->group(function (): void {
            Route::get('/couriers', [DeliveryController::class, 'couriers']);
            Route::patch('/orders/{order}/assign', [DeliveryController::class, 'assign']);
        });
        Route::prefix('admin/delivery-configuration')->middleware('can:configuracion.editar')->group(function (): void {
            Route::get('/', [DeliveryConfigurationController::class, 'admin']);
            Route::put('/settings', [DeliveryConfigurationController::class, 'updateSettings']);
            Route::post('/zones', [DeliveryConfigurationController::class, 'storeZone']);
            Route::put('/zones/{zone}', [DeliveryConfigurationController::class, 'updateZone']);
            Route::post('/blocked-dates', [DeliveryConfigurationController::class, 'blockDate']);
            Route::delete('/blocked-dates/{blockedDate}', [DeliveryConfigurationController::class, 'unblockDate']);
        });

        Route::middleware('can:delivery.ver')->group(function (): void {
            Route::get('/delivery/orders', [DeliveryController::class, 'index']);
            Route::patch('/delivery/orders/{order}', [DeliveryController::class, 'update'])->middleware('can:delivery.actualizar');
            Route::patch('/delivery/orders/{order}/issue', [DeliveryController::class, 'reportIssue'])->middleware('can:delivery.actualizar');
            Route::patch('/delivery/location', [DeliveryController::class, 'updateLocation'])->middleware('can:delivery.actualizar');
        });

        Route::prefix('admin')->middleware('can:roles.gestionar')->group(function (): void {
            Route::get('/staff-users', [StaffUserController::class, 'index']);
            Route::post('/staff-users', [StaffUserController::class, 'store']);
            Route::put('/staff-users/{staffUser}', [StaffUserController::class, 'update']);
            Route::delete('/staff-users/{staffUser}', [StaffUserController::class, 'destroy']);
        });
    });
});
