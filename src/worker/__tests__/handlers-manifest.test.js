import { describe, it, expect, vi } from 'vitest';
import { handleManifest } from '../handlers/manifest.js';

function envWith(getReturn) {
  return {
    KV_MANIFESTS: { get: vi.fn().mockResolvedValue(getReturn) },
  };
}

describe('handleManifest', () => {
  it('returns 200 and the manifest body on KV hit', async () => {
    const body = JSON.stringify({ title: 'x', pages: [{ html: 'p/0.html' }, { html: 'p/1.html', final: true }] });
    const env = envWith(body);
    const res = await handleManifest(env, 'honey-river');
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toMatch(/application\/json/);
    expect(await res.text()).toBe(body);
    expect(env.KV_MANIFESTS.get).toHaveBeenCalledWith('honey-river');
  });
  it('returns 404 on KV miss', async () => {
    const env = envWith(null);
    const res = await handleManifest(env, 'unknown');
    expect(res.status).toBe(404);
  });
  it('sets a short cache header on hits', async () => {
    const env = envWith('{"pages":[]}');
    const res = await handleManifest(env, 'x');
    expect(res.headers.get('cache-control')).toBe('public, max-age=300');
  });
});
