import { BALANCE } from '../config/balance';
import {
  FINAL_LEVEL,
  PARK_LEVELS,
  STORY,
  type BonusGame,
  type LevelId,
  type ParkLevelId,
  type StoryStep,
} from '../config/levels';
import type { PlayerCarry } from '../sim/health';

/** Порядок сцен игры как чистый автомат: состояние прохождения + событие → следующая сцена. */

export type PlayerCount = 1 | 2;
export type HeroId = 'sergey' | 'ivan';

export interface Run {
  readonly players: PlayerCount;
  /** Герой игрока 1. В коопе игрок 2 — второй ведущий. */
  readonly hero: HeroId;
  /** Индекс в STORY. */
  readonly step: number;
  /** Аттракцион парка, который сейчас проходится (null — игрок в хабе или вне парка). */
  readonly parkLevel: ParkLevelId | null;
  readonly parkKeys: readonly ParkLevelId[];
  readonly continuesLeft: number;
  /**
   * Здоровье, жизни и таймкоды игроков между уровнями (бонус-игры и выбор провода их меняют).
   * Пусто — свежие (начало игры).
   */
  readonly carry: readonly PlayerCarry[];
}

export type Route =
  | { readonly scene: 'Title' }
  | { readonly scene: 'Cutscene'; readonly id: string }
  | { readonly scene: 'Level'; readonly level: LevelId }
  | { readonly scene: 'WireChoice' }
  | { readonly scene: 'Bonus'; readonly game: BonusGame }
  | { readonly scene: 'ParkHub' }
  | { readonly scene: 'GameOver'; readonly canContinue: boolean }
  | { readonly scene: 'Ending' };

export type SceneKey = Route['scene'];

export type FlowEvent =
  /**
   * Сцена закончилась: уровень пройден, кат-сцена досмотрена и т. п. carry — состояние игроков
   * после неё (уровень, бонус-игра); нет — не изменилось.
   */
  | { readonly type: 'done'; readonly carry?: readonly PlayerCarry[] }
  /** Выбор в хабе парка: аттракцион 6–8 или ворота студии (9). */
  | { readonly type: 'parkPick'; readonly level: LevelId }
  | { readonly type: 'gameOver' }
  | { readonly type: 'continue' }
  | { readonly type: 'quit' };

export interface Transition {
  readonly run: Run | null;
  readonly route: Route;
}

export function newRun(players: PlayerCount, hero: HeroId): Run {
  return {
    players,
    hero,
    step: 0,
    parkLevel: null,
    parkKeys: [],
    continuesLeft: BALANCE.continues,
    carry: [],
  };
}

export function partnerOf(hero: HeroId): HeroId {
  return hero === 'sergey' ? 'ivan' : 'sergey';
}

function stepAt(run: Run): StoryStep {
  const step = STORY[run.step];
  if (!step) throw new Error(`Story step out of range: ${run.step}`);
  return step;
}

/** Сцена, в которой сейчас находится прохождение. */
export function routeOf(run: Run): Route {
  const step = stepAt(run);
  switch (step.kind) {
    case 'cutscene':
      return { scene: 'Cutscene', id: step.id };
    case 'level':
      return { scene: 'Level', level: step.level };
    case 'wire':
      return { scene: 'WireChoice' };
    case 'bonus':
      return { scene: 'Bonus', game: step.game };
    case 'park':
      return run.parkLevel === null
        ? { scene: 'ParkHub' }
        : { scene: 'Level', level: run.parkLevel };
    case 'ending':
      return { scene: 'Ending' };
  }
}

/** Что можно выбрать в хабе парка. */
export function parkOptions(run: Run): { remaining: ParkLevelId[]; gateOpen: boolean } {
  const remaining = PARK_LEVELS.filter((l) => !run.parkKeys.includes(l));
  return { remaining, gateOpen: remaining.length === 0 };
}

function isParkLevel(level: LevelId): level is ParkLevelId {
  return (PARK_LEVELS as readonly LevelId[]).includes(level);
}

function go(run: Run): Transition {
  return { run, route: routeOf(run) };
}

export function applyEvent(run: Run, ev: FlowEvent): Transition {
  switch (ev.type) {
    case 'done': {
      if (ev.carry) run = { ...run, carry: ev.carry };
      const step = stepAt(run);
      if (step.kind === 'park') {
        if (run.parkLevel === null) throw new Error('Park hub is left via parkPick, not done');
        return go({ ...run, parkKeys: [...run.parkKeys, run.parkLevel], parkLevel: null });
      }
      if (step.kind === 'ending') return { run: null, route: { scene: 'Title' } };
      return go({ ...run, step: run.step + 1 });
    }
    case 'parkPick': {
      if (stepAt(run).kind !== 'park' || run.parkLevel !== null) throw new Error('Not in park hub');
      const { remaining, gateOpen } = parkOptions(run);
      if (ev.level === FINAL_LEVEL) {
        if (!gateOpen) throw new Error('Studio gate is locked');
        return go({ ...run, step: run.step + 1 });
      }
      if (!isParkLevel(ev.level) || !remaining.includes(ev.level)) {
        throw new Error(`Level ${ev.level} is not available in park`);
      }
      return go({ ...run, parkLevel: ev.level });
    }
    case 'gameOver':
      return { run, route: { scene: 'GameOver', canContinue: run.continuesLeft > 0 } };
    case 'continue':
      if (run.continuesLeft <= 0) throw new Error('No continues left');
      // С начала уровня: жизни — стартовые, сердца — полные; максимум сердец и таймкоды остаются.
      return go({
        ...run,
        continuesLeft: run.continuesLeft - 1,
        carry: run.carry.map((c) => ({
          ...c,
          vitals: { ...c.vitals, lives: BALANCE.startLives, hearts: c.vitals.maxHearts, invuln: 0 },
        })),
      });
    case 'quit':
      return { run: null, route: { scene: 'Title' } };
  }
}

/** Отладка (F3): прохождение, поставленное на начало уровня. Аттракционы парка — внутри хаба. */
export function runAtLevel(run: Run, level: LevelId): Run {
  if (isParkLevel(level)) {
    const step = STORY.findIndex((s) => s.kind === 'park');
    const parkKeys = PARK_LEVELS.filter((l) => l < level);
    return { ...run, step, parkLevel: level, parkKeys };
  }
  const step = STORY.findIndex((s) => s.kind === 'level' && s.level === level);
  if (step < 0) throw new Error(`Level ${level} is not in the story`);
  const parkKeys = level === FINAL_LEVEL ? [...PARK_LEVELS] : [];
  return { ...run, step, parkLevel: null, parkKeys };
}
