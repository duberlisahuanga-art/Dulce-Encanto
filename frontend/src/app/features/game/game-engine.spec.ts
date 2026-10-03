import { afterEach, describe, expect, it, vi } from 'vitest';
import { GameScenario } from '../../core/game/game.model';
import { GameEngine, GameFrame } from './game-engine';
import { runnerStep } from './phaser-game-engine';

describe('GameEngine', () => {
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  it('tracks player input, respects pause and finishes at the destination', () => {
    const callbacks: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => {
      callbacks.push(callback);
      return callbacks.length;
    }));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      fillRect: vi.fn(), setLineDash: vi.fn(), beginPath: vi.fn(), moveTo: vi.fn(),
      lineTo: vi.fn(), stroke: vi.fn(), fillText: vi.fn(), arc: vi.fn(), fill: vi.fn(),
    } as unknown as CanvasRenderingContext2D);

    const scenario: GameScenario = {
      width: 800, height: 480, start: { x: 45, y: 240 }, destination: { x: 100, y: 240 },
      tick_ms: 100, time_limit: 30, initial_health: 100, completion_points: 300,
      dulce_points_reward: 90, star_thresholds: [350, 500, 650], points_multiplier: 1,
      obstacles: [], bonuses: [], coins: [],
    };
    const frames: GameFrame[] = [];
    const finished = vi.fn();
    const engine = new GameEngine(document.createElement('canvas'), scenario, frame => frames.push(frame), finished, vi.fn());
    expect(frames[0].shield).toBe(false);
    engine.press('right');
    callbacks.shift()!(100);
    callbacks.shift()!(200);
    engine.setPaused(true);
    callbacks.shift()!(300);
    callbacks.shift()!(400);
    expect(finished).not.toHaveBeenCalled();
    engine.setPaused(false);
    engine.press('right');
    for (let time = 500; time <= 1200; time += 100) callbacks.shift()!(time);
    expect(finished).toHaveBeenCalledWith('44444444');
    expect(frames.at(-1)?.health).toBe(100);
    expect(frames.at(-1)?.progress).toBe(100);
    engine.destroy();
  });

  it('uses the same lane, brake and boost rules as the validated runner level', () => {
    const scenario = { width: 2400, auto_speed: 4 };
    expect(runnerStep(100, 240, 0, scenario)).toEqual({ x: 104, y: 240, speed: 4 });
    expect(runnerStep(100, 240, 4, scenario)).toEqual({ x: 106, y: 240, speed: 6 });
    expect(runnerStep(100, 240, 5, scenario)).toEqual({ x: 102, y: 235, speed: 2 });
    expect(runnerStep(2390, 105, 1, scenario)).toEqual({ x: 2385, y: 105, speed: 4 });
  });
});
