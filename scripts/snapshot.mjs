import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import chokidar from 'chokidar';
import { snapshotBasename } from '../src/lib/snapshot-paths.js';
import { validateManifest } from '../src/lib/route.js';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.gif': 'image/gif',
  '.woff2': 'font/woff2',
};

function startStaticServer(root) {
  return new Promise((resolve) => {
    const server = createServer(async (req, res) => {
      try {
        const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
        const filePath = path.join(root, urlPath);
        if (!filePath.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
        const data = await readFile(filePath);
        const ext = path.extname(filePath).toLowerCase();
        res.writeHead(200, { 'content-type': MIME[ext] || 'application/octet-stream' });
        res.end(data);
      } catch {
        res.writeHead(404); res.end('not found');
      }
    });
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ server, port });
    });
  });
}

const BREAKPOINTS = [
  { name: 'portrait', width: 390, height: 844, dpr: 1.5 },
  { name: 'landscape', width: 1280, height: 800, dpr: 1.5 },
];

async function snapshotPage(browser, siteName, port, page) {
  const base = snapshotBasename(page.html);
  const siteDir = path.join(REPO_ROOT, 'sites', siteName);
  const snapshotsDir = path.join(siteDir, 'snapshots');
  for (const bp of BREAKPOINTS) {
    const ctx = await browser.newContext({
      viewport: { width: bp.width, height: bp.height },
      deviceScaleFactor: bp.dpr,
    });
    const tab = await ctx.newPage();
    const url = `http://127.0.0.1:${port}/sites/${siteName}/${page.html}`;
    console.log(`snapshot ${siteName}/${base} @ ${bp.name} ← ${url}`);
    await tab.goto(url, { waitUntil: 'networkidle' });
    const out = path.join(snapshotsDir, `${base}.${bp.name}.png`);
    await tab.screenshot({ path: out, fullPage: false });
    await ctx.close();
  }
}

async function main() {
  const args = process.argv.slice(2);
  const watch = args.includes('--watch');
  const siteName = args.find((a) => !a.startsWith('-'));
  if (!siteName) {
    console.error('usage: node scripts/snapshot.mjs <site> [--watch]');
    process.exit(1);
  }
  const siteDir = path.join(REPO_ROOT, 'sites', siteName);
  const manifest = JSON.parse(await readFile(path.join(siteDir, 'manifest.json'), 'utf8'));
  validateManifest(manifest);
  await mkdir(path.join(siteDir, 'snapshots'), { recursive: true });

  const { server, port } = await startStaticServer(REPO_ROOT);
  const browser = await chromium.launch();

  const nonFinal = manifest.pages.filter((p) => !p.final);

  if (!watch) {
    try {
      for (const page of nonFinal) await snapshotPage(browser, siteName, port, page);
    } finally {
      await browser.close();
      server.close();
    }
    return;
  }

  // Watch mode: keep browser + server alive; SIGINT triggers cleanup.
  process.on('SIGINT', async () => {
    console.log('\nexiting watch mode...');
    await browser.close();
    server.close();
    process.exit(0);
  });

  for (const page of nonFinal) {
    try { await snapshotPage(browser, siteName, port, page); }
    catch (err) { console.error('snapshot failed:', err.message); }
  }

  console.log('watching for changes... (Ctrl-C to exit)');
  const watcher = chokidar.watch(
    [path.join(siteDir, 'pages'), path.join(siteDir, 'assets')],
    { ignoreInitial: true }
  );
  let timer = null;
  watcher.on('all', () => {
    clearTimeout(timer);
    timer = setTimeout(async () => {
      console.log('change detected — re-snapshotting all pages');
      for (const page of nonFinal) {
        try { await snapshotPage(browser, siteName, port, page); }
        catch (err) { console.error('snapshot failed:', err.message); }
      }
    }, 200);
  });
}

main().catch((err) => { console.error(err); process.exit(1); });
