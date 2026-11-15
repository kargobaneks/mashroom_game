/**
 * Спрайты ведущих 16×24, пиксель-арт данными (ТЗ: «Ассеты и стиль»).
 * Цвета: D — тёмный (одежда, контур, глаза), S — кожа, H — волосы/борода. Не больше 3 цветов
 * плюс прозрачный. Смотрят вправо, влево — зеркально.
 * Карикатура на 1–2 детали: Сергей — зачёсанные волосы и борода, пиджак с открытым воротом;
 * Иван — кок, полуулыбка, серёжка, чёрная рубашка. Образ утверждают сами ведущие (ТЗ).
 * Чистый модуль; текстуру собирает render/heroSprites.ts.
 */
import type { HeroId } from '../systems/Flow';

export const HERO_SPRITE = { width: 16, height: 24 } as const;

/**
 * Цвета из палитры NES, как у героев NES-платформеров: чёрный контур (D), основной цвет (H),
 * светлый для лица и рук (S). У Сергея основной — рыжий: волосы, борода и пиджак одного цвета
 * (так держится силуэт при трёх цветах). У Ивана основной — каштановый (волосы), рубашка чёрная.
 */
export const HERO_PALETTES: Readonly<Record<HeroId, Readonly<Record<'D' | 'S' | 'H', number>>>> = {
  sergey: { D: 0x000000, S: 0xfcbcb0, H: 0xe45c10 },
  ivan: { D: 0x000000, S: 0xfcbcb0, H: 0x881400 },
};

// Кадр 16×24: голова — строки 0–12 (крупная, в половину роста — узнаётся по силуэту),
// тело — 13–19, ноги — 20–23. Смотрят вправо. E — глаз (открыт — D, закрыт — S).
// J в руках — цвет рукава (у Сергея пиджак H, у Ивана рубашка D).

const HEADS: Readonly<Record<HeroId, readonly string[]>> = {
  // Сергей: объёмная шевелюра, зачёсанная назад (выпирает за затылок), борода клином вперёд.
  sergey: [
    '...DDDDDD.......',
    '..DHHHHHHDDD....',
    '.DHHHHHHHHHHDD..',
    'DHHHHHHHHHHHHHD.',
    'DHHHHHHHHSSSSSD.',
    '.DHHHHHSSSSSSSD.',
    '..DHHDSSSSESSSD.',
    '..DHSDSSSSESSSSD',
    '..DHHSSSSSSSSSD.',
    '...DSSSSSHHHHHHD',
    '...DSSHHHHDDHHHD',
    '....DHHHHHHHHHD.',
    '.....DDDDDDDDD..',
  ],

  // Иван: высокий кок козырьком вперёд, гладко выбрит, полуулыбка, серёжка.
  ivan: [
    '.......DDDDDD...',
    '.....DDHHHHHHD..',
    '....DHHHHHHHHHD.',
    '...DHHHHHHHHHHHD',
    '..DHHHHHHHHDDDD.',
    '..DHHHHSSSSSSSD.',
    '..DHHDSSSSESSSD.',
    '..DHHSDSSSESSSSD',
    '..DHDSSSSSSSSSD.',
    '...DSSSSSSSDSSD.',
    '...DSSSSSSSSDDD.',
    '....DSSSSSSSSD..',
    '.....DDDDDDDD...',
  ],
};

const TORSOS: Readonly<Record<HeroId, readonly string[]>> = {
  // Рыжий пиджак с открытым воротом.
  sergey: [
    '.....DHSSHD.....',
    '....DHHSSHHD....',
    '....DHHHSHHHD...',
    '....DHHHHHHHD...',
    '....DHHHHHHHD...',
    '....DHDHHHHHD...',
    '.....DDDDDDD....',
  ],
  // Чёрная рубашка, шея в вороте, пуговицы планки.
  ivan: [
    '.....DDSSDD.....',
    '....DDDSSDDD....',
    '....DDDDHDDDD...',
    '....DDDDDDDDD...',
    '....DDDDHDDDD...',
    '....DHDDDDDDD...',
    '.....DDDDDDD....',
  ],
};

