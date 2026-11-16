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
/** Струя латте босса: тёмная кофейная капля с чёрной обводкой — видна и на белой пене. */
const stream: SpriteDef = {
  w: 6,
  h: 6,
  palette: { D: 0x000000, L: 0xac7c00, M: 0x881400 },
  frames: { idle: ['.DDDD.', 'DLLLLD', 'DLMMLD', 'DLMMLD', 'DLLLLD', '.DDDD.'] },
};
/** Пейнтбольный шарик (вторая фаза): яркий, с чёрной обводкой. */
const paintball: SpriteDef = {
  w: 5,
  h: 5,
  palette: { D: 0x000000, M: 0xd800cc, W: 0xfcfcfc },
  frames: { idle: ['.DDD.', 'DWMMD', 'DMMMD', 'DMMMD', '.DDD.'] },
};

// ——— Босс 1: Агранович ———

/**
 * Молодая стройная девушка. Карикатура на 2 детали: аккуратный пучок с прядями у лица и тонкие
 * круглые очки; чёрное приталенное платье с рюшами на воротнике и лентой-завязкой.
 * Перед выстрелом поправляет очки рукой — это её «знак» атаки. Образ утверждает сама Екатерина (ТЗ).
 */
/** Симметричный кадр: левые половины строк + их зеркало. */
function mirror(lefts: readonly string[]): string[] {
  return lefts.map((l) => l + [...l].reverse().join(''));
}

/**
 * Агранович: молодая стройная девушка, анфас. Взрослые пропорции (голова — около трети роста),
 * узкая талия, юбка шире книзу. Узнаваемость: пучок, тонкие круглые очки, чёрное платье с рюшами
 * на воротнике и лентой. Позы с портрета: рука у пучка (в полёте), поправляет очки (знак перед
 * выстрелом). E — глаз (открыт — D, зажмурилась — S). Образ утверждает сама Екатерина (ТЗ).
 */
const AGRANOVICH_RAW = mirror([
  '..............DD',
  '.............DHH',
  '.............DHH',
  '...........DDDDD',
  '..........DHHHHH',
  '.........DHHHHHH',
  '.........DHHHHHS',
  '.........DHHHSSS',
  '.........DHHSSSS',
  '.........DHSDDSS',
  '.........DHDSEDD',
  '.........DHSDDSS',
  '.........DHSSSSS',
  '.........DHSSSSD',
  '..........DSSSSS',
  '...........DDSSS',
  '.............DSS',
  '...........DDDDD',
  '...........DDDSS',
  '..........DDDDSD',
  '..........DDDDDD',
  '.........DDDDDDD',
  '.........SDDDDDD',
  '.........SDDDDDD',
  '..........SDDDDD',
  '..........DDDDDD',
  '.........DDDDDDD',
  '........DDDDDDDD',
  '........DDDDDDDD',
  '............SS..',
  '............SS..',
  '...........DDD..',
]);
const eyes = (rows: readonly string[], c: string) => rows.map((r) => r.replace(/E/g, c));
/** Руки опущены вдоль тела. */
const AGRANOVICH_BASE = eyes(AGRANOVICH_RAW, 'D');

/** Поза с портрета: левая рука поднята, локоть в сторону, кисть в волосах у виска. */
const AGRANOVICH_HAND_IN_HAIR = patch(AGRANOVICH_BASE, [
  // Опущенная левая рука убрана (рукав у плеча остаётся).
  [9, 22, '.'],
  [9, 23, '.'],
  [10, 24, 'D'],
  [9, 21, 'D'],
  // Плечо — вниз-наружу к локтю, предплечье — вверх к виску.
  [8, 20, 'S'],
  [7, 20, 'D'],
  [8, 19, 'S'],
  [7, 19, 'D'],
  [7, 18, 'S'],
  [6, 18, 'D'],
  [7, 17, 'S'],
  [6, 17, 'D'],
  [6, 16, 'S'],
  [5, 16, 'D'],
  [6, 15, 'S'],
  [5, 15, 'D'],
  [5, 14, 'S'],
  [4, 14, 'D'],
  [5, 13, 'S'],
  [4, 13, 'D'],
  [6, 12, 'S'],
  [5, 12, 'D'],
  [7, 11, 'S'],
  [6, 11, 'D'],
  [8, 10, 'S'],
  [7, 10, 'D'],
  [9, 9, 'S'],
  [9, 10, 'S'],
  [8, 9, 'D'],
  [9, 8, 'D'],
]);

