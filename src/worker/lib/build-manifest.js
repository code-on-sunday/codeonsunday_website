function pad2(n) {
  return n.toString().padStart(2, '0');
}

export function buildManifest(slug, photoCount, paletteSeed) {
  const pages = [{ html: 'pages/00-intro.html' }];
  for (let i = 1; i <= photoCount; i++) {
    pages.push({ html: `pages/${pad2(i)}-photo.html` });
  }
  const finalIndex = photoCount + 1;
  pages.push({ html: `pages/${pad2(finalIndex)}-final.html`, final: true });
  return {
    title: 'this is me',
    slug,
    photoCount,
    paletteSeed,
    pages,
  };
}
