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

describe('renderPage photo', () => {
  it('embeds the absolute photo URL as <img src>', () => {
    const html = renderPage('photo', {
      paletteIndex: 0, rotationIndex: 0,
      photoUrl: 'https://thiiss.me/photo/honey-river/0.jpg',
    });
    expect(html).toContain('src="https://thiiss.me/photo/honey-river/0.jpg"');
    expect(html).toContain('class="polaroid"');
  });
  it('cycles rotation by index', () => {
    const r0 = renderPage('photo', { paletteIndex: 0, rotationIndex: 0, photoUrl: 'u' });
    const r1 = renderPage('photo', { paletteIndex: 0, rotationIndex: 1, photoUrl: 'u' });
    expect(r0).toContain('rotate(-3deg)');
    expect(r1).toContain('rotate(3deg)');
  });
  it('wraps rotation indices past 6', () => {
    const r6 = renderPage('photo', { paletteIndex: 0, rotationIndex: 6, photoUrl: 'u' });
    expect(r6).toContain('rotate(-3deg)'); // same as index 0
  });
});
