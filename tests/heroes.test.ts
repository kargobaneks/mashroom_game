import { describe, expect, it } from 'vitest';
import {
  composeHero,
  HERO_PALETTES,
  HERO_POSES,
  HERO_SPRITE,
  heroPoseFor,
  type HeroPoseInput,
} from '../src/art/heroes';
import { PLAYER_PHYSICS as P } from '../src/config/physics';

const HEROES = ['sergey', 'ivan'] as const;

describe('hero sprites', () => {
  it('every pose is 16×24 and uses at most 3 colours plus transparent', () => {
    for (const hero of HEROES) {
      expect(Object.keys(HERO_PALETTES[hero])).toHaveLength(3);
      for (const pose of HERO_POSES) {
        const rows = composeHero(hero, pose);
        expect(rows, `${hero}:${pose}`).toHaveLength(HERO_SPRITE.height);
        for (const r of rows) {
          expect(r, `${hero}:${pose}`).toHaveLength(HERO_SPRITE.width);
          expect(r).toMatch(/^[.DSH]+$/);
        }
      }
    }
  });

  it('feet touch the bottom row (sprite stands on the hitbox floor)', () => {
    for (const hero of HEROES) {
      for (const pose of ['idle', 'walk1', 'crouch', 'carryIdle'] as const) {
        expect(composeHero(hero, pose).at(-1), `${hero}:${pose}`).toMatch(/D/);
      }
    }
  });

  it('the two hosts look different', () => {
    expect(composeHero('sergey', 'idle')).not.toEqual(composeHero('ivan', 'idle'));
    expect(HERO_PALETTES.sergey).not.toEqual(HERO_PALETTES.ivan);
  });

  it('blink and stun frames differ from idle', () => {
    expect(composeHero('ivan', 'idleBlink')).not.toEqual(composeHero('ivan', 'idle'));
    expect(composeHero('ivan', 'stun1')).not.toEqual(composeHero('ivan', 'stun2'));
  });
});

describe('heroPoseFor', () => {
  const base: HeroPoseInput = {
    state: 'idle',
    onGround: true,
    vx: 0,
    vy: 0,
    carrying: null,
    throwTimer: 0,
    stateTimer: 0,
  };
  const pose = (o: Partial<HeroPoseInput>, frame = 20) =>
    heroPoseFor({ ...base, ...o }, frame, P.deathFrames, P.throwFrames);

  it('maps states to poses', () => {
    expect(pose({})).toBe('idle');
    expect(pose({}, 0)).toBe('idleBlink');
    expect(pose({ state: 'walk' }, 0)).toBe('walk1');
    expect(pose({ state: 'walk' }, 8)).toBe('walk2');
    expect(pose({ state: 'jump' })).toBe('jump');
    expect(pose({ state: 'fall' })).toBe('fall');
    expect(pose({ state: 'crouch' })).toBe('crouch');
    expect(pose({ state: 'carry', vx: 1 }, 0)).toBe('carryWalk1');
    expect(pose({ state: 'carry' })).toBe('carryIdle');
    expect(pose({ state: 'throw', throwTimer: P.throwFrames })).toBe('throw1');
    expect(pose({ state: 'throw', throwTimer: 1 })).toBe('throw2');
    expect(pose({ state: 'hidden' })).toBeNull();
    expect(pose({ state: 'held' })).toBe('jump');
    expect(pose({ state: 'hurt' })).toBe('hurt');
    expect(pose({ state: 'dead', stateTimer: P.deathFrames })).toBe('dead1');
    expect(pose({ state: 'dead', stateTimer: 1 })).toBe('dead3');
  });
});
