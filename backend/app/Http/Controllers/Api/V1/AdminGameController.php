<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\GameAttempt;
use App\Models\GameLevel;
use App\Models\GameObstacle;
use App\Models\GamePointTransaction;
use App\Models\GameReward;
use App\Models\GameRewardRedemption;
use App\Models\GameSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AdminGameController extends Controller
{
    public function dashboard(): JsonResponse
    {
        $attempts = GameAttempt::query();
        $completed = (clone $attempts)->where('status', 'completed')->count();
        $failed = (clone $attempts)->where('status', 'failed')->count();
        $finished = $completed + $failed;

        return response()->json(['data' => [
            'total_attempts' => (clone $attempts)->count(),
            'attempts_today' => (clone $attempts)->whereDate('started_at', today())->count(),
            'unique_players' => (clone $attempts)->distinct('user_id')->count('user_id'),
            'completed' => $completed, 'failed' => $failed,
            'completion_rate' => $finished ? round($completed * 100 / $finished, 1) : 0,
            'points_issued' => GamePointTransaction::query()->where('type', 'earned')->sum('points'),
            'coupons_issued' => GameRewardRedemption::query()->count(),
            'coupons_used' => GameRewardRedemption::query()->whereHas('promotion', fn ($query) => $query->where('uses_count', '>', 0))->count(),
            'average_score' => round((float) (clone $attempts)->where('status', 'completed')->avg('final_score')),
            'average_health' => round((float) (clone $attempts)->where('status', 'completed')->avg('cake_health')),
            'most_played_level' => GameLevel::query()->withCount('attempts')->orderByDesc('attempts_count')->value('name'),
        ]]);
    }

    public function settings(): JsonResponse
    {
        return response()->json(['data' => GameSetting::query()->firstOrFail()]);
    }

    public function updateSettings(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:500'],
            'is_active' => ['required', 'boolean'],
            'max_daily_attempts' => ['required', 'integer', 'between:1,30'],
            'max_daily_prizes' => ['required', 'integer', 'between:0,30'],
            'max_weekly_prizes' => ['required', 'integer', 'between:0,100'],
            'points_multiplier' => ['required', 'numeric', 'between:0,5'],
            'initial_cake_health' => ['required', 'integer', 'between:1,100'],
            'messages' => ['nullable', 'array'],
            'messages.start' => ['nullable', 'string', 'max:200'],
            'messages.success' => ['nullable', 'string', 'max:200'],
            'messages.failure' => ['nullable', 'string', 'max:200'],
        ]);
        $settings = GameSetting::query()->firstOrFail();
        $settings->update($data);

        return response()->json(['data' => $settings->refresh()]);
    }

    public function levels(): JsonResponse
    {
        return response()->json(['data' => GameLevel::query()->orderBy('sort_order')->get()]);
    }

    public function saveLevel(Request $request, ?GameLevel $level = null): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'slug' => ['required', 'alpha_dash', 'max:100', Rule::unique('game_levels', 'slug')->ignore($level?->id)],
            'description' => ['nullable', 'string', 'max:500'],
            'difficulty' => ['required', Rule::in(['facil', 'media', 'dificil'])],
            'time_limit' => ['required', 'integer', 'between:30,90'],
            'initial_cake_health' => ['required', 'integer', 'between:1,100'],
            'obstacle_count' => ['required', 'integer', 'between:1,20'],
            'completion_points' => ['required', 'integer', 'between:0,2000'],
            'dulce_points_reward' => ['required', 'integer', 'between:0,500'],
            'one_star_score' => ['required', 'integer', 'between:0,5000'],
            'two_star_score' => ['required', 'integer', 'gte:one_star_score', 'max:5000'],
            'three_star_score' => ['required', 'integer', 'gte:two_star_score', 'max:5000'],
            'sort_order' => ['required', 'integer', 'between:0,1000'],
            'is_active' => ['required', 'boolean'],
        ]);
        $level = $level ?: new GameLevel();
        $level->fill($data)->save();

        return response()->json(['data' => $level], $level->wasRecentlyCreated ? 201 : 200);
    }

    public function obstacles(): JsonResponse
    {
        return response()->json(['data' => GameObstacle::query()->orderBy('id')->get()]);
    }

    public function saveObstacle(Request $request, ?GameObstacle $obstacle = null): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'type' => ['required', 'alpha_dash', 'max:40', Rule::unique('game_obstacles', 'type')->ignore($obstacle?->id)],
            'damage' => ['required', 'integer', 'between:0,100'],
            'score_penalty' => ['required', 'integer', 'between:0,1000'],
            'speed' => ['required', 'numeric', 'between:0,10'],
            'sprite' => ['nullable', 'string', 'max:20'],
            'is_active' => ['required', 'boolean'],
        ]);
        $obstacle = $obstacle ?: new GameObstacle();
        $obstacle->fill($data)->save();

        return response()->json(['data' => $obstacle], $obstacle->wasRecentlyCreated ? 201 : 200);
    }

    public function rewards(): JsonResponse
    {
        return response()->json(['data' => GameReward::query()->orderBy('points_required')->get()]);
    }

    public function saveReward(Request $request, ?GameReward $reward = null): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:500'],
            'points_required' => ['required', 'integer', 'between:1,100000'],
            'reward_type' => ['required', Rule::in(['fixed_discount', 'percentage_discount', 'free_delivery'])],
            'reward_value' => ['required', 'numeric', 'between:0,1000'],
            'minimum_purchase' => ['required', 'numeric', 'between:0,10000'],
            'expiration_days' => ['required', 'integer', 'between:1,365'],
            'max_redemptions' => ['nullable', 'integer', 'between:1,100000'],
            'max_per_user' => ['required', 'integer', 'between:1,100'],
            'is_active' => ['required', 'boolean'],
        ]);
        if ($data['reward_type'] === 'percentage_discount' && $data['reward_value'] > 100) {
            return response()->json(['message' => 'El porcentaje máximo es 100.'], 422);
        }
        $reward = $reward ?: new GameReward();
        $reward->fill($data)->save();

        return response()->json(['data' => $reward], $reward->wasRecentlyCreated ? 201 : 200);
    }

    public function attempts(): JsonResponse
    {
        return response()->json(GameAttempt::query()->with(['level:id,name', 'user:id,name,email'])
            ->latest('started_at')->paginate(30)->through(fn (GameAttempt $attempt) => $attempt->makeHidden('scenario')));
    }

    public function coupons(): JsonResponse
    {
        return response()->json(['data' => GameRewardRedemption::query()->with([
            'promotion:id,coupon_code,starts_at,ends_at,uses_count,max_uses',
            'reward:id,name',
        ])->latest('id')->limit(100)->get()]);
    }
}
