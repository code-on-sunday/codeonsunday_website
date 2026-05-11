import { renderPage } from '../lib/render-page.js';

export async function handleFinalPage(env, slug) {
  const raw = await env.KV_MANIFESTS.get(slug);
  if (!raw) {
    return new Response('site not found\n', { status: 404 });
  }
  const manifest = JSON.parse(raw);
  const photoCount = manifest.photoCount ?? (manifest.pages.length - 2);
  const paletteIndex = (manifest.paletteSeed ?? 0) + manifest.pages.length - 1;
  const photoUrl = `https://thiiss.me/photo/${slug}/${photoCount - 1}.jpg`;
  const html = renderPage('final', { paletteIndex, photoUrl });
  return new Response(html, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=300',
    },
  });
}
