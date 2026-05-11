// src/worker/handlers/create.js
//
// Note: this file deliberately does NOT import snapshot-pages.js. The Worker
// entry constructs the snapshot function from env.BROWSER and passes it in.
// This keeps Vitest from transitively loading @cloudflare/puppeteer (Workers-only).
import { validatePhotos } from '../lib/validation.js';
import { generateSlug } from '../lib/slug.js';
import { buildManifest } from '../lib/build-manifest.js';
import { renderPage } from '../lib/render-page.js';

async function cleanupSlug(env, slug) {
  const prefixes = [`photos/${slug}/`, `snapshots/${slug}/`];
  for (const prefix of prefixes) {
    const list = await env.R2_BLOBS.list({ prefix }).catch(() => ({ objects: [] }));
    await Promise.all(
      list.objects.map(o => env.R2_BLOBS.delete(o.key).catch(() => {}))
    );
  }
}

function pad2(n) {
  return n.toString().padStart(2, '0');
}

/**
 * @param {object} env  Worker bindings
 * @param {Request} request
 * @param {(slug: string, pages: {base: string, html: string}[]) => Promise<void>} snapshotFn
 *   Required: function that snapshots each page to R2 in both orientations.
 * @param {(token: string|null) => Promise<{ ok: true } | { ok: false, error: string }>} verifyFn
 *   Required: function that validates the Turnstile token.
 */
export async function handleCreate(env, request, snapshotFn, verifyFn) {
  let form;
  try { form = await request.formData(); }
  catch { return jsonError(400, 'bad_format'); }

  const token = form.get('cf-turnstile-response');
  const tokenStr = typeof token === 'string' ? token : null;
  const verdict = await verifyFn(tokenStr);
  if (!verdict.ok) {
    const status = verdict.error === 'turnstile_required' ? 400 : 403;
    return jsonError(status, verdict.error);
  }

  const photos = form.getAll('photos[]').filter(p => typeof p === 'object');
  const v = validatePhotos(photos);
  if (!v.ok) return jsonError(400, v.error);

  const slug = await generateSlug(env);
  const paletteSeed = Math.floor(Math.random() * 6);
  const photoCount = v.photos.length;
  const manifest = buildManifest(slug, photoCount, paletteSeed);

  // 1. Upload originals
  try {
    await Promise.all(v.photos.map(async (file, i) => {
      const bytes = await file.arrayBuffer();
      await env.R2_BLOBS.put(
        `photos/${slug}/${i}.jpg`,
        bytes,
        { httpMetadata: { contentType: 'image/jpeg' } }
      );
    }));
  } catch {
    await cleanupSlug(env, slug);
    return jsonError(500, 'upload_failed');
  }

  // 2. Render HTML for all non-final pages (intro + photos)
  const pagesToSnapshot = [
    {
      base: '00-intro',
      html: renderPage('intro', { paletteIndex: paletteSeed }),
    },
    ...v.photos.map((_, i) => ({
      base: `${pad2(i + 1)}-photo`,
      html: renderPage('photo', {
        paletteIndex: paletteSeed + i + 1,
        rotationIndex: i,
        photoUrl: `https://thiiss.me/photo/${slug}/${i}.jpg`,
      }),
    })),
  ];

  // 3. Snapshot
  try {
    await snapshotFn(slug, pagesToSnapshot);
  } catch {
    await cleanupSlug(env, slug);
    return jsonError(500, 'snapshot_failed');
  }

  // 4. Write manifest with 7-day TTL
  try {
    await env.KV_MANIFESTS.put(
      slug,
      JSON.stringify(manifest),
      { expirationTtl: 604800 }
    );
  } catch {
    await cleanupSlug(env, slug);
    return jsonError(500, 'manifest_write_failed');
  }

  return Response.json({ slug, url: `https://${slug}.thiiss.me/` });
}

function jsonError(status, code) {
  return Response.json({ error: code }, { status });
}