const LEGS = {
  stand: ['.....DDD.DDD....', '....DDD...DDD...', '....DD.....DD...', '...DDD.....DDDD.'],
  stride: ['.....DDD.DDD....', '...DDD.....DDD..', '..DDD.......DDD.', '.DDD.........DDD'],
  passA: ['.....DDDDDD.....', '.....DDD.DD.....', '....DDD..DD.....', '....DD...DDDD...'],
  passB: ['.....DDDDDD.....', '.....DD.DDD.....', '.....DD..DDD....', '....DDDD..DD....'],
  tuck: ['.....DDDDDDD....', '....DD....DDD...', '...DD.......DD..', '................'],
} as const;

/** Присед: тело под головой (голова + 6 строк, прижато к низу кадра). Руки на коленях. */
const CROUCH_BODY = [
  '....DJJSSJJD....',
  '...DJJJJJJJJD...',
  '..DSDJJJJJJDSD..',
  '...DDDD..DDDD...',
  '..DDDD....DDDD..',
  '..DDDD....DDDDD.',
];

type Legs = keyof typeof LEGS;
type Arms = 'down' | 'up' | 'back' | 'forward' | 'flail';
type Eyes = 'open' | 'closed';
type Pixel = readonly [x: number, y: number, c: string];

const col = (x: number, y0: number, y1: number, c: string): Pixel[] =>
  Array.from({ length: y1 - y0 + 1 }, (_, i) => [x, y0 + i, c] as const);

// Руки: J — рукав, D — контур, S — кисть. Задняя рука — у затылка (слева), передняя — у лица.
/** Задняя рука опущена вдоль тела. */
const BACK_DOWN: Pixel[] = [
  [3, 14, 'D'],
  ...col(2, 15, 17, 'D'),
  ...col(3, 15, 17, 'J'),
  [2, 18, 'S'],
  [3, 18, 'S'],
];
/** Передняя рука согнута, кулак перед собой. */
const FRONT_BENT: Pixel[] = [
  [12, 14, 'D'],
  [13, 15, 'D'],
  [12, 15, 'J'],
  [12, 16, 'J'],
  [13, 16, 'J'],
  [14, 16, 'D'],
  [13, 17, 'S'],
  [14, 17, 'S'],
  [15, 17, 'D'],
  [12, 17, 'D'],
  [13, 18, 'D'],
  [14, 18, 'D'],
];
const ARMS: Readonly<Record<Arms, readonly Pixel[]>> = {
  down: [...BACK_DOWN, ...FRONT_BENT],
  // Держит предмет над головой: обе руки вверх, кисти у верхнего края кадра.
  up: [
    ...col(0, 2, 13, 'D'),
    ...col(1, 2, 13, 'J'),
    [0, 0, 'S'],
    [1, 0, 'S'],
    [0, 1, 'S'],
    [1, 1, 'S'],
    ...col(14, 2, 12, 'J'),
    ...col(15, 2, 12, 'D'),
    [14, 0, 'S'],
    [15, 0, 'S'],
    [14, 1, 'S'],
    [15, 1, 'S'],
  ],
  // Замах / прыжок: задняя рука вверх-назад, передняя согнута.
  back: [...col(1, 9, 14, 'D'), ...col(2, 9, 14, 'J'), [1, 8, 'S'], [2, 8, 'S'], ...FRONT_BENT],
  // Бросок: передняя рука вытянута вперёд.
  forward: [
    ...BACK_DOWN,
    [12, 14, 'D'],
    [13, 14, 'D'],
    [14, 14, 'D'],
    [12, 15, 'J'],
    [13, 15, 'J'],
    [14, 15, 'J'],
    [15, 15, 'S'],
    [12, 16, 'D'],
    [13, 16, 'D'],
    [14, 16, 'D'],
  ],
  // Удар, падение: руки в стороны.
  flail: [
    [1, 14, 'D'],
    [2, 14, 'J'],
    [3, 14, 'J'],
    [0, 13, 'S'],
    [13, 14, 'J'],
    [14, 14, 'J'],
    [15, 14, 'D'],
    [15, 13, 'S'],
    [1, 15, 'D'],
    [2, 15, 'D'],
    [13, 15, 'D'],
    [14, 15, 'D'],
  ],
};