/** Перед выстрелом: правая рука поправляет очки (зеркально — кисть у правого стекла). */
const AGRANOVICH_AIM = patch(AGRANOVICH_HAND_IN_HAIR, [
  [22, 22, '.'],
  [22, 23, '.'],
  [21, 24, 'D'],
  [22, 21, 'D'],
  [23, 20, 'S'],
  [24, 20, 'D'],
  [23, 19, 'S'],
  [24, 19, 'D'],
  [24, 18, 'S'],
  [25, 18, 'D'],
  [24, 17, 'S'],
  [25, 17, 'D'],
  [25, 16, 'S'],
  [26, 16, 'D'],
  [25, 15, 'S'],
  [26, 15, 'D'],
  [26, 14, 'S'],
  [27, 14, 'D'],
  [26, 13, 'S'],
  [27, 13, 'D'],
  [25, 12, 'S'],
  [26, 12, 'D'],
  [24, 11, 'S'],
  [25, 11, 'D'],
  [23, 10, 'S'],
  [24, 10, 'D'],
  [22, 9, 'S'],
  [22, 10, 'S'],
  [21, 10, 'S'],
  [23, 9, 'D'],
  [22, 8, 'D'],
]);

/** Зажмурилась (попадание). */
const AGRANOVICH_EYES_CLOSED = eyes(AGRANOVICH_RAW, 'S');

/** Пришла в себя после боя: руки опущены, улыбка. */
const AGRANOVICH_FREED = patch(AGRANOVICH_BASE, [
  [15, 13, 'S'],
  [16, 13, 'S'],
  [14, 13, 'D'],
  [17, 13, 'D'],
  [15, 14, 'D'],
  [16, 14, 'D'],
]);

const agranovich: SpriteDef = {
  w: 32,
  h: 32,
  palette: { D: 0x000000, S: 0xfcbcb0, H: 0xac7c00 },
  frames: {
    idle: AGRANOVICH_HAND_IN_HAIR,
    aim: AGRANOVICH_AIM,
    hit: AGRANOVICH_EYES_CLOSED,
    freed: AGRANOVICH_FREED,
  },
};

// ——— Уровень 2 ———

/** Наложить кусок кадра top на base со строки y0 ('.' в top — пропуск). */
const over = (base: readonly string[], top: readonly string[], y0: number): string[] =>
  base.map((r, y) => {
    const t = top[y - y0];
    if (!t) return r;
    return [...r].map((c, x) => (t[x] && t[x] !== '.' ? t[x] : c)).join('');
  });
