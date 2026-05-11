import { describe, it, expect, vi } from 'vitest';
import { handleCreate } from '../handlers/create.js';

function jpeg(size = 100_000) {
  return new File([new Uint8Array(size)], 'p.jpg', { type: 'image/jpeg' });
}

function makeEnv() {
  const r2 = new Map();
  const kv = new Map();
  return {
    KV_MANIFESTS: {
      get: vi.fn(async (k) => kv.get(k) ?? null),
      put: vi.fn(async (k, v) => { kv.set(k, v); }),
    },
    R2_BLOBS: {
      get: vi.fn(async (k) => r2.has(k) ? { body: r2.get(k) } : null),
      put: vi.fn(async (k, v) => { r2.set(k, v); }),
      delete: vi.fn(async (k) => { r2.delete(k); }),
      list: vi.fn(async ({ prefix }) => ({
        objects: [...r2.keys()].filter(k => k.startsWith(prefix)).map(k => ({ key: k })),
      })),
    },
    __r2: r2,
    __kv: kv,
  };
}

const okSnapshot = (r2) => async (slug, pages) => {
  for (const { base } of pages) {
    r2.set(`snapshots/${slug}/${base}.portrait.png`, new Uint8Array([0x89]));
    r2.set(`snapshots/${slug}/${base}.landscape.png`, new Uint8Array([0x89]));
  }
};
const failSnapshot = async () => { throw new Error('boom'); };

const okVerify = async () => ({ ok: true });
const failVerify = async () => ({ ok: false, error: 'turnstile_failed' });
const requireVerify = async () => ({ ok: false, error: 'turnstile_required' });

async function makeRequest(photos, { token = 'good-token' } = {}) {
  const fd = new FormData();
  for (const p of photos) fd.append('photos[]', p);
  if (token !== null) fd.append('cf-turnstile-response', token);
  return new Request('https://thiiss.me/api/create', { method: 'POST', body: fd });
}

describe('handleCreate', () => {
  it('returns 200 with slug + url for 3 valid photos', async () => {
    const env = makeEnv();
    const req = await makeRequest([jpeg(), jpeg(), jpeg()]);
    const res = await handleCreate(env, req, okSnapshot(env.__r2), okVerify);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.slug).toMatch(/^[a-z]+-[a-z]+(-[0-9a-f]{3})?$/);
    expect(body.url).toBe(`https://${body.slug}.thiiss.me/`);
    // Three photos uploaded
    expect(env.R2_BLOBS.put).toHaveBeenCalledWith(
      `photos/${body.slug}/0.jpg`, expect.anything(), expect.anything()
    );
    expect(env.R2_BLOBS.put).toHaveBeenCalledWith(
      `photos/${body.slug}/2.jpg`, expect.anything(), expect.anything()
    );
    // Manifest written
    expect(env.KV_MANIFESTS.put).toHaveBeenCalledWith(
      body.slug, expect.any(String), { expirationTtl: 604800 }
    );
  });

  it('rejects 2 photos with 400 photo_count', async () => {
    const env = makeEnv();
    const req = await makeRequest([jpeg(), jpeg()]);
    const res = await handleCreate(env, req, okSnapshot(env.__r2), okVerify);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'photo_count' });
    expect(env.R2_BLOBS.put).not.toHaveBeenCalled();
    expect(env.KV_MANIFESTS.put).not.toHaveBeenCalled();
  });

  it('cleans up R2 on snapshot failure', async () => {
    const env = makeEnv();
    const req = await makeRequest([jpeg(), jpeg(), jpeg()]);
    const res = await handleCreate(env, req, failSnapshot, okVerify);
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'snapshot_failed' });
    // No manifest written
    expect(env.KV_MANIFESTS.put).not.toHaveBeenCalled();
    // Best-effort R2 cleanup ran on photos/ prefix
    expect(env.R2_BLOBS.delete).toHaveBeenCalled();
  });

  it('rejects with 400 turnstile_required when no token in form', async () => {
    const env = makeEnv();
    const req = await makeRequest([jpeg(), jpeg(), jpeg()], { token: null });
    const res = await handleCreate(env, req, okSnapshot(env.__r2), requireVerify);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'turnstile_required' });
    expect(env.R2_BLOBS.put).not.toHaveBeenCalled();
    expect(env.KV_MANIFESTS.put).not.toHaveBeenCalled();
  });

  it('rejects with 403 turnstile_failed when verify fails', async () => {
    const env = makeEnv();
    const req = await makeRequest([jpeg(), jpeg(), jpeg()], { token: 'bad' });
    const res = await handleCreate(env, req, okSnapshot(env.__r2), failVerify);
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'turnstile_failed' });
    expect(env.R2_BLOBS.put).not.toHaveBeenCalled();
    expect(env.KV_MANIFESTS.put).not.toHaveBeenCalled();
  });

  it('does not call snapshotFn when turnstile verify fails', async () => {
    const env = makeEnv();
    const req = await makeRequest([jpeg(), jpeg(), jpeg()], { token: 'bad' });
    const snapshotSpy = vi.fn();
    await handleCreate(env, req, snapshotSpy, failVerify);
    expect(snapshotSpy).not.toHaveBeenCalled();
  });

  it('passes the form token through to verifyFn', async () => {
    const env = makeEnv();
    const req = await makeRequest([jpeg(), jpeg(), jpeg()], { token: 'tok-xyz' });
    const verifySpy = vi.fn(async () => ({ ok: true }));
    await handleCreate(env, req, okSnapshot(env.__r2), verifySpy);
    expect(verifySpy).toHaveBeenCalledWith('tok-xyz');
  });
});
