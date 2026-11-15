/**
 * Пиксель-арт врагов, предметов, подбираемого, снарядов и боссов — данными (ТЗ: «Ассеты и стиль»).
 * Каждый спрайт — не больше 3 цветов из палитры NES плюс прозрачный '.'. Буквы в кадрах —
 * ключи палитры спрайта. Смотрят вправо, влево — зеркально. Размер кадра = хитбокс сущности.
 * Чистый модуль; атлас собирает render/spriteAtlas.ts.
 */

export interface SpriteDef {
  readonly w: number;
  readonly h: number;
  readonly palette: Readonly<Record<string, number>>;
  readonly frames: Readonly<Record<string, readonly string[]>>;
}

/** Симметричный кадр: левые половины строк + их зеркало. */
function mirror(lefts: readonly string[]): string[] {
  return lefts.map((l) => l + [...l].reverse().join(''));
}

/** Заменить пиксели: [x, y, символ]. */
function patch(
  rows: readonly string[],
  pixels: readonly (readonly [number, number, string])[],
): string[] {
  const g = rows.map((r) => [...r]);
  for (const [x, y, c] of pixels) {
    const row = g[y];
    if (row && x >= 0 && x < row.length) row[x] = c;
  }
  return g.map((r) => r.join(''));
}

// ——— Враги ———

const BOT_TOP = [
  '......D.........',
  '......D.........',
  '..DDDDDDDDDDDD..',
  '..DMMMMMMMMMMD..',
  '..DMLLLLLLLLMD..',
  '..DMLLDLDLDLMD..',
  '..DMLLLLLLLLMD..',
  '..DMMMMMMMMMMD..',
  '..DDDDDDDDDDDD..',
  '.....DMMMMD.....',
  '....DMMMMMMD....',
  '...DMMMDDMMMD...',
  '....DMMMMMMD....',
  '.....DDDDDD.....',
];

/** Бот-комментатор: экран с «…» вместо лица, ходит стаей. */
const bot: SpriteDef = {
  w: 16,
  h: 16,
  palette: { D: 0x000000, M: 0x7c7c7c, L: 0xf87858 },
  frames: {
    walk1: [...BOT_TOP, '.....DD..DD.....', '....DDD..DDD....'],
    walk2: [...BOT_TOP, '......DDDD......', '.....DDD.DDD....'],
  },
};

const ASTERISK_A = [
  '...L....',
  '.L.L.L..',
  '..LLL...',
  'LLLDLLL.',
  '..LLL...',
  '.L.L.L..',
  '...L....',
  '........',
];
const ASTERISK_B = [
  'L.....L.',
  '.L...L..',
  '..LLL...',
  '..LDL...',
  '..LLL...',
  '.L...L..',
  'L.....L.',
  '........',
];

/** Звёздочка-сноска: крутится. */
const asterisk: SpriteDef = {
  w: 8,
  h: 8,
  palette: { L: 0xfcfcfc, D: 0xd82800 },
  frames: { spin1: ASTERISK_A, spin2: ASTERISK_B },
};

const BARISTA_TOP = [
  '....DDDDDDDD....',
  '....DMMMMMMD....',
  '....DMLLLLMD....',
  '....DMLDDLMD....',
  '....DMMMMMMD....',
  '...DDDDDDDDDD...',
  '...DMMMMMMMMD...',
  '...DMMMMMMMMDDD.',
  '...DMMMMMMMMD.D.',
  '...DMMLLLLMMD...',
  '...DMMLLLLMMD...',
  '...DDDDDDDDDD...',
  '......DDDD......',
];

/** Бариста-бот: кофемашина на колёсике, носик — вперёд. */
const barista: SpriteDef = {
  w: 16,
  h: 16,
  palette: { D: 0x000000, M: 0x881400, L: 0xfcd8a8 },
  frames: {
    roll1: [...BARISTA_TOP, '.....DLLLLD.....', '.....DLDDLD.....', '......DDDD......'],
    roll2: [...BARISTA_TOP, '.....DLDDLD.....', '.....DLLLLD.....', '......DDDD......'],
  },
};

