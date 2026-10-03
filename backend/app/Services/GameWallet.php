<?php

namespace App\Services;

use App\Models\GamePointTransaction;

class GameWallet
{
    public function balance(int $userId): int
    {
        return (int) (GamePointTransaction::query()->where('user_id', $userId)->latest('id')->value('balance_after') ?? 0);
    }

    public function record(int $userId, int $points, string $type, string $description, ?string $attemptId = null): int
    {
        $balance = $this->balance($userId) + $points;
        if ($balance < 0) {
            throw new \DomainException('Saldo insuficiente.');
        }
        GamePointTransaction::create([
            'user_id' => $userId, 'game_attempt_id' => $attemptId,
            'type' => $type, 'points' => $points,
            'balance_after' => $balance, 'description' => $description,
        ]);

        return $balance;
    }
}
