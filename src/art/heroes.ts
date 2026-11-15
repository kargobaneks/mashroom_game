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

/** Цвета из палитры NES. */
export const HERO_PALETTES: Readonly<Record<HeroId, Readonly<Record<'D' | 'S' | 'H', number>>>> = {
  sergey: { D: 0x0000bc, S: 0xfcbcb0, H: 0xe45c10 },
  ivan: { D: 0x000000, S: 0xfcbcb0, H: 0x503000 },
};

// E — глаза: в открытых D, в закрытых S.
const HEADS: Readonly<Record<HeroId, readonly string[]>> = {
  sergey: [
    '......HHHH......',
    '....HHHHHHHH....',
    '...HHHHHHHHHH...',
    '...HHHHSSSSHH...',
    '...HHHSSSSSSS...',
    '...HHSSSESSES...',
    '...HHSSSSSSSS...',
    '....HHSHSSSHS...',
    '....HHHHHHHHH...',
    '.....HHHHHHH....',
  ],
  ivan: [
    '........HHHH....',
    '.....HHHHHHHH...',
    '....HHHHHHHHHH..',
    '...HHHHHSSSSH...',
    '...HHHSSSSSSS...',
    '...HHSSSESSES...',
    '...DSSSSSSSSS...',
    '....SSSSSSSSS...',
    '....SSSSSDDDS...',
    '.....SSSSSSS....',
  ],
};

const TORSOS: Readonly<Record<HeroId, readonly string[]>> = {
  sergey: [
    '......DDDD......',
    '....DDDSSDDD....',
    '...DDDDSSDDDD...',
    '...DDDDDSDDDD...',
    '...DDDDDDDDDD...',
    '...SDDDDDDDDS...',
    '...SDDDDDDDDS...',
    '....DDDDDDDD....',
  ],
  ivan: [
    '......DDDD......',
    '....DDDDDDDD....',
    '...DDDDDDDDDD...',
    '...DDDDDDDDDD...',
    '...DDDDDDDDDD...',
    '...SDDDDDDDDS...',
    '...SDDDDDDDDS...',
    '....DDDDDDDD....',
  ],
};

const LEGS = {
  stand: [
    '....DDDDDDDD....',
    '....DDD..DDD....',
    '....DDD..DDD....',
    '....DDD..DDD....',
    '....DDD..DDD....',
    '...DDDD..DDDD...',
  ],
  stride: [
    '....DDDDDDDD....',
    '....DDD..DDD....',
    '...DDD....DDD...',
    '...DD......DD...',
    '..DDD......DD...',
    '..DD.......DDD..',
  ],
  passA: [
    '....DDDDDDDD....',
    '.....DDDDDD.....',
    '.....DDD.DD.....',
    '.....DD..DD.....',
    '.....DD.DDD.....',
    '....DDD.........',
  ],
  passB: [
    '....DDDDDDDD....',
    '.....DDDDDD.....',
    '.....DD.DDD.....',
    '.....DD..DD.....',
    '.....DDD.DD.....',
    '.........DDDD...',
  ],
  tuck: [
    '....DDDDDDDD....',
    '...DDDD..DDDD...',
    '...DD......DD...',
    '..DDD......DDD..',
    '................',
    '................',
  ],
} as const;

const CROUCH_BODY = [
  '....DDDDDDDD....',
  '...SDDDDDDDDS...',
  '...DDDDDDDDDD...',
  '..DDDD....DDDD..',
  '..DDD......DDD..',
  '.DDDD......DDDD.',
];

type Legs = keyof typeof LEGS;
type Arms = 'down' | 'up' | 'back' | 'forward' | 'flail';
type Eyes = 'open' | 'closed';

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

/** Собрать кадр: HERO_SPRITE.height строк по HERO_SPRITE.width символов ('.', 'D', 'S', 'H'). */
export function composeHero(hero: HeroId, pose: HeroPose): string[] {
  const spec = SPECS[pose];
  const W = HERO_SPRITE.width;
  const H = HERO_SPRITE.height;
  const grid: string[][] = Array.from({ length: H }, () => Array<string>(W).fill('.'));
  const eye = spec.eyes === 'open' ? 'D' : 'S';
  const head = HEADS[hero].map((r) => r.replace(/E/g, eye));

  if (spec.legs === 'crouch') {
    // Присед: голова + сжатое тело, прижато к низу кадра.
    const top = H - head.length - CROUCH_BODY.length;
    [...head, ...CROUCH_BODY].forEach((r, i) => [...r].forEach((c, x) => put(grid, x, top + i, c)));
  } else {
    const bob = spec.bob ? 1 : 0;
    head.forEach((r, i) => [...r].forEach((c, x) => put(grid, x, i + bob, c)));
    TORSOS[hero].forEach((r, i) => [...r].forEach((c, x) => put(grid, x, 10 + i, c)));
    LEGS[spec.legs].forEach((r, i) => [...r].forEach((c, x) => put(grid, x, 18 + i, c)));
  }

  const bodyTop = spec.legs === 'crouch' ? H - CROUCH_BODY.length - 1 : 10;
  const handsY = bodyTop + 5;
  switch (spec.arms) {
    case 'down':
      break;
    case 'up':
      // Руки подняты по бокам головы — держат предмет над головой.
      for (const x of [2, 13]) {
        put(grid, x, 0, 'S');
        for (let y = 1; y <= 11; y++) put(grid, x, y, 'D');
      }
      put(grid, 3, handsY, 'D');
      put(grid, 12, handsY, 'D');
      put(grid, 3, handsY + 1, 'D');
      put(grid, 12, handsY + 1, 'D');
      break;
    case 'back':
      for (let y = 6; y <= 11; y++) put(grid, 2, y, 'D');
      put(grid, 2, 5, 'S');
      put(grid, 3, handsY, 'D');
      put(grid, 3, handsY + 1, 'D');
      break;
    case 'forward':
      for (let x = 13; x <= 14; x++) put(grid, x, 12, 'D');
      put(grid, 15, 12, 'S');
      put(grid, 12, handsY, 'D');
      put(grid, 12, handsY + 1, 'D');
      break;
    case 'flail':
      put(grid, 1, bodyTop + 1, 'D');
      put(grid, 2, bodyTop + 1, 'D');
      put(grid, 13, bodyTop + 1, 'D');
      put(grid, 14, bodyTop + 1, 'D');
      put(grid, 0, bodyTop, 'S');
      put(grid, 15, bodyTop, 'S');
      break;
  }
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
