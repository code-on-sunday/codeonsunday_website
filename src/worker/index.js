import { dispatchRoute } from './router.js';

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
      case 'site-snapshot':
      case 'site-photo':
      case 'apex-photo':
      case 'site-final-page':
      case 'apex-create':
        return new Response(`not implemented: ${route.kind}\n`, { status: 501 });
      case 'not-found':
      default:
        return new Response('not found\n', { status: 404 });
    }
  },
};
