import { describe, it, expect } from 'vitest';
import { PALETTES, paletteFor } from '../lib/palettes.js';

describe('paletteFor', () => {
  it('returns palettes by index, wrapping after 6', () => {
    expect(paletteFor(0)).toEqual(PALETTES[0]);
    expect(paletteFor(5)).toEqual(PALETTES[5]);
    expect(paletteFor(6)).toEqual(PALETTES[0]);
    expect(paletteFor(13)).toEqual(PALETTES[1]);
  });
});
