export function resolveSiteName(pathname, defaultSite) {
  const trimmed = pathname.replace(/^\/+/, '').replace(/\/+$/, '');
  if (!trimmed) return defaultSite;
  const first = trimmed.split('/')[0];
  return first || defaultSite;
}
