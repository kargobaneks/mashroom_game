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

// ——— Уровень 4 «Заморозка-2007» ———

const ICICLE_HANG = [
  'DDDDDDDD',
  'DWWIIIID',
  'DWWIIIID',
  '.DWIIID.',
  '.DWIIID.',
  '.DWIIID.',
  '..DWID..',
  '..DWID..',
  '..DWID..',
  '..DWID..',
  '..DWID..',
  '...DWD..',
  '...DWD..',
  '...DID..',
  '....D...',
  '........',
];

/** Сосулька: висит под трубой, перед падением дрожит. */
const icicle: SpriteDef = {
  w: 8,
  h: 16,
  palette: { D: 0x000000, W: 0xfcfcfc, I: 0xa4e4fc },
  frames: {
    hang: ICICLE_HANG,
    shake: ICICLE_HANG.map((r, i) => (i === 0 ? r : `.${r.slice(0, 7)}`)),
  },
};

const PHONE_BODY = [
  '..DDDDDDDD..',
  '..DGGGGGGD..',
  '..DGIIIIGD..',
  '..DGDIIDGD..',
  '..DGIIIIGD..',
  '..DGIDDIGD..',
  '..DGGGGGGD..',
  '.DDDDDDDDDD.',
  '.DGGGGGGGGD.',
  '.DGDGDGDGGD.',
  '.DGGGGGGGGD.',
  '.DGDGDGDGGD.',
  '.DGGGGGGGGD.',
  '.DDDDDDDDDD.',
];

/** Замороженный телефон-раскладушка: открыт, хмурый экран, скользит, из-под него летит лёд. */
const phone: SpriteDef = {
  w: 12,
  h: 16,
  palette: { D: 0x000000, G: 0xbcbcbc, I: 0xa4e4fc },
  frames: {
    slide1: [...PHONE_BODY, 'IIIIIIIIIIII', 'I.I.I.I.I.I.'],
    slide2: [...PHONE_BODY, 'IIIIIIIIIIII', '.I.I.I.I.I.I'],
  },
};

/** Ледяной блок 32×16 с вмороженной вещью 2007 года: рисунок вещи — ASCII 32×16 поверх льда. */
function iceBlock(item: readonly string[]): string[] {
  const out: string[] = [];
  for (let y = 0; y < 16; y++) {
    let row = '';
    for (let x = 0; x < 32; x++) {
      const edge = x === 0 || y === 0 || x === 31 || y === 15;
      const glint = (x + y) % 9 === 0 && y < 6;
      const ch = item[y]?.[x] ?? '.';
      row += edge ? 'D' : ch !== '.' ? ch : glint || y === 1 ? 'W' : 'I';
    }
    out.push(row);
  }
  return out;
}

/** Компакт-диск 2007-го. */
const ICE_CD = [
  '',
  '',
  '',
  '            DDDDDDD',
  '          DDWWWWWWWDD',
  '         DWWWWWWWWWWWD',
  '         DWWWWDDDWWWWD',
  '         DWWWDD.DDWWWD',
  '         DWWWWDDDWWWWD',
  '         DWWWWWWWWWWWD',
  '          DDWWWWWWWDD',
  '            DDDDDDD',
].map((r) => r.replace(/ /g, '.'));

/** Плеер с колёсиком, как у всех в 2007-м. */
const ICE_PLAYER = [
  '',
  '',
  '             DDDDDDD',
  '             DWWWWWD',
  '             DWDDDWD',
  '             DWDDDWD',
  '             DWWWWWD',
  '             DWDDDWD',
  '             DDWWWDD',
  '             DDWDWDD',
  '             DDWWWDD',
  '             DWDDDWD',
  '             DDDDDDD',
].map((r) => r.replace(/ /g, '.'));

/** Тающая платформа уровня 4: вещь 2007 года во льду. */
const iceblock: SpriteDef = {
  w: 32,
  h: 16,
  palette: { D: 0x000000, W: 0xfcfcfc, I: 0xa4e4fc },
  frames: { cd: iceBlock(ICE_CD), player: iceBlock(ICE_PLAYER) },
};

// ——— Уровень 5: босс Микитко ———

/**
 * Микитко — призрак архива (ТЗ: «Боссы», 5). Образ по фото гостя (docs/refs/mikitko_2.png, выбрал
 * пользователь): длинные тёмные волосы развеваются назад, густая борода, тёмное пальто, шарф в клетку.
 * Вместо ног — призрачный хвост. aim — вытянул руку, заряжает луч, рот открыт; hit — зажмурился;
 * freed — пришёл в себя: стоит на ногах, улыбается.
 */
const mikitko: SpriteDef = {
  w: 24,
  h: 40,
  palette: { D: 0x000000, H: 0x503000, S: 0xfcbcb0 },
  frames: {
    idle: [
      '........HHHHH...........',
      '.....HHHHHHHHHHH........',
      '...HHHHHHHHHHHHHH.......',
      '..HHHHHHHHHHHHHHSS......',
      '.HHHHHHHHHHHHHSSSSS.....',
      'HHHHHHHHHHHHSSSSSSS.....',
      'HHHHHHHHHHHSSSSSSSSS....',
      '.HHHHHHHHHHSSSSDDDSS....',
      'HHHHHHHHHHHSSSSSDSSSS...',
      'HH.HHHHHHHHHSSSSSSSSS...',
      'H..HHHHHHHHHSSSSSSSSSS..',
      '...HHHHHHHHHHSSSSSSSSSS.',
      '..HHHHHHHHHHHHSSSSSSSS..',
      '..HHHHHHHHHHHHHHSHHHHH..',
      '.HH.HHHHHHHHHHHHHHHHHHH.',
      '.H..HHHHHHHHHHHHHDDDHH..',
      '....HHHHHHHHHHHHHHHHHH..',
      '....DHHHHHHHHHHHHHHHHH..',
      '...DDDHHHHHHHHHHHHHHH...',
      '..DDDDDHHHHHHHHHHHHH....',
      '.DDDDDDDSDSHHHHHHHHD....',
      'DDDDDDDDDSDSDHHHHHDDD...',
      'DDDDDDDDSDSDSDHHHDDDDD..',
      'DDDDDDDDDSDSDSDHDDDDDDD.',
      'DDDDDDDDDDSDSDSDDDDDDDDD',
      'DDDDDDDDDDDDDDDDDDDDDDDD',
      'DD.DDDDDDDDDDDDDDDDDD.DD',
      'DD.DDDDDDDDDDDDDDDDDD.DD',
      'DD.DDDDDDDDDDDDDDDDDD.DD',
      'SS.DDDDDDDDDDDDDDDDDD.SS',
      'SS.DDDDDDDDDDDDDDDDDD.SS',
      '...DDDDDDDDDDDDDDDDDD...',
      '...DDDDDDDDDDDDDDDDDD...',
      '....DDDDDDDDDDDDDDDDD...',
      '....DDDD.DDDDDDD.DDDD...',
      '.....DD..DDDDDD...DDD...',
      '.....D....DDDD.....DD...',
      '...........DDD......D...',
      '............D...........',
      '........................',
    ],
    aim: [
      '........HHHHH...........',
      '.....HHHHHHHHHHH........',
      '...HHHHHHHHHHHHHH.......',
      '..HHHHHHHHHHHHHHSS......',
      '.HHHHHHHHHHHHHSSSSS.....',
      'HHHHHHHHHHHHSSSSSSS.....',
      'HHHHHHHHHHHSSSSSSSSS....',
      '.HHHHHHHHHHSSSSDDDSS....',
      'HHHHHHHHHHHSSSSSDSSSS...',
      'HH.HHHHHHHHHSSSSSSSSS...',
      'H..HHHHHHHHHSSSSSSSSSS..',
      '...HHHHHHHHHHSSSSSSSSSS.',
      '..HHHHHHHHHHHHSSSSSSSS..',
      '..HHHHHHHHHHHHHHSHHHHH..',
      '.HH.HHHHHHHHHHHHHHHHHHH.',
      '.H..HHHHHHHHHHHHHDDDHH..',
      '....HHHHHHHHHHHHHDDDHH..',
      '....DHHHHHHHHHHHHHHHHH..',
      '...DDDHHHHHHHHHHHHHHH...',
      '..DDDDDHHHHHHHHHHHHH....',
      '.DDDDDDDSDSHHHHHHHHD..SS',
      'DDDDDDDDDSDSDHHHHHDDDDSS',
      'DDDDDDDDSDSDSDHHHDDDDDSS',
      'DDDDDDDDDSDSDSDHDDDDDDSS',
      'DDDDDDDDDDSDSDSDDDDDDDDD',
      'DDDDDDDDDDDDDDDDDDDDDDDD',
      'DD.DDDDDDDDDDDDDDDDDD.DD',
      'DD.DDDDDDDDDDDDDDDDDD.DD',
      'DD.DDDDDDDDDDDDDDDDDD.DD',
      'SS.DDDDDDDDDDDDDDDDDD...',
      'SS.DDDDDDDDDDDDDDDDDD...',
      '...DDDDDDDDDDDDDDDDDD...',
      '...DDDDDDDDDDDDDDDDDD...',
      '....DDDDDDDDDDDDDDDDD...',
      '....DDDD.DDDDDDD.DDDD...',
      '.....DD..DDDDDD...DDD...',
      '.....D....DDDD.....DD...',
      '...........DDD......D...',
      '............D...........',
      '........................',
    ],
    hit: [
      '........HHHHH...........',
      '.....HHHHHHHHHHH........',
      '...HHHHHHHHHHHHHH.......',
      '..HHHHHHHHHHHHHHSS......',
      '.HHHHHHHHHHHHHSSSSS.....',
      'HHHHHHHHHHHHSSSSSSS.....',
      'HHHHHHHHHHHSSSSDDDSS....',
      '.HHHHHHHHHHSSSSSSSSS....',
      'HHHHHHHHHHHSSSDDDDSSS...',
      'HH.HHHHHHHHHSSSSSSSSS...',
      'H..HHHHHHHHHSSSSSSSSSS..',
      '...HHHHHHHHHHSSSSSSSSSS.',
      '..HHHHHHHHHHHHSSSSSSSS..',
      '..HHHHHHHHHHHHHHSHHHHH..',
      '.HH.HHHHHHHHHHHHHHHHHHH.',
      '.H..HHHHHHHHHHHHDDDDHH..',
      '....HHHHHHHHHHHHDDDDHH..',
      '....DHHHHHHHHHHHHHHHHH..',
      '...DDDHHHHHHHHHHHHHHH...',
      '..DDDDDHHHHHHHHHHHHH....',
      '.DDDDDDDSDSHHHHHHHHD....',
      'DDDDDDDDDSDSDHHHHHDDD...',
      'DDDDDDDDSDSDSDHHHDDDDD..',
      'DDDDDDDDDSDSDSDHDDDDDDD.',
      'DDDDDDDDDDSDSDSDDDDDDDDD',
      'DDDDDDDDDDDDDDDDDDDDDDDD',
      'DD.DDDDDDDDDDDDDDDDDD.DD',
      'DD.DDDDDDDDDDDDDDDDDD.DD',
      'DD.DDDDDDDDDDDDDDDDDD.DD',
      'SS.DDDDDDDDDDDDDDDDDD.SS',
      'SS.DDDDDDDDDDDDDDDDDD.SS',
      '...DDDDDDDDDDDDDDDDDD...',
      '...DDDDDDDDDDDDDDDDDD...',
      '....DDDDDDDDDDDDDDDDD...',
      '....DDDD.DDDDDDD.DDDD...',
      '.....DD..DDDDDD...DDD...',
      '.....D....DDDD.....DD...',
      '...........DDD......D...',
      '............D...........',
      '........................',
    ],
    freed: [
      '........HHHHH...........',
      '.....HHHHHHHHHHH........',
      '...HHHHHHHHHHHHHH.......',
      '..HHHHHHHHHHHHHHSS......',
      '.HHHHHHHHHHHHHSSSSS.....',
      'HHHHHHHHHHHHSSSSSSS.....',
      'HHHHHHHHHHHSSSSSSSSS....',
      '.HHHHHHHHHHSSSSDDDSS....',
      'HHHHHHHHHHHSSSSSDSSSS...',
      'HH.HHHHHHHHHSSSSSSSSS...',
      'H..HHHHHHHHHSSSSSSSSSS..',
      '...HHHHHHHHHHSSSSSSSSSS.',
      '..HHHHHHHHHHHHSSSSSSSS..',
      '..HHHHHHHHHHHHHHSHHHHH..',
      '.HH.HHHHHHHHHHHHDHHHDHH.',
      '.H..HHHHHHHHHHHHDHHHDH..',
      '....HHHHHHHHHHHHHDDDHH..',
      '....DHHHHHHHHHHHHHHHHH..',
      '...DDDHHHHHHHHHHHHHHH...',
      '..DDDDDHHHHHHHHHHHHH....',
      '.DDDDDDDSDSHHHHHHHHD....',
      'DDDDDDDDDSDSDHHHHHDDD...',
      'DDDDDDDDSDSDSDHHHDDDDD..',
      'DDDDDDDDDSDSDSDHDDDDDDD.',
      'DDDDDDDDDDSDSDSDDDDDDDDD',
      'DDDDDDDDDDDDDDDDDDDDDDDD',
      'DD.DDDDDDDDDDDDDDDDDD.DD',
      'DD.DDDDDDDDDDDDDDDDDD.DD',
      'DD.DDDDDDDDDDDDDDDDDD.DD',
      'SS.DDDDDDDDDDDDDDDDDD.SS',
      'SS.DDDDDDDDDDDDDDDDDD.SS',
      '...DDDDDDDDDDDDDDDDDD...',
      '...DDDDDDDDDDDDDDDDDD...',
      '....DDDDDDDDDDDDDDDD....',
      '.....DDDDDD..DDDDDD.....',
      '.....DDDDD....DDDDD.....',
      '.....DDDDD....DDDDD.....',
      '.....DDDDD....DDDDD.....',
      '....DDDDDD....DDDDDDD...',
      '....DDDDDD....DDDDDDD...',
    ],
  },
};

