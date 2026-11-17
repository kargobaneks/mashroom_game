// Собирает карты уровней (Tiled JSON), тайлсеты арта, PNG-заглушку столкновений и иллюстрации
// кат-сцен.
// Запуск: npm run levels
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { encodePng, placeholderTileset } from './levels/lib.mjs';
import { L3_END } from './cutscenes/l3_end.mjs';
import { buildLevel1Hall } from './levels/level1_1.mjs';
import { buildLevel1Kitchen } from './levels/level1_2.mjs';
import { buildLevel1Sink } from './levels/level1_3.mjs';
import { buildLevel1Basement } from './levels/level1_4.mjs';
import { buildLevel2Server } from './levels/level2_1.mjs';
import { buildLevel2Arena } from './levels/level2_2.mjs';
import { buildLevel3Deck } from './levels/level3_1.mjs';
import { buildLevel3Hold } from './levels/level3_2.mjs';
import { buildLevel3Arena } from './levels/level3_3.mjs';
import { buildLevel4Fridge } from './levels/level4_1.mjs';
import { buildLevel5Warehouse } from './levels/level5_1.mjs';
import { buildLevel5Hall } from './levels/level5_2.mjs';
import { buildLevel5Arena } from './levels/level5_arena.mjs';
import { buildLevel6Tower } from './levels/level6_1.mjs';
import { buildLevel6Arena } from './levels/level6_arena.mjs';
import { buildLevel7Entrance } from './levels/level7_1.mjs';
import { buildLevel7Arena } from './levels/level7_arena.mjs';
import { buildLevel7Ride1, buildLevel7Ride2, buildLevel7Ride3 } from './levels/level7_ride.mjs';
import { buildLevel8Factory } from './levels/level8_1.mjs';
import { buildLevel8Folds } from './levels/level8_2.mjs';
import { buildLevel8Magnet } from './levels/level8_3.mjs';
import { buildLevel8Arena, buildLevel8Bonus } from './levels/level8_arena.mjs';
import { buildLevel9Conveyors } from './levels/level9_1.mjs';
import { buildLevel9Scaffold } from './levels/level9_2.mjs';
import { buildLevel9Press } from './levels/level9_3.mjs';
import { buildLevel9Cannons } from './levels/level9_4.mjs';
import { buildLevel9Danger } from './levels/level9_5.mjs';
import {
  buildLevel9Arena,
  buildLevel9Bonus,
  buildLevel9Escape,
  buildLevel9Simes,
} from './levels/level9_extra.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const levelsDir = join(root, 'src/data/levels');
const tilesetsDir = join(root, 'assets/tilesets');
const rel = (p) => relative(levelsDir, p).split('\\').join('/');

mkdirSync(tilesetsDir, { recursive: true });
const placeholderPath = join(tilesetsDir, 'placeholder.png');
writeFileSync(placeholderPath, placeholderTileset());

// Уровень 1 — четыре части, как в оригинале: зал, кухня, мойка, подвал с ареной.
const levels = {
  level1_1: buildLevel1Hall,
  level1_2: buildLevel1Kitchen,
  level1_3: buildLevel1Sink,
  level1_4: buildLevel1Basement,
  // Уровень 2 — серверная (вправо, спуск, вправо) и машинный зал с ареной.
  level2_1: buildLevel2Server,
  level2_2: buildLevel2Arena,
  // Уровень 3 — палуба, трюм (спуск и вправо) и шахта-арена Бордачёва.
  level3_1: buildLevel3Deck,
  level3_2: buildLevel3Hold,
  level3_3: buildLevel3Arena,
  // Уровень 4 — холодильник: одна часть (вправо, вверх, вправо, вверх), таймер 3:00, без босса.
  level4_1: buildLevel4Fridge,
  // Уровень 5 — склад (вправо, вверх, вправо к двери «22»), портретный зал, арена Микитко.
  level5_1: buildLevel5Warehouse,
  level5_2: buildLevel5Hall,
  level5_arena: buildLevel5Arena,
  // Уровень 6 — часовая башня: 13 экранов лесенкой (вправо, вверх, вправо, вверх, вправо).
  level6_1: buildLevel6Tower,
  level6_arena: buildLevel6Arena,
  // Уровень 7 — вход в шахту, три заезда на вагонетке (как в оригинале), арена Соболева и Луки.
  level7_1: buildLevel7Entrance,
  level7_2: buildLevel7Ride1,
  level7_3: buildLevel7Ride2,
  level7_4: buildLevel7Ride3,
  level7_arena: buildLevel7Arena,
  // Уровень 8 — завод с давящими блоками, складные платформы, бонус с Петровским, магнит
  // и механические псы, арена Маркова на кране (как в оригинале).
  level8_1: buildLevel8Factory,
  level8_2: buildLevel8Folds,
  level8_bonus: buildLevel8Bonus,
  level8_3: buildLevel8Magnet,
  level8_arena: buildLevel8Arena,
  // Уровень 9 — логово (как в оригинале): конвейеры, леса с птицами, бонус с Петровским,
  // лазерный пресс, коридор с пушками, коридор DANGER, приёмная с Саймсом, аппаратная
  // (Машина Конца Истории), побег (ТЗ).
  level9_1: buildLevel9Conveyors,
  level9_2: buildLevel9Scaffold,
  level9_bonus: buildLevel9Bonus,
  level9_3: buildLevel9Press,
  level9_4: buildLevel9Cannons,
  level9_5: buildLevel9Danger,
  level9_simes: buildLevel9Simes,
  level9_arena: buildLevel9Arena,
  level9_escape: buildLevel9Escape,
};
for (const [name, build] of Object.entries(levels)) {
  const artPath = join(tilesetsDir, `${name}.png`);
  const { json, artPng } = build().toTiled({
    placeholderImage: rel(placeholderPath),
    artImage: rel(artPath),
    artName: name,
  });
  writeFileSync(artPath, artPng);
  writeFileSync(join(levelsDir, `${name}.json`), JSON.stringify(json));
  console.log(`${name}: ${json.width}×${json.height}, art tiles: ${json.tilesets[1].tilecount}`);
}

// Иллюстрации кат-сцен (под текстовым окном).
const cutscenesDir = join(root, 'assets/cutscenes');
mkdirSync(cutscenesDir, { recursive: true });
for (const [name, draw] of Object.entries({ ...L3_END })) {
  const pix = draw();
  writeFileSync(join(cutscenesDir, `${name}.png`), encodePng(pix.w, pix.h, pix.data));
  console.log(`cutscene ${name}: ${pix.w}×${pix.h}`);
}