/** Цвет рукава: у Сергея — пиджак (H), у Ивана — чёрная рубашка (D). */
const SLEEVE: Readonly<Record<HeroId, 'H' | 'D'>> = { sergey: 'H', ivan: 'D' };

/** Позы из ТЗ: покой 2, ходьба 4, прыжок 1, падение 1, присед 1, с предметом — покой 1 и ходьба 4, бросок 2, удар 1, гибель 3, оглушение 2. */
export const HERO_POSES = [
  'idle',
  'idleBlink',
  'walk1',
  'walk2',
  'walk3',
  'walk4',
  'jump',
  'fall',
  'crouch',
  'carryIdle',
  'carryWalk1',
  'carryWalk2',
  'carryWalk3',
  'carryWalk4',
  'throw1',
  'throw2',
  'hurt',
  'dead1',
  'dead2',
  'dead3',
  'stun1',
  'stun2',
] as const;
export type HeroPose = (typeof HERO_POSES)[number];

interface PoseSpec {
  legs: Legs | 'crouch';
  arms: Arms;
  eyes: Eyes;
  /** Сдвиг головы вниз на 1 px (покачивание при оглушении). */
  bob?: boolean;
}

const WALK: readonly Legs[] = ['stride', 'passA', 'stride', 'passB'];

const SPECS: Readonly<Record<HeroPose, PoseSpec>> = {
  idle: { legs: 'stand', arms: 'down', eyes: 'open' },
  idleBlink: { legs: 'stand', arms: 'down', eyes: 'closed' },
  walk1: { legs: WALK[0]!, arms: 'down', eyes: 'open' },
  walk2: { legs: WALK[1]!, arms: 'down', eyes: 'open' },
  walk3: { legs: WALK[2]!, arms: 'down', eyes: 'open' },
  walk4: { legs: WALK[3]!, arms: 'down', eyes: 'open' },
  jump: { legs: 'tuck', arms: 'back', eyes: 'open' },
  fall: { legs: 'stand', arms: 'flail', eyes: 'open' },
  crouch: { legs: 'crouch', arms: 'down', eyes: 'open' },
  carryIdle: { legs: 'stand', arms: 'up', eyes: 'open' },
  carryWalk1: { legs: WALK[0]!, arms: 'up', eyes: 'open' },
  carryWalk2: { legs: WALK[1]!, arms: 'up', eyes: 'open' },
  carryWalk3: { legs: WALK[2]!, arms: 'up', eyes: 'open' },
  carryWalk4: { legs: WALK[3]!, arms: 'up', eyes: 'open' },
  throw1: { legs: 'stand', arms: 'back', eyes: 'open' },
  throw2: { legs: 'stride', arms: 'forward', eyes: 'open' },
  hurt: { legs: 'tuck', arms: 'flail', eyes: 'closed' },
  dead1: { legs: 'stand', arms: 'flail', eyes: 'closed' },
  dead2: { legs: 'crouch', arms: 'down', eyes: 'closed' },
  dead3: { legs: 'crouch', arms: 'flail', eyes: 'closed' },
  stun1: { legs: 'stand', arms: 'down', eyes: 'closed' },
  stun2: { legs: 'stand', arms: 'down', eyes: 'closed', bob: true },
};

function put(grid: string[][], x: number, y: number, c: string): void {
  const row = grid[y];
  if (row && x >= 0 && x < HERO_SPRITE.width) row[x] = c;
}

const HEAD_ROWS = 13;
const TORSO_TOP = 13;
const LEGS_TOP = 20;

