export function snapshotBasename(htmlPath) {
  return htmlPath.replace(/^pages\//, '').replace(/\.html$/, '');
}

export function snapshotUrl(siteName, basename, orientation) {
  return `/sites/${siteName}/snapshots/${basename}.${orientation}.png`;
}