/**
 * Микитко-призрак (арена уровня 5): большой, как призрак уровня 5 оригинала (~100 px), — 64×80,
 * из трёх слоёв по 3 цвета (как спрайты NES из нескольких палитр): пальто-балахон с руками,
 * волосы с бородой, лицо. Голова — по пиксель-арт фото гостя (docs/refs/mikitko_pixelart.png):
 * длинные волосы развеваются назад, густая борода, взгляд вверх; пальто — призрачно-фиолетовое,
 * чтобы было видно в темноте (у оригинала — фиолетовый балахон). Слои рисуются в одной точке:
 * coat → hair → face. Кадры: idle, aim (рука вперёд, рот открыт), hit (зажмурился).
 */
const mikitkoGhostCoat: SpriteDef = {
  w: 64,
  h: 80,
  palette: { K: 0x000000, G: 0x4428bc, L: 0xbcbcbc },
  frames: {
    idle: [
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '..........................................KKKKK.................',
      '..................................KKKKKKKKGGGGLK................',
      '..............................KKKKGGGGGGGGGGKLK.................',
      '.............................KGGGGGGGGGGGGGGKLGK................',
      '..................KKKKKKKKKKKKGGGGGGGGGGGGGKLGGK................',
      '.................KGGGGGGGGGGGGGGGGGGGGGGGGGKLGGK................',
      '................KGGGGGGGGGGGGGGGGGGGGGGGGGKLGGGK................',
      '...............KGGGGGGGGGGGGGGGGGGGGGGGGGGKLGGGGK...............',
      '..............KGGGGGGGGGGGGGGGGGGGGGGGGGGKLGGGGGGK..............',
      '.............KGGGGGGGGGGGGGGGGGGGGGGGGGGGKLGGGGGGGK.............',
      '.............KGGGGGGGGGGGGGGGGGGGGGGGGGGKLGGGGGGGGK.............',
      '............KGGGGGGGGGGGGGGGGGGGGGGGGGGGKLGGGGGGGGGK............',
      '...........KGGGGGGGGGGGGGGGGGGGGGGGGGGGKLGGGGGGGGGGGK...........',
      '..........KGGGGGGGGGGGGGGGGGGGGGGGGGGGGKLGGGGGGGGGGGGK..........',
      '.........KGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGK.........',
      '.......KKGGGGGGGGGGGGGKGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGK.........',
      '......KGGGGGGGGGGGGGGGKGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGKK........',
      '....KKGGGGGGGGGGGGGGGGKGGGGGGGKGGGGGGGGGGGGGGGGGGGGGGGLLKKK.....',
      '.KKKLLLLGGGGGGGGGGGGGKGGGGGGGGKGGGGGGGGGGGGGGGGGGGGGGGLLLLLKK...',
      'KLLLLLLLGGGGGGGGGGGGGKGGGGGGGGKGGGGGGGGGGGGGGGGGGGGGGLLLLLLLLK..',
      'KLLLLLLLGGGGGGGGGGGGGKGGGGGGGGKGGGGGGGGGGGGGGGGGGGGGGLLLLLLLLK..',
      'LLLLLLLLGGGGGGGGGGGGGKGGGGGGGGKGGGGGGGGGGGGGGGGKGGGGLLLLLLLLLK..',
      'LLLLLLLLLGGGGGGGGGGGGKGGGGGGGGKGGGGGGGGGGGGGGGGKGGGGLLLLLLLLLLK.',
      'LLLLLLLLLGGGGGGGGGGGKGGGGGGGGKGGGGGGGGGGGGGGGGGGKGGGLLLLLLLLLLK.',
      'LLLLLLLLLGGGGGGGGGGGKGGGGGGGGKGGGGGGGGGGGGGGGGGGKGGGGGLLKLKLKLK.',
      'KKLLLLLLKGGGGGGGGGGGKGGGGGGGGKGGGGGGGGKGGGGGGGGGKGGGGGLLKLKLKLK.',
      'KLKLKLKLKGGGGGGGGGGGKGGGGGGGGKGGGGGGGGKGGGGGGGGGKGGGGGGLKLKLKLK.',
      'KLKLKLKLKGGGGGGGGGGGKGGGGGGGGKGGGGGGGGKGGGGGGGGGKGGGGGGLKLKLKLK.',
      'KLKLKLKLGGGGGGGGGGGKGGGGGGGGGKGGGGGGGGKGGGGGGGGGGKGGGGGLKLKLKLK.',
      'KLKLKLKLGGGGGGGGGGGKGGGGGGGGGKGGGGGGGKGGGGGGGGGGGKGGGGGLKLKLKLK.',
      'KLKLKLKLGGGGGGGGGGGKGGGGGGGGGKGGGGGGGKGGGGGGGGGGGKGGGGGGKK.K.K..',
      'KLKLKLKLGGGGGGGGGGGKGGGGGGGGGKGGGGGGGKGGGGGGGGGGGGKGGGGGK.......',
      '.K.K.K.KGGGGGGGGGGGKGGGGGGGGKGGGGGGGGKGGGGGGGGGGGGKGGGGGK.......',
      '........KGGGGGGGGGKGGGGGGGGGKGGGGGGGGKGGGGGGGGGGGGKGGGGK........',
      '.........KGGGGGGGGKGGGGGGGGGKGGGGGGGGKGGGGGGGGGGGGGGGGKKK.......',
      '.........KGGGGGGGGKGGGGGGGGGKGGGGGGGGKGGGGGGGGGGGGGGGKGGGK......',
      '.........KGGKGGGGGGGGGGGGGGGKGGGGGGGKGGGGGGGGGGGGGGGKKGGGK......',
      '.........KGGKKGGGGGGGGGGGGGGKGGGGGGGKGGGGGGGGGGGGGGGKKGGK.......',
      '..........KGKKGGGGGGGGGGGGGGGGGGGGGGKGGGGGGGGGGGGKKGKKGGK.......',
      '..........KGKKGGKKGGGGGGGGKGGGGGGGGGKGGGGGGGGGKGK.KGKKGGK.......',
      '...........K..KGK.KKGGGGGGKGGGGGGGGGGGGGGGGGKKKGK..K..KGK.......',
      '..............KGK..KGGGGGKGGGGGGGGGGGGGGGGGGK..K......KGK.......',
      '...............K....KKGGGKGGGGGGGGGGGGGGGGKGK..........K........',
      '.....................KGGKGGGGGGGGGGGGGGGKK.K....................',
      '....................KGGGKGGGGGGGGGGGGGKK........................',
      '...................KGGGGKGGGGGGGGGKKKK..........................',
      '...................KGGGKGGGGGGGGKK..............................',
      '..................KGGGGKGGGGGKKK................................',
      '.................KGGGGKGGGGGK...................................',
      '.................KGGGGKGGGKK....................................',
      '..................KGGGGGGK......................................',
      '..................KGGGGGK.......................................',
      '..................KGGGGGGK......................................',
      '...................KGGGGGGK.....................................',
      '....................KKKKKK......................................',
    ],
    aim: [
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '..........................................KKKKK.................',
      '..................................KKKKKKKKGGGGLK................',
      '..............................KKKKGGGGGGGGGGKLK.................',
      '.............................KGGGGGGGGGGGGGGKLGK................',
      '..................KKKKKKKKKKKKGGGGGGGGGGGGGKLGGK................',
      '.................KGGGGGGGGGGGGGGGGGGGGGGGGGKLGGK................',
      '................KGGGGGGGGGGGGGGGGGGGGGGGGGKLGGGK................',
      '...............KGGGGGGGGGGGGGGGGGGGGGGGGGGKLGGGGK...............',
      '..............KGGGGGGGGGGGGGGGGGGGGGGGGGGKLGGGGGGK..............',
      '.............KGGGGGGGGGGGGGGGGGGGGGGGGGGGKLGGGGGGGK......KKKKKK.',
      '.............KGGGGGGGGGGGGGGGGGGGGGGGGGGKLGGGGGGGGK.....KKLLLLLK',
      '............KGGGGGGGGGGGGGGGGGGGGGGGGGGGKLGGGGGGGGGK....KLLLLLLK',
      '...........KGGGGGGGGGGGGGGGGGGGGGGGGGGGKLGGGGGGGGGGGKKKKKLKKKKKK',
      '..........KGGGGGGGGGGGGGGGGGGGGGGGGGGGGKLGGGGGGGGGGGGGGGGLLLLLLK',
      '.........KGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGLLLLLLK',
      '.......KKGGGGGGGGGGGGGKGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGLKKKKKK',
      '......KGGGGGGGGGGGGGGGKGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGLLLLLLK',
      '....KKGGGGGGGGGGGGGGGGKGGGGGGGKGGGGGGGGGGGGGGGGGGGGGGGGGGLLLLLLK',
      '.KKKLLLLGGGGGGGGGGGGGKGGGGGGGGKGGGGGGGGGGGGGGGGGGGGGGGGGGLKKKKKK',
      'KLLLLLLLGGGGGGGGGGGGGKGGGGGGGGKGGGGGGGGGGGGGGGGGGGGGGGGKKLLLLLLK',
      'KLLLLLLLGGGGGGGGGGGGGKGGGGGGGGKGGGGGGGGGGGGGGGGGGGGGGGGKKLLLLLLK',
      'LLLLLLLLGGGGGGGGGGGGGKGGGGGGGGKGGGGGGGGGGGGGGGGKGGGGGGGKKLKKKKKK',
      'LLLLLLLLLGGGGGGGGGGGGKGGGGGGGGKGGGGGGGGGGGGGGGGKGGGGGGGK.KKKKKKK',
      'LLLLLLLLLGGGGGGGGGGGKGGGGGGGGKGGGGGGGGGGGGGGGGGGKGGGGGGK........',
      'LLLLLLLLLGGGGGGGGGGGKGGGGGGGGKGGGGGGGGGGGGGGGGGGKGGGGGGK........',
      'KKLLLLLLKGGGGGGGGGGGKGGGGGGGGKGGGGGGGGKGGGGGGGGGKGGGGGGK........',
      'KLKLKLKLKGGGGGGGGGGGKGGGGGGGGKGGGGGGGGKGGGGGGGGGKGGGGGGK........',
      'KLKLKLKLKGGGGGGGGGGGKGGGGGGGGKGGGGGGGGKGGGGGGGGGKGGGGGGK........',
      'KLKLKLKLGGGGGGGGGGGKGGGGGGGGGKGGGGGGGGKGGGGGGGGGGKGGGGGGK.......',
      'KLKLKLKLGGGGGGGGGGGKGGGGGGGGGKGGGGGGGKGGGGGGGGGGGKGGGGGGK.......',
      'KLKLKLKLGGGGGGGGGGGKGGGGGGGGGKGGGGGGGKGGGGGGGGGGGKGGGGGGK.......',
      'KLKLKLKLGGGGGGGGGGGKGGGGGGGGGKGGGGGGGKGGGGGGGGGGGGKGGGGGK.......',
      '.K.K.K.KGGGGGGGGGGGKGGGGGGGGKGGGGGGGGKGGGGGGGGGGGGKGGGGGK.......',
      '........KGGGGGGGGGKGGGGGGGGGKGGGGGGGGKGGGGGGGGGGGGKGGGGK........',
      '.........KGGGGGGGGKGGGGGGGGGKGGGGGGGGKGGGGGGGGGGGGGGGGKKK.......',
      '.........KGGGGGGGGKGGGGGGGGGKGGGGGGGGKGGGGGGGGGGGGGGGKGGGK......',
      '.........KGGKGGGGGGGGGGGGGGGKGGGGGGGKGGGGGGGGGGGGGGGKKGGGK......',
      '.........KGGKKGGGGGGGGGGGGGGKGGGGGGGKGGGGGGGGGGGGGGGKKGGK.......',
      '..........KGKKGGGGGGGGGGGGGGGGGGGGGGKGGGGGGGGGGGGKKGKKGGK.......',
      '..........KGKKGGKKGGGGGGGGKGGGGGGGGGKGGGGGGGGGKGK.KGKKGGK.......',
      '...........K..KGK.KKGGGGGGKGGGGGGGGGGGGGGGGGKKKGK..K..KGK.......',
      '..............KGK..KGGGGGKGGGGGGGGGGGGGGGGGGK..K......KGK.......',
      '...............K....KKGGGKGGGGGGGGGGGGGGGGKGK..........K........',
      '.....................KGGKGGGGGGGGGGGGGGGKK.K....................',
      '....................KGGGKGGGGGGGGGGGGGKK........................',
      '...................KGGGGKGGGGGGGGGKKKK..........................',
      '...................KGGGKGGGGGGGGKK..............................',
      '..................KGGGGKGGGGGKKK................................',
      '.................KGGGGKGGGGGK...................................',
      '.................KGGGGKGGGKK....................................',
      '..................KGGGGGGK......................................',
      '..................KGGGGGK.......................................',
      '..................KGGGGGGK......................................',
      '...................KGGGGGGK.....................................',
      '....................KKKKKK......................................',
    ],
    hit: [
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '..........................................KKKKK.................',
      '..................................KKKKKKKKGGGGLK................',
      '..............................KKKKGGGGGGGGGGKLK.................',
      '.............................KGGGGGGGGGGGGGGKLGK................',
      '..................KKKKKKKKKKKKGGGGGGGGGGGGGKLGGK................',
      '.................KGGGGGGGGGGGGGGGGGGGGGGGGGKLGGK................',
      '................KGGGGGGGGGGGGGGGGGGGGGGGGGKLGGGK................',
      '...............KGGGGGGGGGGGGGGGGGGGGGGGGGGKLGGGGK...............',
      '..............KGGGGGGGGGGGGGGGGGGGGGGGGGGKLGGGGGGK..............',
      '.............KGGGGGGGGGGGGGGGGGGGGGGGGGGGKLGGGGGGGK.............',
      '.............KGGGGGGGGGGGGGGGGGGGGGGGGGGKLGGGGGGGGK.............',
      '............KGGGGGGGGGGGGGGGGGGGGGGGGGGGKLGGGGGGGGGK............',
      '...........KGGGGGGGGGGGGGGGGGGGGGGGGGGGKLGGGGGGGGGGGK...........',
      '..........KGGGGGGGGGGGGGGGGGGGGGGGGGGGGKLGGGGGGGGGGGGK..........',
      '.........KGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGK.........',
      '.......KKGGGGGGGGGGGGGKGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGK.........',
      '......KGGGGGGGGGGGGGGGKGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGKK........',
      '....KKGGGGGGGGGGGGGGGGKGGGGGGGKGGGGGGGGGGGGGGGGGGGGGGGLLKKK.....',
      '.KKKLLLLGGGGGGGGGGGGGKGGGGGGGGKGGGGGGGGGGGGGGGGGGGGGGGLLLLLKK...',
      'KLLLLLLLGGGGGGGGGGGGGKGGGGGGGGKGGGGGGGGGGGGGGGGGGGGGGLLLLLLLLK..',
      'KLLLLLLLGGGGGGGGGGGGGKGGGGGGGGKGGGGGGGGGGGGGGGGGGGGGGLLLLLLLLK..',
      'LLLLLLLLGGGGGGGGGGGGGKGGGGGGGGKGGGGGGGGGGGGGGGGKGGGGLLLLLLLLLK..',
      'LLLLLLLLLGGGGGGGGGGGGKGGGGGGGGKGGGGGGGGGGGGGGGGKGGGGLLLLLLLLLLK.',
      'LLLLLLLLLGGGGGGGGGGGKGGGGGGGGKGGGGGGGGGGGGGGGGGGKGGGLLLLLLLLLLK.',
      'LLLLLLLLLGGGGGGGGGGGKGGGGGGGGKGGGGGGGGGGGGGGGGGGKGGGGGLLKLKLKLK.',
      'KKLLLLLLKGGGGGGGGGGGKGGGGGGGGKGGGGGGGGKGGGGGGGGGKGGGGGLLKLKLKLK.',
      'KLKLKLKLKGGGGGGGGGGGKGGGGGGGGKGGGGGGGGKGGGGGGGGGKGGGGGGLKLKLKLK.',
      'KLKLKLKLKGGGGGGGGGGGKGGGGGGGGKGGGGGGGGKGGGGGGGGGKGGGGGGLKLKLKLK.',
      'KLKLKLKLGGGGGGGGGGGKGGGGGGGGGKGGGGGGGGKGGGGGGGGGGKGGGGGLKLKLKLK.',
      'KLKLKLKLGGGGGGGGGGGKGGGGGGGGGKGGGGGGGKGGGGGGGGGGGKGGGGGLKLKLKLK.',
      'KLKLKLKLGGGGGGGGGGGKGGGGGGGGGKGGGGGGGKGGGGGGGGGGGKGGGGGGKK.K.K..',
      'KLKLKLKLGGGGGGGGGGGKGGGGGGGGGKGGGGGGGKGGGGGGGGGGGGKGGGGGK.......',
      '.K.K.K.KGGGGGGGGGGGKGGGGGGGGKGGGGGGGGKGGGGGGGGGGGGKGGGGGK.......',
      '........KGGGGGGGGGKGGGGGGGGGKGGGGGGGGKGGGGGGGGGGGGKGGGGK........',
      '.........KGGGGGGGGKGGGGGGGGGKGGGGGGGGKGGGGGGGGGGGGGGGGKKK.......',
      '.........KGGGGGGGGKGGGGGGGGGKGGGGGGGGKGGGGGGGGGGGGGGGKGGGK......',
      '.........KGGKGGGGGGGGGGGGGGGKGGGGGGGKGGGGGGGGGGGGGGGKKGGGK......',
      '.........KGGKKGGGGGGGGGGGGGGKGGGGGGGKGGGGGGGGGGGGGGGKKGGK.......',
      '..........KGKKGGGGGGGGGGGGGGGGGGGGGGKGGGGGGGGGGGGKKGKKGGK.......',
      '..........KGKKGGKKGGGGGGGGKGGGGGGGGGKGGGGGGGGGKGK.KGKKGGK.......',
      '...........K..KGK.KKGGGGGGKGGGGGGGGGGGGGGGGGKKKGK..K..KGK.......',
      '..............KGK..KGGGGGKGGGGGGGGGGGGGGGGGGK..K......KGK.......',
      '...............K....KKGGGKGGGGGGGGGGGGGGGGKGK..........K........',
      '.....................KGGKGGGGGGGGGGGGGGGKK.K....................',
      '....................KGGGKGGGGGGGGGGGGGKK........................',
      '...................KGGGGKGGGGGGGGGKKKK..........................',
      '...................KGGGKGGGGGGGGKK..............................',
      '..................KGGGGKGGGGGKKK................................',
      '.................KGGGGKGGGGGK...................................',
      '.................KGGGGKGGGKK....................................',
      '..................KGGGGGGK......................................',
      '..................KGGGGGK.......................................',
      '..................KGGGGGGK......................................',
      '...................KGGGGGGK.....................................',
      '....................KKKKKK......................................',
    ],
  },
};
const mikitkoGhostHair: SpriteDef = {
  w: 64,
  h: 80,
  palette: { K: 0x000000, H: 0x503000, h: 0x885020 },
  frames: {
    idle: [
      '.......................KKKKKKKKKKKKKKKKK........................',
      '.....................KKKKKKKHKKKKKKKKKKKKKK.....................',
      '...................KKKKHHHhhHHHHhhhhhhhhKKKK....................',
      '................KKKKKHHhhhhhhHhhhhHHHHKKKhhKK...................',
      '...........KKKKKKKKhhhhhhhhhhhHHHHHHH...hKKK....................',
      '......KKKKKKKKKKhhhHHHHHHhhhhHHHHHH.......K.....................',
      '.....KKKKKKhhhhhhhhhhhHhhHHHHHHH................................',
      '....KKhhhhhhhhhhhhHHHHhhhhhHHHH.................................',
      '....KKhhhhhhhhhhhhHHHHHhhHHhhhh.................................',
      '....KKKKKKhhhhhHHHHHHhhHHHHHHHH..........KKK....................',
      '...KKKKKhhHHHHHHHHhhhHHHHHHHHH........KKK.......................',
      '..KKHHHHHHHHHHHHhhHHHHHHHHHHHH..................................',
      '..KKHHHHHHHHHhhhHHHHHHHHHHHHHH..........K.......................',
      '...KKKKKKKHhhHHhhhHHHHHHHHHHHH..................................',
      '..KKKKKKhhhhhhhhhhHHHhhHHHHHHH..................................',
      '.KKhhhhhhhhhhhhhhhHhhHHHHHHHHH..................................',
      '.KKhhhhhhhhhhhhhhhhHHHHHHHHHHH..................................',
      '..KKKKKKKhhhhhhhHHHHHHHHHHHHHHH.................................',
      '...KKKKKKKHhhhHHHHHHHHHHHHHHHHH.................................',
      '...KKHHHHhhHHHHHHHHHHHHHHHHHHHH.................................',
      '..KKKHhhhHHHHHHHHHHHHhhHHHHHHHHHHHHHHHHHhhhhhhhhhK..............',
      '.KKKhhKKKKHHHHHHhhHhhHHHHHHHHHHHHHHHHHHHHHHHHHKKKhK.............',
      'KKhhKKKKKKhhhhhhhhhHHHHHHHHHHHhHHHHHHHHHHHKKKKKK.K..............',
      '.KKKKKhhhhhhhhhhhhHHHHHHHHHHHHhHHHHHHHHHHHHHHHHK................',
      '..KKKKhhhhhhhhhhhhHHHHHHHHHHHhHHHhHHHHHHHHHHHHHHK...............',
      '.....KKKKKhhhhhhHHHHHHHHHHHHHhHHHhHHhHHHHHHHhHHHK...............',
      '....KKKKhhKKHHHHHHHHHHHHHHHHHhHHhHHHhHHHhHHHhHHHK...............',
      '...KKKhhHHHHHHHHHHHHHHHHHHHHhHHHhHHHhHHHhHHhHHHHK...............',
      '..KKhhKHHHHHHHHHHHKHHHHHHHHHhHHHhHHHhHHHhHHhHHHK................',
      '...KKKKKKKKKHHHHhhKKKHHHHHHHHHHHhHHHhHHHhHHhHHHK................',
      '....KK.KKKKKKhhhhhKKKKKHHHHHHHHHhHHHhHHhHHHhHHK.................',
      '........KKhhhhhhhhKK.KKKKKKKHHHhHHHhHHHhHHhHHK..................',
      '........KKhhhhhhhhKK...KKKKKKKHhHHHhHHHhHHhHHK..................',
      '.........KKKKhhhhhKK........KKHHHHHhHHHhHHHHK...................',
      '..........KKKKKKhhKK..........KHHHHhHHHhHHHHK...................',
      '.............KKKKKK............KHHHhHHhHHHKK....................',
      '................KK..............KHHhHHhHHHK.....................',
      '.................................KHHHHhHKK......................',
      '..................................KKHHhHK.......................',
      '....................................KHKK........................',
      '.....................................K..........................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
    ],
    aim: [
      '.......................KKKKKKKKKKKKKKKKK........................',
      '.....................KKKKKKKHKKKKKKKKKKKKKK.....................',
      '...................KKKKHHHhhHHHHhhhhhhhhKKKK....................',
      '................KKKKKHHhhhhhhHhhhhHHHHKKKhhKK...................',
      '...........KKKKKKKKhhhhhhhhhhhHHHHHHH...hKKK....................',
      '......KKKKKKKKKKhhhHHHHHHhhhhHHHHHH.......K.....................',
      '.....KKKKKKhhhhhhhhhhhHhhHHHHHHH................................',
      '....KKhhhhhhhhhhhhHHHHhhhhhHHHH.................................',
      '....KKhhhhhhhhhhhhHHHHHhhHHhhhh.................................',
      '....KKKKKKhhhhhHHHHHHhhHHHHHHHH..........KKK....................',
      '...KKKKKhhHHHHHHHHhhhHHHHHHHHH........KKK.......................',
      '..KKHHHHHHHHHHHHhhHHHHHHHHHHHH..................................',
      '..KKHHHHHHHHHhhhHHHHHHHHHHHHHH..........K.......................',
      '...KKKKKKKHhhHHhhhHHHHHHHHHHHH..................................',
      '..KKKKKKhhhhhhhhhhHHHhhHHHHHHH..................................',
      '.KKhhhhhhhhhhhhhhhHhhHHHHHHHHH..................................',
      '.KKhhhhhhhhhhhhhhhhHHHHHHHHHHH..................................',
      '..KKKKKKKhhhhhhhHHHHHHHHHHHHHHH.................................',
      '...KKKKKKKHhhhHHHHHHHHHHHHHHHHH.................................',
      '...KKHHHHhhHHHHHHHHHHHHHHHHHHHH.................................',
      '..KKKHhhhHHHHHHHHHHHHhhHHHHHHHHHHHHHHHHHhhhhhhhhhK..............',
      '.KKKhhKKKKHHHHHHhhHhhHHHHHHHHHHHHHHHHHHHHHHHHHKKKhK.............',
      'KKhhKKKKKKhhhhhhhhhHHHHHHHHHHHhHHHHHHHHHHKKKKKHK.K..............',
      '.KKKKKhhhhhhhhhhhhHHHHHHHHHHHHhHHHHHHHHHHKKKKKHK................',
      '..KKKKhhhhhhhhhhhhHHHHHHHHHHHhHHHhHHHHHHHHKKKHHHK...............',
      '.....KKKKKhhhhhhHHHHHHHHHHHHHhHHHhHHhHHHHHKKKHHHK...............',
      '....KKKKhhKKHHHHHHHHHHHHHHHHHhHHhHHHhHHHhHHHhHHHK...............',
      '...KKKhhHHHHHHHHHHHHHHHHHHHHhHHHhHHHhHHHhHHhHHHHK...............',
      '..KKhhKHHHHHHHHHHHKHHHHHHHHHhHHHhHHHhHHHhHHhHHHK................',
      '...KKKKKKKKKHHHHhhKKKHHHHHHHHHHHhHHHhHHHhHHhHHHK................',
      '....KK.KKKKKKhhhhhKKKKKHHHHHHHHHhHHHhHHhHHHhHHK.................',
      '........KKhhhhhhhhKK.KKKKKKKHHHhHHHhHHHhHHhHHK..................',
      '........KKhhhhhhhhKK...KKKKKKKHhHHHhHHHhHHhHHK..................',
      '.........KKKKhhhhhKK........KKHHHHHhHHHhHHHHK...................',
      '..........KKKKKKhhKK..........KHHHHhHHHhHHHHK...................',
      '.............KKKKKK............KHHHhHHhHHHKK....................',
      '................KK..............KHHhHHhHHHK.....................',
      '.................................KHHHHhHKK......................',
      '..................................KKHHhHK.......................',
      '....................................KHKK........................',
      '.....................................K..........................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
    ],
    hit: [
      '.......................KKKKKKKKKKKKKKKKK........................',
      '.....................KKKKKKKHKKKKKKKKKKKKKK.....................',
      '...................KKKKHHHhhHHHHhhhhhhhhKKKK....................',
      '................KKKKKHHhhhhhhHhhhhHHHHKKKhhKK...................',
      '...........KKKKKKKKhhhhhhhhhhhHHHHHHH...hKKK....................',
      '......KKKKKKKKKKhhhHHHHHHhhhhHHHHHH.......K.....................',
      '.....KKKKKKhhhhhhhhhhhHhhHHHHHHH................................',
      '....KKhhhhhhhhhhhhHHHHhhhhhHHHH.................................',
      '....KKhhhhhhhhhhhhHHHHHhhHHhhhh.................................',
      '....KKKKKKhhhhhHHHHHHhhHHHHHHHH.................................',
      '...KKKKKhhHHHHHHHHhhhHHHHHHHHH........KKKKKK....................',
      '..KKHHHHHHHHHHHHhhHHHHHHHHHHHH..................................',
      '..KKHHHHHHHHHhhhHHHHHHHHHHHHHH...........KKK....................',
      '...KKKKKKKHhhHHhhhHHHHHHHHHHHH.........KK.......................',
      '..KKKKKKhhhhhhhhhhHHHhhHHHHHHH..................................',
      '.KKhhhhhhhhhhhhhhhHhhHHHHHHHHH..................................',
      '.KKhhhhhhhhhhhhhhhhHHHHHHHHHHH..................................',
      '..KKKKKKKhhhhhhhHHHHHHHHHHHHHHH.................................',
      '...KKKKKKKHhhhHHHHHHHHHHHHHHHHH.................................',
      '...KKHHHHhhHHHHHHHHHHHHHHHHHHHH.................................',
      '..KKKHhhhHHHHHHHHHHHHhhHHHHHHHHHHHHHHHHHhhhhhhhhhK..............',
      '.KKKhhKKKKHHHHHHhhHhhHHHHHHHHHHHHHHHHHHHHHHHHHKKKhK.............',
      'KKhhKKKKKKhhhhhhhhhHHHHHHHHHHHhHHHHHHHHHHKKKKKHK.K..............',
      '.KKKKKhhhhhhhhhhhhHHHHHHHHHHHHhHHHHHHHHHHKKKKKHK................',
      '..KKKKhhhhhhhhhhhhHHHHHHHHHHHhHHHhHHHHHHHHKKKHHHK...............',
      '.....KKKKKhhhhhhHHHHHHHHHHHHHhHHHhHHhHHHHHKKKHHHK...............',
      '....KKKKhhKKHHHHHHHHHHHHHHHHHhHHhHHHhHHHhHHHhHHHK...............',
      '...KKKhhHHHHHHHHHHHHHHHHHHHHhHHHhHHHhHHHhHHhHHHHK...............',
      '..KKhhKHHHHHHHHHHHKHHHHHHHHHhHHHhHHHhHHHhHHhHHHK................',
      '...KKKKKKKKKHHHHhhKKKHHHHHHHHHHHhHHHhHHHhHHhHHHK................',
      '....KK.KKKKKKhhhhhKKKKKHHHHHHHHHhHHHhHHhHHHhHHK.................',
      '........KKhhhhhhhhKK.KKKKKKKHHHhHHHhHHHhHHhHHK..................',
      '........KKhhhhhhhhKK...KKKKKKKHhHHHhHHHhHHhHHK..................',
      '.........KKKKhhhhhKK........KKHHHHHhHHHhHHHHK...................',
      '..........KKKKKKhhKK..........KHHHHhHHHhHHHHK...................',
      '.............KKKKKK............KHHHhHHhHHHKK....................',
      '................KK..............KHHhHHhHHHK.....................',
      '.................................KHHHHhHKK......................',
      '..................................KKHHhHK.......................',
      '....................................KHKK........................',
      '.....................................K..........................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
    ],
  },
};
const mikitkoGhostFace: SpriteDef = {
  w: 64,
  h: 80,
  palette: { S: 0xfcbcb0, s: 0xc88870, E: 0x3c78c8 },
  frames: {
    idle: [
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '.....................................SSS........................',
      '...................................SSSSSSS......................',
      '................................SSSSSSSSSSS.....................',
      '...............................SSSSSSSSSSSSS....................',
      '...............................SSSSSSSSSSSSSS...................',
      '...............................SSSSSSSSSS...Ss..................',
      '..............................SSSSSSSS...SSSSs..................',
      '..............................SSSSSSSSSSSSSSSs..................',
      '..............................ssssSSSSSS.EESSs..................',
      '..............................ssssSSSSSSSSSSSsS.................',
      '..............................ssssSSSSSSSSSSSSS.................',
      '..............................SssssSSSSSSSSSSSSS................',
      '..............................SssssSSSSSSSSSSSSSS...............',
      '...............................ssssSSSSSSSSSSSSSSS..............',
      '...............................ssssSSSSSSSSSSSSSSS..............',
      '...............................ssssSSSSSSSSSSSsss...............',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
    ],
    aim: [
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '.....................................SSS........................',
      '...................................SSSSSSS......................',
      '................................SSSSSSSSSSS.....................',
      '...............................SSSSSSSSSSSSS....................',
      '...............................SSSSSSSSSSSSSS...................',
      '...............................SSSSSSSSSS...Ss..................',
      '..............................SSSSSSSS...SSSSs..................',
      '..............................SSSSSSSSSSSSSSSs..................',
      '..............................ssssSSSSSS.EESSs..................',
      '..............................ssssSSSSSSSSSSSsS.................',
      '..............................ssssSSSSSSSSSSSSS.................',
      '..............................SssssSSSSSSSSSSSSS................',
      '..............................SssssSSSSSSSSSSSSSS...............',
      '...............................ssssSSSSSSSSSSSSSSS..............',
      '...............................ssssSSSSSSSSSSSSSSS..............',
      '...............................ssssSSSSSSSSSSSsss...............',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
    ],
    hit: [
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '.....................................SSS........................',
      '...................................SSSSSSS......................',
      '................................SSSSSSSSSSS.....................',
      '...............................SSSSSSSSSSSSS....................',
      '...............................SSSSSSSSSSSSSS...................',
      '...............................SSSSSSSSSSSSSSs..................',
      '..............................SSSSSSSS......Ss..................',
      '..............................SSSSSSSSSSSSSSSs..................',
      '..............................ssssSSSSSSS...Ss..................',
      '..............................ssssSSSSS..SSSSsS.................',
      '..............................ssssSSSSSSSSSSSSS.................',
      '..............................SssssSSSSSSSSSSSSS................',
      '..............................SssssSSSSSSSSSSSSSS...............',
      '...............................ssssSSSSSSSSSSSSSSS..............',
      '...............................ssssSSSSSSSSSSSSSSS..............',
      '...............................ssssSSSSSSSSSSSsss...............',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
    ],
  },
};

