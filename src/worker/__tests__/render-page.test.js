import { describe, it, expect } from 'vitest';
import { renderPage } from '../lib/render-page.js';

describe('renderPage intro', () => {
  it('returns a self-contained HTML doc', () => {
    const html = renderPage('intro', { paletteIndex: 0 });
    expect(html.startsWith('<!doctype html>')).toBe(true);
    expect(html).toContain('this is me');
    expect(html).toContain('<style>');
    expect(html).not.toContain('<link rel="stylesheet"');
  });
  it('applies the gradient palette for the given index', () => {
    const html0 = renderPage('intro', { paletteIndex: 0 });
    expect(html0).toContain('#ffd6a5'); // PALETTES[0].from
  });
  it('uses palette wrap for indices past 6', () => {
    const html = renderPage('intro', { paletteIndex: 7 });
    expect(html).toContain('#caffbf'); // PALETTES[1].from
  });
});
