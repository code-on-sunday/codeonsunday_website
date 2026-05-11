import { describe, it, expect, vi } from 'vitest';
import { handleFinalPage } from '../handlers/final-page.js';

function makeEnv(manifest) {
  return {
    KV_MANIFESTS: {
      get: vi.fn().mockResolvedValue(manifest ? JSON.stringify(manifest) : null),
    },
  };
}

const manifestFor = (photoCount, paletteSeed = 0) => ({
  title: 'this is me',
  paletteSeed,
  photoCount,
  pages: [
    { html: 'pages/00-intro.html' },
    ...Array.from({ length: photoCount }, (_, i) => ({
      html: `pages/0${i + 1}-photo.html`,
    })),
    { html: `pages/0${photoCount + 1}-final.html`, final: true },
  ],
});

describe('handleFinalPage', () => {
  it('returns 200 HTML referencing the last photo URL', async () => {
    const env = makeEnv(manifestFor(4));
    const res = await handleFinalPage(env, 'honey-river');
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain('src="https://thiiss.me/photo/honey-river/3.jpg"');
    expect(body).toContain('tear your own');
  });
  it('returns 404 if the manifest is gone', async () => {
    const env = makeEnv(null);
    const res = await handleFinalPage(env, 'unknown');
    expect(res.status).toBe(404);
  });
});
