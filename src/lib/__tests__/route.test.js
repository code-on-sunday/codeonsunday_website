import { describe, it, expect } from 'vitest';
import { resolveSiteName, validateManifest } from '../route.js';

describe('resolveSiteName', () => {
  it('returns the default site for "/"', () => {
    expect(resolveSiteName('/', 'trung')).toBe('trung');
  });
  it('returns the default site for empty path', () => {
    expect(resolveSiteName('', 'trung')).toBe('trung');
  });
  it('extracts a single-segment site name', () => {
    expect(resolveSiteName('/demo-other', 'trung')).toBe('demo-other');
  });
  it('strips trailing slash', () => {
    expect(resolveSiteName('/demo-other/', 'trung')).toBe('demo-other');
  });
  it('returns the first segment when path has multiple', () => {
    expect(resolveSiteName('/demo-other/sub', 'trung')).toBe('demo-other');
  });
});

describe('validateManifest', () => {
  it('accepts a valid manifest', () => {
    const m = {
      title: 'x',
      pages: [
        { html: 'pages/01.html' },
        { html: 'pages/02.html', final: true },
      ],
    };
    expect(() => validateManifest(m)).not.toThrow();
  });
  it('rejects manifest with no pages', () => {
    expect(() => validateManifest({ title: 'x', pages: [] })).toThrow(/at least 2/);
  });
  it('rejects manifest with one page', () => {
    expect(() => validateManifest({ title: 'x', pages: [{ html: 'a.html', final: true }] })).toThrow(/at least 2/);
  });
  it('rejects manifest with more than 10 pages', () => {
    const pages = Array.from({ length: 11 }, (_, i) => ({ html: `p${i}.html` }));
    pages[pages.length - 1].final = true;
    expect(() => validateManifest({ title: 'x', pages })).toThrow(/at most 10/);
  });
  it('rejects manifest where the last page is not final', () => {
    expect(() => validateManifest({
      title: 'x',
      pages: [{ html: 'a.html' }, { html: 'b.html' }],
    })).toThrow(/last page.*final/);
  });
  it('rejects manifest with multiple final pages', () => {
    expect(() => validateManifest({
      title: 'x',
      pages: [{ html: 'a.html', final: true }, { html: 'b.html', final: true }],
    })).toThrow(/exactly one final/);
  });
});
