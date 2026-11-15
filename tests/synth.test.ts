import { describe, expect, it } from 'vitest';
import { SFX } from '../src/config/sfx';
import { presetDuration, renderSfx } from '../src/systems/Synth';

describe('Synth', () => {
  it('renders every preset with the right length, within [-1, 1] and not silent', () => {
    const sr = 22050;
    for (const [name, p] of Object.entries(SFX)) {
      const pcm = renderSfx(p, sr);
      expect(pcm.length, name).toBe(Math.round(presetDuration(p) * sr));
      let peak = 0;
      for (const s of pcm) peak = Math.max(peak, Math.abs(s));
      expect(peak, name).toBeLessThanOrEqual(1);
      expect(peak, name).toBeGreaterThan(0);
    }
  });

  it('is deterministic', () => {
    const a = renderSfx(SFX.enemyHit, 8000);
    const b = renderSfx(SFX.enemyHit, 8000);
    expect(Array.from(a)).toEqual(Array.from(b));
  });

  it('fades out at the end', () => {
    const pcm = renderSfx(SFX.jump, 22050);
    expect(Math.abs(pcm[pcm.length - 1]!)).toBeLessThan(0.01);
  });
});
