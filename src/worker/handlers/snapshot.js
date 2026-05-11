export async function handleSnapshot(env, slug, base, orient) {
  const key = `snapshots/${slug}/${base}.${orient}.png`;
  const obj = await env.R2_BLOBS.get(key);
  if (!obj) {
    return new Response('snapshot not found\n', { status: 404 });
  }
  return new Response(obj.body, {
    status: 200,
    headers: {
      'content-type': obj.httpMetadata?.contentType || 'image/png',
      'cache-control': 'public, max-age=300',
    },
  });
}
