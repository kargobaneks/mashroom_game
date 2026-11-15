import type { Point } from '../geom';
import { Asterisk } from './Asterisk';
import { Barista } from './Barista';
import { Bot } from './Bot';
import type { Enemy, EnemyKind } from './Enemy';

const FACTORIES: Record<EnemyKind, (at: Point, spawnId: number) => Enemy> = {
  bot: (at, id) => new Bot(at, id),
  asterisk: (at, id) => new Asterisk(at, id),
  barista: (at, id) => new Barista(at, id),
};

export function isEnemyKind(k: string): k is EnemyKind {
  return k in FACTORIES;
}

export function createEnemy(kind: EnemyKind, at: Point, spawnId: number): Enemy {
  return FACTORIES[kind](at, spawnId);
}

export type { Enemy, EnemyKind };
