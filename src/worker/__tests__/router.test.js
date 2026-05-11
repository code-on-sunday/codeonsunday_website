import { describe, it, expect } from 'vitest';
import { dispatchRoute, isSlugHost, parseSlug } from '../router.js';

describe('parseSlug', () => {
  it('extracts a two-word slug from a thiiss.me subdomain', () => {
    expect(parseSlug('honey-river.thiiss.me')).toBe('honey-river');
  });
  it('extracts a slug with hex suffix', () => {
    expect(parseSlug('honey-river-a1f.thiiss.me')).toBe('honey-river-a1f');
  });
  it('returns null on apex thiiss.me', () => {
    expect(parseSlug('thiiss.me')).toBeNull();
  });
  it('returns null on a non-matching hostname', () => {
    expect(parseSlug('www.example.com')).toBeNull();
  });
  it('returns null on a malformed subdomain', () => {
    expect(parseSlug('Bad_Slug.thiiss.me')).toBeNull();
  });
});

describe('dispatchRoute on apex thiiss.me', () => {
  const host = 'thiiss.me';
  it('GET / -> apex-form', () => {
    expect(dispatchRoute('GET', host, '/')).toEqual({ kind: 'apex-form' });
  });
  it('GET /create -> apex-form', () => {
    expect(dispatchRoute('GET', host, '/create')).toEqual({ kind: 'apex-form' });
  });
  it('POST /api/create -> apex-create', () => {
    expect(dispatchRoute('POST', host, '/api/create')).toEqual({ kind: 'apex-create' });
  });
  it('GET /api/create -> not-found', () => {
    expect(dispatchRoute('GET', host, '/api/create')).toEqual({ kind: 'not-found' });
  });
  it('GET /photo/honey-river/0.jpg -> apex-photo', () => {
    expect(dispatchRoute('GET', host, '/photo/honey-river/0.jpg'))
      .toEqual({ kind: 'apex-photo', slug: 'honey-river', index: 0 });
  });
  it('GET /photo/Bad_Slug/0.jpg -> not-found', () => {
    expect(dispatchRoute('GET', host, '/photo/Bad_Slug/0.jpg'))
      .toEqual({ kind: 'not-found' });
  });
  it('GET /unknown -> static-asset (let ASSETS try to resolve)', () => {
    expect(dispatchRoute('GET', host, '/unknown.css'))
      .toEqual({ kind: 'static-asset' });
  });
});

describe('dispatchRoute on <slug>.thiiss.me', () => {
  const host = 'honey-river.thiiss.me';
  it('GET / -> site-root', () => {
    expect(dispatchRoute('GET', host, '/')).toEqual({
      kind: 'site-root', slug: 'honey-river',
    });
  });
  it('GET /sites/honey-river/manifest.json -> site-manifest', () => {
    expect(dispatchRoute('GET', host, '/sites/honey-river/manifest.json'))
      .toEqual({ kind: 'site-manifest', slug: 'honey-river' });
  });
  it('GET /sites/honey-river/snapshots/01-photo.portrait.png -> site-snapshot', () => {
    expect(dispatchRoute('GET', host, '/sites/honey-river/snapshots/01-photo.portrait.png'))
      .toEqual({
        kind: 'site-snapshot', slug: 'honey-river',
        base: '01-photo', orient: 'portrait',
      });
  });
  it('GET /sites/honey-river/pages/05-final.html -> site-final-page', () => {
    expect(dispatchRoute('GET', host, '/sites/honey-river/pages/05-final.html'))
      .toEqual({ kind: 'site-final-page', slug: 'honey-river', index: 5 });
  });
  it('GET /photo/honey-river/2.jpg -> site-photo', () => {
    expect(dispatchRoute('GET', host, '/photo/honey-river/2.jpg'))
      .toEqual({ kind: 'site-photo', slug: 'honey-river', index: 2 });
  });
  it('GET /unknown -> static-asset', () => {
    expect(dispatchRoute('GET', host, '/something.png'))
      .toEqual({ kind: 'static-asset' });
  });
});

describe('isSlugHost', () => {
  it('true for honey-river.thiiss.me', () => {
    expect(isSlugHost('honey-river.thiiss.me')).toBe(true);
  });
  it('false for thiiss.me', () => {
    expect(isSlugHost('thiiss.me')).toBe(false);
  });
  it('false for localhost', () => {
    expect(isSlugHost('localhost')).toBe(false);
  });
});
