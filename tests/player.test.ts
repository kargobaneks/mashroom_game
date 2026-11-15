import { describe, expect, it } from 'vitest';
import { BALANCE } from '../src/config/balance';
import { ENEMIES } from '../src/config/enemies';
import { PLAYER_PHYSICS as P, THROW_PHYSICS } from '../src/config/physics';
import { makeWorld, run, tap } from './helpers';

const FLOOR = 208;

describe('Player: movement', () => {
  it('falls, lands on the floor and idles', () => {
    const w = makeWorld({ start: { x: 40, y: 100 } });
    const p = w.players[0]!;
    run(w, 60);
    expect(p.y + p.h).toBe(FLOOR);
    expect(p.onGround).toBe(true);
    expect(p.state).toBe('idle');
  });

  it('walks at walkSpeed px/frame', () => {
    const w = makeWorld();
    const p = w.players[0]!;
    run(w, 5);
    const x0 = p.x;
    run(w, 10, ['right']);
    expect(p.state).toBe('walk');
    expect(p.x - x0).toBeCloseTo(10 * P.walkSpeed);
    expect(p.facing).toBe(1);
  });

  it('jumps about 40 px with the button held, lower with an early release', () => {
    const measure = (holdFrames: number): number => {
      const w = makeWorld();
      const p = w.players[0]!;
      run(w, 5);
      let top = p.y;
      for (let i = 0; i < holdFrames; i++) {
        run(w, 1, ['jump']);
        top = Math.min(top, p.y);
      }
      for (let i = 0; i < 60; i++) {
        run(w, 1);
        top = Math.min(top, p.y);
      }
      expect(p.state).toBe('idle');
      return FLOOR - P.hitboxStanding.height - top;
    };
    const full = measure(30);
    expect(full).toBeGreaterThanOrEqual(37);
    expect(full).toBeLessThanOrEqual(42);
    expect(measure(3)).toBeLessThan(full / 2);
  });

  it('reports jump while rising and fall while falling', () => {
    const w = makeWorld();
    const p = w.players[0]!;
    run(w, 5);
    run(w, 2, ['jump']);
    expect(p.state).toBe('jump');
    run(w, 20, ['jump']);
    expect(p.state).toBe('fall');
  });

  it('crouches with a smaller hitbox and stands back up', () => {
    const w = makeWorld();
    const p = w.players[0]!;
    run(w, 5);
    run(w, 2, ['down']);
    expect(p.state).toBe('crouch');
    expect(p.h).toBe(P.hitboxCrouching.height);
    expect(p.y + p.h).toBe(FLOOR);
    run(w, 1, ['down', 'right']);
    expect(p.vx).toBe(0);
    run(w, 1);
    expect(p.h).toBe(P.hitboxStanding.height);
    expect(p.y + p.h).toBe(FLOOR);
  });

  it('drops through a one-way platform with down + jump', () => {
    const grid = [
      ...Array(10).fill('#..............#'),
      '#.....====.....#',
      '#..............#',
      '#..............#',
      '################',
      '################',
    ];
    const w = makeWorld({ grid, start: { x: 104, y: 150 } });
    const p = w.players[0]!;
    run(w, 30);
    expect(p.y + p.h).toBe(160);
    run(w, 1, ['down']);
    run(w, 1, ['down', 'jump']);
    run(w, 30);
    expect(p.y + p.h).toBe(FLOOR);
  });
});

