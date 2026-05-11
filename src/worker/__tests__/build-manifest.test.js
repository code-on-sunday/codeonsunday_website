import { describe, it, expect } from 'vitest';
import { buildManifest } from '../lib/build-manifest.js';
import { validateManifest } from '../../lib/route.js';

describe('buildManifest', () => {
  it('builds a 6-page manifest for 4 photos (intro + 4 + final)', () => {
    const m = buildManifest('honey-river', 4, 2);
    expect(m.pages.length).toBe(6);
    expect(m.pages[0].html).toBe('pages/00-intro.html');
    expect(m.pages[1].html).toBe('pages/01-photo.html');
    expect(m.pages[4].html).toBe('pages/04-photo.html');
    expect(m.pages[5]).toEqual({ html: 'pages/05-final.html', final: true });
    expect(m.photoCount).toBe(4);
    expect(m.paletteSeed).toBe(2);
  });
  it('builds an 8-page manifest for 6 photos', () => {
    const m = buildManifest('honey-river', 6, 0);
    expect(m.pages.length).toBe(8);
    expect(m.pages.at(-1)).toEqual({ html: 'pages/07-final.html', final: true });
  });
  it('builds a 5-page manifest for 3 photos', () => {
    const m = buildManifest('honey-river', 3, 0);
    expect(m.pages.length).toBe(5);
  });
  it('produces a shape that passes validateManifest', () => {
    expect(() => validateManifest(buildManifest('x', 3, 0))).not.toThrow();
    expect(() => validateManifest(buildManifest('x', 6, 0))).not.toThrow();
  });
});
