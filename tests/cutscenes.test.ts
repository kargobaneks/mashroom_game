import { describe, expect, it } from 'vitest';
import { CUTSCENE_IMAGES, CUTSCENES, framesOf } from '../src/data/cutscenes';
import ru from '../src/data/text/ru.json';
import { STORY } from '../src/config/levels';

const text = ru as Record<string, string>;

describe('cutscenes', () => {
  it('every story cutscene has frames whose texts and pictures exist', () => {
    for (const step of STORY) {
      if (step.kind !== 'cutscene') continue;
      const frames = framesOf(step.id);
      expect(frames.length, step.id).toBeGreaterThan(0);
      for (const f of frames) {
        expect(text[f.textKey], f.textKey).toBeTruthy();
        if (f.bg) expect(CUTSCENE_IMAGES[f.bg], f.bg).toBeTruthy();
        for (const l of f.labels ?? []) expect(text[l.textKey], l.textKey).toBeTruthy();
      }
    }
  });

  it('after level 3: the hold is empty, then GRPZDC spots the villain at the warehouse (TZ)', () => {
    const f = CUTSCENES.l3_end!;
    expect(f.length).toBeGreaterThanOrEqual(3);
    expect(f.some((x) => x.speaker === 'grpzdc')).toBe(true);
    expect(new Set(f.map((x) => x.bg)).size).toBeGreaterThanOrEqual(3);
  });
});
