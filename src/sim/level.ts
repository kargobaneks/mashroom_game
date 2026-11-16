import type { Point, Rect } from './geom';
import { contains } from './geom';
import { TileGrid } from './TileGrid';

/**
 * Направление прокрутки сегмента камеры. lock — зафиксированный экран (арена босса);
 * rise — арена, где всё поднимается: камера сама опускается вдоль повторяющейся шахты.
 */
export type SegmentDir = 'right' | 'down' | 'up' | 'lock' | 'rise';

export interface Segment extends Rect {
  readonly dir: SegmentDir;
  /** Босс арены, если сегмент — арена. */
  readonly boss: string | null;
  /** Где возрождается игрок в этом сегменте (низ-центр). */
  readonly respawn: Point;
  /**
   * rise: период шахты, px. Камера, опустившись на столько, вместе со всем миром переносится
   * обратно вверх — шахта бесконечная.
   */
  readonly wrap?: number;
}

/** Точка появления сущности. Координата — низ-центр (ноги). */
export interface SpawnPoint extends Point {
  readonly id: number;
  readonly type: 'enemy' | 'item' | 'pickup' | 'bossPoint' | 'lift' | 'floater' | 'ammo' | 'melt';
  readonly kind: string;
  /** Для ящика: что под ним спрятано (появляется, когда ящик поднимают). */
  readonly contains?: string;
}

export interface Zone extends Rect {
  readonly kind: string;
}

export interface LevelData {
  readonly grid: TileGrid;
  readonly segments: readonly Segment[];
  readonly spawns: readonly SpawnPoint[];
  readonly zones: readonly Zone[];
  readonly playerStart: Point;
  /** Таймер части, кадры (свойство карты `timer`, в секундах); null — без таймера. */
  readonly timerFrames: number | null;
  /** Сплошной пол скользкий (свойство карты `slippery`). */
  readonly slippery: boolean;
  /** Свет то и дело гаснет (портретный зал уровня 5; свойство карты `flicker`). */
  readonly flicker: boolean;
}

// Минимальная схема Tiled JSON, которую мы читаем.
interface TiledProperty {
  name: string;
  value: unknown;
}
interface TiledObject {
  id: number;
  type?: string;
  class?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  point?: boolean;
  properties?: TiledProperty[];
}
interface TiledLayer {
  name: string;
  type: string;
  data?: number[];
  objects?: TiledObject[];
}
export interface TiledMap {
  properties?: TiledProperty[];
  width: number;
  height: number;
  tilewidth: number;
  layers: TiledLayer[];
}

function prop(o: TiledObject, name: string): unknown {
  return o.properties?.find((p) => p.name === name)?.value;
}

function objType(o: TiledObject): string {
  return o.type ?? o.class ?? '';
}

function layerMask(map: TiledMap, name: string): Uint8Array {
  const layer = map.layers.find((l) => l.name === name && l.type === 'tilelayer');
  const out = new Uint8Array(map.width * map.height);
  layer?.data?.forEach((gid, i) => {
    if (gid !== 0) out[i] = 1;
  });
  return out;
}

function objects(map: TiledMap, name: string): TiledObject[] {
  return map.layers.find((l) => l.name === name && l.type === 'objectgroup')?.objects ?? [];
}

const SEGMENT_DIRS: readonly SegmentDir[] = ['right', 'down', 'up', 'lock', 'rise'];
const SPAWN_TYPES: readonly SpawnPoint['type'][] = [
  'enemy',
  'item',
  'pickup',
  'bossPoint',
  'lift',
  'floater',
  'ammo',
  'melt',
];

/** Разобрать карту Tiled: слои solid / oneway / hazard, objects и camera. */
export function parseTiledLevel(map: TiledMap): LevelData {
  const grid = new TileGrid(
    map.width,
    map.height,
    map.tilewidth,
    layerMask(map, 'solid'),
    layerMask(map, 'oneway'),
    layerMask(map, 'hazard'),
  );

  const objs = objects(map, 'objects');
  const respawns = objs.filter((o) => objType(o) === 'respawn');
  const start = objs.find((o) => objType(o) === 'spawn');
  if (!start) throw new Error('Level has no player spawn');

  const segments: Segment[] = objects(map, 'camera').map((o) => {
    const dir = prop(o, 'dir');
    if (typeof dir !== 'string' || !(SEGMENT_DIRS as readonly string[]).includes(dir)) {
      throw new Error(`Camera segment ${o.id}: bad dir ${String(dir)}`);
    }
    const rect = { x: o.x, y: o.y, w: o.width, h: o.height };
    const rp = respawns.find((r) => contains(rect, r));
    const boss = prop(o, 'boss');
    const wrap = prop(o, 'wrap');
    return {
      ...rect,
      dir: dir as SegmentDir,
      boss: typeof boss === 'string' ? boss : null,
      respawn: rp ? { x: rp.x, y: rp.y } : { x: rect.x + 32, y: rect.y + rect.h / 2 },
      ...(typeof wrap === 'number' ? { wrap } : {}),
    };
  });
  if (segments.length === 0) throw new Error('Level has no camera segments');

  const spawns: SpawnPoint[] = [];
  const zones: Zone[] = [];
  for (const o of objs) {
    const type = objType(o);
    if (type === 'zone') {
      zones.push({ kind: String(prop(o, 'kind') ?? ''), x: o.x, y: o.y, w: o.width, h: o.height });
    } else if ((SPAWN_TYPES as readonly string[]).includes(type)) {
      const hidden = prop(o, 'contains');
      spawns.push({
        id: o.id,
        type: type as SpawnPoint['type'],
        kind: String(prop(o, 'kind') ?? ''),
        x: o.x,
        y: o.y,
        ...(typeof hidden === 'string' ? { contains: hidden } : {}),
      });
    }
  }

  const mapProp = (name: string) => map.properties?.find((p) => p.name === name)?.value;
  const timer = mapProp('timer');
  return {
    grid,
    segments,
    spawns,
    zones,
    playerStart: { x: start.x, y: start.y },
    timerFrames: typeof timer === 'number' && timer > 0 ? timer * 60 : null,
    slippery: Boolean(mapProp('slippery')),
    flicker: Boolean(mapProp('flicker')),
  };
}
