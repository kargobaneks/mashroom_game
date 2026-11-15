import { describe, expect, it } from 'vitest';
import { SPRITES } from '../src/art/sprites';
import { AGRANOVICH } from '../src/config/balance';
import { ENEMIES, PICKUPS } from '../src/config/enemies';
import { ITEMS } from '../src/config/physics';

describe('sprites', () => {
  it('every frame matches its size, uses only palette letters, at most 3 colours', () => {
    for (const [id, def] of Object.entries(SPRITES)) {
      expect(Object.keys(def.palette).length, id).toBeLessThanOrEqual(3);
      for (const [frame, rows] of Object.entries(def.frames)) {
        const name = `${id}:${frame}`;
        expect(rows, name).toHaveLength(def.h);
        for (const r of rows) {
          expect(r.length, name).toBe(def.w);
          for (const c of r) if (c !== '.') expect(def.palette, `${name} '${c}'`).toHaveProperty(c);
        }
      }
    }
  });

  it('sprite sizes match entity hitboxes', () => {
    const expectSize = (id: keyof typeof SPRITES, w: number, h: number) =>
      expect([SPRITES[id].w, SPRITES[id].h], id).toEqual([w, h]);
    expectSize('bot', ENEMIES.bot.width, ENEMIES.bot.height);
    expectSize('asterisk', ENEMIES.asterisk.width, ENEMIES.asterisk.height);
    expectSize('barista', ENEMIES.barista.width, ENEMIES.barista.height);
    expectSize('latte', ENEMIES.barista.dropSize, ENEMIES.barista.dropSize);
    expectSize('box', ITEMS.box.width, ITEMS.box.height);
    expectSize('case', ITEMS.case.width, ITEMS.case.height);
    for (const k of ['coffee', 'star', 'timecode'] as const)
      expectSize(k, PICKUPS[k].width, PICKUPS[k].height);
    expectSize('stream', AGRANOVICH.streams.size, AGRANOVICH.streams.size);
    expectSize('paintball', AGRANOVICH.paintballs.size, AGRANOVICH.paintballs.size);
    expectSize('agranovich', AGRANOVICH.width, AGRANOVICH.height);
  });

  it('boss has idle, aim (telegraph) and hit frames that differ', () => {
    const f = SPRITES.agranovich.frames;
    expect(f.aim).not.toEqual(f.idle);
    expect(f.hit).not.toEqual(f.idle);
  });
});