// ——— Предметы ———

/** Коробка с реквизитом: картон, скотч, наклейка. */
const box: SpriteDef = {
  w: 16,
  h: 16,
  palette: { D: 0x503000, M: 0xfca044, L: 0xfcd8a8 },
  frames: {
    idle: [
      'DDDDDDDDDDDDDDDD',
      'DMMMMMMLLMMMMMMD',
      'DMMMMMMLLMMMMMMD',
      'DMMMMMMLLMMMMMMD',
      'DMMMMMMLLMMMMMMD',
      'DDDDDDDLLDDDDDDD',
      'DMMMMMMMMMMMMMMD',
      'DMMMMMMMMMMMMMMD',
      'DMMMMMMMMMMMMMMD',
      'DMMLLLLMMMMMMMMD',
      'DMMLDDLMMMMMMMMD',
      'DMMLLLLMMMMMMMMD',
      'DMMMMMMMMMMMMMMD',
      'DMMMMMMMMMMMMMMD',
      'DMMMMMMMMMMMMMMD',
      'DDDDDDDDDDDDDDDD',
    ],
  },
};

/** Кейс с аппаратурой: металл, уголки, ручка, замок. */
const flightCase: SpriteDef = {
  w: 16,
  h: 16,
  palette: { D: 0x000000, M: 0xbcbcbc, L: 0xfcfcfc },
  frames: {
    idle: [
      'DDDDDDDDDDDDDDDD',
      'DLLDMMMMMMMMDLLD',
      'DLDMMMMMMMMMMDLD',
      'DDMMMMMMMMMMMMDD',
      'DMMMMMDDDDMMMMMD',
      'DMMMMMDMMDMMMMMD',
      'DMMMMMMMMMMMMMMD',
      'DDDDDDDDDDDDDDDD',
      'DMMMMMMMMMMMMMMD',
      'DMMMMMMDDMMMMMMD',
      'DMMMMMMDDMMMMMMD',
      'DMMMMMMMMMMMMMMD',
      'DDMMMMMMMMMMMMDD',
      'DLDMMMMMMMMMMDLD',
      'DLLDMMMMMMMMDLLD',
      'DDDDDDDDDDDDDDDD',
    ],
  },
};

// ——— Подбираемое ———

const COFFEE = [
  '..L..L....',
  '...L..L...',
  '.DDDDDDD..',
  '.DMMMMMD..',
  '.DLLLLLDDD',
  '.DLLLLLD.D',
  '.DLLLLLD.D',
  '.DLLLLLDDD',
  '.DLLLLLD..',
  '..DDDDD...',
];

/** Кружка кофе (+1 сердце): пар колышется. */
const coffee: SpriteDef = {
  w: 10,
  h: 10,
  palette: { D: 0x000000, L: 0xfcfcfc, M: 0x881400 },
  frames: {
    a: COFFEE,
    b: patch(COFFEE, [
      [2, 0, '.'],
      [3, 0, 'L'],
      [5, 0, '.'],
      [6, 0, 'L'],
      [3, 1, '.'],
      [2, 1, 'L'],
      [6, 1, '.'],
      [5, 1, 'L'],
    ]),
  },
};

const STAR = [
  '....LL....',
  '....LL....',
  '...LMML...',
  'LLLLMMLLLL',
  '.LMMMMMML.',
  '..LMMMML..',
  '..LMMMML..',
  '.LML..LML.',
  '.LL....LL.',
  '..........',
];

/** Звезда-лайк (+1 жизнь): мерцает. */
const star: SpriteDef = {
  w: 10,
  h: 10,
  palette: { L: 0xf8b800, M: 0xf8d878, W: 0xfcfcfc },
  frames: { a: STAR, b: STAR.map((r) => r.replace(/M/g, 'W')) },
};

