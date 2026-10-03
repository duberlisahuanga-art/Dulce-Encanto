import Phaser from 'phaser';
import { GameObject, GameScenario } from '../../core/game/game.model';
import { GameFrame } from './game-engine';

type SoundEvent = 'coin' | 'hit' | 'bonus' | 'finish';

const spriteAreas = [
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

export function runnerStep(
  x: number,
  y: number,
  input: number,
  scenario: Pick<GameScenario, 'width' | 'auto_speed'>,
): { x: number; y: number; speed: number } {
  const baseSpeed = Math.max(1, scenario.auto_speed ?? 4);
  const speed = [3, 5, 7].includes(input)
    ? Math.max(1, baseSpeed - 2)
    : ([4, 6, 8].includes(input) ? baseSpeed + 2 : baseSpeed);
  const dy = [1, 5, 6].includes(input) ? -5 : ([2, 7, 8].includes(input) ? 5 : 0);
  return {
    x: Math.max(15, Math.min(scenario.width - 15, x + speed)),
    y: Math.max(105, Math.min(375, y + dy)),
    speed,
  };
}

export class PhaserGameEngine {
  private readonly keys = new Set<string>();
  private readonly touches = new Set<string>();
  private readonly hit = new Set<number>();
  private readonly bonuses = new Set<number>();
  private readonly coins = new Set<number>();
  private readonly obstacleViews = new Map<number, Phaser.GameObjects.Image>();
  private readonly bonusViews = new Map<number, Phaser.GameObjects.Image>();
  private readonly coinViews = new Map<number, Phaser.GameObjects.Image>();
  private readonly game: Phaser.Game;
  private scene?: Phaser.Scene;
  private player?: Phaser.GameObjects.Image;
  private playerShadow?: Phaser.GameObjects.Ellipse;
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
  private stopped = false;
  private paused = false;
  private accumulated = 0;
  private feedbackUntil = 0;
  private feedbackText = '';
  private currentSpeed: number;

  constructor(
    host: HTMLElement,
    private readonly scenario: GameScenario,
    private readonly onFrame: (frame: GameFrame) => void,
    private readonly onFinish: (inputs: string) => void,
    private readonly onSound: (event: SoundEvent) => void,
  ) {
    this.x = scenario.start.x;
    this.y = scenario.start.y;
    this.previousX = this.x;
    this.previousY = this.y;
    this.health = scenario.initial_health;
    this.limitTicks = scenario.time_limit * 10;
    this.currentSpeed = scenario.auto_speed ?? 4;
    this.onFrame(this.state());

    const engine = this;
    this.game = new Phaser.Game({
      type: Phaser.AUTO,
      width: scenario.viewport_width ?? 800,
      height: scenario.height,
      parent: host,
      backgroundColor: '#f7dce5',
      transparent: false,
      render: { antialias: true, pixelArt: false, roundPixels: false },
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      scene: {
        preload: function (this: Phaser.Scene) { engine.preload(this); },
        create: function (this: Phaser.Scene) { engine.create(this); },
        update: function (this: Phaser.Scene, _time: number, delta: number) { engine.update(delta); },
      },
    });

    window.addEventListener('keydown', this.keyDown);
    window.addEventListener('keyup', this.keyUp);
    window.addEventListener('blur', this.clearKeys);
  }

  press(direction: string): void { this.touches.add(direction); }
  release(direction: string): void { this.touches.delete(direction); }

  setPaused(value: boolean): void {
    this.paused = value;
    this.accumulated = 0;
    this.clearKeys();
    if (!this.scene) return;
    if (value) this.scene.scene.pause();
    else this.scene.scene.resume();
  }

  isPaused(): boolean { return this.paused; }

  destroy(): void {
    this.stopped = true;
    window.removeEventListener('keydown', this.keyDown);
    window.removeEventListener('keyup', this.keyUp);
    window.removeEventListener('blur', this.clearKeys);
    this.clearKeys();
    this.game.destroy(true);
  }

  private readonly keyDown = (event: KeyboardEvent): void => {
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd', 'W', 'A', 'S', 'D'].includes(event.key)) return;
    event.preventDefault();
    this.keys.add(event.key.toLowerCase());
  };

  private readonly keyUp = (event: KeyboardEvent): void => { this.keys.delete(event.key.toLowerCase()); };
  private readonly clearKeys = (): void => { this.keys.clear(); this.touches.clear(); };

  private preload(scene: Phaser.Scene): void {
    this.scene = scene;
    scene.load.image('dulce-sprites', '/images/game/dulce-encanto-sprites-v2.png');
  }

  private create(scene: Phaser.Scene): void {
    this.scene = scene;
    const texture = scene.textures.get('dulce-sprites');
    spriteAreas.forEach((area, index) => {
      const frame = `sprite-${index}`;
      if (!texture.has(frame)) texture.add(frame, 0, area.x, area.y, area.width, area.height);
    });
    scene.cameras.main.setBounds(0, 0, this.scenario.width, this.scenario.height);
    this.drawWorld(scene);

    this.createSprite(scene, 1, this.scenario.start.x - 45, 240, 82).setDepth(2);
    this.createSprite(scene, 2, this.scenario.destination.x, this.scenario.destination.y, 88).setDepth(2);
    this.createSprite(scene, 3, this.scenario.destination.x + 48, this.scenario.destination.y - 12, 62).setDepth(3);

    for (const obstacle of this.scenario.obstacles) {
      const view = this.createSprite(scene, this.obstacleSprite(obstacle.type), obstacle.x, obstacle.y, 58);
      view.setDepth(4);
      this.obstacleViews.set(obstacle.id, view);
    }
    for (const bonus of this.scenario.bonuses) {
      const view = this.createSprite(scene, this.bonusSprite(bonus.type), bonus.x, bonus.y, 48);
      view.setDepth(4);
      scene.tweens.add({ targets: view, y: bonus.y - 7, duration: 650, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      this.bonusViews.set(bonus.id, view);
    }
    for (const coin of this.scenario.coins) {
      const view = this.createSprite(scene, 8, coin.x, coin.y, 42);
      view.setDepth(4);
      scene.tweens.add({ targets: view, scaleX: view.scaleX * 1.08, scaleY: view.scaleY * 1.08, duration: 450, yoyo: true, repeat: -1 });
      this.coinViews.set(coin.id, view);
    }

    this.playerShadow = scene.add.ellipse(this.x, this.y + 17, 55, 19, 0x4a2932, 0.18).setDepth(5);
    this.player = this.createSprite(scene, 0, this.x, this.y, 70).setDepth(6);
    scene.cameras.main.scrollX = 0;
    this.addDirectionSigns(scene);
  }

  private update(delta: number): void {
    if (this.stopped || this.paused || !this.scene || !this.player) return;
    this.accumulated += Math.min(250, delta);
    while (this.accumulated >= this.scenario.tick_ms && !this.stopped) {
      this.tick();
      this.accumulated -= this.scenario.tick_ms;
    }

    const interpolation = Phaser.Math.Clamp(this.accumulated / this.scenario.tick_ms, 0, 1);
    const renderX = Phaser.Math.Linear(this.previousX, this.x, interpolation);
    const renderY = Phaser.Math.Linear(this.previousY, this.y, interpolation);
    this.player.setPosition(renderX, renderY);
    this.playerShadow?.setPosition(renderX, renderY + 17);
    const input = this.inputCode();
    this.player.setRotation([1, 5, 6].includes(input) ? -0.08 : ([2, 7, 8].includes(input) ? 0.08 : 0));

    for (const obstacle of this.scenario.obstacles) {
      const view = this.obstacleViews.get(obstacle.id);
      if (!view || this.hit.has(obstacle.id)) continue;
      const position = this.obstaclePosition(obstacle, this.ticks + interpolation);
      view.setPosition(position.x, position.y);
    }

    const camera = this.scene.cameras.main;
    const maxScroll = Math.max(0, this.scenario.width - camera.width);
    const targetScroll = Phaser.Math.Clamp(renderX - camera.width * 0.28, 0, maxScroll);
    camera.scrollX = Phaser.Math.Linear(camera.scrollX, targetScroll, 0.1);
  }

  private tick(): void {
    const code = this.inputCode();
    this.inputs += String(code);
    this.ticks++;
    this.previousX = this.x;
    this.previousY = this.y;
    const step = runnerStep(this.x, this.y, code, this.scenario);
    this.x = step.x;
    this.y = step.y;
    this.currentSpeed = step.speed;

    for (const obstacle of this.scenario.obstacles) {
      const position = this.obstaclePosition(obstacle, this.ticks);
      if (this.hit.has(obstacle.id) || !this.touching(position, 16 + (obstacle.radius ?? 19))) continue;
      this.hit.add(obstacle.id);
      this.obstacleViews.get(obstacle.id)?.setVisible(false);
      if (this.ticks > this.shieldUntil) {
        this.health = Math.max(0, this.health - (obstacle.damage ?? 0));
        this.penalty += obstacle.score_penalty ?? 0;
        this.feedbackText = `−${obstacle.damage ?? 0} de integridad`;
        this.feedbackUntil = this.ticks + 12;
        this.flash(0xb92a48);
        this.onSound('hit');
      } else {
        this.feedbackText = 'El escudo absorbió el golpe';
        this.feedbackUntil = this.ticks + 10;
      }
    }
    for (const bonus of this.scenario.bonuses) {
      if (this.bonuses.has(bonus.id) || !this.touching(bonus, 30)) continue;
      this.bonuses.add(bonus.id);
      this.bonusViews.get(bonus.id)?.setVisible(false);
      if (bonus.type === 'clock') { this.limitTicks += 50; this.feedbackText = '+5 segundos'; }
      if (bonus.type === 'shield') { this.shieldUntil = this.ticks + 50; this.feedbackText = 'Protección activada'; }
      if (bonus.type === 'repair') { this.health = Math.min(100, this.health + 10); this.feedbackText = '+10 de integridad'; }
      this.feedbackUntil = this.ticks + 12;
      this.flash(0x4d9b72, 90);
      this.onSound('bonus');
    }
    for (const coin of this.scenario.coins) {
      if (this.coins.has(coin.id) || !this.touching(coin, 28)) continue;
      this.coins.add(coin.id);
      this.coinViews.get(coin.id)?.setVisible(false);
      this.feedbackText = `Dulce recogido · ${this.coins.size}/${this.scenario.coins.length}`;
      this.feedbackUntil = this.ticks + 10;
      this.onSound('coin');
    }

    this.onFrame(this.state());
    if (this.health === 0 || this.ticks >= this.limitTicks || this.touching(this.scenario.destination, 31)) {
      this.stopped = true;
      this.onFrame(this.state());
      this.onSound('finish');
      this.onFinish(this.inputs);
    }
  }

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

  private state(): GameFrame {
    const arrived = this.touching(this.scenario.destination, 31);
    const progress = arrived ? 100 : Math.max(0, Math.min(99, Math.round(
      ((this.x - this.scenario.start.x) / Math.max(1, this.scenario.destination.x - this.scenario.start.x)) * 100,
    )));
    const baseSpeed = this.scenario.auto_speed ?? 4;
    return {
      remaining: Math.max(0, Math.ceil((this.limitTicks - this.ticks) / 10)),
      health: this.health,
      coins: this.coins.size,
      score: Math.max(0, progress * 2 + this.coins.size * 10 - this.penalty),
      shield: this.shieldUntil > 0 && this.ticks <= this.shieldUntil,
      progress,
      message: this.ticks <= this.feedbackUntil ? this.feedbackText : '',
      pace: this.currentSpeed > baseSpeed ? 'Impulso' : (this.currentSpeed < baseSpeed ? 'Frenando' : 'Crucero'),
    };
  }

  private drawWorld(scene: Phaser.Scene): void {
    const graphics = scene.add.graphics().setDepth(0);
    graphics.fillStyle(0xdcebd9, 1).fillRect(0, 0, this.scenario.width, 82);
    graphics.fillStyle(0xeee7df, 1).fillRect(0, 82, this.scenario.width, 316);
    graphics.fillStyle(0xf9f2ea, 1).fillRect(0, 82, this.scenario.width, 18);
    graphics.fillStyle(0xf9f2ea, 1).fillRect(0, 380, this.scenario.width, 18);
    graphics.fillStyle(0xdcebd9, 1).fillRect(0, 398, this.scenario.width, 82);
    graphics.lineStyle(4, 0xfffdf8, 1);
    for (let x = 20; x < this.scenario.width; x += 74) {
      graphics.lineBetween(x, 240, x + 42, 240);
    }
    for (let x = 160; x < this.scenario.width; x += 280) {
      this.drawTree(scene, x, 45);
      this.drawTree(scene, x + 120, 435);
    }
    for (let x = 220; x < this.scenario.width - 160; x += 520) {
      const building = scene.add.rectangle(x, 50, 86, 52, 0xf3c6cf).setStrokeStyle(3, 0xffffff, 0.75);
      building.setDepth(1);
      scene.add.triangle(x, 17, -49, 24, 49, 24, 0, -16, 0x9e4c65).setDepth(1);
      scene.add.rectangle(x, 50, 16, 24, 0xffffff).setDepth(1);
    }
    const crosswalk = scene.add.graphics().setDepth(1);
    crosswalk.fillStyle(0xfffdf8, 0.95);
    for (let offset = -48; offset <= 48; offset += 18) {
      crosswalk.fillRect(this.scenario.destination.x - 95 + offset, 195, 10, 90);
    }
  }

  private drawTree(scene: Phaser.Scene, x: number, y: number): void {
    scene.add.rectangle(x, y + 15, 7, 25, 0x8b6755).setDepth(1);
    scene.add.circle(x, y, 17, 0x77a86a).setDepth(1);
    scene.add.circle(x - 7, y - 7, 10, 0x99bf78).setDepth(1);
  }

  private addDirectionSigns(scene: Phaser.Scene): void {
    const stops = [520, 1040, 1560, 2080];
    stops.forEach((x, index) => {
      const label = index === stops.length - 1 ? 'CLIENTE CERCA' : `${index + 1}/4`;
      scene.add.text(x, 115, label, {
        fontFamily: 'Arial, sans-serif', fontSize: '16px', fontStyle: 'bold', color: '#733b50',
        backgroundColor: '#fffaf0dd', padding: { x: 10, y: 6 },
      }).setOrigin(0.5).setDepth(3);
    });
  }

  private createSprite(scene: Phaser.Scene, index: number, x: number, y: number, size: number): Phaser.GameObjects.Image {
    const area = spriteAreas[index];
    const width = size * area.width / area.height;
    return scene.add.image(x, y, 'dulce-sprites', `sprite-${index}`).setDisplaySize(width, size);
  }

  private obstaclePosition(obstacle: GameObject, tick: number): { x: number; y: number } {
    const movement = obstacle.movement;
    if (!movement) return { x: obstacle.x, y: obstacle.y };
    const range = Math.max(1, movement.range);
    const period = range * 4;
    const progress = ((tick * Math.max(1, movement.speed)) + movement.phase) % period;
    const offset = progress <= range ? progress : (progress <= range * 3 ? range * 2 - progress : progress - period);
    return movement.axis === 'x' ? { x: obstacle.x + offset, y: obstacle.y } : { x: obstacle.x, y: obstacle.y + offset };
  }

  private touching(object: GameObject | { x: number; y: number }, radius: number): boolean {
    return (this.x - object.x) ** 2 + (this.y - object.y) ** 2 <= radius ** 2;
  }

  private flash(color: number, duration = 130): void {
    if (!this.scene) return;
    this.scene.cameras.main.flash(duration, (color >> 16) & 255, (color >> 8) & 255, color & 255, false);
    this.scene.cameras.main.shake(110, 0.004);
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
}
