import { describe, expect, it } from 'vitest';
import { LEVEL_IDS, STORY } from '../src/config/levels';
import { hasText, t } from '../src/systems/Text';
import { computeZoom } from '../src/systems/Zoom';
import { nextEnabled } from '../src/ui/menuLogic';

describe('computeZoom', () => {
  it('uses the largest integer scale that fits, clamped to 1…4', () => {
    expect(computeZoom(1920, 1080)).toBe(4);
    expect(computeZoom(800, 720)).toBe(3);
    expect(computeZoom(600, 500)).toBe(2);
    expect(computeZoom(300, 200)).toBe(1);
    expect(computeZoom(4000, 4000)).toBe(4);
  });
});

describe('text', () => {
  it('substitutes params and flags missing keys', () => {
    expect(t('scene.level', { n: 3 })).toBe('УРОВЕНЬ 3');
    expect(t('no.such.key')).toBe('[no.such.key]');
  });

  it('has names for every level and text for every cutscene', () => {
    for (const l of LEVEL_IDS) expect(hasText(`level.${l}.name`)).toBe(true);
    for (const s of STORY)
      if (s.kind === 'cutscene') expect(hasText(`cutscene.${s.id}`)).toBe(true);
  });
});

describe('nextEnabled', () => {
  const items = [{ label: 'a' }, { label: 'b', enabled: false }, { label: 'c' }];
  it('skips disabled items and wraps', () => {
    expect(nextEnabled(items, 0, 1)).toBe(2);
    expect(nextEnabled(items, 2, 1)).toBe(0);
    expect(nextEnabled(items, 0, -1)).toBe(2);
  });
});
