// Мини-DSL для сборки карт в формате Tiled JSON. Координаты — в тайлах, если не сказано иное.
import { deflateSync } from 'node:zlib';
import { Pix } from './pixels.mjs';

export const TILE = 16;
/** gid тайлов в тайлсете-заглушке: solid, oneway, hazard. */
export const GID = { solid: 1, oneway: 2, hazard: 3 };

export class MapBuilder {
  constructor(cols, rows) {
    this.cols = cols;
    this.rows = rows;
    this.layers = {
      solid: new Array(cols * rows).fill(0),
      oneway: new Array(cols * rows).fill(0),
      hazard: new Array(cols * rows).fill(0),
    };
    this.objects = [];
    this.camera = [];
    /** Свойства карты (таймер, скользкий пол…). */
    this.properties = {};
    this.nextId = 1;
    /** Арт уровня (фон и мебель) — один большой холст, потом режется на тайлы. */
    this.art = new Pix(cols * TILE, rows * TILE);
  }

  /** Рисовать фон прямо на холсте арта: fn(pix). Без контура — фон должен быть тихим. */
  paint(fn) {
    fn(this.art);
  }

  /**
   * Нарисовать предмет переднего плана с чёрным контуром: fn(pix) рисует на отдельном слое
   * размером с карту, слой обводится и кладётся поверх фона. x0, x1 — горизонтальные границы
   * рисунка в px (чтобы не обводить всю карту).
   */
  decor(fn, x0 = 0, x1 = this.art.w) {
    const left = Math.max(0, Math.floor(x0) - 2);
    const right = Math.min(this.art.w, Math.ceil(x1) + 2);
    const layer = new Pix(right - left, this.art.h);
    const shifted = new Proxy(layer, {
      get(target, prop) {
        const v = target[prop];
        if (typeof v !== 'function') return v;
        // Методы рисования получают координаты карты — сдвигаем x на левую границу слоя.
        if (prop === 'set') return (x, y, c) => target.set(x - left, y, c);
        return v.bind(shifted);
      },
    });
    fn(shifted);
    layer.outline();
    layer.blitOnto(this.art, left, 0);
  }

  /**
   * Поставить предмет мебели: def = { w, h (в тайлах), draw(pix, x, y), collide(m, col, top) }.
   * floorRow — строка, на верх которой предмет опирается.
   */
  prop(def, col, floorRow) {
    const top = floorRow - def.h;
    const pad = 48; // ручки, пар, маркизы и т. п. выходят за габарит предмета
    this.decor(
      (p) => def.draw(p, col * TILE, top * TILE),
      col * TILE - pad,
      (col + def.w) * TILE + pad,
    );
    def.collide(this, col, top);
    return top;
  }

  set(layer, tx, ty, on = true) {
    if (tx < 0 || ty < 0 || tx >= this.cols || ty >= this.rows)
      throw new Error(`tile out of map: ${tx},${ty}`);
    this.layers[layer][ty * this.cols + tx] = on ? GID[layer] : 0;
  }