const CLOCK = [
  '..DDDD..',
  '.DLLLLD.',
  'DLLDLLLD',
  'DLLDLLLD',
  'DLLDDDLD',
  'DLLLLLLD',
  '.DLLLLD.',
  '..DDDD..',
];

/** Таймкод: циферблат, обод мерцает. */
const timecode: SpriteDef = {
  w: 8,
  h: 8,
  palette: { D: 0x0058f8, L: 0xfcfcfc, B: 0x3cbcfc },
  frames: { a: CLOCK, b: CLOCK.map((r) => r.replace(/D/g, 'B')) },
};

// ——— Снаряды ———

const DROP = ['..LL..', '.LLLL.', 'LLLLLL', 'LLMMLL', '.LLLL.', '..LL..'];

const latte: SpriteDef = {
  w: 6,
  h: 6,
  palette: { L: 0xfcd8a8, M: 0xac7c00 },
  frames: { idle: DROP },
};
const stream: SpriteDef = {
  w: 6,
  h: 6,
  palette: { L: 0xfcfcfc, M: 0xfcd8a8 },
  frames: { idle: DROP },
};
const paintball: SpriteDef = {
  w: 5,
  h: 5,
  palette: { M: 0xf878f8, L: 0xfcfcfc },
  frames: { idle: ['.MMM.', 'MLMMM', 'MMMMM', 'MMMMM', '.MMM.'] },
};

// ——— Босс 1: Агранович ———

/**
 * Молодая стройная девушка. Карикатура на 2 детали: аккуратный пучок с прядями у лица и тонкие
 * круглые очки; чёрное приталенное платье с рюшами на воротнике и лентой-завязкой.
 * Перед выстрелом поправляет очки рукой — это её «знак» атаки. Образ утверждает сама Екатерина (ТЗ).
 */
const AGRANOVICH_BASE = mirror([
  '................',
  '..............HH',
  '.............HHH',
  '..............HH',
  '...........HHHHH',
  '..........HHHHHH',
  '.........HHHHHHH',
  '.........HHHHHHS',
  '.........HHHSSSS',
  '........HHHSSSSS',
  '........HHSSSSSS',
  '........HHSDDDDD',
  '........HHSDDSDS',
  '........HHSDSSDS',
  '........HHSSDDSS',
  '........HHSSSSSS',
  '.........HSSSSSD',
  '...........SSSSS',
  '............DDDD',
  '...........DDDDS',
  '..........DDDDSD',
  '.........DDDDDSD',
  '.........SDDDDDD',
  '.........SDDDDDD',
  '..........SDDDDD',
  '...........DDDDD',
  '..........DDDDDD',
  '.........DDDDDDD',
  '.........DDDDDDD',
  '.............SS.',
  '.............SS.',
  '.............DD.',
]);

/** Глаза закрыты: зрачков нет, вместо них — линия ресниц. */
const AGRANOVICH_EYES_CLOSED = patch(AGRANOVICH_BASE, [
  [12, 12, 'S'],
  [19, 12, 'S'],
  [12, 13, 'D'],
  [13, 13, 'D'],
  [18, 13, 'D'],
  [19, 13, 'D'],
]);

/** Поза с портрета: левая рука закинута за голову, кисть у пучка. */
const AGRANOVICH_HAND_IN_HAIR = patch(AGRANOVICH_BASE, [
  // Опущенная левая рука убрана.
  [9, 22, '.'],
  [9, 23, '.'],
  [10, 24, '.'],
  // Рукав у плеча, плечо вверх снаружи причёски, локоть над головой, кисть на пучке.
  [8, 20, 'D'],
  [9, 20, 'D'],
  [8, 19, 'D'],
  ...[10, 11, 12, 13, 14, 15, 16, 17, 18].map((y) => [7, y, 'S'] as const),
  [7, 9, 'S'],
  [7, 8, 'S'],
  [8, 7, 'S'],
  [8, 6, 'S'],
  [9, 5, 'S'],
  [10, 4, 'S'],
  [11, 4, 'S'],
  [12, 3, 'S'],
]);

