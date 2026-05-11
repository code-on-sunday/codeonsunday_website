import { describe, it, expect, vi } from 'vitest';
import { generateSlug } from '../lib/slug.js';

function makeEnv(takenSlugs) {
  return {
    KV_MANIFESTS: {
      get: vi.fn().mockImplementation((s) => Promise.resolve(takenSlugs.has(s) ? '{}' : null)),
    },
  };
}

describe('generateSlug', () => {
  it('returns an <adj>-<noun> string from the wordlist', async () => {
    const env = makeEnv(new Set());
    const slug = await generateSlug(env);
    expect(slug).toMatch(/^[a-z]+-[a-z]+$/);
  });
  it('produces 1000 mostly-distinct slugs from the wordlist', async () => {
    const env = makeEnv(new Set());
    const slugs = new Set();
    for (let i = 0; i < 1000; i++) slugs.add(await generateSlug(env));
    expect(slugs.size).toBeGreaterThan(800); // ~95% unique on a ~100×100 wordlist
  });
  it('appends hex suffix after 3 collisions', async () => {
    // Mock: first 3 candidates appear taken; the 4th appears free
    let calls = 0;
    const env = {
      KV_MANIFESTS: {
        get: vi.fn().mockImplementation(() => {
          calls++;
          return Promise.resolve(calls <= 3 ? '{}' : null);
        }),
      },
    };
    const slug = await generateSlug(env);
    expect(slug).toMatch(/^[a-z]+-[a-z]+-[0-9a-f]{3}$/);
    expect(env.KV_MANIFESTS.get).toHaveBeenCalledTimes(4); // 3 retries + 1 hex success
  });
});
