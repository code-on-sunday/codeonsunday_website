import { describe, it, expect, vi } from 'vitest';
import { handleSnapshot } from '../handlers/snapshot.js';

function envWithR2(value) {
  return {
    R2_BLOBS: {
      get: vi.fn().mockResolvedValue(
        value === null
          ? null
          : {
              body: new Blob([value]).stream(),
              httpMetadata: { contentType: 'image/png' },
            }
      ),
    },
  };
}

describe('handleSnapshot', () => {
  it('reads the right R2 key and returns the body with image/png', async () => {
    const env = envWithR2(new Uint8Array([0x89, 0x50]));
    const res = await handleSnapshot(env, 'honey-river', '01-photo', 'portrait');
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('image/png');
    expect(env.R2_BLOBS.get)
      .toHaveBeenCalledWith('snapshots/honey-river/01-photo.portrait.png');
  });
  it('returns 404 on R2 miss', async () => {
    const env = envWithR2(null);
    const res = await handleSnapshot(env, 'honey-river', '01-photo', 'portrait');
    expect(res.status).toBe(404);
  });
  it('sets a short cache header on hits (snapshots are immutable per slug)', async () => {
    const env = envWithR2(new Uint8Array([0x89]));
    const res = await handleSnapshot(env, 'x', 'y', 'portrait');
    expect(res.headers.get('cache-control')).toBe('public, max-age=300');
  });
});