/** Буквы ѣ, і, ѳ — то, что роняет призрак Микитко и чем в него бросают (ТЗ). */
const letter: SpriteDef = {
  w: 16,
  h: 16,
  palette: { D: 0x000000, W: 0xfce0a8 },
  frames: {
    yat: [
      '................',
      '....DDDD........',
      '....DWWD........',
      '.DDDDWWDDDD.....',
      '.DWWWWWWWWD.....',
      '.DDDDWWDDDD.....',
      '....DWWD........',
      '....DWWDDDDD....',
      '....DWWWWWWWD...',
      '....DWWDDDDWWD..',
      '....DWWD..DWWD..',
      '....DWWD..DWWD..',
      '....DWWDDDDWWD..',
      '....DWWWWWWWD...',
      '....DDDDDDDD....',
      '................',
    ],
    i: [
      '......DDDD......',
      '......DWWD......',
      '......DWWD......',
      '......DDDD......',
      '................',
      '.....DDDDD......',
      '.....DWWWD......',
      '.....DDWWD......',
      '......DWWD......',
      '......DWWD......',
      '......DWWD......',
      '......DWWD......',
      '.....DDWWDD.....',
      '.....DWWWWD.....',
      '.....DDDDDD.....',
      '................',
    ],
    fita: [
      '................',
      '.....DDDDDD.....',
      '...DDWWWWWWDD...',
      '..DWWDDDDDDWWD..',
      '.DWWD......DWWD.',
      '.DWWD......DWWD.',
      '.DWWDDDDDDDDWWD.',
      '.DWWWWWWWWWWWWD.',
      '.DWWDDDDDDDDWWD.',
      '.DWWD......DWWD.',
      '.DWWD......DWWD.',
      '..DWWDDDDDDWWD..',
      '...DDWWWWWWDD...',
      '.....DDDDDD.....',
      '................',
      '................',
    ],
  },
};

