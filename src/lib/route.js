export function resolveSiteName(pathname, defaultSite) {
  const trimmed = pathname.replace(/^\/+/, '').replace(/\/+$/, '');
  if (!trimmed) return defaultSite;
  const first = trimmed.split('/')[0];
  return first || defaultSite;
}

export function validateManifest(m) {
  if (!m || typeof m !== 'object') throw new Error('manifest: not an object');
  if (!Array.isArray(m.pages)) throw new Error('manifest: pages must be an array');
  if (m.pages.length < 2) throw new Error('manifest: need at least 2 pages');
  if (m.pages.length > 10) throw new Error('manifest: at most 10 pages');
  if (!m.pages[m.pages.length - 1].final) throw new Error('manifest: last page must be final');
  const finals = m.pages.filter((p) => p.final);
  if (finals.length !== 1) throw new Error('manifest: exactly one final page required');
  for (const p of m.pages) {
    if (typeof p.html !== 'string' || !p.html) throw new Error('manifest: each page needs an html field');
  }
}
