export async function handlePhoto(env, slug, index) {
  const key = `photos/${slug}/${index}.jpg`;
  const obj = await env.R2_BLOBS.get(key);
  if (!obj) {
    return new Response('photo not found\n', { status: 404 });
  }
  return new Response(obj.body, {
    status: 200,
    headers: {
      'content-type': obj.httpMetadata?.contentType || 'image/jpeg',
      'cache-control': 'public, max-age=300',
    },
  });
}
