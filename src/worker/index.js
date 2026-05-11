import { dispatchRoute } from './router.js';
import { handleManifest } from './handlers/manifest.js';
import { handleSnapshot } from './handlers/snapshot.js';
import { handlePhoto } from './handlers/photo.js';
import { handleFinalPage } from './handlers/final-page.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const route = dispatchRoute(request.method, url.host, url.pathname);

    switch (route.kind) {
      case 'apex-form':
        return env.ASSETS.fetch(
          new Request(new URL('/create', url.origin), request)
        );
      case 'site-root':
        return env.ASSETS.fetch(
          new Request(new URL('/', url.origin), request)
        );
      case 'static-asset':
        return env.ASSETS.fetch(request);
      case 'site-manifest':
        return handleManifest(env, route.slug);
      case 'site-snapshot':
        return handleSnapshot(env, route.slug, route.base, route.orient);
      case 'site-photo':
      case 'apex-photo':
        return handlePhoto(env, route.slug, route.index);
      case 'site-final-page':
        return handleFinalPage(env, route.slug);
      case 'apex-create':
        return new Response(`not implemented: ${route.kind}\n`, { status: 501 });
      case 'not-found':
      default:
        return new Response('not found\n', { status: 404 });
    }
  },
};
