import { PICKUPS } from '../config/enemies';
import type { Point, Rect } from './geom';

export type PickupKind = keyof typeof PICKUPS;

export function isPickupKind(k: string): k is PickupKind {
  return k in PICKUPS;
}

/** Подбираемое: кружка кофе (+1 сердце), звезда-лайк (+1 жизнь), таймкод (счётчик). */
export class Pickup implements Rect {
  x: number;
  y: number;
  readonly w: number;
  readonly h: number;
  taken = false;

  constructor(
    readonly kind: PickupKind,
    at: Point,
    readonly spawnId: number,
  ) {
    this.w = PICKUPS[kind].width;
    this.h = PICKUPS[kind].height;
    this.x = at.x - this.w / 2;
    this.y = at.y - this.h;
  }
}
