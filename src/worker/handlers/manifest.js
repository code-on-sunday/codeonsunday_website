export async function handleManifest(env, slug) {
  const body = await env.KV_MANIFESTS.get(slug);
  if (body === null) {
    return new Response('manifest not found\n', { status: 404 });
  }
  return new Response(body, {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'public, max-age=300',
    },
  });
}
