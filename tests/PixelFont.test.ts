import { describe, expect, it } from 'vitest';
import ru from '../src/data/text/ru.json';
import { buildGlyphs, FONT_BODY_ROWS, FONT_CELL, glyphFor } from '../src/systems/PixelFont';

const glyphs = buildGlyphs();
const byChar = new Map(glyphs.map((g) => [g.char, g]));

describe('PixelFont', () => {
  it('has well-formed glyphs that fit the cell', () => {
    for (const g of glyphs) {
      expect(g.rows, g.char).toHaveLength(FONT_BODY_ROWS + 1);
      expect(g.rows.length).toBeLessThanOrEqual(FONT_CELL.height);
      expect(g.width, g.char).toBeGreaterThan(0);
      expect(g.width, g.char).toBeLessThanOrEqual(FONT_CELL.width);
      for (const row of g.rows) {
        expect(row, g.char).toMatch(/^[#.]+$/);
        expect(row.length, g.char).toBe(g.width);
      }
    }
  });

  it('has no duplicate characters', () => {
    expect(byChar.size).toBe(glyphs.length);
  });

  it('covers the full Russian alphabet and pre-reform letters in both cases', () => {
    const letters = 'абвгдеёжзийклмнопрстуфхцчшщъыьэюяѣіѳ';
    for (const ch of letters + letters.toUpperCase()) {
      expect(glyphFor(ch, byChar), ch).toBeDefined();
    }
  });

  it('can render every character used in ru.json', () => {
    const missing = new Set<string>();
    for (const text of Object.values(ru)) {
      for (const ch of text.replace(/\{\w+\}/g, ''))
        if (ch !== ' ' && !glyphFor(ch, byChar)) missing.add(ch);
    }
    expect([...missing]).toEqual([]);
  });
});
