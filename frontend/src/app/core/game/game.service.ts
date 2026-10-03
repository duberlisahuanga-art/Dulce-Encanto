import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from '../config/api-url';
import {
  GameAttempt,
  GameCoupon,
  GameDashboard,
  GameLevel,
  GameObstacle,
  GameProfile,
  GameReward,
  GameSettings,
} from './game.model';

interface Data<T> {
  data: T;
}

@Injectable({ providedIn: 'root' })
export class GameService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_URL}/api/v1`;

  config(): Observable<Data<GameSettings>> {
    return this.get('/game/config');
  }
  levels(): Observable<Data<GameLevel[]>> {
    return this.get('/game/levels');
  }
  profile(): Observable<Data<GameProfile>> {
    return this.get('/game/profile');
  }
  history(): Observable<Data<GameAttempt[]>> {
    return this.get('/game/history');
  }
  rewards(): Observable<Data<GameReward[]>> {
    return this.get('/game/rewards');
  }
  coupons(): Observable<Data<GameCoupon[]>> {
    return this.get('/game/coupons');
  }
  start(levelId: number): Observable<Data<GameAttempt>> {
    return this.mutate('post', '/game/attempts/start', { level_id: levelId });
  }
  finish(attemptId: string, inputs: string): Observable<Data<{ attempt: GameAttempt; balance: number }>> {
    return this.mutate('post', `/game/attempts/${attemptId}/finish`, { inputs });
  }
  pause(attemptId: string): Observable<Data<GameAttempt>> {
    return this.mutate('post', `/game/attempts/${attemptId}/pause`, {});
  }
  resume(attemptId: string): Observable<Data<GameAttempt>> {
    return this.mutate('post', `/game/attempts/${attemptId}/resume`, {});
  }
  abandon(attemptId: string): Observable<{ message: string }> {
    return this.mutate('post', `/game/attempts/${attemptId}/abandon`, {});
  }
  redeem(rewardId: number): Observable<Data<{ redemption: GameCoupon; balance: number }>> {
    return this.mutate('post', `/game/rewards/${rewardId}/redeem`, {});
  }

  adminDashboard(): Observable<Data<GameDashboard>> {
    return this.get('/admin/game/dashboard');
  }
  adminSettings(): Observable<Data<GameSettings>> {
    return this.get('/admin/game/settings');
  }
  adminLevels(): Observable<Data<GameLevel[]>> {
    return this.get('/admin/game/levels');
  }
  adminObstacles(): Observable<Data<GameObstacle[]>> {
    return this.get('/admin/game/obstacles');
  }
  adminRewards(): Observable<Data<GameReward[]>> {
    return this.get('/admin/game/rewards');
  }
  adminAttempts(): Observable<{ data: GameAttempt[] }> {
    return this.get('/admin/game/attempts');
  }
  adminCoupons(): Observable<Data<GameCoupon[]>> {
    return this.get('/admin/game/coupons');
  }
  saveSettings(payload: GameSettings): Observable<Data<GameSettings>> {
    return this.mutate('put', '/admin/game/settings', payload);
  }
  saveLevel(payload: GameLevel): Observable<Data<GameLevel>> {
    return this.mutate(
      payload.id ? 'put' : 'post',
      payload.id ? `/admin/game/levels/${payload.id}` : '/admin/game/levels',
      payload,
    );
  }
  saveObstacle(payload: GameObstacle): Observable<Data<GameObstacle>> {
    return this.mutate(
      payload.id ? 'put' : 'post',
      payload.id ? `/admin/game/obstacles/${payload.id}` : '/admin/game/obstacles',
      payload,
    );
  }
  saveReward(payload: GameReward): Observable<Data<GameReward>> {
    return this.mutate(
      payload.id ? 'put' : 'post',
      payload.id ? `/admin/game/rewards/${payload.id}` : '/admin/game/rewards',
      payload,
    );
  }

  private get<T>(path: string): Observable<T> {
    return this.http.get<T>(`${this.base}${path}`);
  }

  private mutate<T>(method: 'post' | 'put', path: string, body: unknown): Observable<T> {
    return this.http.request<T>(method, `${this.base}${path}`, { body });
  }
}
