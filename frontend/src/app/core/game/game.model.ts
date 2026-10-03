export interface GameSettings {
  id: number;
  name: string;
  description: string | null;
  is_active: boolean;
  max_daily_attempts: number;
  max_daily_prizes: number;
  max_weekly_prizes: number;
  points_multiplier: string;
  initial_cake_health: number;
  messages: { start?: string; success?: string; failure?: string } | null;
}

export interface GameLevel {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  difficulty: 'facil' | 'media' | 'dificil';
  time_limit: number;
  initial_cake_health: number;
  obstacle_count: number;
  completion_points: number;
  dulce_points_reward: number;
  one_star_score: number;
  two_star_score: number;
  three_star_score: number;
  sort_order: number;
  is_active: boolean;
  best_score?: number;
  best_stars?: number;
}

export interface GameObstacle {
  id: number;
  name: string;
  type: string;
  damage: number;
  score_penalty: number;
  speed: string;
  sprite: string | null;
  is_active: boolean;
}

export interface GameReward {
  id: number;
  name: string;
  description: string | null;
  points_required: number;
  reward_type: 'fixed_discount' | 'percentage_discount' | 'free_delivery';
  reward_value: string;
  minimum_purchase: string;
  expiration_days: number;
  max_redemptions: number | null;
  max_per_user: number;
  is_active: boolean;
}

export interface GameObject {
  id: number;
  x: number;
  y: number;
  type?: string;
  sprite?: string;
  radius?: number;
  damage?: number;
  score_penalty?: number;
  movement?: {
    axis: 'x' | 'y';
    range: number;
    speed: number;
    phase: number;
  } | null;
}

export interface GameScenario {
  mode?: 'board' | 'runner';
  width: number;
  height: number;
  viewport_width?: number;
  auto_speed?: number;
  start: { x: number; y: number };
  destination: { x: number; y: number };
  tick_ms: number;
  time_limit: number;
  initial_health: number;
  completion_points: number;
  dulce_points_reward: number;
  star_thresholds: number[];
  points_multiplier: number;
  obstacles: GameObject[];
  bonuses: GameObject[];
  coins: GameObject[];
}

export interface GameAttempt {
  id: string;
  user_id: number;
  game_level_id: number;
  started_at: string;
  finished_at: string | null;
  paused_at?: string | null;
  paused_milliseconds?: number;
  status: 'started' | 'completed' | 'failed' | 'invalid' | 'expired' | 'abandoned';
  duration_seconds: number | null;
  cake_health: number | null;
  coins: number;
  final_score: number;
  dulce_points_earned: number;
  stars: number;
  scenario: GameScenario;
  level?: GameLevel;
  user?: { id: number; name: string; email: string };
}

export interface GameProfile {
  balance: number;
  attempts_today: number;
  transactions: { id: number; type: string; points: number; balance_after: number; description: string; created_at: string }[];
}

export interface GameCoupon {
  id: number;
  user_id?: number;
  points_spent: number;
  redeemed_at: string;
  promotion: { coupon_code: string; ends_at: string; uses_count: number; max_uses: number };
  reward: { name: string };
}

export interface GameDashboard {
  total_attempts: number;
  attempts_today: number;
  unique_players: number;
  completed: number;
  failed: number;
  completion_rate: number;
  points_issued: number;
  coupons_issued: number;
  coupons_used: number;
  average_score: number;
  average_health: number;
  most_played_level: string | null;
}