/**
 * Луч призрака: ровный прямой отрезок одной толщины — белое ядро, лавандовая кромка (отзыв:
 * прежний, с утолщением на конце и волнистым хвостом, выглядел неприлично). Мерцает.
 */
const beam: SpriteDef = {
  w: 32,
  h: 4,
  palette: { L: 0x9878f8, W: 0xf8f8f8 },
  frames: {
    a: [
      'LLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLL',
      'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW',
      'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW',
      'LLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLL',
    ],
    b: [
      'LLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLL',
      'WWWLWWWWWWWLWWWWWWWLWWWWWWWLWWWW',
      'WWWWWWWLWWWWWWWLWWWWWWWLWWWWWWWL',
      'LLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLL',
    ],
  },
};

/** Пламя свечи на арене архива (горит и в темноте, как в оригинале). */
const flame: SpriteDef = {
  w: 16,
  h: 11,
  palette: { R: 0xf83800, Y: 0xfce0a8 },
  frames: {
    a: [
      '.......R........',
      '...R...R..R.....',
      '...RR.RRR.RR....',
      '..RRRRRRRRRR....',
      '..RRRYYYYRRRR...',
      '.RRRYYYYYYRRR...',
      '.RRYYYYYYYYRR...',
      '.RRYYYYYYYYRR...',
      '..RRYYYYYYRR....',
      '...RRRYYRRR.....',
      '.....RRRR.......',
    ],
    b: [
      '.........R......',
      '....R..R.R..R...',
      '....RRRRR..RR...',
      '...RRRRRRRRRR...',
      '..RRRRYYYYRRR...',
      '..RRRYYYYYYRRR..',
      '..RRYYYYYYYYRR..',
      '..RRYYYYYYYYRR..',
      '...RRYYYYYYRR...',
      '....RRRYYRRR....',
      '......RRRR......',
    ],
  },
};

/**
 * Призрак удалённого комментария (уровень 5, ТЗ): бледное облачко-рожица в синем пламени,
 * как огоньки на складе оригинала; хвост — обрывки текста.
 */
const commentGhost: SpriteDef = {
  w: 16,
  h: 14,
  palette: { B: 0x3cbcfc, W: 0xfce0a8, D: 0x000000 },
  frames: {
    fly1: [
      '....BBBBBBB.....',
      '..BBWWWWWWWBB...',
      '.BWWWWWWWWWWWBB.',
      'BWWDDWWWDDWWWWBB',
      'BWWDWWWWWDWWWWWB',
      'BWWWWWWWWWWWWWB.',
      'BWWWDDDDDWWWWWBB',
      '.BWWWWWWWWWWWB.B',
      '..BBWWWWWWWBB..B',
      '....BBWBBBB.B...',
      '......BB..B.....',
      '.....B..B.......',
      '....B...........',
      '................',
    ],
    fly2: [
      '....BBBBBBB.....',
      '..BBWWWWWWWBB...',
      '.BWWWWWWWWWWWBB.',
      'BWWDDWWWDDWWWWBB',
      'BWWDWWWWWDWWWWWB',
      'BWWWWWWWWWWWWWB.',
      'BWWWDDDDDWWWWWB.',
      '.BWWWWWWWWWWWBBB',
      '..BBWWWWWWWBB...',
      '....BBBBWBB..B..',
      '.......B.BB.....',
      '......B....B....',
      '.........B......',
      '................',
    ],
  },
};

/** Свеча на ножках (уровень 5, по оригиналу): пламя на макушке, рыжие ботинки. ceil — вверх ногами. */
const candle: SpriteDef = {
  w: 12,
  h: 20,
  palette: { W: 0xf8f8f8, O: 0xf83800, D: 0x000000 },
  frames: {
    walk1: [
      '.....O......',
      '....OWO.....',
      '....OWO.....',
      '.....D......',
      '..WWWWWWWW..',
      '..WWWWWWWW..',
      '.WWDWWWWDWW.',
      '.WWDWWWWDWW.',
      '.WWWWWWWWWW.',
      '.WWWDDDDWWW.',
      '.WWWWDDWWWW.',
      '.WWWWWWWWWW.',
      '..WWWWWWWW..',
      '..WWWWWWWW..',
      '...WWWWWW...',
      '..OO....OO..',
      '..OOO..OOO..',
      '.OO.O..O.OO.',
      '.O..O..O..O.',
      'OO..OO.OO.OO',
    ],
    walk2: [
      '.....O......',
      '....OWO.....',
      '....OWO.....',
      '.....D......',
      '..WWWWWWWW..',
      '..WWWWWWWW..',
      '.WWDWWWWDWW.',
      '.WWDWWWWDWW.',
      '.WWWWWWWWWW.',
      '.WWWDDDDWWW.',
      '.WWWWDDWWWW.',
      '.WWWWWWWWWW.',
      '..WWWWWWWW..',
      '..WWWWWWWW..',
      '...WWWWWW...',
      '...OO..OO...',
      '...OOOOOO...',
      '..OO....OO..',
      '.OO......OO.',
      'OO........OO',
    ],
    ceil1: [
      'OO..OO.OO.OO',
      '.O..O..O..O.',
      '.OO.O..O.OO.',
      '..OOO..OOO..',
      '..OO....OO..',
      '...WWWWWW...',
      '..WWWWWWWW..',
      '..WWWWWWWW..',
      '.WWWWWWWWWW.',
      '.WWWWDDWWWW.',
      '.WWWDDDDWWW.',
      '.WWWWWWWWWW.',
      '.WWDWWWWDWW.',
      '.WWDWWWWDWW.',
      '..WWWWWWWW..',
      '..WWWWWWWW..',
      '.....D......',
      '....OWO.....',
      '....OWO.....',
      '.....O......',
    ],
    ceil2: [
      'OO........OO',
      '.OO......OO.',
      '..OO....OO..',
      '...OOOOOO...',
      '...OO..OO...',
      '...WWWWWW...',
      '..WWWWWWWW..',
      '..WWWWWWWW..',
      '.WWWWWWWWWW.',
      '.WWWWDDWWWW.',
      '.WWWDDDDWWW.',
      '.WWWWWWWWWW.',
      '.WWDWWWWDWW.',
      '.WWDWWWWDWW.',
      '..WWWWWWWW..',
      '..WWWWWWWW..',
      '.....D......',
      '....OWO.....',
      '....OWO.....',
      '.....O......',
    ],
  },
};

/**
 * Дмитрий Петровский — помощник перед ареной уровня 5 (на месте Рокфора). По фото
 * (`docs/refs/petrovsky_1.png`): бритая голова, густая тёмная борода лопатой, тёмный пиджак,
 * светлая рубашка. Анфас, симметричный.
 */