const URALOV_HEAD = [
  '..........D...D.',
  '.........DHD.DHD',
  '........DHHHDHHH',
  '.......DHHHHHHHH',
  '.......DHHHHHHHH',
  '.......DHHSHHHHS',
  '.......DHSSSHSSS',
  '.......DHSSSSSSS',
  '.......DSSSSSSSS',
  '.......DSSDDDSSS',
  '......DSDSSEDSSS',
  '......DDSSSSSSSS',
  '.......DSSSSSSSS',
  '.......DSDSSSSSS',
  '.......DSSDSSSDD',
  '........DSDSDSSS',
  '.........DDSDSDS',
  '..........DDDDDD',
];
const URALOV_TORSO = [
  '..........DDDSSH',
  '.........DDDDDHH',
  '.........DDDDDHH',
  '.........DDDDDHH',
  '.........DDDDDHH',
  '.........DDDDDHD',
  '.........DDDDDHH',
  '.........DDDDDHH',
  '.........DDDDDHH',
  '.........DDDDDHD',
  '.........DDDDDDD',
  '...........DDDD.',
  '...........DSSD.',
  '..........DDDDD.',
];
const URALOV_BODY = mirror([...URALOV_HEAD, ...URALOV_TORSO]);
const URALOV_WINGS_UP = mirror([
  'DD..............',
  'DSD.............',
  'DSSD............',
  '.DSSD...........',
  '..DHHD..........',
  '..DHHHD.........',
  '..DHHHHD........',
  '..DHHDHHD.......',
  '..DHHDHHHD......',
  '..DHDHHHDHD.....',
  '..DHDHHHDHHD....',
  '..DDHHHDHHHD....',
  '..DHHHHDHHHD....',
  '..DHHHDHHHHD....',
  '..DHHHDHHHD.....',
  '..DHHDHHHHD.....',
  '...DHDHHHD......',
  '...DDHHHHD......',
  '....DHHHD.......',
  '....DDHHD.......',
  '.....DDHD.......',
  '......DDD.......',
]);
const URALOV_WINGS_DOWN = mirror([
  '.......DD.......',
  '.....DDHHD......',
  '....DHHHHD......',
  '...DHHHDHD......',
  '..DHHHDHHD......',
  '..DHHDHHHD......',
  '.DHHDHHHHD......',
  '.DHDHHHHD.......',
  'DHHDHHHHD.......',
  'DHDHHHDD........',
  'DSDDDD..........',
  'DSSD............',
  '.DD.............',
]);
const uralovFace = (rows: readonly string[]) =>
  patch(rows, [
    // Чуб падает на лоб справа, вихор на макушке.
    [18, 5, 'H'],
    [19, 6, 'H'],
    [18, 6, 'H'],
    [20, 6, 'H'],
    [17, 5, 'H'],
    [22, 0, 'D'],
    [23, 1, 'D'],
    [22, 1, 'H'],
    // Ухмылка: правый угол рта выше.
    [17, 14, 'S'],
    [18, 13, 'D'],
  ]);
const uralovEyes = (rows: readonly string[], c: string) => rows.map((r) => r.replace(/E/g, c));
const URALOV_IDLE = uralovEyes(uralovFace(over(URALOV_BODY, URALOV_WINGS_UP, 7)), 'D');
const URALOV_FLAP = uralovEyes(uralovFace(over(URALOV_BODY, URALOV_WINGS_DOWN, 17)), 'D');
const URALOV_HIT = uralovEyes(uralovFace(over(URALOV_BODY, URALOV_WINGS_DOWN, 17)), 'S');
const URALOV_FREED = uralovEyes(
  patch(uralovFace(URALOV_BODY), [
    [8, 18, 'D'],
    [8, 19, 'D'],
    [8, 20, 'D'],
    [8, 21, 'D'],
    [8, 22, 'D'],
    [8, 23, 'D'],
    [8, 24, 'D'],
    [8, 25, 'D'],
    [8, 26, 'S'],
    [8, 27, 'D'],
    [23, 18, 'D'],
    [23, 19, 'D'],
    [23, 20, 'D'],
    [23, 21, 'D'],
    [23, 22, 'D'],
    [23, 23, 'D'],
    [23, 24, 'D'],
    [23, 25, 'D'],
    [23, 26, 'S'],
    [23, 27, 'D'],
    [14, 14, 'S'],
    [15, 14, 'S'],
    [16, 14, 'S'],
    [17, 14, 'S'],
    [13, 14, 'D'],
    [18, 14, 'D'],
    [14, 15, 'D'],
    [15, 15, 'D'],
    [16, 15, 'D'],
    [17, 15, 'D'],
  ]),
  'D',
);

/**
 * Семён Уралов: анфас, крупная голова (шарж, без унижающих деталей — ТЗ). Узнаваемость: взъерошенные
 * зачёсанные вверх волосы с залысинами и чубом набок, полуприкрытые глаза, щетина, ухмылка,
 * тёмный пиджак поверх коричневой рубашки. Летает, раскинув полы пиджака, как крылья, — как
 * «летучий кот» уровня 2 оригинала. Образ утверждает сам Семён (ТЗ).
 */
const uralov: SpriteDef = {
  w: 32,
  h: 32,
  palette: { D: 0x000000, S: 0xfcbcb0, H: 0x881400 },
  frames: { idle: URALOV_IDLE, flap: URALOV_FLAP, hit: URALOV_HIT, freed: URALOV_FREED },
};

