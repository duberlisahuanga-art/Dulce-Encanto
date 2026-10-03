<?php

namespace App\Services;

use App\Models\GameLevel;
use App\Models\GameObstacle;

class GameRules
{
    public function scenario(GameLevel $level): array
    {
        $types = GameObstacle::query()->where('is_active', true)->orderBy('id')->get();
        $obstacles = [];
        $runner = (int) $level->sort_order === 0;
        $runnerPositions = [
            [430, 150], [720, 330], [1010, 240], [1330, 150], [1610, 330], [1900, 240],
        ];
        for ($index = 0; $index < $level->obstacle_count && $types->isNotEmpty(); $index++) {
            $type = $types[$index % $types->count()];
            [$x, $y] = $runner
                ? ($runnerPositions[$index] ?? [430 + $index * 270, [150, 240, 330][$index % 3]])
                : [150 + ($index % 5) * 120 + intdiv($index, 5) * 22, [240, 150, 330, 205, 295][$index % 5] + intdiv($index, 5) * 12];
            $obstacles[] = [
                'id' => $index + 1,
                'x' => $x,
                'y' => $y,
                'radius' => 19,
                'type' => $type->type,
                'sprite' => $type->sprite ?: '⚠️',
                'damage' => (int) $type->damage,
                'score_penalty' => (int) $type->score_penalty,
                'movement' => (float) $type->speed > 0 ? [
                    'axis' => $index % 2 === 0 ? 'y' : 'x',
                    'range' => 32 + ($index % 3) * 8,
                    'speed' => max(1, (int) round((float) $type->speed)),
                    'phase' => ($index * 13) % 40,
                ] : null,
            ];
        }

        if ($runner) {
            return [
                'mode' => 'runner', 'width' => 2400, 'height' => 480, 'viewport_width' => 800,
                'start' => ['x' => 100, 'y' => 240], 'destination' => ['x' => 2320, 'y' => 240],
                'tick_ms' => 100, 'auto_speed' => 4,
                'time_limit' => (int) $level->time_limit,
                'initial_health' => (int) $level->initial_cake_health,
                'completion_points' => (int) $level->completion_points,
                'dulce_points_reward' => (int) $level->dulce_points_reward,
                'star_thresholds' => [(int) $level->one_star_score, (int) $level->two_star_score, (int) $level->three_star_score],
                'obstacles' => $obstacles,
                'bonuses' => [
                    ['id' => 1, 'x' => 640, 'y' => 150, 'type' => 'clock', 'sprite' => '⏱️'],
                    ['id' => 2, 'x' => 1240, 'y' => 330, 'type' => 'shield', 'sprite' => '🛡️'],
                    ['id' => 3, 'x' => 1800, 'y' => 150, 'type' => 'repair', 'sprite' => '❤️'],
                ],
                'coins' => [
                    ['id' => 1, 'x' => 300, 'y' => 150], ['id' => 2, 'x' => 540, 'y' => 330],
                    ['id' => 3, 'x' => 850, 'y' => 150], ['id' => 4, 'x' => 1120, 'y' => 330],
                    ['id' => 5, 'x' => 1480, 'y' => 150], ['id' => 6, 'x' => 1740, 'y' => 330],
                    ['id' => 7, 'x' => 2080, 'y' => 150],
                ],
            ];
        }

        return [
            'mode' => 'board',
            'width' => 800, 'height' => 480, 'start' => ['x' => 45, 'y' => 240],
            'destination' => ['x' => 755, 'y' => 240], 'tick_ms' => 100,
            'time_limit' => (int) $level->time_limit,
            'initial_health' => (int) $level->initial_cake_health,
            'completion_points' => (int) $level->completion_points,
            'dulce_points_reward' => (int) $level->dulce_points_reward,
            'star_thresholds' => [(int) $level->one_star_score, (int) $level->two_star_score, (int) $level->three_star_score],
            'obstacles' => $obstacles,
            'bonuses' => [
                ['id' => 1, 'x' => 220, 'y' => 95, 'type' => 'clock', 'sprite' => '⏱️'],
                ['id' => 2, 'x' => 380, 'y' => 390, 'type' => 'shield', 'sprite' => '🛡️'],
                ['id' => 3, 'x' => 560, 'y' => 90, 'type' => 'repair', 'sprite' => '❤️'],
            ],
            'coins' => [
                ['id' => 1, 'x' => 275, 'y' => 300],
                ['id' => 2, 'x' => 460, 'y' => 165],
                ['id' => 3, 'x' => 620, 'y' => 330],
            ],
        ];
    }

