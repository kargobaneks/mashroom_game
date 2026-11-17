import type { SpawnPoint } from '../level';
import { Asterisk } from './Asterisk';
import { Barista } from './Barista';
import { Bot } from './Bot';
import { Cable } from './Cable';
import { Candle } from './Candle';
import { CommentGhost } from './CommentGhost';
import { Crab } from './Crab';
import { Gull } from './Gull';
import { Headline } from './Headline';
import { Icicle } from './Icicle';
import { AmbushRat, Cannon, Laser, Nest } from './LairEnemies';
import { MechDog, SlingRat } from './FutureEnemies';
import { DiveMoth, Moth, Porcupine } from './MineCritters';
import { Bat, Boulder, Pendulum, SnakeBox } from './MineHazards';
import { Mole } from './Mole';
import { Phone } from './Phone';
import { Rat } from './Rat';
import { Rigger } from './Rigger';
import type { Enemy, EnemyKind } from './Enemy';

/** Точка появления: низ-центр и свойства точки на карте (длина луча, фаза). */
type At = Pick<SpawnPoint, 'x' | 'y' | 'h' | 'phase'>;

const FACTORIES: Record<EnemyKind, (at: At, spawnId: number) => Enemy> = {
  bot: (at, id) => new Bot(at, id),
  asterisk: (at, id) => new Asterisk(at, id),
  barista: (at, id) => new Barista(at, id),
  headline: (at, id) => new Headline(at, id),
  cable: (at, id) => new Cable(at, id),
  crab: (at, id) => new Crab(at, id),
  gull: (at, id) => new Gull(at, id),
  rigger: (at, id) => new Rigger(at, id),
  icicle: (at, id) => new Icicle(at, id),
  phone: (at, id) => new Phone(at, id),
  commentGhost: (at, id) => new CommentGhost(at, id),
  candle: (at, id) => new Candle(at, id),
  candleCeil: (at, id) => new Candle(at, id, true),
  mole: (at, id) => new Mole(at, id),
  rat: (at, id) => new Rat(at, id),
  boulder: (at, id) => new Boulder(at, id),
  pendulum: (at, id) => new Pendulum(at, id),
  bat: (at, id) => new Bat(at, id),
  snakeBox: (at, id) => new SnakeBox(at, id),
  porcupine: (at, id) => new Porcupine(at, id),
  moth: (at, id) => new Moth(at, id),
  diveMoth: (at, id) => new DiveMoth(at, id),
  slingRat: (at, id) => new SlingRat(at, id),
  mechDog: (at, id) => new MechDog(at, id),
  nest: (at, id) => new Nest(at, id),
  eggNest: (at, id) => new Nest(at, id, true),
  laser: (at, id) => new Laser(at, id),
  cannon: (at, id) => new Cannon(at, id),
  // Шар пушки появляется только из пушки; на карте его нет.
  cannonBall: () => {
    throw new Error('cannonBall is spawned by a cannon');
  },
  ambushRat: (at, id) => new AmbushRat(at, id),
  rubble: (at, id) => new Icicle(at, id, 'rubble'),
};

export function isEnemyKind(k: string): k is EnemyKind {
  return k in FACTORIES;
}

export function createEnemy(kind: EnemyKind, at: At, spawnId: number): Enemy {
  return FACTORIES[kind](at, spawnId);
}

export type { Enemy, EnemyKind };