/** Панический заголовок: газета с красной шапкой «!!!». */
const HEADLINE_A = [
  'DDDDDDDDDDDDDDDD',
  'DWWWWWWWWWWWWWWD',
  'DWRRRRRRRRRRRRWD',
  'DWRRWRRWRRWRRRWD',
  'DWRRWRRWRRWRRRWD',
  'DWRRWRRWRRWRRRWD',
  'DWRRRRRRRRRRRRWD',
  'DWRRWRRWRRWRRRWD',
  'DWWWWWWWWWWWWWWD',
  'DWDDWDDDWDDWDDWD',
  'DWWWWWWWWWWWWWWD',
  'DDDDDDDDDDDDDDDD',
];
const headline: SpriteDef = {
  w: 16,
  h: 12,
  palette: { D: 0x000000, W: 0xfcfcfc, R: 0xf83800 },
  frames: {
    fly1: HEADLINE_A,
    // Уголок газеты трепещет.
    fly2: patch(HEADLINE_A, [
      [15, 0, '.'],
      [14, 0, '.'],
      [15, 1, '.'],
      [14, 1, 'D'],
      [13, 0, 'D'],
    ]),
    idle: HEADLINE_A,
  },
};

/** Кабель-змейка: свёрнутый оранжевый кабель с вилкой; кадры — вилка вверху и внизу. */
const cable: SpriteDef = {
  w: 12,
  h: 12,
  palette: { D: 0x000000, O: 0xe45c10, Y: 0xf8b800 },
  frames: {
    roll1: [
      '....DDDD....',
      '..DDOOOODD..',
      '.DOODDDDOOD.',
      '.DODOOOODOD.',
      'DODODDDDODOD',
      'DODODOODODOD',
      'DODODDODODOD',
      'DODOOOODODOD',
      '.DODDDDDOOD.',
      '.DOOOOOOODDD',
      '..DDOOOODYYD',
      '....DDDD.DDD',
    ],
    roll2: [
      '....DDDD.DDD',
      '..DDOOOODYYD',
      '.DOODDDDDOD.',
      '.DODOOOOODD.',
      'DODODDDDODOD',
      'DODODOODODOD',
      'DODODDODODOD',
      'DODOOOODODOD',
      '.DODDDDDOOD.',
      '.DOOOOOOOOD.',
      '..DDOOOODD..',
      '....DDDD....',
    ],
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
  w: 48,
  h: 12,
  palette: { D: 0x0058f8, W: 0xfcfcfc, S: 0xbcbcbc },
  frames: {
    idle: [
      'DD............................................DD',
      'DWD..........................................DWD',
      '.DWDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDWD.',
      '.DWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWD.',
      '..DWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWD..',
      '..DWWWDDDWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWD..',
      '..DWWWDWDWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWD..',
      '...DWWDDDWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWD...',
      '...DSWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWSD...',
      '....DSSWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWSSD....',
      '.....DDSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSDD.....',
      '.......DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD.......',
    ],
  },
};

// ——— Босс 3: Бордачёв ———

/**
 * Тимофей Бордачёв (по фото гостя): светлые волосы до ушей, длинная чёлка набок через лоб,
 * круглое лицо, лёгкая полуулыбка; тёмный пиджак, светлая рубашка, тёмный галстук (горошек
 * в 24 px не читается — без него). Взрослые пропорции, голова крупнее (шарж без унижающих деталей — ТЗ). Знак перед броском —
 * заносит руку вверх. Y — волосы, S — лицо, руки и рубашка, D — контур, пиджак, галстук.
 * Образ утверждает сам Тимофей (ТЗ).
 */
const BORDACHEV_HEAD = mirror([
  '.........DDD',
  '.......DDYYY',
  '......DYYYYY',
  '.....DYYYYYY',
  '....DYYYYYYY',
  '....DYYYYYYY',
  '....DYYYYYYY',
  '....DYYYYYYY',
  '....DYYYYYYS',
  '....DYYSSSSS',
  '....DYSDDSSS',
  '....DYSSDSSS',
  '....DYSSDSSS',
  '...DSYSSSSSS',
  '...DSYSSSSSD',
  '....DYSSSSSS',
  '....DSSSSSSS',
  '.....DSSSSDD',
  '......DSSSSS',
  '.......DDDDD',
]);
const BORDACHEV_TORSO = mirror([
  '..........DS',
  '.......DDSSS',
  '....DDDDDSSD',
  '..DDDDDDDSSD',
  '.DDDDDDDDSSD',
  '.DD.DDDDDDSD',
  '.DD.DDDDDDSD',
  '.DD.DDDDDDDD',
  '.DD.DDDDDDDD',
  '.DD.DDDDDDDD',
  '.DD.DDDDDDDD',
  '.SS.DDDDDDDD',
  '.SS.DDDDDDDD',
  '....DDDDDDDD',
]);
const BORDACHEV_LEGS = mirror([
  '....DDDDDD..',
  '....DDDDDD..',
  '.....DDDDD..',
  '.....DDDDD..',
  '....DDDDDD..',
  '....DDDDDD..',
]);
/** Чёлка набок: справа (от зрителя) она ниже и закрывает край лба. Полуулыбка. */
const bordachevDetails = (rows: readonly string[]): string[] =>
  patch(rows, [
    [12, 8, 'Y'],
    [13, 9, 'Y'],
    [14, 9, 'Y'],
    [15, 9, 'Y'],
    [16, 9, 'Y'],
    [17, 9, 'Y'],
    [18, 9, 'Y'],
    [17, 10, 'Y'],
    [18, 10, 'Y'],
    [16, 10, 'D'],
    [15, 10, 'D'],
    [14, 10, 'S'],
    // Полуулыбка: правый угол рта приподнят.
    [14, 16, 'D'],
    [13, 17, 'S'],
  ]);
const BORDACHEV_BODY = bordachevDetails([...BORDACHEV_HEAD, ...BORDACHEV_TORSO, ...BORDACHEV_LEGS]);
/** Правая рука (смотрит вправо) поднята над плечом — замах. */
const BORDACHEV_AIM = patch(BORDACHEV_BODY, [
  ...[25, 26, 27, 28, 29, 30, 31, 32].flatMap(
    (y) =>
      [
        [21, y, '.'],
        [22, y, '.'],
      ] as [number, number, string][],
  ),
  ...[13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24].flatMap(
    (y) =>
      [
        [20, y, 'D'],
        [21, y, 'D'],
        [22, y, 'D'],
        [23, y, y < 16 ? 'D' : '.'],
      ] as [number, number, string][],
  ),
  [21, 11, 'S'],
  [22, 11, 'S'],
  [21, 12, 'S'],
  [22, 12, 'S'],
  [20, 11, 'D'],
  [23, 11, 'D'],
  [20, 12, 'D'],
  [23, 12, 'D'],
  [21, 10, 'D'],
  [22, 10, 'D'],
]);
/** Прыжок: руки в стороны, ноги поджаты. */
const BORDACHEV_JUMP = patch(BORDACHEV_BODY, [
  ...[34, 35, 36, 37, 38, 39].flatMap(
    (y) =>
      [4, 5, 6, 7, 8, 9, 14, 15, 16, 17, 18, 19].map((x) => [x, y, '.']) as [
        number,
        number,
        string,
      ][],
  ),
  ...[34, 35].flatMap(
    (y) =>
      [3, 4, 5, 6, 7, 8, 15, 16, 17, 18, 19, 20].map((x) => [x, y, 'D']) as [
        number,
        number,
        string,
      ][],
  ),
  ...[36, 37].flatMap(
    (y) => [2, 3, 4, 5, 18, 19, 20, 21].map((x) => [x, y, 'D']) as [number, number, string][],
  ),
]);
/** Удар: зажмурился, рот открыт. */
const BORDACHEV_HIT = patch(BORDACHEV_BODY, [
  [8, 11, 'S'],
  [8, 12, 'D'],
  [7, 12, 'D'],
  [9, 12, 'D'],
  [15, 11, 'S'],
  [15, 12, 'D'],
  [14, 12, 'D'],
  [16, 12, 'D'],
  [14, 16, 'S'],
  [10, 16, 'D'],
  [11, 16, 'D'],
  [12, 16, 'D'],
  [13, 16, 'D'],
  [10, 17, 'D'],
  [13, 17, 'D'],
  [11, 17, 'D'],
  [12, 17, 'D'],
  [11, 18, 'D'],
  [12, 18, 'D'],
]);
/** Пришёл в себя: широкая улыбка. */
const BORDACHEV_FREED = patch(BORDACHEV_BODY, [
  [8, 16, 'D'],
  [15, 16, 'D'],
  [14, 16, 'S'],
  [9, 17, 'D'],
  [13, 17, 'D'],
  [14, 17, 'D'],
]);
const bordachev: SpriteDef = {
  w: 24,
  h: 40,
  palette: { D: 0x000000, S: 0xfcbcb0, Y: 0xf8b800 },
  frames: {
    idle: BORDACHEV_BODY,
    aim: BORDACHEV_AIM,
    jump: BORDACHEV_JUMP,
    hit: BORDACHEV_HIT,
    freed: BORDACHEV_FREED,
  },
};

/** Глобус «старого мирового порядка»: синее море, зелёные материки, чёрный контур. */
const globe: SpriteDef = {
  w: 10,
  h: 10,
  palette: { D: 0x000000, B: 0x0058f8, G: 0x00a800 },
  frames: {
    idle: [
      '...DDDD...',
      '.DDBBGGDD.',
      '.DBGGGBBD.',
      'DBBGGBBBGD',
      'DBBBGBBGGD',
      'DGBBBBGGBD',
      'DGGBBBBGBD',
      '.DGBBBBBD.',
      '.DDBBGBDD.',
      '...DDDD...',
    ],
  },
};

/** Крюк крана «принуждение к миру»: блок с тросом и красный крюк. */
const hook: SpriteDef = {
  w: 16,
  h: 16,
  palette: { D: 0x000000, M: 0xbcbcbc, R: 0xf83800 },
  frames: {
    idle: [
      '......DDDD......',
      '....DDMMMMDD....',
      '...DMMDDDDMMD...',
      '...DMDMMMMDMD...',
      '...DMMDDDDMMD...',
      '....DDMMMMDD....',
      '......DMMD......',
      '......DRRD......',
      '......DRRD......',
      '..DD..DRRD......',
      '.DRRD.DRRD......',
      '.DRRD.DRRD......',
      '.DRRRDDRRD......',
      '..DRRRRRD.......',
      '...DRRRD........',
      '....DDD.........',
    ],
  },
};

// ——— Враги уровня 3 ———

const CRAB_TOP = [
  '...DDDDDDDDDD...',
  '...DBBDBBDBBD...',
  '...DBBDBBDBBD...',
  '...DDDDDDDDDD...',
  '..DRRRRRRRRRRD..',
  '.DRRDRRRRRRDRRD.',
  'DRDRRRRRRRRRRDRD',
  'DRDRRRRRRRRRRDRD',
  '.DD.DRRRRRRD.DD.',
];
/** Контейнерный краб: красный краб с синим контейнером на спине. Клешни вверх — замер. */
const crab: SpriteDef = {
  w: 16,
  h: 12,
  palette: { D: 0x000000, R: 0xf83800, B: 0x0058f8 },
  frames: {
    walk1: [...CRAB_TOP, '..D.D.D..D.D.D..', '.D..D.D..D.D..D.', '.D...D....D...D.'],
    walk2: [...CRAB_TOP, '...D.D.DD.D.D...', '..D..D.DD.D..D..', '..D..D....D..D..'],
    claws: [
      'DD.DDDDDDDDDD.DD',
      'RRDDBBDBBDBBDDRR',
      'DRDDBBDBBDBBDDRD',
      '.DRDDDDDDDDDDRD.',
      '..DRRRRRRRRRRD..',
      '..DRDRRRRRRDRD..',
      '..DRRRRRRRRRRD..',
      '..DRRRRRRRRRRD..',
      '...DDRRRRRRDD...',
      '..D.D.D..D.D.D..',
      '.D..D.D..D.D..D.',
      '.D...D....D...D.',
    ],
  },
};

/** Чайка-дрон: белая чайка с пропеллером на макушке; пикирует, сложив крылья. */
const gull: SpriteDef = {
  w: 16,
  h: 12,
  palette: { D: 0x000000, W: 0xfcfcfc, Y: 0xf8b800 },
  frames: {
    fly1: [
      '.......DDDDD....',
      'DD........D.....',
      'DWD.......D.....',
      '.DWD....DDWD....',
      '..DWD..DWWWWD...',
      '...DWDDWWWWDYYD.',
      '....DWWWWWWWDDD.',
      '....DWWWWWWWD...',
      '.....DWWWWWD....',
      '......DDDDD.....',
      '.......D..D.....',
      '................',
    ],
    fly2: [
      '.......DDDDD....',
      '..........D.....',
      '..........D.....',
      '........DDWD....',
      '.......DWWWWD...',
      '....DDDWWWWDYYD.',
      '...DWWWWWWWWDDD.',
      '..DWWWDWWWWWD...',
      '.DWWD.DWWWWD....',
      'DWWD...DDDDD....',
      'DDD....D..D.....',
      '................',
    ],
    dive: [
      '.....DDDDD......',
      '.......D........',
      '.....DDWD.......',
      '....DWWWWD......',
      '...DWWWWWWD.....',
      '...DWWWWWWWD....',
      '....DWWWWWWWD...',
      '.....DWWWWWWWD..',
      '......DWWWWWDYD.',
      '.......DDDDDDYYD',
      '............DYYD',
      '.............DD.',
    ],
  },
};

const RIGGER_BUCKET = [
  'DDDDDDDDDDDDDDDD',
  'DLLLLLLLLLLLLLLD',
  '.DMMLMMMMMMMMMD.',
  '.DMMLMMMMMMMMMD.',
  '.DMMMMMMMMMMMMD.',
  '..DMMMMMMMMMMD..',
  '..DMMMMMMMMMMD..',
  '...DDDDDDDDDD...',
];
/** Бот-такелажник в люльке на блоке: голова-экран бота с каской, сидит в ведре. */
const rigger: SpriteDef = {
  w: 16,
  h: 20,
  palette: { D: 0x000000, M: 0x7c7c7c, L: 0xf8b800 },
  frames: {
    idle: [
      '.......DD.......',
      '.......DD.......',
      '....DDDDDDDD....',
      '...DLLLLLLLLD...',
      '..DDDDDDDDDDDD..',
      '..DMMMMMMMMMMD..',
      '..DMDDDDDDDDMD..',
      '..DMDLDDDDLDMD..',
      '..DMDDDDDDDDMD..',
      '..DMMMMMMMMMMD..',
      '...DDDDDDDDDD...',
      '.....DMMMMD.....',
      ...RIGGER_BUCKET,
    ],
    throw: [
      '.......DD.......',
      '.......DD..DD...',
      '....DDDDDDDMMD..',
      '...DLLLLLLLLDMD.',
      '..DDDDDDDDDDDDMD',
      '..DMMMMMMMMMMDMD',
      '..DMDDDDDDDDMDD.',
      '..DMDLDDDDLDMD..',
      '..DMDDDDDDDDMD..',
      '..DMMMMMMMMMMD..',
      '...DDDDDDDDDD...',
      '.....DMMMMD.....',
      ...RIGGER_BUCKET,
    ],
  },
};

/** Гайка такелажника. */
const nut: SpriteDef = {
  w: 6,
  h: 6,
  palette: { D: 0x000000, M: 0xbcbcbc },
  frames: { idle: ['.DDDD.', 'DMMMMD', 'DMDDMD', 'DMDDMD', 'DMMMMD', '.DDDD.'] },
};

// ——— Бонус-игра «Кран» ———

const CLAW_TOP = [
  '......DDDD......',
  '......DMMD......',
  '....DDDMMDDD....',
  '...DMMMMMMMMD...',
  '...DDDDDDDDDD...',
];
/** Захват крана в автомате: раскрыт / сжат. */
const claw: SpriteDef = {
  w: 16,
  h: 12,
  palette: { D: 0x000000, M: 0xbcbcbc },
  frames: {
    open: [
      ...CLAW_TOP,
      '...DM......MD...',
      '..DM........MD..',
      '..DM........MD..',
      '.DM..........MD.',
      '.DM..........MD.',
      '.DD..........DD.',
      '................',
    ],
    closed: [
      ...CLAW_TOP,
      '....DM....MD....',
      '....DM....MD....',
      '.....DM..MD.....',
      '.....DM..MD.....',
      '......DMMD......',
      '......DDDD......',
      '................',
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
  uralov,
  bordachev,
  globe,
  hook,
  headline,
  cable,
  crab,
  gull,
  rigger,
  nut,
  pump,
  jug,
  claw,
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
