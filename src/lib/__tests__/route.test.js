import { describe, it, expect } from 'vitest';
import { resolveSiteName } from '../route.js';

describe('resolveSiteName — legacy 2-arg path-only', () => {
  it('returns default for /', () => {
    expect(resolveSiteName('/', 'trung')).toBe('trung');
  });
  it('returns first segment for /trung', () => {
    expect(resolveSiteName('/trung', 'fallback')).toBe('trung');
  });
  it('returns first segment for /demo-other/x/y', () => {
    expect(resolveSiteName('/demo-other/x/y', 'fallback')).toBe('demo-other');
  });
});

describe('resolveSiteName — hostname-aware 3-arg', () => {
  it('returns the slug when host is <slug>.thiiss.me, ignoring pathname', () => {
    expect(resolveSiteName('honey-river.thiiss.me', '/', 'trung')).toBe('honey-river');
  });
  it('returns the slug with hex suffix', () => {
    expect(resolveSiteName('honey-river-a1f.thiiss.me', '/', 'trung'))
      .toBe('honey-river-a1f');
  });
  it('falls through to pathname for apex thiiss.me', () => {
    expect(resolveSiteName('thiiss.me', '/create', 'trung')).toBe('create');
  });
  it('falls through to pathname for thiiss.me default', () => {
    expect(resolveSiteName('thiiss.me', '/', 'trung')).toBe('trung');
  });
  it('falls through to pathname for non-thiiss hosts', () => {
    expect(resolveSiteName('localhost', '/trung', 'fallback')).toBe('trung');
  });
  it('rejects malformed slug subdomains and falls through', () => {
    expect(resolveSiteName('Bad_Slug.thiiss.me', '/', 'fallback')).toBe('fallback');
  });
});
