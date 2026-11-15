import level1HallArt from '../../../assets/tilesets/level1_1.png';
import level1KitchenArt from '../../../assets/tilesets/level1_2.png';
import level1SinkArt from '../../../assets/tilesets/level1_3.png';
import level1BasementArt from '../../../assets/tilesets/level1_4.png';
import type { LevelId } from '../../config/levels';
import type { TiledMap } from '../../sim/level';
import level1Hall from './level1_1.json';
import level1Kitchen from './level1_2.json';
import level1Sink from './level1_3.json';
import level1Basement from './level1_4.json';

/** Часть уровня: карта Tiled и тайлсет её арта. */
export interface LevelPart {
  readonly map: TiledMap;
  /** Имя тайлсета арта в карте Tiled и URL его картинки. */
  readonly artTileset: string;
  readonly artUrl: string;
}

/**
 * Готовые уровни: каждый — части по порядку (как в оригинале: уровень 1 — зал, кухня, мойка,
 * подвал с боссом). Уровни без карт пока идут заглушкой.
 */
export const LEVELS: Partial<Record<LevelId, readonly LevelPart[]>> = {
  1: [
    { map: level1Hall as TiledMap, artTileset: 'level1_1', artUrl: level1HallArt },
    { map: level1Kitchen as TiledMap, artTileset: 'level1_2', artUrl: level1KitchenArt },
    { map: level1Sink as TiledMap, artTileset: 'level1_3', artUrl: level1SinkArt },
    { map: level1Basement as TiledMap, artTileset: 'level1_4', artUrl: level1BasementArt },
  ],
};

export const artTextureKey = (tileset: string): string => `art-${tileset}`;

/** Индекс части с боссом (для F2). */
export function bossPartIndex(parts: readonly LevelPart[]): number {
  return parts.findIndex((p) =>
    p.map.layers.some(
      (l) =>
        l.name === 'camera' && l.objects?.some((o) => o.properties?.some((q) => q.name === 'boss')),
    ),
  );
}