    public function replay(array $scenario, string $inputs): array
    {
        $x = (int) $scenario['start']['x'];
        $y = (int) $scenario['start']['y'];
        $health = (int) $scenario['initial_health'];
        $limitTicks = (int) $scenario['time_limit'] * 10;
        $shieldUntil = 0;
        $hit = [];
        $collected = [];
        $coins = [];
        $penalty = 0;
        $completed = false;
        $ticks = 0;
        $directions = [[0, 0], [0, -3], [0, 3], [-3, 0], [3, 0], [-2, -2], [2, -2], [-2, 2], [2, 2]];

        for ($index = 0, $length = strlen($inputs); $index < $length; $index++) {
            $ticks = $index + 1;
            if ($ticks > $limitTicks) {
                break;
            }
            $input = (int) $inputs[$index];
            if (($scenario['mode'] ?? 'board') === 'runner') {
                $baseSpeed = max(1, (int) ($scenario['auto_speed'] ?? 4));
                $speed = in_array($input, [3, 5, 7], true)
                    ? max(1, $baseSpeed - 2)
                    : (in_array($input, [4, 6, 8], true) ? $baseSpeed + 2 : $baseSpeed);
                $dy = in_array($input, [1, 5, 6], true) ? -5 : (in_array($input, [2, 7, 8], true) ? 5 : 0);
                $x = max(15, min((int) $scenario['width'] - 15, $x + $speed));
                $y = max(105, min(375, $y + $dy));
            } else {
                [$dx, $dy] = $directions[$input];
                $x = max(15, min(785, $x + $dx));
                $y = max(15, min(465, $y + $dy));
            }

            foreach ($scenario['obstacles'] as $obstacle) {
                [$obstacleX, $obstacleY] = $this->obstaclePosition($obstacle, $ticks);
                if (isset($hit[$obstacle['id']]) || ! $this->touches($x, $y, $obstacleX, $obstacleY, 16 + $obstacle['radius'])) {
                    continue;
                }
                $hit[$obstacle['id']] = true;
                if ($ticks > $shieldUntil) {
                    $health = max(0, $health - (int) $obstacle['damage']);
                    $penalty += (int) $obstacle['score_penalty'];
                }
            }
            foreach ($scenario['bonuses'] as $bonus) {
                if (isset($collected[$bonus['id']]) || ! $this->touches($x, $y, $bonus['x'], $bonus['y'], 30)) {
                    continue;
                }
                $collected[$bonus['id']] = true;
                if ($bonus['type'] === 'clock') $limitTicks += 50;
                if ($bonus['type'] === 'shield') $shieldUntil = $ticks + 50;
                if ($bonus['type'] === 'repair') $health = min(100, $health + 10);
            }
            foreach ($scenario['coins'] as $coin) {
                if (! isset($coins[$coin['id']]) && $this->touches($x, $y, $coin['x'], $coin['y'], 28)) {
                    $coins[$coin['id']] = true;
                }
            }
            if ($health === 0) break;
            if ($this->touches($x, $y, $scenario['destination']['x'], $scenario['destination']['y'], 31)) {
                $completed = true;
                break;
            }
        }

        $score = $completed ? max(0, (int) $scenario['completion_points'] + intdiv(max(0, $limitTicks - $ticks), 10) * 3 + $health * 2 + count($coins) * 10 - $penalty) : 0;
        $thresholds = $scenario['star_thresholds'];
        $stars = $completed
            ? (int) ($score >= $thresholds[0]) + (int) ($score >= $thresholds[1]) + (int) ($score >= $thresholds[2])
            : 0;

        return [
            'completed' => $completed,
            'health' => $health,
            'coins' => count($coins),
            'score' => $score,
            'stars' => $stars,
            'ticks' => $ticks,
            'remaining_ticks' => max(0, $limitTicks - $ticks),
            'x' => $x, 'y' => $y,
        ];
    }

    private function touches(int $x, int $y, int $otherX, int $otherY, int $radius): bool
    {
        return ($x - $otherX) ** 2 + ($y - $otherY) ** 2 <= $radius ** 2;
    }

    /** @return array{0: int, 1: int} */
    private function obstaclePosition(array $obstacle, int $tick): array
    {
        $movement = $obstacle['movement'] ?? null;
        if (! is_array($movement)) {
            return [(int) $obstacle['x'], (int) $obstacle['y']];
        }

        $range = max(1, (int) $movement['range']);
        $period = $range * 4;
        $progress = (($tick * max(1, (int) $movement['speed'])) + (int) $movement['phase']) % $period;
        $offset = $progress <= $range
            ? $progress
            : ($progress <= $range * 3 ? $range * 2 - $progress : $progress - $period);

        return $movement['axis'] === 'x'
            ? [(int) $obstacle['x'] + $offset, (int) $obstacle['y']]
            : [(int) $obstacle['x'], (int) $obstacle['y'] + $offset];
    }
}
