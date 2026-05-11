import puppeteer from '@cloudflare/puppeteer';

const PORTRAIT = { width: 390, height: 844, deviceScaleFactor: 1.5 };
const LANDSCAPE = { width: 1280, height: 800, deviceScaleFactor: 1.5 };

/**
 * Snapshots a list of {base, html} entries to R2 under
 * snapshots/<slug>/<base>.<orient>.png for both portrait and landscape.
 *
 * Throws on any failure. Caller is responsible for cleanup.
 */
export async function snapshotPages(env, slug, pages) {
  const browser = await puppeteer.launch(env.BROWSER);
  const page = await browser.newPage();
  try {
    for (const { base, html } of pages) {
      await page.setViewport(PORTRAIT);
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const portraitPng = await page.screenshot({ type: 'png' });

      await page.setViewport(LANDSCAPE);
      // Force a layout flush so the orientation-media-query reflow lands before screenshot.
      await page.evaluate(() => document.body.getBoundingClientRect());
      const landscapePng = await page.screenshot({ type: 'png' });

      await Promise.all([
        env.R2_BLOBS.put(
          `snapshots/${slug}/${base}.portrait.png`,
          portraitPng,
          { httpMetadata: { contentType: 'image/png' } }
        ),
        env.R2_BLOBS.put(
          `snapshots/${slug}/${base}.landscape.png`,
          landscapePng,
          { httpMetadata: { contentType: 'image/png' } }
        ),
      ]);
    }
  } finally {
    await browser.close();
  }
}