/** Перед выстрелом: вторая рука поправляет очки — как на фото. */
const AGRANOVICH_AIM = patch(AGRANOVICH_HAND_IN_HAIR, [
  // Опущенная правая рука убрана.
  [22, 22, '.'],
  [22, 23, '.'],
  [21, 24, '.'],
  // Кисть у края очков.
  [21, 11, 'S'],
  [22, 11, 'S'],
  [23, 11, 'S'],
  [22, 12, 'S'],
  [23, 12, 'S'],
  // Предплечье вниз-наружу, локоть, короткий рукав у плеча.
  ...[13, 14, 15, 16, 17, 18].map((y) => [24, y, 'S'] as const),
  [23, 19, 'D'],
  [24, 19, 'D'],
  [22, 20, 'D'],
  [23, 20, 'D'],
]);

const agranovich: SpriteDef = {
  w: 32,
  h: 32,
  palette: { D: 0x000000, S: 0xfcbcb0, H: 0xac7c00 },
  frames: {
    idle: AGRANOVICH_HAND_IN_HAIR,
    aim: AGRANOVICH_AIM,
    hit: AGRANOVICH_EYES_CLOSED,
  },
};

// ——— Механизмы ———

/** Помпа-дозатор на бутылке сиропа (лифт): носик и шток. */
const pump: SpriteDef = {
  w: 24,
  h: 8,
  palette: { D: 0x000000, M: 0xbcbcbc, L: 0xfcfcfc },
  frames: {
    idle: [
      'DDDDDDDDDDDDDDDDDDDDDDDD',
      'DLLLLLLLLLLLLLLLLLLLLLLD',
      'DMMMMMMMMMMMMMMMMMMMMMMD',
      'DDDDDDDDDDDDDDDDDDDDDDDD',
      '.........DMMMMD.........',
      '.........DMMMMD.........',
      '.........DMMMMD.........',
      '.........DMMMMD.........',
    ],
  },
};

/** Молочник-кораблик: всплывает в раковине. */
const jug: SpriteDef = {
  w: 32,
  h: 12,
  palette: { D: 0x0058f8, W: 0xfcfcfc, S: 0xbcbcbc },
  frames: {
    idle: [
      'DD............................DD',
      'DWD..........................DWD',
      '.DWDDDDDDDDDDDDDDDDDDDDDDDDDDWD.',
      '.DWWWWWWWWWWWWWWWWWWWWWWWWWWWWD.',
      '..DWWWWWWWWWWWWWWWWWWWWWWWWWWD..',
      '..DWWWDDDWWWWWWWWWWWWWWWWWWWWD..',
      '..DWWWDWDWWWWWWWWWWWWWWWWWWWWD..',
      '...DWWDDDWWWWWWWWWWWWWWWWWWWD...',
      '...DSWWWWWWWWWWWWWWWWWWWWWWSD...',
      '....DSSWWWWWWWWWWWWWWWWWWSSD....',
      '.....DDSSSSSSSSSSSSSSSSSSDD.....',
      '.......DDDDDDDDDDDDDDDDDD.......',
    ],
  },
};

export const SPRITES = {
  bot,
  asterisk,
  barista,
  box,
  case: flightCase,
  coffee,
  star,
  timecode,
  latte,
  stream,
  paintball,
  agranovich,
  pump,
  jug,
} as const satisfies Record<string, SpriteDef>;

export type SpriteId = keyof typeof SPRITES;

export function spriteFrameName(id: string, frame: string): string {
  return `${id}:${frame}`;
}

/** Анимация: какой кадр показывать на кадре игры `tick`. */
export const SPRITE_ANIM = {
  enemyFramesPerPose: 10,
  pickupFramesPerPose: 20,
  /** Покачивание босса в полёте: амплитуда, px, и период, кадры. */
  bossBobAmplitude: 2,
  bossBobPeriod: 60,
} as const;
