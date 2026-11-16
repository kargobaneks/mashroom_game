import type { Point } from '../geom';
import { Asterisk } from './Asterisk';
import { Barista } from './Barista';
import { Bot } from './Bot';
import { Cable } from './Cable';
import { Crab } from './Crab';
import { Gull } from './Gull';
import { Headline } from './Headline';
import { Rigger } from './Rigger';
import type { Enemy, EnemyKind } from './Enemy';

const FACTORIES: Record<EnemyKind, (at: Point, spawnId: number) => Enemy> = {
  bot: (at, id) => new Bot(at, id),
  asterisk: (at, id) => new Asterisk(at, id),
  barista: (at, id) => new Barista(at, id),
  headline: (at, id) => new Headline(at, id),
  cable: (at, id) => new Cable(at, id),
  crab: (at, id) => new Crab(at, id),
  gull: (at, id) => new Gull(at, id),
  rigger: (at, id) => new Rigger(at, id),
};

export function isEnemyKind(k: string): k is EnemyKind {
  return k in FACTORIES;
}

export function createEnemy(kind: EnemyKind, at: Point, spawnId: number): Enemy {
  return FACTORIES[kind](at, spawnId);
}

export type { Enemy, EnemyKind };