  /** Залить прямоугольник [x0..x1] × [y0..y1] включительно. */
  fill(layer, x0, x1, y0, y1, on = true) {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) this.set(layer, x, y, on);
  }

  solid(x0, x1, y0, y1 = y0) {
    this.fill('solid', x0, x1, y0, y1);
  }

  clear(x0, x1, y0, y1 = y0) {
    this.fill('solid', x0, x1, y0, y1, false);
  }

  oneway(x0, x1, y) {
    this.fill('oneway', x0, x1, y, y);
  }

  hazard(x0, x1, y) {
    this.fill('hazard', x0, x1, y, y);
  }

  /** Точка: низ-центр тайла col, стоящего на поверхности row (ноги на y = row*16). */
  point(type, col, row, props = {}) {
    this.objects.push(
      obj(this.nextId++, type, col * TILE + TILE / 2, row * TILE, 0, 0, props, true),
    );
  }

  /** Точка в пикселях. */
  pointPx(type, x, y, props = {}) {
    this.objects.push(obj(this.nextId++, type, x, y, 0, 0, props, true));
  }

  zone(kind, x, y, w, h) {
    this.objects.push(obj(this.nextId++, 'zone', x, y, w, h, { kind }, false));
  }

  /** Сегмент камеры, в пикселях. */
  segment(dir, x, y, w, h, props = {}) {
    this.camera.push(obj(this.nextId++, 'segment', x, y, w, h, { dir, ...props }, false));
  }

  /**
   * Собрать карту Tiled. Слой art — арт уровня из уникальных тайлов (тайлсет artName);
   * solid / oneway / hazard — столкновения на тайлсете-заглушке (в игре невидимы, F4 — показать).
   * Возвращает { json, artPng }.
   */
  toTiled({ placeholderImage, artImage, artName }) {
    const { gids, png, count, columns } = this.buildArtTileset();
    const tileLayer = (id, name, data, visible = true) => ({
      id,
      name,
      type: 'tilelayer',
      width: this.cols,
      height: this.rows,
      x: 0,
      y: 0,
      opacity: 1,
      visible,
      data,
    });
    const objLayer = (id, name, objects) => ({
      id,
      name,
      type: 'objectgroup',
      draworder: 'topdown',
      x: 0,
      y: 0,
      opacity: 1,
      visible: true,
      objects,
    });
    const ART_FIRSTGID = 5;
    const json = {
      type: 'map',
      version: '1.10',
      tiledversion: '1.11.0',
      orientation: 'orthogonal',
      renderorder: 'right-down',
      width: this.cols,
      height: this.rows,
      tilewidth: TILE,
      tileheight: TILE,
      infinite: false,
      ...(Object.keys(this.properties).length > 0
        ? {
            properties: Object.entries(this.properties).map(([name, value]) => ({
              name,
              type:
                typeof value === 'number' ? 'int' : typeof value === 'boolean' ? 'bool' : 'string',
              value,
            })),
          }
        : {}),
      nextlayerid: 7,
      nextobjectid: this.nextId,
      tilesets: [
        {
          firstgid: 1,
          name: 'placeholder',
          image: placeholderImage,
          imagewidth: TILE * 4,
          imageheight: TILE,
          tilewidth: TILE,
          tileheight: TILE,
          tilecount: 4,
          columns: 4,
          margin: 0,
          spacing: 0,
        },
        {
          firstgid: ART_FIRSTGID,
          name: artName,
          image: artImage,
          imagewidth: columns * TILE,
          imageheight: Math.ceil(count / columns) * TILE,
          tilewidth: TILE,
          tileheight: TILE,
          tilecount: count,
          columns,
          margin: 0,
          spacing: 0,
        },
      ],
      layers: [
        tileLayer(
          6,
          'art',
          gids.map((g) => (g === 0 ? 0 : g + ART_FIRSTGID - 1)),
        ),
        tileLayer(1, 'solid', this.layers.solid),
        tileLayer(2, 'oneway', this.layers.oneway),
        tileLayer(3, 'hazard', this.layers.hazard),
        objLayer(4, 'objects', this.objects),
        objLayer(5, 'camera', this.camera),
      ],
    };
    return { json, artPng: png };
  }

  /** Разрезать холст арта на тайлы, одинаковые склеить. gids: 0 — пусто, иначе 1..count. */
  buildArtTileset() {
    const keys = new Map();
    const order = [];
    const gids = new Array(this.cols * this.rows).fill(0);
    for (let ty = 0; ty < this.rows; ty++) {
      for (let tx = 0; tx < this.cols; tx++) {
        if (this.art.tileIsEmpty(tx, ty, TILE)) continue;
        const k = this.art.tileKey(tx, ty, TILE);
        let id = keys.get(k);
        if (id === undefined) {
          order.push([tx, ty]);
          id = order.length;
          keys.set(k, id);
        }
        gids[ty * this.cols + tx] = id;
      }
    }
    const columns = 16;
    const count = Math.max(1, order.length);
    const sheet = new Pix(columns * TILE, Math.ceil(count / columns) * TILE);
    order.forEach(([tx, ty], i) =>
      this.art.copyTile(tx, ty, TILE, sheet, (i % columns) * TILE, Math.floor(i / columns) * TILE),
    );
    return { gids, png: encodePng(sheet.w, sheet.h, sheet.data), count, columns };
  }
}

function obj(id, type, x, y, width, height, props, point) {
  const o = {
    id,
    name: '',
    type,
    x,
    y,
    width,
    height,
    rotation: 0,
    visible: true,
    properties: Object.entries(props).map(([name, value]) => ({
      name,
      type: typeof value === 'number' ? 'int' : 'string',
      value,
    })),
  };
  if (point) o.point = true;
  return o;
}

// ——— PNG-заглушка тайлсета: 4 тайла 16×16 (solid, oneway, hazard, запас) ———

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
export function encodePng(width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0;
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** Цвета заглушек — из палитры NES. */
export function placeholderTileset() {
  const W = TILE * 4,
    H = TILE;
  const px = Buffer.alloc(W * H * 4);
  const put = (x, y, [r, g, b], a = 255) => {
    const i = (y * W + x) * 4;
    px[i] = r;
    px[i + 1] = g;
    px[i + 2] = b;
    px[i + 3] = a;
  };
  for (let y = 0; y < H; y++)
    for (let x = 0; x < TILE; x++) {
      // solid: серый кирпич с рамкой
      const edge = x === 0 || y === 0 || x === TILE - 1 || y === TILE - 1;
      put(
        x,
        y,
        edge
          ? [0x50, 0x30, 0x00]
          : y === 8 || (x === 8 && y < 8) || (x === 0 && y > 8)
            ? [0x50, 0x30, 0x00]
            : [0x88, 0x70, 0x00],
      );
      // oneway: полка — толстая доска сверху
      if (y < 4) put(TILE + x, y, y === 0 ? [0xfc, 0xd8, 0xa8] : [0xac, 0x7c, 0x00]);
      else put(TILE + x, y, [0, 0, 0], 0);
      // hazard: красные шипы
      const spike = y >= 8 && Math.abs((x % 8) - 3.5) <= (y - 8) / 2 + 0.5;
      put(2 * TILE + x, y, spike ? [0xd8, 0x28, 0x00] : [0, 0, 0], spike ? 255 : 0);
      put(3 * TILE + x, y, [0, 0, 0], 0);
    }
  return encodePng(W, H, px);
}