/** Собрать кадр: HERO_SPRITE.height строк по HERO_SPRITE.width символов ('.', 'D', 'S', 'H'). */
export function composeHero(hero: HeroId, pose: HeroPose): string[] {
  const spec = SPECS[pose];
  const W = HERO_SPRITE.width;
  const H = HERO_SPRITE.height;
  const grid: string[][] = Array.from({ length: H }, () => Array<string>(W).fill('.'));
  const eye = spec.eyes === 'open' ? 'D' : 'S';
  const head = HEADS[hero].map((r) => r.replace(/E/g, eye));
  const sleeve = SLEEVE[hero];
  const draw = (rows: readonly string[], top: number) =>
    rows.forEach((r, i) => [...r].forEach((c, x) => c !== '.' && put(grid, x, top + i, c)));

  if (spec.legs === 'crouch') {
    // Присед: голова + сжатое тело, прижато к низу кадра. Руки — на коленях (в теле).
    const top = H - HEAD_ROWS - CROUCH_BODY.length;
    draw(head, top);
    draw(
      CROUCH_BODY.map((r) => r.replace(/J/g, sleeve)),
      top + HEAD_ROWS,
    );
    if (spec.arms === 'flail') {
      put(grid, 2, top + HEAD_ROWS, 'S');
      put(grid, 13, top + HEAD_ROWS, 'S');
    }
    return grid.map((r) => r.join(''));
  }

  const bob = spec.bob ? 1 : 0;
  draw(head, bob);
  draw(TORSOS[hero], TORSO_TOP);
  draw(LEGS[spec.legs], LEGS_TOP);
  for (const [x, y, c] of ARMS[spec.arms]) put(grid, x, y, c === 'J' ? sleeve : c);
  return grid.map((r) => r.join(''));
}

/** Состояние игрока, нужное для выбора кадра (подмножество sim/Player). */
export interface HeroPoseInput {
  readonly state: string;
  readonly onGround: boolean;
  readonly vx: number;
  readonly vy: number;
  readonly carrying: unknown;
  readonly throwTimer: number;
  readonly stateTimer: number;
}

export const HERO_ANIM = {
  walkFramesPerPose: 8,
  stunFramesPerPose: 10,
  /** Моргание: раз в столько кадров, длится blinkFrames. */
  blinkEvery: 180,
  blinkFrames: 8,
} as const;

/** Какой кадр рисовать. null — игрока не видно (сидит в ящике). */
export function heroPoseFor(
  p: HeroPoseInput,
  frame: number,
  deathFrames: number,
  throwFrames: number,
): HeroPose | null {
  const walk = (Math.floor(frame / HERO_ANIM.walkFramesPerPose) % 4) + 1;
  switch (p.state) {
    case 'hidden':
      return null;
    case 'idle':
    case 'respawn':
      return frame % HERO_ANIM.blinkEvery < HERO_ANIM.blinkFrames ? 'idleBlink' : 'idle';
    case 'walk':
      return `walk${walk}` as HeroPose;
    case 'jump':
    case 'held':
      return 'jump';
    case 'fall':
      return 'fall';
    case 'crouch':
      return 'crouch';
    case 'carry':
      if (!p.onGround) return 'carryIdle';
      return p.vx !== 0 ? (`carryWalk${walk}` as HeroPose) : 'carryIdle';
    case 'throw':
      return p.throwTimer > throwFrames / 2 ? 'throw1' : 'throw2';
    case 'hurt':
      return 'hurt';
    case 'stunned':
      return Math.floor(frame / HERO_ANIM.stunFramesPerPose) % 2 === 0 ? 'stun1' : 'stun2';
    case 'dead': {
      const elapsed = deathFrames - p.stateTimer;
      return elapsed < deathFrames / 3
        ? 'dead1'
        : elapsed < (2 * deathFrames) / 3
          ? 'dead2'
          : 'dead3';
    }
    default:
      return 'idle';
  }
}
