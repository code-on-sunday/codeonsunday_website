import { describe, it, expect } from 'vitest';
import { validatePhotos } from '../lib/validation.js';

function fakeFile({ size = 100_000, type = 'image/jpeg' } = {}) {
  const blob = new Blob([new Uint8Array(size)], { type });
  return new File([blob], 'p.jpg', { type });
}

describe('validatePhotos', () => {
  it('passes 3 valid jpegs', () => {
    const photos = [fakeFile(), fakeFile(), fakeFile()];
    expect(validatePhotos(photos)).toEqual({ ok: true, photos });
  });
  it('passes 6 valid jpegs', () => {
    const photos = Array.from({ length: 6 }, () => fakeFile());
    expect(validatePhotos(photos)).toEqual({ ok: true, photos });
  });
  it('rejects fewer than 3', () => {
    const photos = [fakeFile(), fakeFile()];
    expect(validatePhotos(photos)).toEqual({ ok: false, error: 'photo_count' });
  });
  it('rejects more than 6', () => {
    const photos = Array.from({ length: 7 }, () => fakeFile());
    expect(validatePhotos(photos)).toEqual({ ok: false, error: 'photo_count' });
  });
  it('rejects a >2MB photo', () => {
    const photos = [fakeFile(), fakeFile(), fakeFile({ size: 3 * 1024 * 1024 })];
    expect(validatePhotos(photos)).toEqual({ ok: false, error: 'photo_too_large' });
  });
  it('rejects non-jpeg content type', () => {
    const photos = [fakeFile(), fakeFile(), fakeFile({ type: 'image/png' })];
    expect(validatePhotos(photos)).toEqual({ ok: false, error: 'bad_format' });
  });
});
