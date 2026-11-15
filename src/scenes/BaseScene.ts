import Phaser from 'phaser';
import { GLOBAL_KEYS } from '../config/controls';
import { DISPLAY, STEP_MS } from '../config/display';
import { applyEvent, type FlowEvent, type Route, type Run } from '../systems/Flow';
import { Controls } from '../systems/Input';

const RUN_KEY = 'run';

/**
 * Основа всех сцен. Логика идёт фиксированным шагом 1/60 с в tick(), независимо от частоты
 * монитора; ввод обновляется перед каждым шагом. Переходы между сценами — через go(событие).
 */
export abstract class BaseScene<TData extends object = object> extends Phaser.Scene {
  protected controls!: Controls;
  private accumulator = 0;
  private leaving = false;

  create(data: TData): void {
    this.accumulator = 0;
    this.leaving = false;
    this.controls = new Controls(this);
    this.input.keyboard?.on(`keydown-${GLOBAL_KEYS.mute}`, () => {
      this.sound.mute = !this.sound.mute;
    });
    this.build(data);
  }

  /** Построить сцену. data — то, что передано в scene.start (для игровых сцен — Route). */
  protected abstract build(data: TData): void;

  /** Один шаг логики (1/60 с). */
  protected abstract tick(): void;

  override update(_time: number, delta: number): void {
    this.accumulator = Math.min(this.accumulator + delta, STEP_MS * DISPLAY.maxStepsPerFrame);
    while (this.accumulator >= STEP_MS && !this.leaving) {
      this.accumulator -= STEP_MS;
      this.controls.update();
      this.tick();
    }
  }

  protected get run(): Run {
    const run = this.registry.get(RUN_KEY) as Run | null | undefined;
    if (!run) throw new Error('No active run');
    return run;
  }

  protected startRun(run: Run, route: Route): void {
    this.registry.set(RUN_KEY, run);
    this.switchTo(route);
  }

  /** Передать событие автомату сцен и перейти в следующую сцену. */
  protected go(ev: FlowEvent): void {
    const { run, route } = applyEvent(this.run, ev);
    this.registry.set(RUN_KEY, run);
    this.switchTo(route);
  }

  protected switchTo(route: Route | { scene: 'PlayerSelect' }): void {
    if (this.leaving) return;
    this.leaving = true;
    this.scene.start(route.scene, route);
  }
}
