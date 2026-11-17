import level1HallArt from '../../../assets/tilesets/level1_1.png';
import level1KitchenArt from '../../../assets/tilesets/level1_2.png';
import level1SinkArt from '../../../assets/tilesets/level1_3.png';
import level1BasementArt from '../../../assets/tilesets/level1_4.png';
import level2ServerArt from '../../../assets/tilesets/level2_1.png';
import level2ArenaArt from '../../../assets/tilesets/level2_2.png';
import level3DeckArt from '../../../assets/tilesets/level3_1.png';
import level3HoldArt from '../../../assets/tilesets/level3_2.png';
import level3ArenaArt from '../../../assets/tilesets/level3_3.png';
import level4FridgeArt from '../../../assets/tilesets/level4_1.png';
import level5WarehouseArt from '../../../assets/tilesets/level5_1.png';
import level5HallArt from '../../../assets/tilesets/level5_2.png';
import level5ArenaArt from '../../../assets/tilesets/level5_arena.png';
import level6TowerArt from '../../../assets/tilesets/level6_1.png';
import level6ArenaArt from '../../../assets/tilesets/level6_arena.png';
import level7EntranceArt from '../../../assets/tilesets/level7_1.png';
import level7Ride1Art from '../../../assets/tilesets/level7_2.png';
import level7Ride2Art from '../../../assets/tilesets/level7_3.png';
import level7Ride3Art from '../../../assets/tilesets/level7_4.png';
import level7ArenaArt from '../../../assets/tilesets/level7_arena.png';
import level8FactoryArt from '../../../assets/tilesets/level8_1.png';
import level8FoldsArt from '../../../assets/tilesets/level8_2.png';
import level8BonusArt from '../../../assets/tilesets/level8_bonus.png';
import level8MagnetArt from '../../../assets/tilesets/level8_3.png';
import level8ArenaArt from '../../../assets/tilesets/level8_arena.png';
import type { LevelId } from '../../config/levels';
import type { TiledMap } from '../../sim/level';
import level1Hall from './level1_1.json';
import level1Kitchen from './level1_2.json';
import level1Sink from './level1_3.json';
import level1Basement from './level1_4.json';
import level2Server from './level2_1.json';
import level2Arena from './level2_2.json';
import level3Deck from './level3_1.json';
import level3Hold from './level3_2.json';
import level3Arena from './level3_3.json';
import level4Fridge from './level4_1.json';
import level5Warehouse from './level5_1.json';
import level5Hall from './level5_2.json';
import level5Arena from './level5_arena.json';
import level6Tower from './level6_1.json';
import level6Arena from './level6_arena.json';
import level7Entrance from './level7_1.json';
import level7Ride1 from './level7_2.json';
import level7Ride2 from './level7_3.json';
import level7Ride3 from './level7_4.json';
import level7Arena from './level7_arena.json';
import level8Factory from './level8_1.json';
import level8Folds from './level8_2.json';
import level8Bonus from './level8_bonus.json';
import level8Magnet from './level8_3.json';
import level8Arena from './level8_arena.json';

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
  2: [
    { map: level2Server as TiledMap, artTileset: 'level2_1', artUrl: level2ServerArt },
    { map: level2Arena as TiledMap, artTileset: 'level2_2', artUrl: level2ArenaArt },
  ],
  3: [
    { map: level3Deck as TiledMap, artTileset: 'level3_1', artUrl: level3DeckArt },
    { map: level3Hold as TiledMap, artTileset: 'level3_2', artUrl: level3HoldArt },
    { map: level3Arena as TiledMap, artTileset: 'level3_3', artUrl: level3ArenaArt },
  ],
  // Холодильник: одна часть, босса нет (как в оригинале).
  4: [{ map: level4Fridge as TiledMap, artTileset: 'level4_1', artUrl: level4FridgeArt }],
  // Архив: склад → портретный зал (Петровский) → арена Микитко.
  5: [
    { map: level5Warehouse as TiledMap, artTileset: 'level5_1', artUrl: level5WarehouseArt },
    { map: level5Hall as TiledMap, artTileset: 'level5_2', artUrl: level5HallArt },
    { map: level5Arena as TiledMap, artTileset: 'level5_arena', artUrl: level5ArenaArt },
  ],
  // Часовая башня: 13 экранов лесенкой → арена Щелина.
  6: [
    { map: level6Tower as TiledMap, artTileset: 'level6_1', artUrl: level6TowerArt },
    { map: level6Arena as TiledMap, artTileset: 'level6_arena', artUrl: level6ArenaArt },
  ],
  // Салун: вход в шахту → три заезда на вагонетке (как в оригинале) → арена Соболева и Луки.
  7: [
    { map: level7Entrance as TiledMap, artTileset: 'level7_1', artUrl: level7EntranceArt },
    { map: level7Ride1 as TiledMap, artTileset: 'level7_2', artUrl: level7Ride1Art },
    { map: level7Ride2 as TiledMap, artTileset: 'level7_3', artUrl: level7Ride2Art },
    { map: level7Ride3 as TiledMap, artTileset: 'level7_4', artUrl: level7Ride3Art },
    { map: level7Arena as TiledMap, artTileset: 'level7_arena', artUrl: level7ArenaArt },
  ],
  // Нейросеть (Мир будущего): завод → складные платформы → бонус с Петровским → магнит и псы
  // → арена Маркова на кране (как в оригинале).
  8: [
    { map: level8Factory as TiledMap, artTileset: 'level8_1', artUrl: level8FactoryArt },
    { map: level8Folds as TiledMap, artTileset: 'level8_2', artUrl: level8FoldsArt },
    { map: level8Bonus as TiledMap, artTileset: 'level8_bonus', artUrl: level8BonusArt },
    { map: level8Magnet as TiledMap, artTileset: 'level8_3', artUrl: level8MagnetArt },
    { map: level8Arena as TiledMap, artTileset: 'level8_arena', artUrl: level8ArenaArt },
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