describe('Player: carry, throw, hide', () => {
  const withBox = (kind: 'box' | 'case' = 'box') =>
    makeWorld({ start: { x: 40, y: 208 }, spawns: [{ type: 'item', kind, x: 56, y: 208 }] });

  it('picks up an item it pushes against and carries it overhead', () => {
    const w = withBox();
    const p = w.players[0]!;
    run(w, 20, ['right']);
    expect(p.x + p.w).toBeCloseTo(w.items[0]!.x);
    tap(w, ['right', 'action']);
    expect(p.state).toBe('carry');
    const it = w.items[0]!;
    expect(it.state).toBe('carried');
    expect(it.y + it.h).toBe(p.y);
  });

  it('throws forward, up and along the ground at the TZ speeds', () => {
    const cases = [
      { keys: [] as const, vx: THROW_PHYSICS.forwardSpeed, vy: 0 },
      { keys: ['up'] as const, vx: 0, vy: -THROW_PHYSICS.upSpeed },
    ];
    for (const c of cases) {
      const w = withBox();
      const p = w.players[0]!;
      run(w, 20, ['right']);
      tap(w, ['right', 'action']);
      run(w, 2);
      tap(w, [...c.keys, 'action']);
      const it = w.items[0]!;
      expect(it.state).toBe('thrown');
      expect(it.vx).toBe(c.vx);
      expect(it.vy).toBe(c.vy);
      expect(p.state).toBe('throw');
      run(w, P.throwFrames);
      expect(p.state).toBe('idle');
    }
  });

  it('heavy case slows walking and lowers the jump', () => {
    const w = withBox('case');
    const p = w.players[0]!;
    run(w, 20, ['right']);
    tap(w, ['right', 'action']);
    const x0 = p.x;
    run(w, 4, ['left']);
    expect(x0 - p.x).toBeCloseTo(4 * P.walkSpeedHeavyItem);
    run(w, 1, ['jump']);
    expect(p.vy).toBeCloseTo(P.jumpVelocityHeavyItem + P.gravity);
  });

  it('hides under the item: no damage, enemies touching the box die, any key exits', () => {
    const w = makeWorld({
      start: { x: 40, y: 208 },
      spawns: [
        { type: 'item', kind: 'box', x: 56, y: 208 },
        { type: 'enemy', kind: 'bot', x: 200, y: 208 },
      ],
    });
    const p = w.players[0]!;
    run(w, 20, ['right']);
    tap(w, ['right', 'action']);
    tap(w, ['down']);
    expect(p.state).toBe('hidden');
    expect(w.items[0]!.state).toBe('hiding');
    expect(w.damagePlayer(p, 0)).toBe(false);

    // Бот доходит до укрытия и гибнет; сердца целы.
    run(w, 300, ['down']);
    expect(w.enemies).toHaveLength(0);
    expect(p.vitals.hearts).toBe(BALANCE.startHearts);
    expect(p.state).toBe('hidden');

    tap(w, ['right']);
    expect(p.state).toBe('carry');
  });

  it('throws along the ground from hiding with the action button', () => {
    const w = withBox();
    const p = w.players[0]!;
    run(w, 20, ['right']);
    tap(w, ['right', 'action']);
    tap(w, ['down']);
    run(w, 2, ['down']);
    tap(w, ['down', 'action']);
    expect(w.items[0]!.state).toBe('thrown');
    expect(w.items[0]!.throwDir).toBe('ground');
    expect(p.carrying).toBeNull();
  });
});

describe('Thrown items that miss', () => {
  it('fly missRange px, then drop onto the nearest platform and stay there (reusable)', () => {
    const grid = [...Array(13).fill('#' + '.'.repeat(38) + '#'), '#'.repeat(40), '#'.repeat(40)];
    const w = makeWorld({
      grid,
      start: { x: 40, y: 208 },
      spawns: [{ type: 'item', kind: 'box', x: 56, y: 208 }],
    });
    const seg = w.camera.segment as { w: number };
    seg.w = 640;
    run(w, 20, ['right']);
    tap(w, ['right', 'action']);
    run(w, 2);
    tap(w, ['action']);
    const box = w.items[0]!;
    const x0 = box.x;
    run(w, 120);
    expect(box.state).toBe('resting');
    expect(box.x - x0).toBeGreaterThanOrEqual(THROW_PHYSICS.missRange - THROW_PHYSICS.forwardSpeed);
    expect(box.x - x0).toBeLessThan(THROW_PHYSICS.missRange + 2 * THROW_PHYSICS.forwardSpeed);
    expect(box.y + box.h).toBe(208);
  });
});

describe('Player: picking up «уперевшись»', () => {
  it('pressing action next to a box without pushing towards it does nothing', () => {
    const w = makeWorld({
      start: { x: 40, y: 208 },
      spawns: [{ type: 'item', kind: 'box', x: 56, y: 208 }],
    });
    const p = w.players[0]!;
    run(w, 20, ['right']);
    tap(w, ['action']);
    expect(p.carrying).toBeNull();
    tap(w, []);
    tap(w, ['right', 'action']);
    expect(p.carrying?.kind).toBe('item');
  });

  it('a box with something inside reveals it where it stood', () => {
    const w = makeWorld({
      start: { x: 40, y: 208 },
      spawns: [{ type: 'item', kind: 'box', x: 56, y: 208, contains: 'timecode' }],
    });
    const p = w.players[0]!;
    run(w, 20, ['right']);
    expect(w.pickups).toHaveLength(0);
    tap(w, ['right', 'action']);
    expect(w.pickups).toHaveLength(1);
    expect(w.pickups[0]!.kind).toBe('timecode');
    run(w, 10, ['right']);
    expect(p.timecodes).toBe(1);
  });
});

