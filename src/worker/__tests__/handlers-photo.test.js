import { describe, it, expect, vi } from 'vitest';
import { handlePhoto } from '../handlers/photo.js';

function envWithR2(value) {
  return {
    R2_BLOBS: {
      get: vi.fn().mockResolvedValue(
        value === null
          ? null
          : {
              body: new Blob([value]).stream(),
              httpMetadata: { contentType: 'image/jpeg' },
            }
      ),
    },
  };
}

describe('handlePhoto', () => {
  it('reads photos/<slug>/<i>.jpg and returns the body', async () => {
    const env = envWithR2(new Uint8Array([0xff, 0xd8]));
    const res = await handlePhoto(env, 'honey-river', 2);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('image/jpeg');
    expect(env.R2_BLOBS.get).toHaveBeenCalledWith('photos/honey-river/2.jpg');
  });
  it('returns 404 on R2 miss', async () => {
    const env = envWithR2(null);
    const res = await handlePhoto(env, 'honey-river', 99);
    expect(res.status).toBe(404);
  });
});
