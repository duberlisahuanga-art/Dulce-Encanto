import { ChangeDetectorRef, Component, ElementRef, HostListener, OnDestroy, ViewChild, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { CartService } from '../../core/cart/cart.service';
import { GameAttempt, GameCoupon, GameLevel, GameProfile, GameReward, GameSettings } from '../../core/game/game.model';
import { GameService } from '../../core/game/game.service';
import { GameEngine, GameFrame } from './game-engine';
import { PhaserGameEngine } from './phaser-game-engine';

type GameView = 'home' | 'levels' | 'intro' | 'playing' | 'result' | 'rewards' | 'history';

@Component({
  selector: 'app-game',
  imports: [RouterLink],
  templateUrl: './game.html',
  styleUrl: './game.scss',
})
export class Game implements OnDestroy {
  @ViewChild('gameCanvas') private canvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('gameStage') private gameStage?: ElementRef<HTMLElement>;
  private readonly service = inject(GameService);
  private readonly cart = inject(CartService);
  private readonly router = inject(Router);
  private readonly changeDetector = inject(ChangeDetectorRef);
  private engine: GameEngine | PhaserGameEngine | null = null;
  private audio: AudioContext | null = null;
  private musicTimer: number | null = null;
  private musicStep = 0;
  protected pendingInputs = '';
  protected readonly view = signal<GameView>('home');
  protected readonly loading = signal(true);
  protected readonly busy = signal(false);
  protected readonly paused = signal(false);
  protected readonly sound = signal(false);
  protected readonly error = signal('');
  protected readonly info = signal('');
  protected readonly settings = signal<GameSettings | null>(null);
  protected readonly levels = signal<GameLevel[]>([]);
  protected readonly profile = signal<GameProfile | null>(null);
  protected readonly rewards = signal<GameReward[]>([]);
  protected readonly coupons = signal<GameCoupon[]>([]);
  protected readonly history = signal<GameAttempt[]>([]);
  protected readonly selected = signal<GameLevel | null>(null);
  protected readonly attempt = signal<GameAttempt | null>(null);
  protected readonly result = signal<GameAttempt | null>(null);
  protected readonly frame = signal<GameFrame>({ remaining: 0, health: 100, coins: 0, score: 0, shield: false, progress: 0, message: '', pace: 'Crucero' });
  protected readonly joystickTransform = signal('translate3d(0, 0, 0)');
  private joystickDirections: string[] = [];

  constructor() { this.loadHome(); }

  ngOnDestroy(): void {
    this.stopMusic();
    this.engine?.destroy();
    const attempt = this.attempt();
    if (attempt && !this.result() && !this.pendingInputs) this.service.abandon(attempt.id).subscribe({ error: () => {} });
    void this.audio?.close();
  }

  @HostListener('document:visibilitychange')
  protected visibilityChanged(): void {
    if (document.hidden && this.view() === 'playing' && !this.paused()) this.pause();
  }

  protected loadHome(): void {
    this.loading.set(true);
    this.error.set('');
    forkJoin({ config: this.service.config(), levels: this.service.levels(), profile: this.service.profile() })
      .subscribe({
        next: ({ config, levels, profile }) => {
          this.settings.set(config.data);
          this.levels.set(levels.data);
          this.profile.set(profile.data);
          this.loading.set(false);
        },
        error: (error) => {
          this.error.set(this.apiError(error, 'No pudimos cargar el juego. Inténtalo de nuevo.'));
          this.loading.set(false);
        },
      });
  }

  protected choose(level: GameLevel): void {
    this.selected.set(level);
    this.error.set('');
    this.view.set('intro');
  }

  protected begin(): void {
    const level = this.selected();
    if (!level || this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.service.start(level.id).subscribe({
      next: ({ data }) => {
        this.attempt.set(data);
        this.result.set(null);
        this.pendingInputs = '';
        this.paused.set(false);
        this.view.set('playing');
        this.changeDetector.detectChanges();
        const runner = data.scenario.mode === 'runner';
        const target = runner ? this.gameStage?.nativeElement : this.canvas?.nativeElement;
        if (!target) {
          this.error.set('No se pudo abrir el mapa. Recarga la página.');
          this.busy.set(false);
          this.leave();
          return;
        }
        const onFrame = (frame: GameFrame) => this.frame.set(frame);
        const onFinish = (inputs: string) => {
          this.pendingInputs = inputs;
          this.stopMusic();
          this.submitResult();
        };
        const onSound = (event: 'coin' | 'hit' | 'bonus' | 'finish') => this.playSound(event);
        this.engine = runner
          ? new PhaserGameEngine(target as HTMLElement, data.scenario, onFrame, onFinish, onSound)
          : new GameEngine(target as HTMLCanvasElement, data.scenario, onFrame, onFinish, onSound);
        if (this.sound()) this.startMusic();
        this.busy.set(false);
      },
      error: (error) => {
        this.error.set(this.apiError(error, 'No pudimos iniciar la partida.'));
        this.busy.set(false);
      },
    });
  }

  private submitResult(): void {
    const attempt = this.attempt();
    if (!attempt || !this.pendingInputs || this.busy()) return;
    this.busy.set(true);
    this.info.set('Validando la entrega…');
    this.service.finish(attempt.id, this.pendingInputs).subscribe({
      next: ({ data }) => {
        this.engine?.destroy();
        this.engine = null;
        this.result.set(data.attempt);
        this.profile.update((profile) => profile ? { ...profile, balance: data.balance, attempts_today: profile.attempts_today + 1 } : profile);
        this.pendingInputs = '';
        this.attempt.set(null);
        this.info.set('');
        this.busy.set(false);
        this.view.set('result');
        this.service.levels().subscribe({ next: ({ data: levels }) => this.levels.set(levels), error: () => {} });
      },
      error: (error) => {
        this.error.set(this.apiError(error, 'No pudimos validar el resultado. Vuelve a intentarlo.'));
        this.info.set('');
        this.busy.set(false);
      },
    });
  }

  protected retryResult(): void { this.error.set(''); this.submitResult(); }

  protected pause(): void {
    const attempt = this.attempt();
    if (!attempt || this.busy() || this.pendingInputs) return;
    this.busy.set(true);
    this.engine?.setPaused(true);
    this.stopMusic();
    this.service.pause(attempt.id).subscribe({
      next: () => { this.paused.set(true); this.busy.set(false); },
      error: (error) => {
        this.engine?.setPaused(false);
        if (this.sound()) this.startMusic();
        this.error.set(this.apiError(error, 'No se pudo pausar la partida.'));
        this.busy.set(false);
      },
    });
  }

  protected resume(): void {
    const attempt = this.attempt();
    if (!attempt || this.busy()) return;
    this.busy.set(true);
    this.service.resume(attempt.id).subscribe({
      next: () => {
        this.paused.set(false);
        this.engine?.setPaused(false);
        if (this.sound()) this.startMusic();
        this.busy.set(false);
      },
      error: (error) => {
        this.error.set(this.apiError(error, 'La pausa terminó. Inicia otra partida.'));
        this.busy.set(false);
        this.leave();
      },
    });
  }

  protected leave(): void {
    this.stopMusic();
    this.engine?.destroy();
    this.engine = null;
    const attempt = this.attempt();
    this.attempt.set(null);
    this.pendingInputs = '';
    if (attempt) this.service.abandon(attempt.id).subscribe({ error: () => {} });
    this.view.set('levels');
    this.paused.set(false);
  }

  protected openRewards(): void {
    this.view.set('rewards');
    this.error.set('');
    this.loading.set(true);
    forkJoin({ rewards: this.service.rewards(), coupons: this.service.coupons(), profile: this.service.profile() }).subscribe({
      next: ({ rewards, coupons, profile }) => {
        this.rewards.set(rewards.data);
        this.coupons.set(coupons.data);
        this.profile.set(profile.data);
        this.loading.set(false);
      },
      error: (error) => { this.error.set(this.apiError(error, 'No pudimos cargar tus recompensas.')); this.loading.set(false); },
    });
  }

  protected openHistory(): void {
    this.view.set('history');
    this.loading.set(true);
    this.service.history().subscribe({
      next: ({ data }) => { this.history.set(data); this.loading.set(false); },
      error: (error) => { this.error.set(this.apiError(error, 'No pudimos cargar el historial.')); this.loading.set(false); },
    });
  }

  protected redeem(reward: GameReward): void {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.service.redeem(reward.id).subscribe({
      next: ({ data }) => {
        this.profile.update((profile) => profile ? { ...profile, balance: data.balance } : profile);
        this.info.set(`Cupón ${data.redemption.promotion.coupon_code} generado. Ya puedes usarlo en el carrito.`);
        this.busy.set(false);
        this.service.coupons().subscribe({ next: ({ data: coupons }) => this.coupons.set(coupons), error: () => {} });
      },
      error: (error) => { this.error.set(this.apiError(error, 'No se pudo canjear la recompensa.')); this.busy.set(false); },
    });
  }

  protected applyCoupon(code: string): void {
    this.busy.set(true);
    this.error.set('');
    this.cart.applyCoupon(code).subscribe({
      next: () => void this.router.navigate(['/carrito']),
      error: (error) => { this.error.set(this.apiError(error, 'Agrega productos suficientes al carrito para aplicar el cupón.')); this.busy.set(false); },
    });
  }

  protected toggleSound(): void {
    this.sound.update((enabled) => !enabled);
    if (this.sound() && !this.audio) this.audio = new AudioContext();
    if (this.sound()) {
      void this.audio?.resume();
      if (this.view() === 'playing' && !this.paused() && !this.pendingInputs) this.startMusic();
    } else {
      this.stopMusic();
    }
  }

  private startMusic(): void {
    if (!this.audio || this.musicTimer !== null) return;
    this.musicStep = 0;
    this.playMusicNote();
    this.musicTimer = window.setInterval(() => this.playMusicNote(), 430);
  }

  private stopMusic(): void {
    if (this.musicTimer === null) return;
    window.clearInterval(this.musicTimer);
    this.musicTimer = null;
  }

  private playMusicNote(): void {
    if (!this.sound() || !this.audio || this.audio.state === 'closed') return;
    const melody = [261.63, 329.63, 392, 329.63, 293.66, 349.23, 440, 349.23];
    const now = this.audio.currentTime;
    const oscillator = this.audio.createOscillator();
    const gain = this.audio.createGain();
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(melody[this.musicStep % melody.length], now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.018, now + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.36);
    oscillator.connect(gain).connect(this.audio.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.38);
    this.musicStep += 1;
  }

  private playSound(event: 'coin' | 'hit' | 'bonus' | 'finish'): void {
    if (!this.sound() || !this.audio) return;
    const frequencies = { coin: 780, hit: 180, bonus: 550, finish: 660 };
    const oscillator = this.audio.createOscillator();
    const gain = this.audio.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = frequencies[event];
    gain.gain.setValueAtTime(0.05, this.audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.audio.currentTime + 0.13);
    oscillator.connect(gain).connect(this.audio.destination);
    oscillator.start();
    oscillator.stop(this.audio.currentTime + 0.14);
  }

  protected controlDown(direction: string, event: PointerEvent): void {
    event.preventDefault();
    this.engine?.press(direction);
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }
  protected controlUp(direction: string, event: PointerEvent): void {
    event.preventDefault();
    this.engine?.release(direction);
  }

  protected joystickStart(event: PointerEvent): void {
    event.preventDefault();
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    this.updateJoystick(event);
  }

  protected joystickMove(event: PointerEvent): void {
    if (!(event.currentTarget as HTMLElement).hasPointerCapture(event.pointerId)) return;
    event.preventDefault();
    this.updateJoystick(event);
  }

  protected joystickEnd(event: PointerEvent): void {
    event.preventDefault();
    this.joystickDirections.forEach((direction) => this.engine?.release(direction));
    this.joystickDirections = [];
    this.joystickTransform.set('translate3d(0, 0, 0)');
  }

  private updateJoystick(event: PointerEvent): void {
    const element = event.currentTarget as HTMLElement;
    const bounds = element.getBoundingClientRect();
    const rawX = event.clientX - (bounds.left + bounds.width / 2);
    const rawY = event.clientY - (bounds.top + bounds.height / 2);
    const radius = Math.min(bounds.width, bounds.height) * .28;
    const distance = Math.hypot(rawX, rawY);
    const scale = distance > radius ? radius / distance : 1;
    const x = rawX * scale;
    const y = rawY * scale;
    this.joystickTransform.set(`translate3d(${x}px, ${y}px, 0)`);

    const threshold = radius * .28;
    const next = [
      ...(y < -threshold ? ['up'] : y > threshold ? ['down'] : []),
      ...(x < -threshold ? ['left'] : x > threshold ? ['right'] : []),
    ];
    this.joystickDirections.filter((direction) => !next.includes(direction)).forEach((direction) => this.engine?.release(direction));
    next.filter((direction) => !this.joystickDirections.includes(direction)).forEach((direction) => this.engine?.press(direction));
    this.joystickDirections = next;
  }

  protected stars(count: number): string { return '★'.repeat(count) + '☆'.repeat(Math.max(0, 3 - count)); }

  private apiError(error: unknown, fallback: string): string {
    if (!(error instanceof HttpErrorResponse)) return fallback;
    if (error.status === 429) return 'Hiciste varias acciones seguidas. Espera unos segundos y pulsa “Reintentar envío”.';
    const body = error.error as { message?: string; errors?: Record<string, string[]> } | null;
    const first = body?.errors && Object.values(body.errors)[0]?.[0];
    return first || body?.message || fallback;
  }
}
