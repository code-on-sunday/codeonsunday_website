const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

export function validatePhotos(photos) {
  if (!Array.isArray(photos) || photos.length < 3 || photos.length > 6) {
    return { ok: false, error: 'photo_count' };
  }
  for (const f of photos) {
    if (!f || typeof f.size !== 'number') return { ok: false, error: 'bad_format' };
    if (f.type !== 'image/jpeg') return { ok: false, error: 'bad_format' };
    if (f.size > MAX_PHOTO_BYTES) return { ok: false, error: 'photo_too_large' };
  }
  return { ok: true, photos };
}
