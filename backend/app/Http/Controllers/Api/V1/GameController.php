<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\GameAttempt;
use App\Models\GameLevel;
use App\Models\GamePointTransaction;
use App\Models\GameReward;
use App\Models\GameRewardRedemption;
use App\Models\GameSetting;
use App\Models\Promotion;
use App\Models\User;
use App\Services\GameRules;
use App\Services\GameWallet;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class GameController extends Controller
{
    public function config(): JsonResponse
    {
        return response()->json(['data' => GameSetting::query()->firstOrFail()]);
    }

    public function levels(Request $request): JsonResponse
    {
        $best = GameAttempt::query()->where('user_id', $request->user()->id)
            ->selectRaw('game_level_id, MAX(final_score) as best_score, MAX(stars) as best_stars')
            ->groupBy('game_level_id')->get()->keyBy('game_level_id');

        return response()->json(['data' => GameLevel::query()->where('is_active', true)->orderBy('sort_order')->get()
            ->map(fn (GameLevel $level) => [...$level->toArray(),
                'best_score' => (int) ($best[$level->id]->best_score ?? 0),
                'best_stars' => (int) ($best[$level->id]->best_stars ?? 0),
            ])]);
    }

    public function start(Request $request, GameRules $rules): JsonResponse
    {
        $data = $request->validate(['level_id' => ['required', 'integer', 'exists:game_levels,id']]);
        $attempt = DB::transaction(function () use ($request, $data, $rules): GameAttempt {
            User::query()->whereKey($request->user()->id)->lockForUpdate()->firstOrFail();
            $settings = GameSetting::query()->firstOrFail();
            if (! $settings->is_active) {
                throw ValidationException::withMessages(['game' => ['El juego está temporalmente desactivado.']]);
            }
            $level = GameLevel::query()->whereKey($data['level_id'])->where('is_active', true)->first();
            if (! $level) {
                throw ValidationException::withMessages(['level_id' => ['Este nivel ya no está disponible.']]);
            }
            $today = GameAttempt::query()->where('user_id', $request->user()->id)->whereDate('started_at', today());
            if ($today->count() >= $settings->max_daily_attempts) {
                throw ValidationException::withMessages(['game' => ['Alcanzaste el máximo de partidas de hoy. Vuelve mañana.']]);
            }
            GameAttempt::query()->where('user_id', $request->user()->id)->where('status', 'started')
                ->where('started_at', '<', now()->subMinutes(3))->update(['status' => 'expired', 'finished_at' => now()]);
            if (GameAttempt::query()->where('user_id', $request->user()->id)->where('status', 'started')->exists()) {
                throw ValidationException::withMessages(['game' => ['Ya tienes una partida en curso. Termínala antes de iniciar otra.']]);
            }
            $scenario = $rules->scenario($level);
            $scenario['initial_health'] = min((int) $settings->initial_cake_health, (int) $level->initial_cake_health);
            $scenario['points_multiplier'] = (float) $settings->points_multiplier;

            return GameAttempt::create([
                'id' => (string) Str::uuid(), 'user_id' => $request->user()->id,
                'game_level_id' => $level->id, 'started_at' => now(), 'status' => 'started',
                'scenario' => $scenario,
            ]);
        });

        return response()->json(['data' => $attempt->load('level')], 201);
    }

    public function finish(Request $request, GameAttempt $attempt, GameRules $rules, GameWallet $wallet): JsonResponse
    {
        $data = $request->validate(['inputs' => ['required', 'string', 'regex:/^[0-8]+$/', 'max:1200']]);
        abort_unless($attempt->user_id === $request->user()->id, 404);
        $result = DB::transaction(function () use ($request, $attempt, $rules, $wallet, $data): array {
            User::query()->whereKey($request->user()->id)->lockForUpdate()->firstOrFail();
            $attempt = GameAttempt::query()->whereKey($attempt->id)->lockForUpdate()->firstOrFail();
            if ($attempt->status !== 'started' || $attempt->paused_at !== null) {
                Log::warning('Intento de finalizar una partida ya procesada', ['attempt_id' => $attempt->id, 'user_id' => $request->user()->id]);
                throw ValidationException::withMessages(['game' => ['Esta partida ya fue finalizada.']]);
            }
            $simulation = $rules->replay($attempt->scenario, $data['inputs']);
            $elapsedMs = $attempt->started_at->diffInMilliseconds(now()) - $attempt->paused_milliseconds;
            $maxMs = ($attempt->scenario['time_limit'] + 5 + 15) * 1000;
            if ($simulation['ticks'] !== strlen($data['inputs']) || $elapsedMs + 2000 < $simulation['ticks'] * 100 || $elapsedMs > $maxMs) {
                Log::warning('Resultado imposible en el juego', ['attempt_id' => $attempt->id, 'user_id' => $request->user()->id]);
                $attempt->update(['status' => 'invalid', 'finished_at' => now()]);

                return ['attempt' => $attempt, 'balance' => $wallet->balance($request->user()->id)];
            }
            $settings = GameSetting::query()->firstOrFail();
            $prizesToday = GameAttempt::query()->where('user_id', $request->user()->id)->whereDate('finished_at', today())
                ->where('dulce_points_earned', '>', 0)->count();
            $prizesWeek = GameAttempt::query()->where('user_id', $request->user()->id)->where('finished_at', '>=', now()->startOfWeek())
                ->where('dulce_points_earned', '>', 0)->count();
            $points = $simulation['completed'] && $prizesToday < $settings->max_daily_prizes && $prizesWeek < $settings->max_weekly_prizes
                ? (int) round($attempt->scenario['dulce_points_reward'] * $simulation['stars'] / 3 * $attempt->scenario['points_multiplier'])
                : 0;
            $attempt->update([
                'status' => $simulation['completed'] ? 'completed' : 'failed',
                'finished_at' => now(), 'duration_seconds' => (int) ceil($simulation['ticks'] / 10),
                'cake_health' => $simulation['health'], 'coins' => $simulation['coins'],
                'final_score' => $simulation['score'], 'stars' => $simulation['stars'],
                'dulce_points_earned' => $points,
            ]);
            $balance = $points > 0
                ? $wallet->record($request->user()->id, $points, 'earned', 'Entrega completada', $attempt->id)
                : $wallet->balance($request->user()->id);

            return ['attempt' => $attempt, 'balance' => $balance];
        });

        return response()->json(['data' => $result]);
    }

    public function pause(Request $request, GameAttempt $attempt): JsonResponse
    {
        abort_unless($attempt->user_id === $request->user()->id, 404);
        $attempt = DB::transaction(function () use ($attempt): GameAttempt {
            $attempt = GameAttempt::query()->whereKey($attempt->id)->lockForUpdate()->firstOrFail();
            abort_unless($attempt->status === 'started', 422);
            if ($attempt->paused_at === null) $attempt->update(['paused_at' => now()]);

            return $attempt;
        });

        return response()->json(['data' => $attempt]);
    }

    public function resume(Request $request, GameAttempt $attempt): JsonResponse
    {
        abort_unless($attempt->user_id === $request->user()->id, 404);
        $attempt = DB::transaction(function () use ($attempt): GameAttempt {
            $attempt = GameAttempt::query()->whereKey($attempt->id)->lockForUpdate()->firstOrFail();
            abort_unless($attempt->status === 'started' && $attempt->paused_at !== null, 422);
            $paused = $attempt->paused_at->diffInMilliseconds(now());
            if ($attempt->paused_milliseconds + $paused > 30000) {
                $attempt->update(['status' => 'expired', 'finished_at' => now()]);
                return $attempt;
            }
            $attempt->update([
                'paused_milliseconds' => $attempt->paused_milliseconds + $paused,
                'paused_at' => null,
            ]);

            return $attempt;
        });

        if ($attempt->status === 'expired') {
            throw ValidationException::withMessages(['game' => ['La pausa máxima de 30 segundos terminó. Inicia otra partida.']]);
        }

        return response()->json(['data' => $attempt]);
    }

    public function abandon(Request $request, GameAttempt $attempt): JsonResponse
    {
        abort_unless($attempt->user_id === $request->user()->id, 404);
        GameAttempt::query()->whereKey($attempt->id)->where('status', 'started')
            ->update(['status' => 'abandoned', 'finished_at' => now()]);

        return response()->json(['message' => 'Partida finalizada.']);
    }

    public function profile(Request $request, GameWallet $wallet): JsonResponse
    {
        return response()->json(['data' => [
            'balance' => $wallet->balance($request->user()->id),
            'attempts_today' => GameAttempt::query()->where('user_id', $request->user()->id)->whereDate('started_at', today())->count(),
            'transactions' => GamePointTransaction::query()->where('user_id', $request->user()->id)->latest('id')->limit(20)->get(),
        ]]);
    }

    public function history(Request $request): JsonResponse
    {
        return response()->json(['data' => GameAttempt::query()->where('user_id', $request->user()->id)
            ->with('level:id,name')->latest('started_at')->limit(50)->get()->makeHidden('scenario')]);
    }

    public function rewards(Request $request): JsonResponse
    {
        return response()->json(['data' => GameReward::query()->where('is_active', true)->orderBy('points_required')->get()]);
    }

    public function coupons(Request $request): JsonResponse
    {
        return response()->json(['data' => GameRewardRedemption::query()->where('user_id', $request->user()->id)
            ->with(['promotion:id,coupon_code,starts_at,ends_at,uses_count,max_uses', 'reward:id,name'])
            ->latest('id')->get()]);
    }

    public function redeem(Request $request, GameReward $reward, GameWallet $wallet): JsonResponse
    {
        $result = DB::transaction(function () use ($request, $reward, $wallet): array {
            User::query()->whereKey($request->user()->id)->lockForUpdate()->firstOrFail();
            $reward = GameReward::query()->whereKey($reward->id)->lockForUpdate()->firstOrFail();
            $settings = GameSetting::query()->firstOrFail();
            if (! $settings->is_active || ! $reward->is_active) {
                throw ValidationException::withMessages(['reward' => ['Esta recompensa ya no está disponible.']]);
            }
            if ($wallet->balance($request->user()->id) < $reward->points_required) {
                throw ValidationException::withMessages(['reward' => ['No tienes Dulce Puntos suficientes.']]);
            }
            $used = GameRewardRedemption::query()->where('game_reward_id', $reward->id);
            if (($reward->max_redemptions !== null && $used->count() >= $reward->max_redemptions)
                || $used->where('user_id', $request->user()->id)->count() >= $reward->max_per_user) {
                throw ValidationException::withMessages(['reward' => ['Alcanzaste el límite de canjes de esta recompensa.']]);
            }
            $discountType = match ($reward->reward_type) {
                'percentage_discount' => 'percentage',
                'free_delivery' => 'free_delivery',
                default => 'fixed',
            };
            $promotion = Promotion::create([
                'name' => $reward->name, 'description' => $reward->description,
                'discount_type' => $discountType, 'discount_value' => $reward->reward_value,
                'starts_at' => today(), 'ends_at' => today()->addDays($reward->expiration_days),
                'is_active' => true, 'applies_to_all' => true,
                'coupon_code' => 'DULCE-'.Str::upper(Str::random(8)),
                'requires_coupon' => true, 'minimum_purchase' => $reward->minimum_purchase,
                'owner_user_id' => $request->user()->id, 'max_uses' => 1,
                'is_game_reward' => true,
            ]);
            $redemption = GameRewardRedemption::create([
                'user_id' => $request->user()->id, 'game_reward_id' => $reward->id,
                'promotion_id' => $promotion->id, 'points_spent' => $reward->points_required,
                'status' => 'issued', 'redeemed_at' => now(),
            ]);
            $balance = $wallet->record($request->user()->id, -$reward->points_required, 'redeemed', 'Canje de '.$reward->name);
            Log::info('Recompensa del juego canjeada', ['user_id' => $request->user()->id, 'redemption_id' => $redemption->id]);

            return ['redemption' => $redemption->load(['promotion', 'reward']), 'balance' => $balance];
        });

        return response()->json(['data' => $result], 201);
    }
}