const PETROVSKY_HEAD = mirror([
  '........DDDD',
  '......DDSSSS',
  '.....DSSSSSS',
  '....DSSSSSSS',
  '....DSSSSSSS',
  '...DSSSSSSSS',
  '...DSSSSSSSS',
  '...DSSDDDSSS',
  '...DSSSSSSSS',
  '..DDSSDDSSSS',
  '..DSDSSSSSSS',
  '..DDYSSSSSSS',
  '...DYSSSSSSD',
  '...DYYYYYYYY',
  '...YYYYYYYDD',
  '...YYYYYYYYY',
  '...YYYYYYYYY',
  '....YYYYYYYY',
  '.....YYYYYYY',
  '......YYYYYY',
]);
const PETROVSKY_TORSO = mirror([
  '.......DYYYY',
  '....DDDDDYYY',
  '..DDDDDDDSYY',
  '.DDDDDDDDSSY',
  '.DDDDDDDDDSS',
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
const petrovsky: SpriteDef = {
  w: 24,
  h: 40,
  palette: { D: 0x000000, S: 0xfcbcb0, Y: 0x503000 },
  frames: { idle: [...PETROVSKY_HEAD, ...PETROVSKY_TORSO, ...BORDACHEV_LEGS] },
};

// ——— Уровень 6 «Часовая башня» ———

const MOLE_OUT = [
  '................',
  '.....DDDDDD.....',
  '....DHHHHHHD....',
  '...DHHHHHHHHD...',
  '...DHHHHHHHHD...',
  '..DDDDDDDDDDDD..',
  '...DBBBBBBBBD...',
  '...DBBBBBDBBD...',
  '...DBBBBBDBBD...',
  '...DBBBBBBBDDD..',
  '..DBBBBBBBBBBD..',
  '.DBBDBBBBBBDBBD.',
  '.DBBBBBBBBBBBBD.',
  '..DBBBBBBBBBBD..',
  '..DBBBBBBBBBBD..',
  '..DDDDDDDDDDDD..',
];
/** Крот-дедлайн в жёлтой каске (крот часовой башни оригинала). Смотрит вправо. */
const mole: SpriteDef = {
  w: 16,
  h: 16,
  palette: { D: 0x000000, H: 0xf8b800, B: 0x881400 },
  frames: {
    out: MOLE_OUT,
    // Лапа с ключом поднята над каской.
    throw: patch(MOLE_OUT, [
      [12, 1, 'D'],
      [13, 1, 'D'],
      [12, 2, 'D'],
      [13, 2, 'B'],
      [14, 2, 'D'],
      [13, 3, 'B'],
      [14, 3, 'D'],
      [13, 4, 'B'],
      [14, 4, 'D'],
      [14, 11, 'D'],
      [13, 11, 'B'],
    ]),
    // Только каска над уступом.
    hide: [
      ...Array.from({ length: 10 }, () => '................'),
      '.....DDDDDD.....',
      '....DHHHHHHD....',
      '...DHHHHHHHHD...',
      '...DHHHHHHHHD...',
      '..DDDDDDDDDDDD..',
      '..DDDDDDDDDDDD..',
    ],
    // Выглядывает: каска и глаза.
    peek: [
      ...Array.from({ length: 6 }, () => '................'),
      '.....DDDDDD.....',
      '....DHHHHHHD....',
      '...DHHHHHHHHD...',
      '...DHHHHHHHHD...',
      '..DDDDDDDDDDDD..',
      '...DBBBBBDBBD...',
      '...DBBBBBDBBD...',
      '...DBBBBBBBDDD..',
      '..DBBBBBBBBBBD..',
      '..DDDDDDDDDDDD..',
    ],
  },
};

const RAT_BODY = [
  '................',
  '..........DD....',
  '.........DGGD...',
  '........DGGGGDD.',
  '..DDDDDDGGGDGGGD',
  '.DGGGGGGGGGGGGGD',
  'DGGGGGGGGGGGGDD.',
  'DGGGGGGGGGGGGD..',
  '.DGGGGGGGGGGD...',
  'D.DDDDDDDDDD....',
];
/** Крыса-напоминалка (электрокрыса оригинала): серая, хвост, искрит жёлтым. Смотрит вправо. */
const rat: SpriteDef = {
  w: 16,
  h: 12,
  palette: { D: 0x000000, G: 0xbcbcbc, Y: 0xf8d878 },
  frames: {
    walk1: [...RAT_BODY, 'D..DD....DD.....', '.DD.............'],
    walk2: [...RAT_BODY, 'D...DD..DD......', '.DD.............'],
    spark1: patch(
      [...RAT_BODY, 'D..DD....DD.....', '.DD.............'],
      [
        [3, 1, 'Y'],
        [5, 2, 'Y'],
        [14, 0, 'Y'],
        [0, 3, 'Y'],
        [15, 8, 'Y'],
        [13, 10, 'Y'],
        [7, 0, 'Y'],
      ],
    ),
    spark2: patch(
      [...RAT_BODY, 'D...DD..DD......', '.DD.............'],
      [
        [2, 2, 'Y'],
        [6, 1, 'Y'],
        [12, 0, 'Y'],
        [15, 2, 'Y'],
        [14, 9, 'Y'],
        [1, 4, 'Y'],
        [6, 11, 'Y'],
      ],
    ),
  },
};

/** Гаечный ключ крота. */
const wrench: SpriteDef = {
  w: 8,
  h: 8,
  palette: { D: 0x000000, G: 0xbcbcbc },
  frames: {
    idle: [
      '.DD.DD..',
      'DGGDGGD.',
      'DGGGGD..',
      '.DGGGGD.',
      '..DDGGGD',
      '....DGGD',
      '.....DGD',
      '......D.',
    ],
  },
};

/** Разряд крысы — бежит по полу. */
const bolt: SpriteDef = {
  w: 12,
  h: 8,
  palette: { D: 0x000000, Y: 0xf8d878, W: 0xfcfcfc },
  frames: {
    idle: [
      '...D....D...',
      '..DYD..DYD..',
      '.DYWYDDYWYD.',
      'DYWDWYYWDWYD',
      'DYD.DWWD.DYD',
      '.D...DD...D.',
      '............',
      '............',
    ],
  },
};

/** Платформа на цепи: стальная доска на подвесах. */
const chainPlatform: SpriteDef = {
  w: 32,
  h: 8,
  palette: { D: 0x000000, G: 0xbcbcbc, B: 0x7c7c7c },
  frames: {
    idle: [
      'DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD',
      'DGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGD',
      'DGBGGGGGGGGGGGGGGGGGGGGGGGGGGBGD',
      'DGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGD',
      'DBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBD',
      'DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD',
      '..............DDDD..............',
      '..............DBBD..............',
    ],
  },
};

const GEAR_TOP = mirror([
  '......DD',
  '..DD.DYY',
  '.DYYDDYY',
  '.DYYYYYY',
  '..DYYOOO',
  'DDDYOOOO',
  'DYYYOODD',
  'DYYYOOD.',
]);
/** Шестерёнка Щелина (снаряд и предмет арены). */
const gear: SpriteDef = {
  w: 16,
  h: 16,
  palette: { D: 0x000000, Y: 0xf8b800, O: 0xac7c00 },
  frames: { idle: [...GEAR_TOP, ...[...GEAR_TOP].reverse()] },
};

/**
 * Павел Щелин на моноцикле-шестерне (страус часовой башни оригинала). По фото
 * (`docs/refs/shchelin_1.png`): тёмные короткие волосы набок, высокий лоб, тонкие очки,
 * короткая борода с усами, светлый свитер. Анфас; внизу — шестерня-колесо.
 */
const SHCHELIN_HEAD = [
  '..........DDDDD.........',
  '.......DDDDDDDDDDD......',
  '.....DDDDDDDDDDDDDDD....',
  '.....DDDDDDSSSSSSSDDD...',
  '.....DDSSSSSSSSSSSSDD...',
  '....SDDDDDDDDDDDDDDDDS..',
  '....SDSSDSDSSDSSDSSDSS..',
  '....SDSSSSDSSDSSSSSDSS..',
  '.....DSSSSSSSSSSSSSSD...',
  '.....DSSSDDDDDDDSSSSD...',
  '......DDSSSDDDSSSDD.....',
  '.......DDDDDDDDDDD......',
];
const SHCHELIN_TORSO = mirror([
  '.......DCCDS',
  '....CCCCCDSS',
  '..CCCCCCCCDD',
  '.CCDCCCCCCCC',
  '.CCDCCCCCCCC',
  '.SS.CCCCCCCC',
  '....DDDDDDDD',
  '.....DDD.DDD',
]);
/** Шестерня-колесо 12 рядов; turn — сдвиг зубцов (кадр вращения). */
function unicycleGear(turn: number): string[] {
  const rows: string[] = [];
  for (let y = 0; y < 12; y++) {
    let r = '';
    for (let x = 0; x < 24; x++) {
      const d = Math.hypot(x - 11.5, y - 5.5);
      const a = Math.atan2(y - 5.5, x - 11.5) + turn;
      const tooth = Math.cos(a * 8) > 0.2 ? 1.3 : 0;
      if (d > 4.6 + tooth) r += '.';
      else if (d < 1.3) r += 'D';
      else if (d < 2.2) r += 'C';
      else if (d > 3.8 + tooth) r += 'D';
      else if (d < 2.9) r += 'D';
      else r += 'C';
    }
    rows.push(r);
  }
  return rows;
}
const SHCHELIN_UPPER = [...SHCHELIN_HEAD, ...SHCHELIN_TORSO];
const SHCHELIN_IDLE = [...SHCHELIN_UPPER, ...unicycleGear(0)];
/**
 * Павел Щелин на моноцикле-шестерне (страус часовой башни оригинала). По фото
 * (`docs/refs/shchelin_1.png`): тёмные короткие волосы набок, высокий лоб, тонкие очки,
 * короткая борода с усами, светлый свитер. Анфас; внизу — шестерня-колесо. Невысокий (32 px):
 * через него, едущего навстречу, можно перепрыгнуть (отзыв пользователя).
 */
const shchelin: SpriteDef = {
  w: 24,
  h: 32,
  palette: { D: 0x000000, S: 0xfcbcb0, C: 0xfce0a8 },
  frames: {
    idle: SHCHELIN_IDLE,
    ride: [...SHCHELIN_UPPER, ...unicycleGear(Math.PI / 8)],
    // Замах: правая рука (смотрит вправо) поднята над плечом.
    aim: patch(SHCHELIN_IDLE, [
      ...[15, 16, 17].flatMap(
        (y) =>
          [
            [21, y, '.'],
            [22, y, '.'],
          ] as [number, number, string][],
      ),
      ...[8, 9, 10, 11, 12, 13, 14].flatMap(
        (y) =>
          [
            [21, y, 'C'],
            [22, y, 'C'],
            [23, y, 'D'],
          ] as [number, number, string][],
      ),
      [21, 6, 'S'],
      [22, 6, 'S'],
      [21, 7, 'S'],
      [22, 7, 'S'],
    ]),
    // Попадание: зажмурился.
    hit: patch(SHCHELIN_IDLE, [
      [8, 6, 'S'],
      [15, 6, 'S'],
      [7, 7, 'D'],
      [8, 7, 'D'],
      [15, 7, 'D'],
      [16, 7, 'D'],
    ]),
    // Освобождён: улыбается.
    freed: patch(SHCHELIN_IDLE, [
      [9, 10, 'D'],
      [14, 10, 'D'],
      [11, 10, 'S'],
      [12, 10, 'S'],
    ]),
  },
};

// ——— Уровень 7 «Салун»: шахта и вагонетка ———

/** Вагонетка: деревянный короб на колёсах, спереди рычаг. Рисуется поверх героя (он внутри). */
const cart: SpriteDef = {
  w: 32,
  h: 20,
  palette: { D: 0x000000, W: 0x881400, G: 0x7c7c7c },
  frames: {
    idle: [
      '............................DD..',
      '............................DGD.',
      '.............................DGD',
      '.............................DGD',
      '............................DGD.',
      '...........................DGD..',
      '...........................DGD..',
      '...........................DGD..',
      'DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD',
      'DGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGD',
      'DWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWD',
      'DWDWWWWWWWWWDWWWWWWWDWWWWWWWWDWD',
      'DWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWD',
      'DGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGD',
      '.DDDDDDDDDDDDDDDDDDDDDDDDDDDDDD.',
      '...DDDD..................DDDD...',
      '..DGGGGD................DGGGGD..',
      '..DGDDGD................DGDDGD..',
      '..DGGGGD................DGGGGD..',
      '...DDDD..................DDDD...',
    ],
  },
};

const BOULDER_HALF = mirror([
  '.....DDD',
  '...DDGGG',
  '..DGGGGG',
  '.DGGWGGG',
  '.DGWWGGG',
  'DGGGGGGG',
  'DGGGGGGD',
  'DGGGGGGG',
]);
/** Валун под потолком шахты. */
const boulder: SpriteDef = {
  w: 16,
  h: 16,
  palette: { D: 0x000000, G: 0x7c7c7c, W: 0xbcbcbc },
  frames: { idle: [...BOULDER_HALF, ...[...BOULDER_HALF].reverse()] },
};

const BALL_HALF = mirror([
  '.....DDD',
  '...DDDDD',
  '..DDGGDD',
  '.DDGGDDD',
  '.DDGDDDD',
  'DDDDDDDD',
  'DDDDDDDD',
  'DDDDDDDD',
]);
/** Ядро маятника (цепь рисует сцена). */
const pendulum: SpriteDef = {
  w: 16,
  h: 16,
  palette: { D: 0x000000, G: 0x7c7c7c },
  frames: { idle: [...BALL_HALF, ...[...BALL_HALF].reverse()] },
};

/** Летучая мышь: машет крыльями, пикирует со сложенными. */
const bat: SpriteDef = {
  w: 16,
  h: 12,
  palette: { D: 0x000000, P: 0x940084, R: 0xf83800 },
  frames: {
    fly1: [
      'D..............D',
      'DD............DD',
      'DPD..........DPD',
      'DPPD..DDDD..DPPD',
      'DPPPDDPPPPDDPPPD',
      'DPPPPPRPPRPPPPPD',
      '.DPPPPPPPPPPPPD.',
      '..DPPDPPPPDPPD..',
      '...DD.DPPD.DD...',
      '.......DD.......',
      '................',
      '................',
    ],
    fly2: [
      '................',
      '................',
      '......DDDD......',
      '.....DPPPPD.....',
      '..DDDPRPPRPDDD..',
      '.DPPPPPPPPPPPPD.',
      'DPPPPPPPPPPPPPPD',
      'DPPDDPPPPPPDDPPD',
      'DPD..DPPPPD..DPD',
      'DD....DPPD....DD',
      'D......DD......D',
      '................',
    ],
    dive: [
      '......DDDD......',
      '.....DPPPPD.....',
      '.....PRPPRP.....',
      '....DPPPPPPD....',
      '...DPPPPPPPPD...',
      '...DPPDPPDPPD...',
      '...DPD.PP.DPD...',
      '...DD..PP..DD...',
      '.......DD.......',
      '................',
      '................',
      '................',
    ],
  },
};

const SNAKE_BOX = [
  'DDDDDDDDDDDDDDDD',
  'DWWWWWWWWWWWWWWD',
  'DWDDDDDDDDDDDDWD',
  'DWDWWWWWWWWWWDWD',
  'DWDWWWDDWWWWWDWD',
  'DWDWWDWWDWWWWDWD',
  'DWDWWWWDWWWWWDWD',
  'DWDWWWDWWWWWWDWD',
  'DWDWWWWWWWWWWDWD',
  'DWDWWWDWWWWWWDWD',
  'DWDWWWWWWWWWWDWD',
  'DWDDDDDDDDDDDDWD',
  'DWWWWWWWWWWWWWWD',
  'DWDWWWWWWWWWWDWD',
  'DWWWWWWWWWWWWWWD',
  'DDDDDDDDDDDDDDDD',
];
/** Змея в коробке: коробка с «?», выскочила — зелёная голова с языком. */
const snakeBox: SpriteDef = {
  w: 16,
  h: 16,
  palette: { D: 0x000000, W: 0xe45c10, G: 0x00a800 },
  frames: {
    idle: SNAKE_BOX,
    out: [
      '.....DDDDDD.....',
      '....DGGGGGGD....',
      '...DGDGGGGDGD...',
      '...DGGGGGGGGDD..',
      '....DGGGGGGGGGD.',
      '.....DDGGGDDDDW.',
      '......DGGD..W.W.',
      '......DGGD......',
      'DDDDDDDGGDDDDDDD',
      'DWWWWWDGGDWWWWWD',
      'DWWWWWDGGDWWWWWD',
      'DWDDDDDDDDDDDDWD',
      'DWWWWWWWWWWWWWWD',
      'DWDWWWWWWWWWWDWD',
      'DWWWWWWWWWWWWWWD',
      'DDDDDDDDDDDDDDDD',
    ],
  },
};

/** Дикобраз: иглы назад, бежит вправо. */
const porcupine: SpriteDef = {
  w: 16,
  h: 12,
  palette: { D: 0x000000, B: 0x881400, W: 0xfce0a8 },
  frames: {
    walk1: [
      '..D.D.D.........',
      '.DWDWDWD........',
      'DWBWBWBWDD......',
      'DBWBWBWBBBD.....',
      'WBBWBWBBBBBDD...',
      'DBWBWBBBBBBBBD..',
      'DBBBBBBBBBDBBBD.',
      '.DBBBBBBBBBBBBBD',
      '..DBBBBBBBBBBDD.',
      '...DDDDDDDDDD...',
      '...DD....DD.....',
      '..DD......DD....',
    ],
    walk2: [
      '..D.D.D.........',
      '.DWDWDWD........',
      'DWBWBWBWDD......',
      'DBWBWBWBBBD.....',
      'WBBWBWBBBBBDD...',
      'DBWBWBBBBBBBBD..',
      'DBBBBBBBBBDBBBD.',
      '.DBBBBBBBBBBBBBD',
      '..DBBBBBBBBBBDD.',
      '...DDDDDDDDDD...',
      '....DD..DD......',
      '....DD..DD......',
    ],
  },
};

const MOTH_A = [
  '.DD......DD.',
  'DWWD....DWWD',
  'DWWWDDDDWWWD',
  'DWWWDGGDWWWD',
  '.DWWDGGDWWD.',
  '..DDDGGDDD..',
  '.DWWDGGDWWD.',
  '.DWDDGGDDWD.',
  '..D..DD..D..',
  '............',
];
/** Моль: бледные крылья. */
const moth: SpriteDef = {
  w: 12,
  h: 10,
  palette: { D: 0x000000, W: 0xfce0a8, G: 0x7c7c7c },
  frames: {
    fly1: MOTH_A,
    fly2: [
      '............',
      '............',
      '.DDD....DDD.',
      'DWWWDDDDWWWD',
      'DWWWDGGDWWWD',
      '.DDDDGGDDDD.',
      '.DWWDGGDWWD.',
      '..DDDGGDDD..',
      '.....DD.....',
      '............',
    ],
  },
};
/** Моль-пикировщик — темнее, крылья сложены при пике. */
const diveMoth: SpriteDef = {
  w: 12,
  h: 10,
  palette: { D: 0x000000, W: 0xac7c00, G: 0x503000 },
  frames: {
    fly1: MOTH_A,
    fly2: MOTH_A,
    dive: [
      '....DDDD....',
      '...DGGGGD...',
      '..DWDGGDWD..',
      '..DWDGGDWD..',
      '..DWDGGDWD..',
      '...DDGGDD...',
      '....DGGD....',
      '.....DD.....',
      '............',
      '............',
    ],
  },
};

/** Снаряд моли. */
const mothShot: SpriteDef = {
  w: 6,
  h: 6,
  palette: { D: 0x000000, W: 0xfce0a8 },
  frames: { idle: ['.DDDD.', 'DWWWWD', 'DWDDWD', 'DWDDWD', 'DWWWWD', '.DDDD.'] },
};

/** Игральная карта босса (снаряд и предмет): рубашка с абстрактным узором (ТЗ). */
const card: SpriteDef = {
  w: 16,
  h: 12,
  palette: { D: 0x000000, W: 0xfcfcfc, R: 0xd82800 },
  frames: {
    idle: [
      'DDDDDDDDDDDDDDDD',
      'DWWWWWWWWWWWWWWD',
      'DWRRRRRRRRRRRRWD',
      'DWRWRWRWRWRWRRWD',
      'DWRRWRWRWRWRWRWD',
      'DWRWRWRWRWRWRRWD',
      'DWRRWRWRWRWRWRWD',
      'DWRWRWRWRWRWRRWD',
      'DWRRWRWRWRWRWRWD',
      'DWRRRRRRRRRRRRWD',
      'DWWWWWWWWWWWWWWD',
      'DDDDDDDDDDDDDDDD',
    ],
  },
};

// ——— Уровень 7: Соболев, Лука Е*ков (Третьяков), камео Стаса Васильева ———

/** Поднятая правая рука (смотрит вправо) — замах перед броском карты. */
function raiseArm(rows: readonly string[], sleeve: string): string[] {
  return patch(rows, [
    ...[25, 26, 27, 28, 29, 30, 31, 32].flatMap(
      (y) =>
        [
          [21, y, '.'],
          [22, y, '.'],
        ] as [number, number, string][],
    ),
    ...[12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24].flatMap(
      (y) =>
        [
          [20, y, 'D'],
          [21, y, sleeve],
          [22, y, sleeve],
          [23, y, 'D'],
        ] as [number, number, string][],
    ),
    [21, 10, 'S'],
    [22, 10, 'S'],
    [21, 11, 'S'],
    [22, 11, 'S'],
    [20, 10, 'D'],
    [23, 10, 'D'],
    [20, 11, 'D'],
    [23, 11, 'D'],
  ]);
}
/** Сидит за карточным столом: видно только по пояс (низ — за столом). */
function seated(rows: readonly string[]): string[] {
  return rows.map((r, y) => (y < 28 ? r : '.'.repeat(r.length)));
}
/** Глаза закрыты (удар) и улыбка (побеждён): глаза в строке 11, рот — 16. */
const eyesShut = (rows: readonly string[]) =>
  patch(rows, [
    [7, 11, 'S'],
    [16, 11, 'S'],
    [6, 11, 'D'],
    [8, 11, 'D'],
    [15, 11, 'D'],
    [17, 11, 'D'],
  ]);

const SOBOLEV_HEAD = mirror([
  '........HHHH',
  '......HHHHHH',
  '.....HHHHHHH',
  '....HHHHHHHH',
  '....HHHHHHHH',
  '....DHHHHHHS',
  '....DHSSSSSS',
  '....DSSSSSSS',
  '....DSSSSSSS',
  '....DSDDDSSS',
  '...DSSSSSSSS',
  '...DSSSDSSSS',
  '...DSSSSSSSS',
  '....DSSSSSSS',
  '....DSSSSSSD',
  '....DSSSSSSS',
  '.....DSSSDDD',
  '......DSSSSS',
  '.......DSSSS',
  '........DDDD',
]);
const SOBOLEV_IDLE = [...SOBOLEV_HEAD, ...BORDACHEV_TORSO, ...BORDACHEV_LEGS];
/**
 * Николай Соболев (по фото `docs/refs/sobolev_1.png`): русые волосы зачёсаны вверх и назад,
 * гладко выбрит, тёмный пиджак, светлая рубашка. Анфас.
 */
const sobolev: SpriteDef = {
  w: 24,
  h: 40,
  palette: { D: 0x000000, S: 0xfcbcb0, H: 0x503000 },
  frames: {
    idle: SOBOLEV_IDLE,
    aim: raiseArm(SOBOLEV_IDLE, 'D'),
    hit: eyesShut(SOBOLEV_IDLE),
    freed: patch(SOBOLEV_IDLE, [
      [8, 16, 'D'],
      [15, 16, 'D'],
    ]),
    sit: seated(SOBOLEV_IDLE),
  },
};

const LUKA_HEAD = mirror([
  '........DDDD',
  '......DDSSSS',
  '.....DSSSSSS',
  '....DSSSSSSS',
  '....DSSSSSSS',
  '....DSSSSSSS',
  '....DSSSSSSS',
  '....DSSSSSSS',
  '....DSSSSSSS',
  '....DSDDDSSS',
  '...DSSSSSSSS',
  '...DSSSDSSSS',
  '...DSSSSSSSS',
  '....DSSSSSSD',
  '....DDSSSSSS',
  '....DDDDDDDD',
  '....DDDDSSSD',
  '.....DDDDDDD',
  '......DDDDDD',
  '........DDDD',
]);
const LUKA_TORSO = mirror([
  '..........DD',
  '.......GGDDD',
  '....GGGGGGDD',
  '..GGGGGGGGGD',
  '.GGGGGGGGGGD',
  '.GG.GGGGGGGD',
  '.GG.GGGGGGGG',
  '.GG.GGGGGGGG',
  '.GG.GGGGGGGG',
  '.GG.GGGGGGGG',
  '.GG.GGGGGGGG',
  '.SS.GGGGGGGG',
  '.SS.GGGGGGGG',
  '....GGGGGGGG',
]);
const LUKA_IDLE = [...LUKA_HEAD, ...LUKA_TORSO, ...BORDACHEV_LEGS];
/**
 * Лука Е*ков — Андрей Третьяков (по фото `docs/refs/tretyakov_1.png`): бритая голова, тёмная
 * борода с усами, серое худи поверх тёмной футболки. Анфас.
 */
const luka: SpriteDef = {
  w: 24,
  h: 40,
  palette: { D: 0x000000, S: 0xfcbcb0, G: 0xbcbcbc },
  frames: {
    idle: LUKA_IDLE,
    aim: raiseArm(LUKA_IDLE, 'G'),
    hit: eyesShut(LUKA_IDLE),
    freed: patch(LUKA_IDLE, [
      [8, 16, 'S'],
      [15, 16, 'S'],
    ]),
    sit: seated(LUKA_IDLE),
  },
};

const VASILIEV_HEAD = mirror([
  '.......DDDDD',
  '.....DDD.DDD',
  '....DDDDDDDD',
  '...DDDDDDDDD',
  '...DDDDDDDDD',
  '....DDSDSSDS',
  '....DSSSSSSS',
  '....DSSSSSSS',
  '....DSSSSSSS',
  '....DSDDSSSS',
  '...DSSSSSSSS',
  '...DSSSDSSSS',
  '...DSSSSSSSS',
  '....DSSSSSSD',
  '....DSDSSDDD',
  '....DSSDSSSS',
  '.....DSDSDSS',
  '......DSSSSS',
  '.......DSSSS',
  '........DDDD',
]);
const VASILIEV_TORSO = mirror([
  '..........DS',
  '.......BBDSS',
  '....BBBBBDSS',
  '..BBBBBBBDSS',
  '.BBBBBBBBDSS',
  '.BB.BBBBBDSS',
  '.BB.BBBDBDSS',
  '.BB.BBBBBDSS',
  '.BB.BBBBBDSS',
  '.BB.BBBDBDSS',
  '.BB.BBBBBDSS',
  '.SS.BBBBBBBB',
  '.SS.BBBBBBBB',
  '....BBBBBBBB',
]);
/**
 * Стас Васильев — камео за стойкой салуна (по фото `docs/refs/vasiliev_1.png`): тёмные кудри,
 * щетина, бежевая рубашка нараспашку поверх светлой футболки.
 */
const vasiliev: SpriteDef = {
  w: 24,
  h: 40,
  palette: { D: 0x000000, S: 0xfcbcb0, B: 0xd8b878 },
  frames: {
    idle: [...VASILIEV_HEAD, ...VASILIEV_TORSO, ...BORDACHEV_LEGS],
    // За стойкой: видно по пояс.
    bar: seated([...VASILIEV_HEAD, ...VASILIEV_TORSO, ...BORDACHEV_LEGS]),
  },
};

// ——— Уровень 8 «Нейросеть» (Мир будущего оригинала) ———

/** Кадр, нарисованный функцией: fn(x, y) → символ палитры или '.'. */
function grid(w: number, h: number, fn: (x: number, y: number) => string): string[] {
  return Array.from({ length: h }, (_, y) =>
    Array.from({ length: w }, (_, x) => fn(x, y)).join(''),
  );
}

/** Рамка: чёрный контур по краю прямоугольника w×h. */
const edge = (x: number, y: number, w: number, h: number) =>
  x === 0 || y === 0 || x === w - 1 || y === h - 1;

/** Металлический блок: белый кубик с заклёпками (как в оригинале). */
const metal: SpriteDef = {
  w: 16,
  h: 16,
  palette: { D: 0x000000, W: 0xfcfcfc, G: 0xbcbcbc },
  frames: {
    idle: grid(16, 16, (x, y) => {
      if (edge(x, y, 16, 16)) return 'D';
      if ((x === 3 || x === 12) && (y === 3 || y === 12)) return 'D';
      if (x === 14 || y === 14) return 'G';
      if (x === 1 || y === 1) return 'W';
      return (x + y) % 7 === 0 ? 'W' : 'G';
    }),
  },
};

/** Обломок от удара шара: кусок бетона с арматурой. */
const scrap: SpriteDef = {
  w: 16,
  h: 12,
  palette: { D: 0x000000, G: 0x7c7c7c, W: 0xbcbcbc },
  frames: {
    idle: [
      '....DDDD........',
      '..DDWWWWDD..DD..',
      '.DWWWGWWWWDDWD..',
      'DWWGWWWWWGWWWD..',
      'DWWWWWGWWWWWGDD.',
      'DGWWWWWWWWGWWWWD',
      'DGGWGWWWWWWWWGWD',
      '.DGGGWWWGWWWWGGD',
      '.DGGGGGGGGWGGGD.',
      '..DGGDGGGGGGGD..',
      '...DD.DDGGGDD...',
      '.......DDDD.....',
    ],
  },
};

/** Камешек из рогатки. */
const pebble: SpriteDef = {
  w: 6,
  h: 6,
  palette: { D: 0x000000, G: 0xbcbcbc },
  frames: { idle: ['.DDDD.', 'DGGGGD', 'DGGDGD', 'DGGGGD', 'DGDGGD', '.DDDD.'] },
};

const SLING_RAT = [
  '................',
  '..........DD....',
  '.........DGGD...',
  '........DGGGGD..',
  '.......DGGGDGGD.',
  '.......DGGGGGGGD',
  '......DGGGGGGDD.',
  '.....DGGGGGGD...',
  '....DGGGGGGGD...',
  '...DGGGGGGGGD...',
  'D..DGGGGGGGGD...',
  'D..DGGGGGGGD....',
  '.D.DGGGGGGD.....',
  '..DDGGGGGGD.....',
  '....DD..DD......',
  '...DDD.DDD......',
];
/** Крыса с рогаткой: серая, стоит на задних лапах, коричневая рогатка в лапе. */
const slingRat: SpriteDef = {
  w: 16,
  h: 16,
  palette: { D: 0x000000, G: 0xbcbcbc, B: 0x881400 },
  frames: {
    idle: patch(SLING_RAT, [
      [12, 8, 'D'],
      [13, 8, 'B'],
      [14, 7, 'B'],
      [14, 6, 'B'],
      [15, 5, 'B'],
      [13, 7, 'D'],
    ]),
    // Натянула рогатку: лапа с рогаткой отведена назад, резинка натянута.
    aim: patch(SLING_RAT, [
      [12, 6, 'B'],
      [13, 5, 'B'],
      [13, 4, 'B'],
      [14, 3, 'B'],
      [12, 4, 'B'],
      [11, 3, 'B'],
      [10, 9, 'D'],
      [11, 9, 'D'],
    ]),
  },
};

const DOG_TOP = [
  '..........DD....',
  '.........DGGD...',
  '.........DGGGDDD',
  '........DGGRGGGD',
  'DD......DGGGGGDD',
  'DGD....DGGGGDD..',
  '.DGDDDDGGGGD....',
  '..DGGGGGGGGD....',
  '..DGGDGGDGGD....',
  '..DGGGGGGGGD....',
  '...DDDDDDDD.....',
];
/** Механический пёс на колёсах: серый корпус, красный глаз. */
const mechDog: SpriteDef = {
  w: 16,
  h: 14,
  palette: { D: 0x000000, G: 0xbcbcbc, R: 0xf83800 },
  frames: {
    roll1: [...DOG_TOP, '..DDD....DDD....', '.DGDGD..DGDGD...', '..DDD....DDD....'],
    roll2: [...DOG_TOP, '..DGD....DGD....', '.DDGDD..DDGDD...', '..DGD....DGD....'],
  },
};

/** Давящий блок 32×32: стальной пресс, снизу — жёлто-чёрные полосы. */
const crusher: SpriteDef = {
  w: 32,
  h: 32,
  palette: { D: 0x000000, G: 0xbcbcbc, Y: 0xf8b800 },
  frames: {
    idle: grid(32, 32, (x, y) => {
      if (edge(x, y, 32, 32)) return 'D';
      if (y === 10 || y === 11) return 'D';
      if (y < 10) {
        if ((x === 4 || x === 27) && (y === 3 || y === 7)) return 'D';
        return y === 1 ? 'G' : (x + 2 * y) % 13 === 0 ? 'D' : 'G';
      }
      if (y === 30) return 'D';
      return Math.floor((x + y) / 4) % 2 === 0 ? 'Y' : 'D';
    }),
  },
};

/** Складная платформа: серая плита на петлях; раскрытая — створки висят вниз. */
const foldPlatform: SpriteDef = {
  w: 32,
  h: 8,
  palette: { D: 0x000000, G: 0xbcbcbc, B: 0x0058f8 },
  frames: {
    idle: [
      'DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD',
      'DGGGGGGGGGGGGGGDDGGGGGGGGGGGGGGD',
      'DGBBBBBBBBBBBBGDDGBBBBBBBBBBBBGD',
      'DGGGGGGGGGGGGGGDDGGGGGGGGGGGGGGD',
      'DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD',
      '...DD....................DD.....',
      '...DD....................DD.....',
      '................................',
    ],
    open: [
      'DDD..........................DDD',
      'DGD..........................DGD',
      'DGD..........................DGD',
      'DBD..........................DBD',
      'DGD..........................DGD',
      'DBD..........................DBD',
      'DGD..........................DGD',
      'DDD..........................DDD',
    ],
  },
};

/** Гусеницы крана 80×24: два кадра — траки сдвинуты. */
function craneTracksFrame(shift: number): string[] {
  const W = 80;
  const H = 24;
  return grid(W, H, (x, y) => {
    // Скруглённые концы.
    const r = 12;
    const cx = x < r ? r : x > W - 1 - r ? W - 1 - r : x;
    const d = Math.hypot(x - cx, y - (H - 1) / 2);
    if (d > r) return '.';
    if (d > r - 1.2) return 'D';
    if (d > r - 4) return (x + shift) % 6 < 2 ? 'D' : 'W';
    // Катки.
    const k = (x - 6) % 14;
    const kd = Math.hypot(k - 7, y - 11.5);
    if (x > 6 && x < W - 6 && kd < 5) return kd > 3.6 ? 'D' : kd < 1.5 ? 'D' : 'G';
    return 'G';
  });
}
const craneTracks: SpriteDef = {
  w: 80,
  h: 24,
  palette: { D: 0x000000, G: 0x7c7c7c, W: 0xbcbcbc },
  frames: { a: craneTracksFrame(0), b: craneTracksFrame(3) },
};

/**
 * Корпус крана 72×64 (от x крана + 8, с высоты 104): красная кабина с окном (в окне виден
 * Марков — он рисуется позади), под ней корпус с решёткой и узлом стрелы слева.
 */
const craneBody: SpriteDef = {
  w: 72,
  h: 64,
  palette: { D: 0x000000, R: 0xd82800, O: 0xfc7460 },
  frames: {
    idle: grid(72, 64, (x, y) => {
      // Кабина: x 36..69, y 0..33; окно x 40..65, y 4..30 — прозрачное.
      const inCab = x >= 36 && x <= 69 && y <= 33;
      if (inCab) {
        const win = x >= 40 && x <= 65 && y >= 4 && y <= 30;
        if (win) return '.';
        if (x === 36 || x === 69 || y === 0 || x === 39 || x === 66 || y === 3 || y === 31)
          return 'D';
        return y === 1 || x === 37 ? 'O' : 'R';
      }
      // Корпус: x 0..71, y 32..63, скошен слева сверху.
      if (y < 32) return '.';
      const yy = y - 32;
      if (x < 16 - yy) return '.';
      if (x === 16 - yy || x === 71 || y === 32 || y === 63) return 'D';
      if (yy === 1) return 'O';
      // Решётка радиатора справа и заклёпки.
      if (x >= 50 && x <= 66 && yy >= 8 && yy <= 22) return (x - 50) % 4 === 0 ? 'D' : 'R';
      if (yy === 26 && x % 8 === 4) return 'D';
      // Узел стрелы слева.
      const pd = Math.hypot(x - 22, yy - 9);
      if (pd < 5) return pd > 3.5 ? 'D' : pd < 1.5 ? 'D' : 'O';
      return 'R';
    }),
  },
};

/** Шар на цепи 24×24: синий, с шипами (как в оригинале). */
const wreckingBall: SpriteDef = {
  w: 24,
  h: 24,
  palette: { D: 0x000000, B: 0x0058f8, W: 0xfcfcfc },
  frames: {
    idle: grid(24, 24, (x, y) => {
      const dx = x - 11.5;
      const dy = y - 11.5;
      const d = Math.hypot(dx, dy);
      // Шипы по 8 направлениям.
      const a = Math.atan2(dy, dx);
      const spike = Math.abs(Math.sin(a * 4)) < 0.22 && d <= 11.5;
      if (d > 9 && !spike) return '.';
      if (spike && d > 8) return d > 10.6 ? 'D' : 'W';
      if (d > 8) return 'D';
      if (Math.hypot(dx + 3, dy + 3) < 2.5) return 'W';
      return 'B';
    }),
  },
};

/**
 * Сергей Марков (по фото гостя): короткие рыжеватые волосы с залысинами, рыжая бородка
 * с усами, тёмный пиджак, ярко-красный свитер с белым воротником рубашки. Анфас.
 * Палитра: волосы, борода и свитер — одним рыжим (3 цвета на спрайт).
 */
const MARKOV_HEAD = mirror([
  '.........OOO',
  '.......OOOOO',
  '.....OOOOOOO',
  '....DOOOOOOO',
  '....DOOOOOSS',
  '....DOSSSSSS',
  '....DSSSSSSS',
  '....DSSSSSSS',
  '....DSSSSSSS',
  '....DSDDDSSS',
  '...DSSSSSSSS',
  '...DSSSDSSSS',
  '...DSSSSSSSS',
  '....DSSSSSSS',
  '....DSSOOOSD',
  '....DSOOOOOO',
  '.....DOOODDD',
  '......DOOOOO',
  '.......DOOOO',
  '........DDOO',
]);
const MARKOV_TORSO = mirror([
  '..........DS',
  '.......DDSSS',
  '....DDDDDSOO',
  '..DDDDDDDOOO',
  '.DDDDDDDDOOO',
  '.DD.DDDDDOOO',
  '.DD.DDDDDOOO',
  '.DD.DDDDDOOO',
  '.DD.DDDDDOOO',
  '.DD.DDDDDDOO',
  '.DD.DDDDDDDD',
  '.SS.DDDDDDDD',
  '.SS.DDDDDDDD',
  '....DDDDDDDD',
]);
const MARKOV_IDLE = [...MARKOV_HEAD, ...MARKOV_TORSO, ...BORDACHEV_LEGS];
const markov: SpriteDef = {
  w: 24,
  h: 40,
  palette: { D: 0x000000, S: 0xfcbcb0, O: 0xe45c10 },
  frames: {
    idle: MARKOV_IDLE,
    aim: raiseArm(MARKOV_IDLE, 'D'),
    hit: eyesShut(MARKOV_IDLE),
    freed: patch(MARKOV_IDLE, [
      [8, 16, 'D'],
      [15, 16, 'D'],
    ]),
  },
};

// ——— Уровень 9 «Студия Конца Истории» ———

/** Разделить кадр на слои: в каждом — только свои буквы, остальное прозрачно. */
function onlyKeys(rows: readonly string[], keys: string): string[] {
  return rows.map((r) => [...r].map((c) => (keys.includes(c) ? c : '.')).join(''));
}

/** Шар с потолка арены — единственное оружие против робота: светящаяся бирюзовая сфера. */
const orb: SpriteDef = {
  w: 14,
  h: 14,
  palette: { D: 0x000000, T: 0x00a8a8, W: 0xb8f8f8 },
  frames: {
    idle: grid(14, 14, (x, y) => {
      const d = Math.hypot(x - 6.5, y - 6.5);
      if (d > 6.9) return '.';
      if (d > 5.7) return 'D';
      if (Math.hypot(x - 4.5, y - 4.5) < 2.2) return 'W';
      // Полоска-шов по экватору.
      if (y === 7 && d < 5) return 'D';
      return 'T';
    }),
  },
};

/** Искра с хвоста робота: бежит по полу. Жёлто-белая, с тёмным контуром. */
const spark: SpriteDef = {
  w: 8,
  h: 8,
  palette: { D: 0x000000, Y: 0xf8b800, W: 0xfcfcfc },
  frames: {
    idle: [
      '...DD...',
      '.D.YD.D.',
      '..DYYD..',
      'DYYWWYYD',
      'DYYWWYYD',
      '..DYYD..',
      '.D.YD.D.',
      '...DD...',
    ],
  },
};

/** Кулак-ракета робота. */
const fist: SpriteDef = {
  w: 16,
  h: 16,
  palette: { D: 0x000000, M: 0x0058f8, L: 0x3cbcfc },
  frames: {
    idle: [
      '....DDDDDDD.....',
      '..DDLLLLLLLDD...',
      '.DLLLDLLDLLLLD..',
      '.DLLLDLLDLLLLD..',
      'DLLMMDMMDMMLLLD.',
      'DLMMMDMMDMMMLLD.',
      'DMMMMMMMMMMMMMDD',
      'DMMMMMMMMMMMMMDL',
      'DDMMMMMMMMMMMDLL',
      '.DMMMMMMMMMMMDLL',
      '.DDMMMMMMMMMDDL.',
      '..DDDMMMMMDDD...',
      '....DDDDDDD.....',
      '................',
      '................',
      '................',
    ],
  },
};

/** Реактивное пламя под роботом: бьёт вниз, два кадра. */
const jet: SpriteDef = {
  w: 24,
  h: 16,
  palette: { R: 0xf83800, Y: 0xfce0a8, W: 0xfcfcfc },
  frames: {
    a: grid(24, 16, (x, y) => {
      const half = 11 - y * 0.6;
      const d = Math.abs(x - 11.5);
      if (d > half) return '.';
      if (d < half - 6) return 'W';
      return d < half - 3 ? 'Y' : 'R';
    }),
    b: grid(24, 16, (x, y) => {
      const half = 10 - y * 0.55 + ((y + x) % 3 === 0 ? 1 : 0);
      const d = Math.abs(x - 11.5);
      if (d > half) return '.';
      if (d < half - 5) return 'W';
      return d < half - 2.5 ? 'Y' : 'R';
    }),
  },
};

/** Пушка на потолочном рельсе: серый корпус, ствол вниз-вперёд. */
const cannon: SpriteDef = {
  w: 16,
  h: 12,
  palette: { D: 0x000000, G: 0xbcbcbc, M: 0x7c7c7c },
  frames: {
    idle: [
      'DDDDDDDDDDDDDDDD',
      'DGGGGGGGGGGGGGGD',
      'DMMMMMMMMMMMMMMD',
      '.DDDDDDDDDDDDDD.',
      '...DGGGGGGGD....',
      '..DGGGGGGGGGD...',
      '..DGGMMMMGGGD...',
      '..DGMMMMMMGGDDD.',
      '...DMMMMMMGDGGD.',
      '....DDDDDDDGGGD.',
      '..........DGMMD.',
      '..........DDDD..',
    ],
  },
};

/** Шар пушки: зелёный, неуязвимый, отскакивает. */
const cannonBall: SpriteDef = {
  w: 10,
  h: 10,
  palette: { D: 0x000000, G: 0x00a800, L: 0xb8f818 },
  frames: {
    idle: grid(10, 10, (x, y) => {
      const d = Math.hypot(x - 4.5, y - 4.5);
      if (d > 4.9) return '.';
      if (d > 3.8) return 'D';
      return Math.hypot(x - 3, y - 3) < 1.6 ? 'L' : 'G';
    }),
  },
};

/** Обломок потолка (побег): кусок бетона. */
const rubble: SpriteDef = {
  w: 16,
  h: 12,
  palette: { D: 0x000000, G: 0x7c7c7c, W: 0xbcbcbc },
  frames: {
    hang: [
      '.DDDDDDDDDDDDDD.',
      'DWWWWGWWWWWGWWWD',
      'DWGWWWWWGWWWWGWD',
      'DWWWWWGWWWWWWWGD',
      'DGWWWWWWWWGWWWGD',
      'DGGWGWWWWWWWWGGD',
      '.DGGGWWWGWWWGGD.',
      '.DGGGGGGGGWGGGD.',
      '..DGGDGGGGGGGD..',
      '...DD.DDGGGDD...',
      '.......DDDD.....',
      '................',
    ],
    shake: [
      '................',
      '.DDDDDDDDDDDDDD.',
      'DWWWWGWWWWWGWWWD',
      'DWGWWWWWGWWWWGWD',
      'DWWWWWGWWWWWWWGD',
      'DGWWWWWWWWGWWWGD',
      'DGGWGWWWWWWWWGGD',
      '.DGGGWWWGWWWGGD.',
      '.DGGGGGGGGWGGGD.',
      '..DGGDGGGGGGGD..',
      '...DD.DDGGGDD...',
      '.......DDDD.....',
    ],
  },
};

/** Рычаг конвейера: низкий пульт с красной ручкой (16×8). */
const lever: SpriteDef = {
  w: 16,
  h: 8,
  palette: { D: 0x000000, G: 0xbcbcbc, R: 0xd82800 },
  frames: {
    left: [
      '.DD.............',
      'DRRD............',
      'DRRDD...........',
      '.DD.DD..........',
      'DDDDDDDDDDDDDDDD',
      'DGGGGGGGGGGGGGGD',
      'DGDGDGGGGGGRRRGD',
      'DDDDDDDDDDDDDDDD',
    ],
    right: [
      '.............DD.',
      '............DRRD',
      '...........DDRRD',
      '..........DD.DD.',
      'DDDDDDDDDDDDDDDD',
      'DGGGGGGGGGGGGGGD',
      'DGRRRGGGGGGDGDGD',
      'DDDDDDDDDDDDDDDD',
    ],
  },
};

/** Невидимые точки (вылет птиц, лазер): кадр-пустышка, на экран не попадает. */
const blank: SpriteDef = {
  w: 1,
  h: 1,
  palette: { D: 0x000000 },
  frames: { idle: ['.'] },
};

// Дмитрий Саймс (сцена перед аппаратной, фото — в чате 17.11): лысый, очки в тонкой тёмной
// оправе, седая короткая борода и усы, тёмный костюм, белая рубашка, красный галстук в полоску.
// Буквы: D — чёрный, S — кожа, G — седина; W — рубашка, R/K — галстук (второй слой).
const SIMES_HEAD = mirror([
  '........DDDD',
  '......DDSSSS',
  '.....DSSSSSS',
  '....DSSSSSSS',
  '....DSSSSSSS',
  '...DSSSSSSSS',
  '...DSSSSSSSS',
  '...DSSSSSSSS',
  '..DSDDDDDDSS',
  '..DSDSSSSDDD',
  '..DSDSDSSDSS',
  '..DSDDDDDDSS',
  '...DSSSSSSSS',
  '...DGSSSSSSS',
  '...DGGSSGGGG',
  '...DGGGGGDDD',
  '...DGGGGGGGG',
  '....GGGGGGGG',
  '.....GGGGGGG',
  '......GGGGGG',
]);
const SIMES_TORSO = mirror([
  '.......DGGGG',
  '....DDDDDWGG',
  '..DDDDDDDWWR',
  '.DDDDDDDDWWK',
  '.DDDDDDDDDWR',
  '.DD.DDDDDDWK',
  '.DD.DDDDDDDR',
  '.DD.DDDDDDDK',
  '.DD.DDDDDDDD',
  '.DD.DDDDDDDD',
  '.DD.DDDDDDDD',
  '.SS.DDDDDDDD',
  '.SS.DDDDDDDD',
  '....DDDDDDDD',
]);
const SIMES = [...SIMES_HEAD, ...SIMES_TORSO, ...BORDACHEV_LEGS];
const simes: SpriteDef = {
  w: 24,
  h: 40,
  palette: { D: 0x000000, S: 0xfcbcb0, G: 0xbcbcbc },
  frames: { idle: onlyKeys(SIMES, 'DSG') },
};
const simesShirt: SpriteDef = {
  w: 24,
  h: 40,
  palette: { W: 0xfcfcfc, R: 0xd82800, K: 0x881400 },
  frames: { idle: onlyKeys(SIMES, 'WRK') },
};

/**
 * Машина Конца Истории — робот-двойник Дефицита Будущего (робот Толстопуза оригинала): чиновник
 * в костюме — синий стальной корпус-пиджак, белая рубашка и красный галстук, вместо лица —
 * циферблат со стрелками, навсегда стоящими на одной дате; цилиндр. Смотрит влево, на героя.
 * 96×96, три слоя по 3 цвета. Фазы (ТЗ: между фазами отваливается деталь): p2 — без цилиндра,
 * p3 — без правой (дальней) руки.
 */
type Shape = { inside: (x: number, y: number) => boolean; fill: (x: number, y: number) => string };
const ell = (cx: number, cy: number, rx: number, ry: number) => (x: number, y: number) =>
  ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1;
const rect = (x0: number, y0: number, x1: number, y1: number) => (x: number, y: number) =>
  x >= x0 && x <= x1 && y >= y0 && y <= y1;
/** Сталь: светлая кромка сверху-слева, тень снизу-справа. */
const steel =
  (inside: (x: number, y: number) => boolean) =>
  (x: number, y: number): string =>
    !inside(x - 2, y - 2) ? 'L' : !inside(x + 3, y + 3) ? 'N' : 'M';

function machineFrame(phase: 1 | 2 | 3): string[] {
  const g: string[][] = Array.from({ length: 96 }, () => Array<string>(96).fill('.'));
  const shapes: Shape[] = [];
  const add = (inside: Shape['inside'], fill: Shape['fill'] = steel(inside)) =>
    shapes.push({ inside, fill });
  // Дальняя (правая) рука: плечо и кулак внизу. В фазе 3 — культя.
  if (phase < 3) {
    add(rect(78, 50, 88, 70));
    add(ell(86, 74, 8, 7));
  }
  add(ell(78, 48, 10, 9));
  // Ноги и ботинки.
  add(rect(30, 76, 42, 88));
  add(rect(56, 76, 68, 88));
  add(ell(34, 92, 13, 5), (_x, y) => (y < 91 ? 'L' : 'M'));
  add(ell(62, 92, 13, 5), (_x, y) => (y < 91 ? 'L' : 'M'));
  // Корпус-пиджак.
  const torso = ell(48, 58, 31, 23);
  add(torso, (x, y) => {
    // Рубашка: V от шеи, галстук посередине, пуговицы.
    const v = y >= 36 && y <= 60 && Math.abs(x + 0.5 - 48) <= (60 - y) * 0.42;
    if (v) {
      if (Math.abs(x + 0.5 - 48) <= 2 + (y > 52 ? 1 : 0) && y >= 38) return y === 40 ? 'D' : 'R';
      return 'W';
    }
    if (Math.abs(x + 0.5 - 48) <= (60 - y) * 0.42 + 1.2 && y >= 36 && y <= 61) return 'D';
    if ((y === 66 || y === 72) && Math.abs(x - 47.5) < 2) return 'Y';
    if (y === 61 && Math.abs(x - 47.5) < 1) return 'D';
    // Заклёпки по шву.
    if (y === 46 && (x === 28 || x === 68)) return 'Y';
    return steel(torso)(x, y);
  });
  // Ближняя (левая) рука вытянута вперёд: плечо, предплечье, кулак — отсюда стреляет.
  add(ell(20, 48, 10, 9));
  add(rect(5, 38, 18, 49));
  add(ell(7, 43, 7, 8));
  // Шея и голова-циферблат в золотом ободе.
  add(rect(42, 30, 54, 37));
  const head = ell(46, 22, 13, 12);
  add(head, (x, y) => {
    const r = Math.hypot(x + 0.5 - 46, y + 0.5 - 22);
    if (r > 11.5) return 'D';
    if (r > 9.8) return 'Y';
    if (r > 9) return 'D';
    // Риски на 12, 3, 6, 9.
    const dx = x + 0.5 - 46;
    const dy = y + 0.5 - 22;
    if (r > 7 && (Math.abs(dx) < 1 || Math.abs(dy) < 1)) return 'D';
    // Стрелки замерли: часовая — на 11, минутная — на 12 (без пяти полночь).
    const onHand = (ang: number, len: number) => {
      const t = dx * Math.cos(ang) + dy * Math.sin(ang);
      const n = Math.abs(-dx * Math.sin(ang) + dy * Math.cos(ang));
      return t >= 0 && t <= len && n < 0.9;
    };
    if (onHand(-Math.PI / 2, 7.5) || onHand(-Math.PI / 2 - Math.PI / 6, 5.5)) return 'D';
    if (r < 1.3) return 'R';
    return 'W';
  });
  // Цилиндр (до фазы 2).
  if (phase === 1) {
    add(rect(31, 8, 61, 10), (_x, y) => (y === 8 ? 'H' : 'D'));
    add(rect(36, 0, 56, 9), (x, y) => (y >= 5 && y <= 6 ? 'R' : x < 40 ? 'H' : 'K'));
  }
  // Рисуем по порядку; контур — там, где сосед вне фигуры.
  for (const s of shapes)
    for (let y = 0; y < 96; y++)
      for (let x = 0; x < 96; x++) {
        if (!s.inside(x, y)) continue;
        const rim =
          !s.inside(x - 1, y) || !s.inside(x + 1, y) || !s.inside(x, y - 1) || !s.inside(x, y + 1);
        g[y]![x] = rim ? 'D' : s.fill(x, y);
      }
  return g.map((r) => r.join(''));
}
const MACHINE_FRAMES = { p1: machineFrame(1), p2: machineFrame(2), p3: machineFrame(3) };
const machineLayer = (keys: string, palette: Record<string, number>): SpriteDef => ({
  w: 96,
  h: 96,
  palette,
  frames: {
    p1: onlyKeys(MACHINE_FRAMES.p1, keys),
    p2: onlyKeys(MACHINE_FRAMES.p2, keys),
    p3: onlyKeys(MACHINE_FRAMES.p3, keys),
  },
});
/** Сталь корпуса: контур, синий, голубой (как робот оригинала — виден в темноте). */
const machineSteel = machineLayer('DML', { D: 0x000000, M: 0x0058f8, L: 0x3cbcfc });
/** Рубашка и циферблат, галстук, золото ободов и пуговиц. */
const machineTrim = machineLayer('WRY', { W: 0xfcfcfc, R: 0xd82800, Y: 0xf8b800 });
/** Цилиндр (серый с тёмной стороной) и тени стали — тёмно-синие, не чёрные: в темноте арены видно. */
const machineHat = machineLayer('HKN', { H: 0x7c7c7c, K: 0x3c3c3c, N: 0x0000bc });

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
  icicle,
  phone,
  iceblock,
  mikitko,
  mikitkoGhostCoat,
  mikitkoGhostHair,
  mikitkoGhostFace,
  letter,
  beam,
  flame,
  commentGhost,
  candle,
  candleCeil: candle,
  petrovsky,
  mole,
  rat,
  wrench,
  bolt,
  chainPlatform,
  gear,
  shchelin,
  cart,
  boulder,
  pendulum,
  bat,
  snakeBox,
  porcupine,
  moth,
  diveMoth,
  mothShot,
  card,
  sobolev,
  luka,
  vasiliev,
  metal,
  scrap,
  pebble,
  slingRat,
  mechDog,
  crusher,
  foldPlatform,
  craneTracks,
  craneBody,
  wreckingBall,
  markov,
  orb,
  spark,
  fist,
  jet,
  cannon,
  cannonBall,
  rubble,
  lever,
  simes,
  simesShirt,
  machineSteel,
  machineTrim,
  machineHat,
  ambushRat: rat,
  nest: blank,
  eggNest: blank,
  laser: blank,
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
