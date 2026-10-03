import { GameObject, GameScenario } from '../../core/game/game.model';

export interface GameFrame {
  remaining: number;
  health: number;
  coins: number;
  score: number;
  shield: boolean;
  progress: number;
  message: string;
  pace: string;
}

export class GameEngine {
  private static readonly spriteAreas = [
    { x: 70, y: 120, width: 275, height: 265 },
    { x: 425, y: 65, width: 285, height: 335 },
    { x: 750, y: 85, width: 325, height: 315 },
    { x: 1170, y: 75, width: 215, height: 330 },
    { x: 65, y: 450, width: 285, height: 275 },
    { x: 415, y: 480, width: 300, height: 225 },
    { x: 770, y: 495, width: 310, height: 215 },
    { x: 1135, y: 445, width: 280, height: 285 },
    { x: 70, y: 780, width: 270, height: 250 },
    { x: 445, y: 745, width: 255, height: 300 },
    { x: 790, y: 770, width: 240, height: 280 },
    { x: 1150, y: 785, width: 250, height: 245 },
  ] as const;
  private readonly context: CanvasRenderingContext2D;
  private readonly keys = new Set<string>();
  private readonly touches = new Set<string>();
  private readonly hit = new Set<number>();
  private readonly bonuses = new Set<number>();
  private readonly coins = new Set<number>();
  private x: number;
  private y: number;
  private previousX: number;
  private previousY: number;
  private health: number;
  private limitTicks: number;
  private ticks = 0;
  private shieldUntil = 0;
  private penalty = 0;
  private inputs = '';
  private frameId = 0;
  private lastFrame = 0;
  private accumulated = 0;
  private stopped = false;
  private paused = false;
  private visualTime = 0;
  private impactUntil = 0;
  private feedbackUntil = 0;
  private feedbackText = '';
  private heading = 0;
  private readonly trail: { x: number; y: number }[] = [];
  private readonly sprites = new Image();
  private spritesReady = false;
  private readonly directions: [number, number][] = [
    [0, 0], [0, -3], [0, 3], [-3, 0], [3, 0], [-2, -2], [2, -2], [-2, 2], [2, 2],
  ];

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly scenario: GameScenario,
    private readonly onFrame: (frame: GameFrame) => void,
    private readonly onFinish: (inputs: string) => void,
    private readonly onSound: (event: 'coin' | 'hit' | 'bonus' | 'finish') => void,
  ) {
    const context = canvas.getContext('2d');
    if (!context) throw new Error('No se pudo iniciar el mapa.');
    this.context = context;
    this.canvas.width = scenario.width;
    this.canvas.height = scenario.height;
    this.x = scenario.start.x;
    this.y = scenario.start.y;
    this.previousX = this.x;
    this.previousY = this.y;
    this.health = scenario.initial_health;
    this.limitTicks = scenario.time_limit * 10;
    this.sprites.onload = () => { this.spritesReady = true; };
    this.sprites.src = '/images/game/dulce-encanto-sprites-v2.png';
    window.addEventListener('keydown', this.keyDown);
    window.addEventListener('keyup', this.keyUp);
    window.addEventListener('blur', this.clearKeys);
    this.onFrame(this.state());
    this.frameId = requestAnimationFrame(this.loop);
  }

  press(direction: string): void { this.touches.add(direction); }
  release(direction: string): void { this.touches.delete(direction); }
  setPaused(value: boolean): void {
    this.paused = value;
    this.lastFrame = 0;
    this.accumulated = 0;
    this.clearKeys();
  }
  isPaused(): boolean { return this.paused; }

  destroy(): void {
    this.stopped = true;
    cancelAnimationFrame(this.frameId);
    window.removeEventListener('keydown', this.keyDown);
    window.removeEventListener('keyup', this.keyUp);
    window.removeEventListener('blur', this.clearKeys);
    this.clearKeys();
  }

  private readonly keyDown = (event: KeyboardEvent): void => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd', 'W', 'A', 'S', 'D'].includes(event.key)) {
      event.preventDefault();
      this.keys.add(event.key.toLowerCase());
    }
  };
  private readonly keyUp = (event: KeyboardEvent): void => { this.keys.delete(event.key.toLowerCase()); };
  private readonly clearKeys = (): void => { this.keys.clear(); this.touches.clear(); };

  private readonly loop = (timestamp: number): void => {
    if (this.stopped) return;
    if (!this.lastFrame) this.lastFrame = timestamp;
    this.visualTime = timestamp;
    if (!this.paused) {
      this.accumulated += Math.min(250, timestamp - this.lastFrame);
      while (this.accumulated >= this.scenario.tick_ms && !this.stopped) {
        this.tick();
        this.accumulated -= this.scenario.tick_ms;
      }
    }
    this.lastFrame = timestamp;
    this.draw();
    if (!this.stopped) this.frameId = requestAnimationFrame(this.loop);
  };

  private inputCode(): number {
    const active = (direction: string, key: string, arrow: string) => this.touches.has(direction) || this.keys.has(key) || this.keys.has(arrow);
    const up = active('up', 'w', 'arrowup');
    const down = active('down', 's', 'arrowdown');
    const left = active('left', 'a', 'arrowleft');
    const right = active('right', 'd', 'arrowright');
    if (up && left) return 5;
    if (up && right) return 6;
    if (down && left) return 7;
    if (down && right) return 8;
    if (up) return 1;
    if (down) return 2;
    if (left) return 3;
    if (right) return 4;
    return 0;
  }

  private tick(): void {
    const code = this.inputCode();
    this.inputs += String(code);
    this.ticks++;
    const [dx, dy] = this.directions[code];
    this.previousX = this.x;
    this.previousY = this.y;
    this.x = Math.max(15, Math.min(785, this.x + dx));
    this.y = Math.max(15, Math.min(465, this.y + dy));
    if (code !== 0) this.heading = Math.atan2(dy, dx);
    if (code !== 0) {
      this.trail.push({ x: this.x, y: this.y });
      if (this.trail.length > 6) this.trail.shift();
    }

    for (const obstacle of this.scenario.obstacles) {
      const position = this.obstaclePosition(obstacle, this.ticks);
      if (this.hit.has(obstacle.id) || !this.touching(position, 16 + (obstacle.radius ?? 19))) continue;
      this.hit.add(obstacle.id);
      if (this.ticks > this.shieldUntil) {
        this.health = Math.max(0, this.health - (obstacle.damage ?? 0));
        this.penalty += obstacle.score_penalty ?? 0;
        this.impactUntil = this.ticks + 5;
        this.feedbackText = `−${obstacle.damage ?? 0} de integridad`;
        this.feedbackUntil = this.ticks + 12;
        this.onSound('hit');
      }
    }
    for (const bonus of this.scenario.bonuses) {
      if (this.bonuses.has(bonus.id) || !this.touching(bonus, 30)) continue;
      this.bonuses.add(bonus.id);
      this.onSound('bonus');
      if (bonus.type === 'clock') { this.limitTicks += 50; this.feedbackText = '+5 segundos'; }
      if (bonus.type === 'shield') { this.shieldUntil = this.ticks + 50; this.feedbackText = 'Protección activada'; }
      if (bonus.type === 'repair') { this.health = Math.min(100, this.health + 10); this.feedbackText = '+10 de integridad'; }
      this.feedbackUntil = this.ticks + 12;
    }
    for (const coin of this.scenario.coins) {
      if (!this.coins.has(coin.id) && this.touching(coin, 28)) {
        this.coins.add(coin.id);
        this.feedbackText = '+1 Dulce Punto';
        this.feedbackUntil = this.ticks + 10;
        this.onSound('coin');
      }
    }
    if (this.ticks % 2 === 0) this.onFrame(this.state());
    if (this.health === 0 || this.ticks >= this.limitTicks || this.touching(this.scenario.destination, 31)) {
      this.onFrame(this.state());
      this.stopped = true;
      this.onSound('finish');
      this.onFinish(this.inputs);
    }
  }

  private touching(object: GameObject | { x: number; y: number }, radius: number): boolean {
    return (this.x - object.x) ** 2 + (this.y - object.y) ** 2 <= radius ** 2;
  }

  private state(): GameFrame {
    const arrived = this.touching(this.scenario.destination, 31);
    const progress = arrived ? 100 : Math.max(0, Math.min(99, Math.round(
      ((this.x - this.scenario.start.x) / Math.max(1, this.scenario.destination.x - this.scenario.start.x)) * 100,
    )));
    return {
      remaining: Math.max(0, Math.ceil((this.limitTicks - this.ticks) / 10)),
      health: this.health, coins: this.coins.size,
      score: Math.max(0, progress * 2 + this.coins.size * 10 - this.penalty),
      shield: this.shieldUntil > 0 && this.ticks <= this.shieldUntil,
      progress,
      message: this.ticks <= this.feedbackUntil ? this.feedbackText : '',
      pace: 'Conducción libre',
    };
  }

  private draw(): void {
    const ctx = this.context;
    const { width, height } = this.scenario;
    const pulse = (Math.sin(this.visualTime / 260) + 1) / 2;
    ctx.fillStyle = '#f7dce5';
    ctx.fillRect(0, 0, width, height);
    this.drawCityDetails(ctx, width, height);
    ctx.fillStyle = '#eee7df';
    ctx.fillRect(0, 55, width, height - 110);
    ctx.fillStyle = '#f9f2ea';
    ctx.fillRect(0, 70, width, 18);
    ctx.fillRect(0, height - 88, width, 18);
    ctx.setLineDash([28, 22]);
    ctx.strokeStyle = '#fffdf8';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, 240);
    ctx.lineTo(width, 240);
    ctx.stroke();
    ctx.setLineDash([]);

    this.drawCrosswalk(ctx, width - 112, height / 2);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    this.drawSprite(ctx, 1, this.scenario.start.x, this.scenario.start.y, 68, '🏪');
    ctx.fillStyle = `rgba(143, 63, 89, ${0.15 + pulse * 0.18})`;
    ctx.beginPath();
    ctx.arc(this.scenario.destination.x, this.scenario.destination.y, 30 + pulse * 7, 0, Math.PI * 2);
    ctx.fill();
    this.drawSprite(ctx, 2, this.scenario.destination.x, this.scenario.destination.y, 70, '🏠');
    for (const obstacle of this.scenario.obstacles) {
      const position = this.obstaclePosition(obstacle, this.ticks);
      if (!this.hit.has(obstacle.id)) this.drawSprite(ctx, this.obstacleSprite(obstacle.type), position.x, position.y, 48, obstacle.sprite ?? '⚠️');
    }
    for (const bonus of this.scenario.bonuses) {
      if (!this.bonuses.has(bonus.id)) this.drawSprite(ctx, this.bonusSprite(bonus.type), bonus.x, bonus.y + Math.sin(this.visualTime / 240 + bonus.id) * 3, 40, bonus.sprite ?? '✦');
    }
    for (const coin of this.scenario.coins) {
      if (!this.coins.has(coin.id)) {
        const bob = Math.sin(this.visualTime / 220 + coin.id) * 3;
        this.drawSprite(ctx, 8, coin.x, coin.y + bob, 34, '🍬');
      }
    }

    this.trail.forEach((point, index) => {
      ctx.fillStyle = `rgba(156, 73, 101, ${(index + 1) / this.trail.length * 0.13})`;
      ctx.beginPath();
      ctx.arc(point.x, point.y, 5 + index, 0, Math.PI * 2);
      ctx.fill();
    });
    const interpolation = Math.max(0, Math.min(1, this.accumulated / this.scenario.tick_ms));
    const playerX = this.previousX + (this.x - this.previousX) * interpolation;
    const playerY = this.previousY + (this.y - this.previousY) * interpolation;
    ctx.fillStyle = 'rgba(74, 41, 50, 0.16)';
    ctx.beginPath();
    ctx.arc(playerX, playerY + 12, 18, 0, Math.PI * 2);
    ctx.fill();
    this.drawPlayer(ctx, playerX, playerY);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#733b50';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText('CLIENTE →', width - 18, 28);

    if (this.ticks <= this.impactUntil) {
      ctx.fillStyle = 'rgba(185, 42, 72, 0.12)';
      ctx.fillRect(0, 0, width, height);
    }
  }

  private obstaclePosition(obstacle: GameObject, tick: number): { x: number; y: number } {
    const movement = obstacle.movement;
    if (!movement) return { x: obstacle.x, y: obstacle.y };
    const range = Math.max(1, movement.range);
    const period = range * 4;
    const progress = ((tick * Math.max(1, movement.speed)) + movement.phase) % period;
    const offset = progress <= range
      ? progress
      : (progress <= range * 3 ? range * 2 - progress : progress - period);
    return movement.axis === 'x'
      ? { x: obstacle.x + offset, y: obstacle.y }
      : { x: obstacle.x, y: obstacle.y + offset };
  }

  private drawCityDetails(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.fillStyle = '#dcebd9';
    ctx.fillRect(0, 0, width, 55);
    ctx.fillRect(0, height - 55, width, 55);
    for (let x = 95; x < width; x += 145) {
      this.drawTree(ctx, x, 28);
      this.drawTree(ctx, x + 48, height - 27);
    }
  }

  private drawTree(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    ctx.fillStyle = '#8b6755';
    ctx.fillRect(x - 2, y + 4, 4, 11);
    ctx.fillStyle = '#77a86a';
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#99bf78';
    ctx.beginPath();
    ctx.arc(x - 4, y - 4, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawPlayer(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    if (!this.spritesReady) {
      ctx.font = '30px sans-serif';
      ctx.fillText('🛵', x, y);
      return;
    }
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(this.heading);
    const area = GameEngine.spriteAreas[0];
    const width = 58 * area.width / area.height;
    ctx.drawImage(this.sprites, area.x, area.y, area.width, area.height, -width / 2, -29, width, 58);
    ctx.restore();
  }

  private drawSprite(ctx: CanvasRenderingContext2D, index: number, x: number, y: number, size: number, fallback: string): void {
    if (!this.spritesReady) {
      ctx.font = `${Math.round(size * 0.62)}px sans-serif`;
      ctx.fillText(fallback, x, y);
      return;
    }
    const area = GameEngine.spriteAreas[index];
    const width = size * area.width / area.height;
    ctx.drawImage(this.sprites, area.x, area.y, area.width, area.height, x - width / 2, y - size / 2, width, size);
  }

  private obstacleSprite(type?: string): number {
    if (type === 'vehicle') return 4;
    if (type === 'pothole') return 5;
    if (type === 'puddle') return 6;
    return 7;
  }

  private bonusSprite(type?: string): number {
    if (type === 'clock') return 9;
    if (type === 'shield') return 10;
    return 11;
  }

  private drawCrosswalk(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    ctx.fillStyle = '#fffdf8';
    for (let offset = -44; offset <= 44; offset += 16) {
      ctx.fillRect(x + offset, y - 38, 8, 76);
    }
  }
}
