// Уровень 1, часть 1-3: «Мойка» (по структуре части 1-3 оригинала, своя обстановка).
//   • экраны 0–5 — вправо: чередуются духовки (верх — платформа, ступенька-стопка тарелок перед ней)
//     и стены с полками; боты и бариста по полу, звёздочки;
//   • экран 6 — большая раковина: вентиль у пола открывает воду, вода поднимается, всплывает
//     молочник-кораблик; на нём доплыть до высокого уступа с выходом. В воду упал — минус жизнь.
// Сетка 112 × 15.
import * as K from './kitchen-art.mjs';
import { placers } from './common.mjs';
import { MapBuilder, TILE } from './lib.mjs';

export function buildLevel1Sink() {
  const m = new MapBuilder(112, 15);
  const { stack, pair, enemy, tc } = placers(m);
  const FLOOR = 12; // y = 192
  const OVEN = 9; // верх духовки
  const SHELF_LOW = 10;
  const SHELF_HIGH = 8;

  m.paint((p) => K.sinkTiles(p, 0, 0, 112 * TILE, 15 * TILE, FLOOR * TILE));
  m.solid(0, 95, FLOOR, 14);
  m.solid(0, 0, 0, 11);
  m.solid(111, 111, 0, 14);

  // Духовки встроены в ряд тумб: тумба (на 32 выше пола) рядом с духовкой (на 48) — ступенька
  // на неё. Между рядами — стены с полками. Всё стоит где ему место.
  const COUNTER = FLOOR - 2; // верх тумбы
  const kitchenRow = (col) => {
    m.prop(K.counter(4), col, FLOOR);
    m.prop(K.oven, col + 4, FLOOR);
    m.prop(K.counter(4), col + 8, FLOOR);
  };
  const shelf = (col, w, load, row) => m.prop(K.shelf(w, load), col, row + 1);

  // ——— Экран 0 (0–15): ряд тумб с духовкой ———
  m.point('spawn', 1, FLOOR);
  m.point('respawn', 1, FLOOR);
  kitchenRow(3); // тумба 3–6, духовка 7–10, тумба 11–14
  pair(8, OVEN, 'timecode', 'timecode');
  shelf(11, 4, 'plates', SHELF_HIGH);
  tc(12, SHELF_HIGH);
  tc(13, SHELF_HIGH);

  // ——— Экран 1 (16–31): стена с полками ———
  shelf(18, 5, 'jars', SHELF_LOW);
  pair(19, SHELF_LOW);
  shelf(25, 4, 'pots', SHELF_HIGH);
  tc(26, SHELF_HIGH);
  tc(27, SHELF_HIGH);
  enemy('bot', 24, FLOOR);

  // ——— Экран 2 (32–47): ряд тумб с духовкой ———
  kitchenRow(33); // 33–36, 37–40, 41–44
  pair(34, COUNTER, null, 'timecode');
  tc(38, OVEN - 1);
  tc(39, OVEN - 2);
  enemy('asterisk', 40, 3);

  // ——— Экран 3 (48–63): стена с полками ———
  shelf(50, 5, 'plates', SHELF_LOW);
  pair(51, SHELF_LOW);
  shelf(57, 4, 'jars', SHELF_HIGH);
  tc(58, SHELF_HIGH);
  enemy('bot', 58, FLOOR);

  // ——— Экран 4 (64–79): ряд тумб с духовкой ———
  kitchenRow(65); // 65–68, 69–72, 73–76
  stack(67, COUNTER, 'timecode');
  tc(70, OVEN);
  tc(71, OVEN);
  enemy('asterisk', 72, 2);

  // ——— Экран 5 (80–95): бариста, кофе; в конце — тумба у борта огромной мойки ———
  pair(81, FLOOR, null, 'coffee');
  shelf(84, 4, 'pots', SHELF_LOW);
  tc(85, SHELF_LOW);
  enemy('barista', 88, FLOOR);
  m.prop(K.counter(4), 92, FLOOR); // 92–95, верх y = 160
  m.prop(K.plateStack(2), 95, COUNTER); // стопка тарелок — ступенька на борт (верх y = 128)
  tc(93, COUNTER);
  tc(94, COUNTER);

  // ——— Экран 6 (96–111): внутри огромной мойки ———
  // Герои размером с бурундука: весь экран — внутренность мойки. Через левый борт (y = 96)
  // спускаются на дно. На дне — вентиль и молочник; вентиль пускает воду из крана, мойка
  // наполняется, молочник всплывает. Выход — переливное отверстие в правом борту на уступе
  // (y = 128): со дна и с борта не достать, только с всплывшего молочника. Упал в воду — минус жизнь.
  const RIM = 6; // верх борта, y = 96
  const BOTTOM = 14; // дно, y = 224
  m.paint((p) => K.sinkInterior(p, 97 * TILE, 0, 14 * TILE, 15 * TILE, BOTTOM * TILE));
  m.decor(
    (p) => {
      K.sinkWall(p, 96 * TILE, RIM * TILE, TILE, (15 - RIM) * TILE);
      K.sinkWall(p, 111 * TILE, 0, TILE, 15 * TILE);
    },
    94 * TILE,
    112 * TILE,
  );
  m.solid(96, 96, RIM, 14); // левый борт
  m.solid(111, 111, 0, 14); // правый борт
  m.solid(97, 110, BOTTOM, BOTTOM); // дно
  // Кран и струя (струю рисует игра, пока вода прибывает).
  let spout = { x: 0, y: 0 };
  m.decor(
    (p) => {
      spout = K.faucet(p, 99 * TILE, TILE);
    },
    96 * TILE,
    104 * TILE,
  );
  m.zone('stream', spout.x, spout.y, 4, 4);
  // Вентиль на дне — у места, куда спускаются с борта; молочник лежит рядом на дне.
  m.decor((p) => K.valve(p, 98 * TILE, BOTTOM * TILE), 97 * TILE, 100 * TILE);
  m.zone('trigger', 98 * TILE, (BOTTOM - 2) * TILE, TILE, 2 * TILE);
  // Вода — до y = 144: чуть ниже уступа с выходом (y = 128), уступ остаётся сухим.
  const WATER_TOP = 9;
  m.zone('flood', 97 * TILE, WATER_TOP * TILE, 14 * TILE, (BOTTOM - WATER_TOP) * TILE);
  m.pointPx('floater', 105 * TILE, BOTTOM * TILE); // ближе к уступу с выходом
  // Уступ у переливного отверстия и выход.
  m.prop(K.shelf(4, 'plates'), 107, 9); // колонки 107–110, верх y = 128
  K.placeExitDoor(m, 109, 8);
  for (const r of [10, 12]) {
    tc(100, r);
    tc(106, r);
  }

  m.segment('right', 0, 0, 112 * TILE, 15 * TILE);
  return m;
}