describe('Player: damage, death, respawn', () => {
  it('loses a heart, is knocked back, then ignores hits while invulnerable', () => {
    const w = makeWorld();
    const p = w.players[0]!;
    run(w, 5);
    expect(w.damagePlayer(p, 0)).toBe(true);
    expect(p.vitals.hearts).toBe(BALANCE.startHearts - 1);
    expect(p.state).toBe('hurt');
    expect(p.vx).toBe(P.knockback.x);
    expect(p.vitals.invuln).toBe(P.invulnerableFrames);
    expect(w.damagePlayer(p, 0)).toBe(false);
    run(w, P.hurtFrames + 1);
    expect(p.controlled).toBe(true);
    run(w, P.invulnerableFrames);
    expect(w.damagePlayer(p, 0)).toBe(true);
  });

  it('dies when hearts run out, loses a life and respawns with full hearts', () => {
    const w = makeWorld();
    const p = w.players[0]!;
    run(w, 5);
    for (let i = 0; i < BALANCE.startHearts; i++) {
      w.damagePlayer(p, 0);
      p.vitals.invuln = 0;
    }
    expect(p.state).toBe('dead');
    run(w, P.deathFrames);
    expect(p.vitals.lives).toBe(BALANCE.startLives - 1);
    expect(p.state).toBe('respawn');
    expect(p.vitals.hearts).toBe(BALANCE.startHearts);
    run(w, P.respawnFrames + 1);
    expect(p.controlled).toBe(true);
  });

  it('game over when the last life is lost', () => {
    const w = makeWorld();
    const p = w.players[0]!;
    for (let life = 0; life < BALANCE.startLives; life++) {
      p.kill(w);
      run(w, P.deathFrames);
    }
    expect(p.out).toBe(true);
    expect(w.gameOver).toBe(true);
    expect(w.drainEvents().some((e) => e.type === 'gameOver')).toBe(true);
  });

  it('falling into a pit costs a life', () => {
    const grid = ROOM_WITH_PIT;
    const w = makeWorld({ grid, start: { x: 120, y: 100 } });
    const p = w.players[0]!;
    run(w, 120);
    expect(p.state === 'dead' || p.vitals.lives < BALANCE.startLives).toBe(true);
  });

  it('hazard tiles hurt', () => {
    const grid = [...Array(13).fill('#..............#'), '#^^^^^^^^^^^^^^#', '################'];
    const w = makeWorld({ grid, start: { x: 40, y: 100 } });
    const p = w.players[0]!;
    run(w, 60);
    expect(p.vitals.hearts).toBeLessThan(BALANCE.startHearts);
  });
});

const ROOM_WITH_PIT = [
  ...Array(13).fill('#..............#'),
  '######....######',
  '######....######',
];

describe('Coop', () => {
  const coop = () =>
    makeWorld({
      players: [
        { id: 1, hero: 'sergey' },
        { id: 2, hero: 'ivan' },
      ],
      start: { x: 40, y: 208 },
    });

  it('picks up the partner, throws them in an arc; they land unhurt', () => {
    const w = coop();
    const [a, b] = w.players as [(typeof w.players)[0] & object, (typeof w.players)[0] & object];
    run(w, 10);
    run(w, 3, ['right']);
    tap(w, ['right', 'action']);
    expect(b.state).toBe('held');
    expect(a.carrying?.kind).toBe('player');
    run(w, 2);
    expect(b.y + b.h).toBe(a.y);
    tap(w, ['right', 'action']);
    expect(b.thrownFlight).toBe(true);
    expect(w.damagePlayer(b, 0)).toBe(false);
    run(w, 60);
    expect(b.thrownFlight).toBe(false);
    expect(b.onGround).toBe(true);
    expect(b.vitals.hearts).toBe(BALANCE.startHearts);
  });

  it('a held partner breaks free with jump', () => {
    const w = coop();
    const [a, b] = w.players as [
      NonNullable<(typeof w.players)[0]>,
      NonNullable<(typeof w.players)[0]>,
    ];
    run(w, 10);
    run(w, 3, ['right']);
    tap(w, ['right', 'action']);
    expect(b.state).toBe('held');
    tap(w, [], ['jump']);
    expect(b.state).toBe('jump');
    expect(a.carrying).toBeNull();
  });

  it('a thrown item stuns the partner without costing a heart', () => {
    const w = makeWorld({
      players: [
        { id: 1, hero: 'sergey' },
        { id: 2, hero: 'ivan' },
      ],
      start: { x: 40, y: 208 },
      spawns: [{ type: 'item', kind: 'box', x: 24, y: 208 }],
    });
    const [a, b] = w.players as [
      NonNullable<(typeof w.players)[0]>,
      NonNullable<(typeof w.players)[0]>,
    ];
    run(w, 10);
    run(w, 5, ['left']);
    tap(w, ['left', 'action']);
    expect(a.carrying?.kind).toBe('item');
    run(w, 1, ['right']);
    tap(w, ['right', 'action']);
    run(w, 10);
    expect(b.state).toBe('stunned');
    expect(b.vitals.hearts).toBe(BALANCE.startHearts);
  });

  it('duet: both press up + action within the window — enemies on screen are stunned, then cooldown', () => {
    const w = makeWorld({
      players: [
        { id: 1, hero: 'sergey' },
        { id: 2, hero: 'ivan' },
      ],
      start: { x: 40, y: 208 },
      spawns: [{ type: 'enemy', kind: 'bot', x: 200, y: 208 }],
    });
    run(w, 5);
    expect(w.enemies).toHaveLength(1);
    tap(w, ['up', 'action']);
    run(w, BALANCE.duet.windowFrames - 2, ['up']);
    tap(w, ['up'], ['up', 'action']);
    expect(w.enemies[0]!.stun).toBeGreaterThan(0);
    expect(w.drainEvents().some((e) => e.type === 'duet')).toBe(true);
    expect(w.duetCooldown).toBeGreaterThan(0);
  });

  it('duet does not fire when presses are too far apart', () => {
    const w = makeWorld({
      players: [
        { id: 1, hero: 'sergey' },
        { id: 2, hero: 'ivan' },
      ],
      spawns: [{ type: 'enemy', kind: 'bot', x: 200, y: 208 }],
    });
    run(w, 5);
    tap(w, ['up', 'action']);
    run(w, BALANCE.duet.windowFrames + 2, ['up']);
    tap(w, [], ['up', 'action']);
    expect(w.enemies[0]!.stun).toBe(0);
  });
});

