import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { GameAttempt, GameCoupon, GameDashboard, GameLevel, GameObstacle, GameReward, GameSettings } from '../../../core/game/game.model';
import { GameService } from '../../../core/game/game.service';

type AdminView = 'dashboard' | 'settings' | 'levels' | 'obstacles' | 'rewards' | 'attempts' | 'coupons';

@Component({
  selector: 'app-game-admin',
  imports: [FormsModule, RouterLink],
  templateUrl: './game-admin.html',
  styleUrl: './game-admin.scss',
})
export class GameAdmin {
  private readonly service = inject(GameService);
  protected readonly view = signal<AdminView>('dashboard');
  protected readonly loading = signal(true);
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly message = signal('');
  protected readonly dashboard = signal<GameDashboard | null>(null);
  protected readonly levels = signal<GameLevel[]>([]);
  protected readonly obstacles = signal<GameObstacle[]>([]);
  protected readonly rewards = signal<GameReward[]>([]);
  protected readonly attempts = signal<GameAttempt[]>([]);
  protected readonly coupons = signal<GameCoupon[]>([]);
  protected readonly levelFormOpen = signal(false);
  protected readonly obstacleFormOpen = signal(false);
  protected readonly rewardFormOpen = signal(false);
  protected settingsDraft: GameSettings | null = null;
  protected levelDraft: GameLevel = this.newLevel();
  protected obstacleDraft: GameObstacle = this.newObstacle();
  protected rewardDraft: GameReward = this.newReward();

  constructor() { this.load(); }

  protected load(): void {
    this.loading.set(true);
    this.error.set('');
    forkJoin({
      dashboard: this.service.adminDashboard(), settings: this.service.adminSettings(),
      levels: this.service.adminLevels(), obstacles: this.service.adminObstacles(),
      rewards: this.service.adminRewards(), attempts: this.service.adminAttempts(),
      coupons: this.service.adminCoupons(),
    }).subscribe({
      next: (data) => {
        this.dashboard.set(data.dashboard.data);
        this.settingsDraft = structuredClone(data.settings.data);
        this.levels.set(data.levels.data);
        this.obstacles.set(data.obstacles.data);
        this.rewards.set(data.rewards.data);
        this.attempts.set(data.attempts.data);
        this.coupons.set(data.coupons.data);
        this.loading.set(false);
      },
      error: (error) => { this.error.set(this.apiError(error)); this.loading.set(false); },
    });
  }

  protected switchView(view: AdminView): void { this.view.set(view); this.error.set(''); this.message.set(''); }

  protected setMessage(key: 'start' | 'success' | 'failure', value: string): void {
    if (this.settingsDraft) this.settingsDraft.messages = { ...this.settingsDraft.messages, [key]: value };
  }

  protected saveSettings(): void {
    if (!this.settingsDraft || this.busy()) return;
    this.saving(() => this.service.saveSettings(this.settingsDraft!), (data) => {
      this.settingsDraft = structuredClone(data);
    });
  }

  protected editLevel(level?: GameLevel): void {
    this.levelDraft = level ? structuredClone(level) : this.newLevel();
    this.levelFormOpen.set(true);
  }
  protected saveLevel(): void {
    this.saving(() => this.service.saveLevel(this.levelDraft), () => {
      this.levelFormOpen.set(false);
      this.service.adminLevels().subscribe({ next: ({ data }) => this.levels.set(data), error: () => {} });
    });
  }

  protected editObstacle(obstacle?: GameObstacle): void {
    this.obstacleDraft = obstacle ? structuredClone(obstacle) : this.newObstacle();
    this.obstacleFormOpen.set(true);
  }
  protected saveObstacle(): void {
    this.saving(() => this.service.saveObstacle(this.obstacleDraft), () => {
      this.obstacleFormOpen.set(false);
      this.service.adminObstacles().subscribe({ next: ({ data }) => this.obstacles.set(data), error: () => {} });
    });
  }

  protected editReward(reward?: GameReward): void {
    this.rewardDraft = reward ? structuredClone(reward) : this.newReward();
    this.rewardFormOpen.set(true);
  }
  protected saveReward(): void {
    this.saving(() => this.service.saveReward(this.rewardDraft), () => {
      this.rewardFormOpen.set(false);
      this.service.adminRewards().subscribe({ next: ({ data }) => this.rewards.set(data), error: () => {} });
    });
  }

  private saving<T>(request: () => import('rxjs').Observable<{ data: T }>, onSuccess: (data: T) => void): void {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.message.set('');
    request().subscribe({
      next: ({ data }) => { onSuccess(data); this.message.set('Cambios guardados.'); this.busy.set(false); },
      error: (error) => { this.error.set(this.apiError(error)); this.busy.set(false); },
    });
  }

  private apiError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const response = error.error as { message?: string; errors?: Record<string, string[]> } | null;
      return (response?.errors && Object.values(response.errors)[0]?.[0]) || response?.message || 'No se pudieron guardar los cambios.';
    }
    return 'No se pudo conectar con el servidor.';
  }

  private newLevel(): GameLevel {
    return { id: 0, name: '', slug: '', description: '', difficulty: 'facil', time_limit: 70,
      initial_cake_health: 100, obstacle_count: 5, completion_points: 300,
      dulce_points_reward: 90, one_star_score: 350, two_star_score: 500,
      three_star_score: 650, sort_order: 0, is_active: true };
  }
  private newObstacle(): GameObstacle {
    return { id: 0, name: '', type: '', damage: 10, score_penalty: 20,
      speed: '0', sprite: '⚠️', is_active: true };
  }
  private newReward(): GameReward {
    return { id: 0, name: '', description: '', points_required: 500,
      reward_type: 'fixed_discount', reward_value: '3', minimum_purchase: '20',
      expiration_days: 30, max_redemptions: null, max_per_user: 1, is_active: true };
  }
}
