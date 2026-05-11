const SLUG_RE = /^[a-z]+-[a-z]+(?:-[0-9a-f]{3})?$/;

export function parseSlug(host) {
  if (!host.endsWith('.thiiss.me')) return null;
  const label = host.slice(0, -'.thiiss.me'.length);
  if (!SLUG_RE.test(label)) return null;
  return label;
}

export function isSlugHost(host) {
  return parseSlug(host) !== null;
}

export function dispatchRoute(method, host, path) {
  const slug = parseSlug(host);

  // <slug>.thiiss.me/*
  if (slug) {
    if (method === 'GET' && path === '/') {
      return { kind: 'site-root', slug };
    }
    const manifestMatch = path.match(/^\/sites\/([a-z-]+)\/manifest\.json$/);
    if (method === 'GET' && manifestMatch && manifestMatch[1] === slug) {
      return { kind: 'site-manifest', slug };
    }
    const snapshotMatch = path.match(
      /^\/sites\/([a-z-]+)\/snapshots\/([0-9a-z-]+)\.(portrait|landscape)\.png$/
    );
    if (method === 'GET' && snapshotMatch && snapshotMatch[1] === slug) {
      return {
        kind: 'site-snapshot', slug,
        base: snapshotMatch[2],
        orient: snapshotMatch[3],
      };
    }
    const finalMatch = path.match(/^\/sites\/([a-z-]+)\/pages\/(\d+)-final\.html$/);
    if (method === 'GET' && finalMatch && finalMatch[1] === slug) {
      return {
        kind: 'site-final-page', slug,
        index: Number(finalMatch[2]),
      };
    }
    const photoMatch = path.match(/^\/photo\/([a-z-]+)\/(\d+)\.jpg$/);
    if (method === 'GET' && photoMatch) {
      return {
        kind: 'site-photo',
        slug: photoMatch[1],
        index: Number(photoMatch[2]),
      };
    }
    return { kind: 'static-asset' };
  }

  // thiiss.me/*  (or any non-slug host — treat as apex for local dev)
  if (method === 'GET' && (path === '/' || path === '/create')) {
    return { kind: 'apex-form' };
  }
  if (method === 'POST' && path === '/api/create') {
    return { kind: 'apex-create' };
  }
  const photoMatch = path.match(/^\/photo\/(.+)\/(\d+)\.jpg$/);
  if (method === 'GET' && photoMatch) {
    const photoSlug = photoMatch[1];
    if (!SLUG_RE.test(photoSlug)) {
      return { kind: 'not-found' };
    }
    return {
      kind: 'apex-photo',
      slug: photoSlug,
      index: Number(photoMatch[2]),
    };
  }
  if (path.startsWith('/api/')) {
    return { kind: 'not-found' };
  }
  return { kind: 'static-asset' };
}
