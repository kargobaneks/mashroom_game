// Собирает карты уровней (Tiled JSON), тайлсеты арта и PNG-заглушку столкновений.
// Запуск: npm run levels
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { placeholderTileset } from './levels/lib.mjs';
import { buildLevel1Hall } from './levels/level1_1.mjs';
import { buildLevel1Kitchen } from './levels/level1_2.mjs';
import { buildLevel1Sink } from './levels/level1_3.mjs';
import { buildLevel1Basement } from './levels/level1_4.mjs';
import { buildLevel2Server } from './levels/level2_1.mjs';
import { buildLevel2Arena } from './levels/level2_2.mjs';

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
