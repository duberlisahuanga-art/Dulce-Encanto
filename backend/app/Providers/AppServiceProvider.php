<?php

namespace App\Providers;

use App\Models\User;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Auth::guard('web')->setRememberDuration((int) config('auth.remember_duration'));

        RateLimiter::for('shopping-assistant', fn (Request $request): array => [
            Limit::perMinute(5)->by('minute:'.$request->ip()),
            Limit::perDay(30)->by('day:'.$request->ip()),
        ]);

        RateLimiter::for('game-actions', fn (Request $request): Limit => Limit::perMinute(30)
            ->by('game:'.($request->user()?->getAuthIdentifier() ?? $request->ip())));

        Gate::before(
            fn (User $user): ?bool => $user->hasRole('superadministrador') ? true : null,
        );
    }
}