describe('Enemies', () => {
  it('a thrown box kills a bot and breaks', () => {
    const w = makeWorld({
      start: { x: 40, y: 208 },
      spawns: [
        { type: 'item', kind: 'box', x: 56, y: 208 },
        { type: 'enemy', kind: 'bot', x: 200, y: 208 },
      ],
    });
    run(w, 20, ['right']);
    tap(w, ['right', 'action']);
    run(w, 2);
    tap(w, ['right', 'action']);
    run(w, 40);
    expect(w.enemies).toHaveLength(0);
    expect(w.items).toHaveLength(0);
  });

  it('asterisk sticks and slows by 50%, jumping shakes it off', () => {
    const w = makeWorld({
      start: { x: 40, y: 208 },
      spawns: [{ type: 'enemy', kind: 'asterisk', x: 60, y: 200 }],
    });
    const p = w.players[0]!;
    run(w, 60);
    expect(p.slowStacks).toBe(1);
    expect(p.vitals.hearts).toBe(BALANCE.startHearts);
    const x0 = p.x;
    run(w, 4, ['right']);
    expect(p.x - x0).toBeCloseTo(4 * P.walkSpeed * 0.5);
    tap(w, ['jump']);
    expect(p.slowStacks).toBe(0);
  });

  it('asterisk slow wears off after slowFrames', () => {
    const w = makeWorld({
      start: { x: 40, y: 208 },
      spawns: [{ type: 'enemy', kind: 'asterisk', x: 60, y: 200 }],
    });
    const p = w.players[0]!;
    run(w, 60);
    expect(p.slowStacks).toBe(1);
    run(w, ENEMIES.asterisk.slowFrames);
    expect(p.slowStacks).toBe(0);
  });

  it('bot touching the player costs a heart', () => {
    const w = makeWorld({
      start: { x: 40, y: 208 },
      spawns: [{ type: 'enemy', kind: 'bot', x: 120, y: 208 }],
    });
    const p = w.players[0]!;
    run(w, 200);
    expect(p.vitals.hearts).toBeLessThan(BALANCE.startHearts);
  });
});

describe('Pickups', () => {
  it('coffee heals up to max, star adds a life, timecodes count', () => {
    const w = makeWorld({
      start: { x: 40, y: 208 },
      spawns: [
        { type: 'pickup', kind: 'coffee', x: 70, y: 208 },
        { type: 'pickup', kind: 'star', x: 100, y: 208 },
        { type: 'pickup', kind: 'timecode', x: 130, y: 208 },
      ],
    });
    const p = w.players[0]!;
    p.vitals.hearts = 1;
    run(w, 100, ['right']);
    expect(p.vitals.hearts).toBe(2);
    expect(p.vitals.lives).toBe(BALANCE.startLives + 1);
    expect(p.timecodes).toBe(1);
  });
});
