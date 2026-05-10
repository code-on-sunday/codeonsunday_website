# Cloth-Tear Template Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the cloth-tear runtime content-agnostic so any `sites/<name>/` folder of HTML + assets renders as a tearable site, with the current Trung site re-implemented as the reference site.

**Architecture:** Pages become standalone HTML files in `sites/<name>/pages/`; a Playwright script snapshots them to portrait + landscape PNGs in `sites/<name>/snapshots/`; the runtime fetches a `manifest.json`, loads matching PNGs as cloth textures, and mounts the final page as an iframe. Path-based routing (`/`, `/<sitename>`) selects which site to render.

**Tech Stack:** Vite (existing), Cloudflare Workers Static Assets (existing), Playwright (new — snapshot pipeline), Vitest (new — unit tests for routing/manifest helpers).

**Spec:** `docs/superpowers/specs/2026-05-10-cloth-tear-template-design.md`

---

## File structure

```
cloth-tear/
├── index.html                                # entry shell — unchanged structure
├── vite.config.js                            # +path-routing middleware
├── wrangler.jsonc                            # +SPA fallback
├── package.json                              # +playwright, vitest, scripts
├── scripts/
│   └── snapshot.mjs                          # NEW Playwright snapshotter
├── src/
│   ├── main.js                               # generalized: manifest loader, no PAGES[]
│   └── lib/
│       ├── route.js                          # NEW resolveSiteName, manifest validation
│       ├── snapshot-paths.js                 # NEW snapshot filename derivation
│       └── __tests__/
│           ├── route.test.js
│           └── snapshot-paths.test.js
└── sites/
    ├── trung/
    │   ├── manifest.json
    │   ├── pages/
    │   │   ├── 01-hello.html
    │   │   ├── 02-hanoi.html
    │   │   ├── 03-badminton.html
    │   │   ├── 04-grew-up.html
    │   │   ├── 05-side-projects.html
    │   │   ├── 06-3-lines.html
    │   │   ├── 07-real-people.html
    │   │   └── 08-friends.html
    │   ├── assets/
    │   │   ├── style.css                     # shared helpers (polaroid, sparkles, etc.)
    │   │   └── photos/                       # moved from public/photos/
    │   └── snapshots/                        # generated PNGs (committed)
    │       ├── 01-hello.portrait.png
    │       ├── 01-hello.landscape.png
    │       └── ...
    └── demo-other/                           # swap-test site
        ├── manifest.json
        ├── pages/
        │   ├── 01-front.html
        │   └── 02-back.html
        ├── assets/style.css
        └── snapshots/...
```

The existing `public/photos/` directory is relocated to `sites/trung/assets/photos/` since photos are now site-scoped.

---

## Task 1: Install Vitest and add unit-test scaffolding

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install Vitest**

Run:
```
npm install --save-dev vitest
```
Expected: vitest added to devDependencies.

- [ ] **Step 2: Add a test script**

Edit `package.json` `"scripts"` section to include:

```json
"scripts": {
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview",
  "test": "vitest run",
  "test:watch": "vitest"
}
```

- [ ] **Step 3: Verify the test runner**

Run:
```
npm test
```
Expected: vitest reports "No test files found" (and exit 0). That's fine — tests come in later tasks.

- [ ] **Step 4: Commit**

```
git add package.json package-lock.json
git commit -m "chore: add vitest for unit tests"
```

---

## Task 2: Add `resolveSiteName(pathname, defaultSite)` with tests

This is the function `src/main.js` will use to map `location.pathname` to a site folder name. Default site fallback handles the `/` → trung mapping.

**Files:**
- Create: `src/lib/route.js`
- Create: `src/lib/__tests__/route.test.js`

- [ ] **Step 1: Write failing tests**

Create `src/lib/__tests__/route.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { resolveSiteName } from '../route.js';

describe('resolveSiteName', () => {
  it('returns the default site for "/"', () => {
    expect(resolveSiteName('/', 'trung')).toBe('trung');
  });
  it('returns the default site for empty path', () => {
    expect(resolveSiteName('', 'trung')).toBe('trung');
  });
  it('extracts a single-segment site name', () => {
    expect(resolveSiteName('/demo-other', 'trung')).toBe('demo-other');
  });
  it('strips trailing slash', () => {
    expect(resolveSiteName('/demo-other/', 'trung')).toBe('demo-other');
  });
  it('returns the first segment when path has multiple', () => {
    expect(resolveSiteName('/demo-other/sub', 'trung')).toBe('demo-other');
  });
});
```

- [ ] **Step 2: Run the tests, confirm they fail**

Run:
```
npm test
```
Expected: FAIL — `route.js` does not exist.

- [ ] **Step 3: Implement**

Create `src/lib/route.js`:

```js
export function resolveSiteName(pathname, defaultSite) {
  const trimmed = pathname.replace(/^\/+/, '').replace(/\/+$/, '');
  if (!trimmed) return defaultSite;
  const first = trimmed.split('/')[0];
  return first || defaultSite;
}
```

- [ ] **Step 4: Run the tests, confirm they pass**

Run:
```
npm test
```
Expected: 5 tests pass.

- [ ] **Step 5: Commit**

```
git add src/lib/route.js src/lib/__tests__/route.test.js
git commit -m "feat(route): add resolveSiteName with tests"
```

---

## Task 3: Add `validateManifest(json)` with tests

A small validator for the `sites/<name>/manifest.json` shape. Used at runtime to fail loudly on malformed manifests during dev.

**Files:**
- Modify: `src/lib/route.js`
- Modify: `src/lib/__tests__/route.test.js`

- [ ] **Step 1: Append failing tests**

Add to `src/lib/__tests__/route.test.js`:

```js
import { validateManifest } from '../route.js';

describe('validateManifest', () => {
  it('accepts a valid manifest', () => {
    const m = {
      title: 'x',
      pages: [
        { html: 'pages/01.html' },
        { html: 'pages/02.html', final: true },
      ],
    };
    expect(() => validateManifest(m)).not.toThrow();
  });
  it('rejects manifest with no pages', () => {
    expect(() => validateManifest({ title: 'x', pages: [] })).toThrow(/at least 2/);
  });
  it('rejects manifest with one page', () => {
    expect(() => validateManifest({ title: 'x', pages: [{ html: 'a.html', final: true }] })).toThrow(/at least 2/);
  });
  it('rejects manifest with more than 10 pages', () => {
    const pages = Array.from({ length: 11 }, (_, i) => ({ html: `p${i}.html` }));
    pages[pages.length - 1].final = true;
    expect(() => validateManifest({ title: 'x', pages })).toThrow(/at most 10/);
  });
  it('rejects manifest where the last page is not final', () => {
    expect(() => validateManifest({
      title: 'x',
      pages: [{ html: 'a.html' }, { html: 'b.html' }],
    })).toThrow(/last page.*final/);
  });
  it('rejects manifest with multiple final pages', () => {
    expect(() => validateManifest({
      title: 'x',
      pages: [{ html: 'a.html', final: true }, { html: 'b.html', final: true }],
    })).toThrow(/exactly one final/);
  });
});
```

- [ ] **Step 2: Run the tests, confirm they fail**

Run:
```
npm test
```
Expected: FAIL — `validateManifest` is not exported.

- [ ] **Step 3: Implement**

Append to `src/lib/route.js`:

```js
export function validateManifest(m) {
  if (!m || typeof m !== 'object') throw new Error('manifest: not an object');
  if (!Array.isArray(m.pages)) throw new Error('manifest: pages must be an array');
  if (m.pages.length < 2) throw new Error('manifest: need at least 2 pages');
  if (m.pages.length > 10) throw new Error('manifest: at most 10 pages');
  const finals = m.pages.filter((p) => p.final);
  if (finals.length !== 1) throw new Error('manifest: exactly one final page required');
  if (!m.pages[m.pages.length - 1].final) throw new Error('manifest: last page must be final');
  for (const p of m.pages) {
    if (typeof p.html !== 'string' || !p.html) throw new Error('manifest: each page needs an html field');
  }
}
```

- [ ] **Step 4: Run the tests, confirm they pass**

Run:
```
npm test
```
Expected: all tests pass (5 from Task 2 + 6 new).

- [ ] **Step 5: Commit**

```
git add src/lib/route.js src/lib/__tests__/route.test.js
git commit -m "feat(route): add manifest validator with tests"
```

---

## Task 4: Add snapshot-path helpers with tests

Two derivations: `snapshotBasename('pages/01-hello.html')` → `'01-hello'`, and `snapshotUrl(siteName, basename, orientation)` → `'/sites/trung/snapshots/01-hello.portrait.png'`.

**Files:**
- Create: `src/lib/snapshot-paths.js`
- Create: `src/lib/__tests__/snapshot-paths.test.js`

- [ ] **Step 1: Write failing tests**

Create `src/lib/__tests__/snapshot-paths.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { snapshotBasename, snapshotUrl } from '../snapshot-paths.js';

describe('snapshotBasename', () => {
  it('strips pages/ prefix and .html suffix', () => {
    expect(snapshotBasename('pages/01-hello.html')).toBe('01-hello');
  });
  it('strips just .html when no pages/ prefix', () => {
    expect(snapshotBasename('hello.html')).toBe('hello');
  });
  it('handles nested paths', () => {
    expect(snapshotBasename('pages/sub/02.html')).toBe('sub/02');
  });
});

describe('snapshotUrl', () => {
  it('builds portrait URL', () => {
    expect(snapshotUrl('trung', '01-hello', 'portrait'))
      .toBe('/sites/trung/snapshots/01-hello.portrait.png');
  });
  it('builds landscape URL', () => {
    expect(snapshotUrl('demo-other', 'front', 'landscape'))
      .toBe('/sites/demo-other/snapshots/front.landscape.png');
  });
});
```

- [ ] **Step 2: Run the tests, confirm they fail**

Run:
```
npm test
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `src/lib/snapshot-paths.js`:

```js
export function snapshotBasename(htmlPath) {
  return htmlPath.replace(/^pages\//, '').replace(/\.html$/, '');
}

export function snapshotUrl(siteName, basename, orientation) {
  return `/sites/${siteName}/snapshots/${basename}.${orientation}.png`;
}
```

- [ ] **Step 4: Run the tests, confirm they pass**

Run:
```
npm test
```
Expected: all 5 new tests pass.

- [ ] **Step 5: Commit**

```
git add src/lib/snapshot-paths.js src/lib/__tests__/snapshot-paths.test.js
git commit -m "feat: add snapshot path helpers with tests"
```

---

## Task 5: Add Vite plugin for path routing, sites/ serving, and build copy

This single plugin handles three concerns:
1. **Path rewrite** — single-segment paths (`/demo-other`) → `/index.html` so the SPA runtime can read `location.pathname`.
2. **Dev `/sites/` serving** — Vite doesn't auto-serve top-level dirs (only `public/`), so we serve `sites/` files from disk via middleware.
3. **Build copy** — at build time, copy `sites/` into `dist/sites/` so production has the snapshots and final-page HTML.

**Files:**
- Modify: `vite.config.js`

- [ ] **Step 1: Replace `vite.config.js`**

```js
import { defineConfig } from 'vite';
import { readFile, cp } from 'node:fs/promises';
import path from 'node:path';

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

function clothTear() {
  const root = process.cwd();
  const sitesRoot = path.join(root, 'sites');
  return {
    name: 'cloth-tear',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = (req.url || '').split('?')[0];

        // 2. Serve /sites/* from disk in dev
        if (url.startsWith('/sites/')) {
          try {
            const decoded = decodeURIComponent(url);
            const filePath = path.normalize(path.join(root, decoded));
            if (!filePath.startsWith(sitesRoot)) {
              res.writeHead(403); res.end(); return;
            }
            const data = await readFile(filePath);
            res.writeHead(200, {
              'content-type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
            });
            res.end(data);
            return;
          } catch {
            res.writeHead(404); res.end('not found'); return;
          }
        }

        // 1. Path rewrite for site names
        const reserved = ['/src/', '/sites/', '/node_modules/', '/@', '/public/'].some((p) => url.startsWith(p));
        const isFile = /\.[a-z0-9]+$/i.test(url);
        if (!reserved && !isFile && url !== '/') req.url = '/index.html';
        next();
      });
    },
    async closeBundle() {
      // 3. Copy sites/ → dist/sites/ at build time
      await cp(sitesRoot, path.join(root, 'dist', 'sites'), { recursive: true });
    },
  };
}

export default defineConfig({
  publicDir: false,
  plugins: [clothTear()],
  build: {
    target: 'es2020',
    minify: 'terser',
    terserOptions: {
      mangle: true,
      compress: { drop_console: true },
      format: { comments: false },
    },
    sourcemap: false,
  },
});
```

`publicDir: false` because we're emptying `public/` in Task 12 (photos move to `sites/trung/assets/photos/`).

- [ ] **Step 2: Manually verify the middleware**

Create a throwaway `sites/_test/hello.txt` containing `hello`:

```
mkdir -p sites/_test
printf 'hello' > sites/_test/hello.txt
```

Run:
```
npm run dev
```
- Visit `http://localhost:5173/sites/_test/hello.txt` — should respond `hello`.
- Visit `http://localhost:5173/anything-here` — `index.html` loads (today's cloth-tear, since `main.js` isn't generalized yet — fine).
- Visit `http://localhost:5173/src/main.js` — JS served as-is.

Stop the dev server (Ctrl-C). Remove the throwaway:

```
rm -rf sites/_test
```

- [ ] **Step 3: Commit**

```
git add vite.config.js
git commit -m "feat(vite): add cloth-tear plugin (path routing + sites serving + build copy)"
```

---

## Task 6: Configure Cloudflare SPA fallback

So `/<sitename>` works in production, falling through to `index.html` when no static asset matches.

**Files:**
- Modify: `wrangler.jsonc`

- [ ] **Step 1: Read the current wrangler config**

Run:
```
cat wrangler.jsonc
```
Expected: a small JSON config with an `assets` block. Note its current shape.

- [ ] **Step 2: Add SPA fallback**

Edit `wrangler.jsonc` so the `assets` block includes:

```jsonc
"assets": {
  "directory": "./dist",
  "not_found_handling": "single-page-application"
}
```

Keep all other existing fields intact (name, main, compatibility_date, etc.).

- [ ] **Step 3: Commit**

```
git add wrangler.jsonc
git commit -m "feat(workers): add SPA fallback for path-based routing"
```

---

## Task 7: Install Playwright

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install Playwright Chromium**

Run:
```
npm install --save-dev playwright
npx playwright install chromium
```
Expected: Playwright installed; Chromium binary downloaded.

- [ ] **Step 2: Commit dependency change**

```
git add package.json package-lock.json
git commit -m "chore: add playwright for snapshot pipeline"
```

(The Chromium binary itself lives outside the repo — no commit needed for that.)

---

## Task 8: Build `scripts/snapshot.mjs` (one-shot mode)

Reads `sites/<name>/manifest.json`, snapshots each non-final page at portrait + landscape, writes PNGs to `sites/<name>/snapshots/`. Self-hosts a tiny static server so HTTP loads work.

**Files:**
- Create: `scripts/snapshot.mjs`
- Modify: `package.json` (add `snapshot` script)

- [ ] **Step 1: Create `scripts/snapshot.mjs`**

```js
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
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
        if (!filePath.startsWith(root)) { res.writeHead(403); res.end(); return; }
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

async function main() {
  const siteName = process.argv[2];
  if (!siteName) {
    console.error('usage: node scripts/snapshot.mjs <site>');
    process.exit(1);
  }
  const siteDir = path.join(REPO_ROOT, 'sites', siteName);
  const manifestPath = path.join(siteDir, 'manifest.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  validateManifest(manifest);

  const snapshotsDir = path.join(siteDir, 'snapshots');
  await mkdir(snapshotsDir, { recursive: true });

  const { server, port } = await startStaticServer(REPO_ROOT);
  console.log(`static server: http://127.0.0.1:${port}`);
  const browser = await chromium.launch();

  const nonFinal = manifest.pages.filter((p) => !p.final);
  for (const page of nonFinal) {
    const base = snapshotBasename(page.html);
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
      await tab.screenshot({ path: out, fullPage: false, omitBackground: false });
      await ctx.close();
    }
  }

  await browser.close();
  server.close();
}

main().catch((err) => { console.error(err); process.exit(1); });
```

- [ ] **Step 2: Add npm script**

In `package.json`, add to the `"scripts"` block:

```json
"snapshot": "node scripts/snapshot.mjs"
```

- [ ] **Step 3: Sanity-check the script can load**

Run:
```
node scripts/snapshot.mjs
```
Expected: prints the `usage:` line and exits non-zero. Confirms imports resolve.

- [ ] **Step 4: Commit**

```
git add scripts/snapshot.mjs package.json
git commit -m "feat: add Playwright snapshot script"
```

---

## Task 9: Add `--watch` mode to the snapshot script

Re-snapshots affected pages when their HTML or assets change.

**Files:**
- Modify: `scripts/snapshot.mjs`

- [ ] **Step 1: Add chokidar dependency**

Run:
```
npm install --save-dev chokidar
```

- [ ] **Step 2: Refactor `main()` and add watch mode**

Replace the `main()` function and add a helper, leaving the rest of `scripts/snapshot.mjs` unchanged:

```js
import chokidar from 'chokidar';

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
  for (const page of nonFinal) await snapshotPage(browser, siteName, port, page);

  if (!watch) {
    await browser.close();
    server.close();
    return;
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
```

(The 200ms debounce + re-snapshotting all pages keeps the watcher simple. Per-file precision is a v1.1 polish.)

- [ ] **Step 3: Commit**

```
git add scripts/snapshot.mjs package.json package-lock.json
git commit -m "feat(snapshot): add --watch mode"
```

---

## Task 10: Replace procedural `PAGES` with manifest loader in `src/main.js`

This is the core runtime refactor. Pages become `{ kind: 'snapshot', img } | { kind: 'final', html }` instead of paint functions. The cloth/tear/fall logic stays the same; only the page content source changes.

**Files:**
- Modify: `src/main.js`

- [ ] **Step 1: Read current `src/main.js`**

Run:
```
wc -l src/main.js
```
Expected: ~1230 lines. Note especially:
- Lines ~437–728: `const PAGES = [...]` — to be removed
- Lines ~197–432: `paintBackground`, `paintSparkles`, `paintWavy`, `paintGradText`, `paintText`, `paintPolaroid`, `paintTweet`, `paintLogoChip`, `paintChip` — to be removed
- Lines ~22–54: `IMAGES` registry + `loadImage` — to be removed
- Lines ~761–791: `paintStaticPage`, `enterStaticMode`, `paintPage`, `repaintLayers` — to be reworked

- [ ] **Step 2: Rewrite the top of `src/main.js`** (everything before `// ---------- WebGL renderer for the cloth mesh ----------`)

Replace lines 1–55 (the IIFE opener, image registry, and `loadImage`) with this version that imports the routing helpers and starts a bootstrap chain:

```js
import { resolveSiteName, validateManifest } from './lib/route.js';
import { snapshotBasename, snapshotUrl } from './lib/snapshot-paths.js';

(async () => {
  const canvas = document.getElementById('c');
  const ctx = canvas.getContext('2d');
  const isCoarse = matchMedia('(pointer: coarse)').matches;
  const DPR = Math.min(window.devicePixelRatio || 1, isCoarse ? 1.5 : 2);

  const PAGE_SCALE = 2;
  const pageCanvas = document.createElement('canvas');
  const pageCtx = pageCanvas.getContext('2d');
  const bgCanvas = document.createElement('canvas');
  const bgCtx = bgCanvas.getContext('2d');
  let bgReady = false;

  const SITE_NAME = resolveSiteName(location.pathname, 'trung');

  function loadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`image failed: ${url}`));
      img.src = url;
    });
  }

  function show404() {
    document.body.innerHTML = `
      <div style="position:fixed;inset:0;display:grid;place-items:center;
                  font:600 16px -apple-system,sans-serif;color:#e6ecff;
                  background:radial-gradient(circle at 50% 30%,#1a1f2e 0%,#060810 70%);
                  text-align:center;padding:24px;">
        <div>
          <div style="font-size:32px;margin-bottom:12px;">site not found</div>
          <div style="opacity:.7;">no <code>sites/${SITE_NAME}/manifest.json</code></div>
        </div>
      </div>`;
  }

  let manifest, pages;
  try {
    const res = await fetch(`/sites/${SITE_NAME}/manifest.json`);
    if (!res.ok) throw new Error(`manifest ${res.status}`);
    manifest = await res.json();
    validateManifest(manifest);
  } catch (err) {
    console.error(err);
    show404();
    return;
  }
  if (manifest.title) document.title = manifest.title;

  function currentOrientation() {
    return window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
  }

  async function loadPagesForOrientation(orientation) {
    return Promise.all(manifest.pages.map(async (p) => {
      if (p.final) return { kind: 'final', html: `/sites/${SITE_NAME}/${p.html}` };
      const base = snapshotBasename(p.html);
      const img = await loadImage(snapshotUrl(SITE_NAME, base, orientation));
      return { kind: 'snapshot', img };
    }));
  }

  pages = await loadPagesForOrientation(currentOrientation());
  let pagesOrientation = currentOrientation();
```

- [ ] **Step 3: Delete the procedural paint helpers and `PAGES` array**

In `src/main.js`, remove:
- The constant `PLAYFUL` and all paint helpers (`paintBackground`, `paintSparkles`, `paintWavy`, `paintGradText`, `paintText`, `paintPolaroid`, `paintTweet`, `paintLogoChip`, `paintChip`).
- The entire `const PAGES = [...]` array.

- [ ] **Step 4: Replace `paintPage` and `repaintLayers`**

Replace those two functions with versions that draw the loaded snapshots:

```js
function paintPage(page, p, target, w, h) {
  target.width = Math.max(1, Math.round(w * PAGE_SCALE));
  target.height = Math.max(1, Math.round(h * PAGE_SCALE));
  p.setTransform(PAGE_SCALE, 0, 0, PAGE_SCALE, 0, 0);
  p.clearRect(0, 0, w, h);
  if (page.kind === 'snapshot') {
    p.drawImage(page.img, 0, 0, w, h);
  } else {
    // final-page slot — draw a solid backdrop; the iframe handles real content
    p.fillStyle = '#000';
    p.fillRect(0, 0, w, h);
  }
}

function repaintLayers() {
  if (!cols) return;
  const cw = (cols - 1) * restX;
  const ch = (rows - 1) * restY;
  paintPage(pages[currentLayer], pageCtx, pageCanvas, cw, ch);
  uploadPageTexture();
  if (currentLayer + 1 < pages.length) {
    paintPage(pages[currentLayer + 1], bgCtx, bgCanvas, cw, ch);
    bgReady = true;
  } else {
    bgReady = false;
  }
}
```

- [ ] **Step 5: Replace `enterStaticMode` to mount an iframe**

```js
function enterStaticMode() {
  staticMode = true;
  glCanvas.style.display = 'none';
  canvas.style.display = 'none';
  const final = pages[pages.length - 1];
  const iframe = document.createElement('iframe');
  iframe.src = final.html;
  iframe.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;border:0;background:#000;';
  document.body.appendChild(iframe);
}
```

Delete `paintStaticPage` (no longer needed — the iframe owns final-page rendering).

- [ ] **Step 6: Update remaining references to `PAGES`**

Search and replace within `src/main.js`:
- `PAGES.length` → `pages.length`
- `PAGES[currentLayer]` → `pages[currentLayer]`
- `PAGES[currentLayer + 1]` → `pages[currentLayer + 1]`

- [ ] **Step 7: Adjust the IIFE close + bootstrap call at the bottom**

The original ends with `resize(); requestAnimationFrame(frame); })();`. Now wrap in async:

```js
  resize();
  requestAnimationFrame(frame);
})();
```

(No code change here — the file already starts with `(async () => {` from Step 2. Just confirm the closing `})();` is intact.)

- [ ] **Step 8: Commit**

The dev server won't render until a manifest exists (next tasks), but the file should at least parse without errors.

Run:
```
node --check src/main.js
```
Expected: no output (syntactically valid).

```
git add src/main.js
git commit -m "refactor(runtime): load pages from manifest, drop procedural PAGES"
```

---

## Task 11: Add orientation-swap texture reload

When the viewport crosses portrait↔landscape mid-session, refetch the matching breakpoint's snapshots and rebuild.

**Files:**
- Modify: `src/main.js`

- [ ] **Step 1: Update `resize()`**

Find the existing `function resize()` and modify it to detect orientation crossings:

```js
async function resize() {
  W = window.innerWidth;
  H = window.innerHeight;
  const pw = Math.floor(W * DPR);
  const ph = Math.floor(H * DPR);
  canvas.width = pw; canvas.height = ph;
  canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
  glCanvas.width = pw; glCanvas.height = ph;
  glCanvas.style.width = W + 'px'; glCanvas.style.height = H + 'px';

  const newOrientation = currentOrientation();
  if (newOrientation !== pagesOrientation) {
    pagesOrientation = newOrientation;
    try { pages = await loadPagesForOrientation(newOrientation); }
    catch (err) { console.error('orientation reload failed', err); }
  }

  if (staticMode) return;
  buildCloth();
  buildLinkCounts();
  originalLinks = links.length;
  armedAliveAt = -1;
  falling = false;
  fallingElapsed = 0;
}
```

(`paintStaticPage` is gone — the iframe handles orientation natively via CSS.)

- [ ] **Step 2: Manually verify**

This task can't be tested until a manifest + snapshots exist (Task 14). Defer manual verification to Task 14's verification step.

- [ ] **Step 3: Commit**

```
git add src/main.js
git commit -m "feat(runtime): swap textures on portrait/landscape change"
```

---

## Task 12: Move `public/photos/` to `sites/trung/assets/photos/`

Photos are now site-scoped. The current site's photos move under the new layout.

**Files:**
- Move: `public/photos/` → `sites/trung/assets/photos/`

- [ ] **Step 1: Create the destination and move**

Run:
```
mkdir -p sites/trung/assets
git mv public/photos sites/trung/assets/photos
```

Expected: `sites/trung/assets/photos/` exists with all the original files.

- [ ] **Step 2: Verify `public/` is empty (or remove it)**

Run:
```
ls -la public/ 2>/dev/null
```
If empty, leave it; if it contains nothing else, you can remove it later. No commit yet — combine with the manifest in the next task.

---

## Task 13: Create `sites/trung/manifest.json` and a stub first page

Get the pipeline runnable end-to-end with a single page before porting all 8.

**Files:**
- Create: `sites/trung/manifest.json`
- Create: `sites/trung/pages/01-hello.html`
- Create: `sites/trung/pages/08-friends.html`
- Create: `sites/trung/assets/style.css`

- [ ] **Step 1: Create a minimal `style.css`**

`sites/trung/assets/style.css`:

```css
:root { color-scheme: light; }
* { box-sizing: border-box; }
html, body {
  margin: 0; padding: 0; width: 100vw; height: 100vh;
  overflow: hidden;
  font-family: "Marker Felt", "Comic Sans MS", "Bradley Hand", "Chalkboard SE", cursive;
  -webkit-font-smoothing: antialiased;
  color: #3d2c4f;
}
.page {
  position: absolute; inset: 0;
  display: flex; align-items: center; justify-content: center;
}
```

- [ ] **Step 2: Create the stub `01-hello.html`**

`sites/trung/pages/01-hello.html`:

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<link rel="stylesheet" href="../assets/style.css" />
<style>
  body { background: linear-gradient(180deg, #ffd6a5 0%, #ffadad 50%, #bdb2ff 100%); }
  .hello { font-size: 18vw; font-weight: 700; font-style: italic;
           background: linear-gradient(90deg, #ff5e8a, #ff9a3c);
           -webkit-background-clip: text; background-clip: text;
           -webkit-text-fill-color: transparent;
           transform: rotate(-2deg); }
</style>
</head>
<body>
  <div class="page"><div class="hello">Trung</div></div>
</body>
</html>
```

- [ ] **Step 3: Create the stub `08-friends.html`** (the live final page)

`sites/trung/pages/08-friends.html`:

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<link rel="stylesheet" href="../assets/style.css" />
<style>
  body { background: linear-gradient(180deg, #ffd6a5 0%, #ffadad 50%, #bdb2ff 100%); }
  h1 { font-size: 12vw; margin: 0; }
  p  { font-size: 4vw; opacity: .8; }
</style>
</head>
<body>
  <div class="page" style="flex-direction:column; gap:1rem;">
    <h1>say hi</h1>
    <p>connect with me</p>
  </div>
</body>
</html>
```

- [ ] **Step 4: Create `manifest.json`**

`sites/trung/manifest.json`:

```json
{
  "title": "Trung — tear to read",
  "pages": [
    { "html": "pages/01-hello.html" },
    { "html": "pages/08-friends.html", "final": true }
  ]
}
```

- [ ] **Step 5: Run the snapshot script**

Run:
```
npm run snapshot trung
```
Expected: console logs `snapshot trung/01-hello @ portrait` and `landscape`. Files appear at `sites/trung/snapshots/01-hello.portrait.png` and `01-hello.landscape.png`. (No snapshot for the final page.)

- [ ] **Step 6: Update `index.html` for the new viewport defaults**

The current `index.html` has dark-mode `:root { color-scheme: dark; }` and dark gradient body. Since pages now own their own background via CSS, simplify the body:

Replace `index.html` body styles:

```html
<style>
  html, body {
    margin: 0; padding: 0; height: 100%; width: 100%;
    background: #000;
    overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif;
    color: #e6ecff;
    -webkit-tap-highlight-color: transparent;
    -webkit-user-select: none;
    user-select: none;
    overscroll-behavior: none;
    touch-action: none;
  }
  canvas { display: block; position: fixed; inset: 0; width: 100%; height: 100%; touch-action: none; }
  #c { z-index: 1; }
  #gl { z-index: 2; }
</style>
```

- [ ] **Step 7: Run the dev server and verify end-to-end**

Run:
```
npm run dev
```
Visit `http://localhost:5173/` in a browser.

Expected: cloth-tear effect runs with the new pink "Trung" page as the cloth texture; tearing it through reveals the "say hi" final page mounted as an iframe. No console errors.

Stop the dev server (Ctrl-C).

- [ ] **Step 8: Commit**

```
git add sites/trung index.html
git commit -m "feat: add stub trung site exercising the manifest pipeline end-to-end"
```

---

## Task 14: Build out shared `style.css` helpers (polaroid, sparkles, gradient text, wavy line)

Before porting the remaining pages, define reusable CSS classes for the recurring visual primitives. Each page becomes mostly markup.

**Files:**
- Modify: `sites/trung/assets/style.css`

- [ ] **Step 1: Replace `style.css` with the full helpers set**

```css
:root { color-scheme: light; }
* { box-sizing: border-box; }
html, body {
  margin: 0; padding: 0; width: 100vw; height: 100vh;
  overflow: hidden;
  font-family: "Marker Felt", "Comic Sans MS", "Bradley Hand", "Chalkboard SE", cursive;
  -webkit-font-smoothing: antialiased;
  color: #3d2c4f;
}
.page {
  position: relative;
  width: 100vw; height: 100vh;
  overflow: hidden;
}

/* sparkles — a CSS background-image of randomly placed dots */
.sparkles::before {
  content: '';
  position: absolute; inset: 0;
  pointer-events: none;
  background-image:
    radial-gradient(circle at 7%  9%,  rgba(255,255,255,.55) 2px, transparent 3px),
    radial-gradient(circle at 19% 41%, rgba(255,255,255,.55) 3px, transparent 4px),
    radial-gradient(circle at 32% 13%, rgba(255,255,255,.55) 2px, transparent 3px),
    radial-gradient(circle at 51% 67%, rgba(255,255,255,.55) 4px, transparent 5px),
    radial-gradient(circle at 68% 22%, rgba(255,255,255,.55) 3px, transparent 4px),
    radial-gradient(circle at 79% 78%, rgba(255,255,255,.55) 2px, transparent 3px),
    radial-gradient(circle at 88% 35%, rgba(255,255,255,.55) 3px, transparent 4px),
    radial-gradient(circle at 12% 86%, rgba(255,255,255,.55) 2px, transparent 3px),
    radial-gradient(circle at 44% 92%, rgba(255,255,255,.55) 3px, transparent 4px);
  background-size: 100% 100%;
}

/* gradient italic display text */
.grad {
  font-style: italic; font-weight: 700;
  background: linear-gradient(90deg, var(--from, #ff5e8a), var(--to, #ff9a3c));
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent; color: transparent;
  text-shadow: none;
  filter: drop-shadow(0.06em 0.06em 0 rgba(40,20,60,0.28));
}

/* polaroid card */
.polaroid {
  background: #fff8ef;
  padding: 5%;
  padding-bottom: 18%;
  box-shadow: 4% 4% 0 rgba(40,20,60,0.30);
  display: flex; flex-direction: column;
}
.polaroid img {
  width: 100%; aspect-ratio: 1 / 1;
  object-fit: cover; display: block;
}
.polaroid .caption {
  font-style: italic; text-align: center;
  font-size: 16%;
  color: #3d2c4f;
  margin-top: 7%;
}

/* logo chip — square white card with logo image inside */
.logo-chip {
  background: #fff;
  display: flex; align-items: center; justify-content: center;
  padding: 10%;
  box-shadow: 4% 5% 0 rgba(20,10,40,0.30);
}
.logo-chip img { max-width: 100%; max-height: 100%; object-fit: contain; }

/* wavy underline (svg-as-data-uri so it scales with the parent's width) */
.wavy {
  display: block;
  width: 60%;
  height: 2.5%;
  margin: 0 auto;
  background:
    no-repeat center / contain
    url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 8' preserveAspectRatio='none'><path d='M0 4 Q 12.5 0 25 4 T 50 4 T 75 4 T 100 4' fill='none' stroke='%23ff5e8a' stroke-width='1.2' stroke-linecap='round'/></svg>");
}

/* social-card frame for tweet-style */
.tweet {
  background: #000;
  padding: 1.2%;
  box-shadow: 2% 5% 0 rgba(0,0,0,0.40);
  position: relative;
  display: flex; align-items: center; justify-content: center;
}
.tweet img { width: 100%; height: 100%; object-fit: contain; display: block; }
.tweet[data-mark="x"]::after,
.tweet[data-mark="check"]::after {
  content: '';
  position: absolute; inset: 0;
  background-position: center; background-repeat: no-repeat;
  background-size: 65% 65%;
  pointer-events: none;
}
.tweet[data-mark="x"]::after {
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><g stroke='%23dc2626' stroke-width='14' stroke-linecap='round' fill='none'><line x1='15' y1='15' x2='85' y2='85'/><line x1='85' y1='15' x2='15' y2='85'/></g></svg>");
}
.tweet[data-mark="check"]::after {
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><polyline points='20,55 45,80 85,25' fill='none' stroke='%2322c55e' stroke-width='14' stroke-linecap='round' stroke-linejoin='round'/></svg>");
}
```

- [ ] **Step 2: Commit**

```
git add sites/trung/assets/style.css
git commit -m "feat(trung): add shared CSS helpers (polaroid, sparkles, grad text, wavy)"
```

---

## Task 15: Port page 01 — hello / Trung

Source reference: `src/main.js` lines 437–485 (the original `PAGES[0].paint`).

**Files:**
- Modify: `sites/trung/pages/01-hello.html`

- [ ] **Step 1: Replace the stub with the full layout**

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<link rel="stylesheet" href="../assets/style.css" />
<style>
  body { background: linear-gradient(180deg, #ffd6a5 0%, #ffadad 50%, #bdb2ff 100%); }
  .hello { position: absolute; left: 10vw; top: 7vh; font-size: 10vw;
           font-style: italic; transform: rotate(-4deg); color: #3d2c4f; }
  .polaroid-me { position: absolute; left: 50%; top: 36vh;
                 width: 66vw; transform: translate(-50%, -50%) rotate(-2deg); }
  .my-name { position: absolute; left: 50%; top: 66vh; transform: translateX(-50%);
             font-size: 7.5vw; color: #5b3a8a; }
  .name-grad { position: absolute; left: 50%; top: 78vh;
               transform: translate(-50%, -50%) rotate(-2deg);
               font-size: 30vw;
               --from: #ff5e8a; --to: #ff9a3c; }
  .underline { position: absolute; left: 0; right: 0; top: 86vh; }

  @media (orientation: landscape) {
    .hello { font-size: 6vw; left: 10vw; top: 18vh; }
    .polaroid-me { left: 78vw; top: 30vh; width: 22vw; transform: translate(-50%, -50%) rotate(4deg); }
    .my-name { left: 40vw; top: 40vh; font-size: 5.5vw; }
    .name-grad { left: 40vw; top: 58vh; font-size: 20vw; }
    .underline { left: 16vw; right: 36vw; top: 70vh; }
  }
</style>
</head>
<body>
  <div class="page sparkles">
    <div class="hello">hello,</div>
    <figure class="polaroid polaroid-me">
      <img src="../assets/photos/trung.webp" alt="Trung" />
      <figcaption class="caption">me</figcaption>
    </figure>
    <div class="my-name">my name is</div>
    <div class="grad name-grad">Trung</div>
    <div class="wavy underline"></div>
  </div>
</body>
</html>
```

- [ ] **Step 2: Re-snapshot and visually verify**

Run:
```
npm run snapshot trung
npm run dev
```
Visit `http://localhost:5173/` in a browser. Confirm the first cloth layer shows the polaroid + "Trung" name in roughly the same position as today's deployed site.

Stop the dev server.

- [ ] **Step 3: Commit**

```
git add sites/trung/pages/01-hello.html sites/trung/snapshots
git commit -m "feat(trung): port page 01 — hello / Trung"
```

---

## Task 16: Port page 02 — Hà Nội / Việt Nam

Source reference: `src/main.js` lines 487–520.

**Files:**
- Create: `sites/trung/pages/02-hanoi.html`
- Modify: `sites/trung/manifest.json`

- [ ] **Step 1: Create `02-hanoi.html`**

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<link rel="stylesheet" href="../assets/style.css" />
<style>
  body { background: linear-gradient(180deg, #caf0f8 0%, #90e0ef 50%, #a4c3b2 100%); color: #1f3b3b; }
  .from   { position: absolute; left: 50%; top: 7vh;  transform: translateX(-50%);
            font-style: italic; font-size: 5.5vw; }
  .hanoi  { position: absolute; left: 50%; top: 16vh; transform: translate(-50%,-50%) rotate(-2deg);
            font-size: 22vw; --from: #ff5e8a; --to: #e63946; }
  .vnam   { position: absolute; left: 50%; top: 24vh; transform: translateX(-50%);
            font-style: italic; font-weight: 700; font-size: 8.5vw; }
  .underline { position: absolute; left: 0; right: 0; top: 30vh; }
  .stack { position: absolute; left: 50%; top: 60vh; transform: translate(-50%, -50%);
           width: 90vw; height: 70vw; }
  .stack .polaroid { position: absolute; width: 50vw; }
  .p1 { left:  5vw; top: -5vw; transform: rotate(-7deg); }
  .p2 { left: 41vw; top:  5vw; transform: rotate( 4deg); }
  .p3 { left: 17vw; top: 22vw; transform: rotate(-3deg); }

  @media (orientation: landscape) {
    .from   { font-size: 4vw; top: 10vh; }
    .hanoi  { font-size: 16vw; top: 22vh; }
    .vnam   { font-size: 6vw; top: 32vh; }
    .underline { top: 40vh; }
    .stack { top: 75vh; width: 78vw; height: 28vw; }
    .stack .polaroid { width: 21vw; }
    .p1 { left:  8vw; top: 0; transform: rotate(-6deg); }
    .p2 { left: 38vw; top: 1vw; transform: rotate( 2deg); }
    .p3 { left: 70vw; top: 0;   transform: rotate(-4deg); }
  }
</style>
</head>
<body>
  <div class="page sparkles">
    <div class="from">I'm from</div>
    <div class="grad hanoi">Hà Nội</div>
    <div class="vnam">Việt Nam</div>
    <div class="wavy underline"></div>
    <div class="stack">
      <figure class="polaroid p1"><img src="../assets/photos/river.webp" alt="" /><figcaption class="caption">red river</figcaption></figure>
      <figure class="polaroid p2"><img src="../assets/photos/hanoi.webp" alt="" /><figcaption class="caption">Hanoi</figcaption></figure>
      <figure class="polaroid p3"><img src="../assets/photos/vietnam.webp" alt="" /><figcaption class="caption">việt nam</figcaption></figure>
    </div>
  </div>
</body>
</html>
```

- [ ] **Step 2: Update `manifest.json`**

```json
{
  "title": "Trung — tear to read",
  "pages": [
    { "html": "pages/01-hello.html" },
    { "html": "pages/02-hanoi.html" },
    { "html": "pages/08-friends.html", "final": true }
  ]
}
```

- [ ] **Step 3: Re-snapshot and visually verify**

Run:
```
npm run snapshot trung
npm run dev
```
Visit `http://localhost:5173/`, tear through page 1, confirm page 2 shows Hà Nội text + 3 polaroids stacked.

- [ ] **Step 4: Commit**

```
git add sites/trung/pages/02-hanoi.html sites/trung/manifest.json sites/trung/snapshots
git commit -m "feat(trung): port page 02 — Hà Nội"
```

---

## Task 17: Port page 03 — badminton

Source reference: `src/main.js` lines 522–558.

**Files:**
- Create: `sites/trung/pages/03-badminton.html`
- Modify: `sites/trung/manifest.json`

- [ ] **Step 1: Create `03-badminton.html`**

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<link rel="stylesheet" href="../assets/style.css" />
<style>
  body { background: linear-gradient(180deg, #fdf6c8 0%, #bef264 50%, #7cd6a8 100%); color: #2a4d2c; }
  .right-now { position: absolute; left: 12vw; top: 6vh; font-style: italic; font-size: 5.5vw; transform: rotate(-3deg); }
  .learn-line { position: absolute; left: 50%; top: 16vh; transform: translateX(-50%); font-size: 6.2vw; text-align: center; width: 90vw; }
  .badminton { position: absolute; left: 50%; top: 26vh; transform: translate(-50%, -50%) rotate(1deg);
               font-size: 11vw; --from: #16a34a; --to: #0ea5e9; }
  .smash { position: absolute; left: 50%; top: 62vh; transform: translate(-50%, -50%) rotate(-2deg); width: 78vw; }

  @media (orientation: landscape) {
    .right-now  { font-size: 4vw; top: 13vh; left: 16vw; }
    .learn-line { font-size: 5vw; top: 23vh; }
    .badminton  { font-size: 10.5vw; top: 36vh; }
    .smash      { width: 30vw; top: 70vh; }
  }
</style>
</head>
<body>
  <div class="page sparkles">
    <div class="right-now">right now</div>
    <div class="learn-line">I'm learning to swing a</div>
    <div class="grad badminton">badminton racket</div>
    <figure class="polaroid smash">
      <img src="../assets/photos/badminton.webp" alt="" />
      <figcaption class="caption">smash</figcaption>
    </figure>
  </div>
</body>
</html>
```

- [ ] **Step 2: Update `manifest.json`** to insert this page before the final entry. The pages array becomes:

```json
[
  { "html": "pages/01-hello.html" },
  { "html": "pages/02-hanoi.html" },
  { "html": "pages/03-badminton.html" },
  { "html": "pages/08-friends.html", "final": true }
]
```

- [ ] **Step 3: Snapshot, verify, commit**

```
npm run snapshot trung
npm run dev   # visually verify, stop with Ctrl-C
git add sites/trung/pages/03-badminton.html sites/trung/manifest.json sites/trung/snapshots
git commit -m "feat(trung): port page 03 — badminton"
```

---

## Task 18: Port page 04 — I'm 32 / grew up with...

Source reference: `src/main.js` lines 560–607. Logo grid: 13 logos, 3×4+centered (portrait) or 4×3+centered (landscape).

**Files:**
- Create: `sites/trung/pages/04-grew-up.html`
- Modify: `sites/trung/manifest.json`

- [ ] **Step 1: Create `04-grew-up.html`**

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<link rel="stylesheet" href="../assets/style.css" />
<style>
  body { background: linear-gradient(180deg, #ffd1ef 0%, #c084fc 50%, #7c3aed 100%); color: #fff; }
  .age   { position: absolute; left: 50%; top: 6vh; transform: translate(-50%,-50%) rotate(-1deg);
           font-size: 13vw; --from: #fffae3; --to: #fde68a; }
  .lead  { position: absolute; left: 50%; top: 13vh; transform: translateX(-50%);
           font-style: italic; font-size: 4vw; opacity: .85; }

  .grid { position: absolute; inset: 18vh 5vw 5vh 5vw;
          display: grid; grid-template-columns: repeat(3, 1fr); gap: 2vw;
          align-items: center; justify-items: center; }
  .grid .logo-chip { width: 24vw; height: 24vw; }
  .grid > :nth-child(13) { grid-column: 1 / -1; }
  .grid > :nth-child(odd)  { transform: rotate(-2deg); }
  .grid > :nth-child(even) { transform: rotate( 2deg); }

  @media (orientation: landscape) {
    .age  { font-size: 13vw; top: 13vh; }
    .lead { font-size: 3vw; top: 24vh; }
    .grid { inset: 32vh 4vw 4vh 4vw; grid-template-columns: repeat(4, 1fr); gap: 1.2vw; }
    .grid .logo-chip { width: 13vw; height: 13vw; }
    .grid > :nth-child(13) { grid-column: 1 / -1; }
  }
</style>
</head>
<body>
  <div class="page sparkles">
    <div class="grad age">I'm 32</div>
    <div class="lead">and I grew up with —</div>
    <div class="grid">
      <div class="logo-chip"><img src="../assets/photos/logos/snes.svg" alt=""></div>
      <div class="logo-chip"><img src="../assets/photos/logos/gameboy.svg" alt=""></div>
      <div class="logo-chip"><img src="../assets/photos/logos/little-fighter.png" alt=""></div>
      <div class="logo-chip"><img src="../assets/photos/logos/worms.png" alt=""></div>
      <div class="logo-chip"><img src="../assets/photos/logos/internet.svg" alt=""></div>
      <div class="logo-chip"><img src="../assets/photos/logos/yahoo.svg" alt=""></div>
      <div class="logo-chip"><img src="../assets/photos/logos/facebook.svg" alt=""></div>
      <div class="logo-chip"><img src="../assets/photos/logos/gunbound.jpg" alt=""></div>
      <div class="logo-chip"><img src="../assets/photos/logos/diablo2.png" alt=""></div>
      <div class="logo-chip"><img src="../assets/photos/logos/powerpoint.svg" alt=""></div>
      <div class="logo-chip"><img src="../assets/photos/logos/pascal.jpg" alt=""></div>
      <div class="logo-chip"><img src="../assets/photos/logos/cpp.svg" alt=""></div>
      <div class="logo-chip"><img src="../assets/photos/logos/warcraft-ft.jpg" alt=""></div>
    </div>
  </div>
</body>
</html>
```

- [ ] **Step 2: Update `manifest.json`** to insert this page (4 entries plus the final).

- [ ] **Step 3: Snapshot, verify, commit**

```
npm run snapshot trung
npm run dev   # verify the logo grid
git add sites/trung/pages/04-grew-up.html sites/trung/manifest.json sites/trung/snapshots
git commit -m "feat(trung): port page 04 — grew up with"
```

---

## Task 19: Port page 05 — side projects (depressive tone)

Source reference: `src/main.js` lines 609–634.

**Files:**
- Create: `sites/trung/pages/05-side-projects.html`
- Modify: `sites/trung/manifest.json`

- [ ] **Step 1: Create `05-side-projects.html`**

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<link rel="stylesheet" href="../assets/style.css" />
<style>
  body { background: linear-gradient(180deg, #3d3a4d 0%, #26233a 50%, #0f0d1a 100%); color: #cdc4d6; }
  .head { position: absolute; left: 50%; top: 10vh; transform: translateX(-50%); font-size: 5vw; text-align: center; width: 90vw; }
  .sub  { position: absolute; left: 50%; top: 17vh; transform: translateX(-50%); font-size: 4vw; font-style: italic; color: #9a92a6; text-align: center; width: 90vw; }
  .sub2 { position: absolute; left: 50%; top: 22vh; transform: translateX(-50%); font-size: 4vw; font-style: italic; color: #9a92a6; text-align: center; width: 90vw; }
  .pic  { position: absolute; left: 50%; top: 62vh; transform: translate(-50%, -50%) rotate(-2deg); width: 78vw; }

  @media (orientation: landscape) {
    .head { left: 28vw; top: 40vh; transform: none; text-align: left; font-size: 3.8vw; width: 50vw; }
    .sub  { left: 28vw; top: 50vh; transform: none; text-align: left; font-size: 3.2vw; width: 50vw; }
    .sub2 { left: 28vw; top: 56vh; transform: none; text-align: left; font-size: 3.2vw; width: 50vw; }
    .pic  { left: 74vw; top: 50vh; width: 32vw; }
  }
</style>
</head>
<body>
  <div class="page">
    <div class="head">+ 4 side projects that made money</div>
    <div class="sub">I never figured out how to keep them going.</div>
    <div class="sub2">or how to live on social media.</div>
    <figure class="polaroid pic">
      <img src="../assets/photos/bad.webp" alt="" />
      <figcaption class="caption">side projects</figcaption>
    </figure>
  </div>
</body>
</html>
```

- [ ] **Step 2: Update `manifest.json`**, snapshot, verify, commit.

```
npm run snapshot trung
npm run dev   # verify
git add sites/trung/pages/05-side-projects.html sites/trung/manifest.json sites/trung/snapshots
git commit -m "feat(trung): port page 05 — side projects"
```

---

## Task 20: Port page 06 — writing 3 lines (god-light tone)

Source reference: `src/main.js` lines 636–667.

**Files:**
- Create: `sites/trung/pages/06-3-lines.html`
- Modify: `sites/trung/manifest.json`

- [ ] **Step 1: Create `06-3-lines.html`**

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<link rel="stylesheet" href="../assets/style.css" />
<style>
  body { background: linear-gradient(180deg, #ffffff 0%, #fff5cc 50%, #ffd47a 100%); color: #3d2410; }
  .lead    { position: absolute; left: 50%; top: 8vh;  transform: translateX(-50%); font-size: 4.8vw; text-align: center; width: 92vw; }
  .sublead { position: absolute; left: 50%; top: 15vh; transform: translateX(-50%); font-size: 4.2vw; font-style: italic; color: rgba(60,40,20,0.85); text-align: center; width: 92vw; }
  .bullets { position: absolute; left: 50%; top: 23vh; transform: translateX(-50%); font-size: 4vw; color: #5b3a1f; text-align: center; line-height: 1.4; }
  .pic     { position: absolute; left: 50%; top: 70vh; transform: translate(-50%, -50%) rotate(-2deg); width: 74vw; }

  @media (orientation: landscape) {
    .lead    { left: 28vw; top: 30vh; transform: none; text-align: left; font-size: 3.8vw; width: 50vw; }
    .sublead { left: 28vw; top: 40vh; transform: none; text-align: left; font-size: 3.2vw; width: 50vw; }
    .bullets { left: 28vw; top: 50vh; transform: none; text-align: left; font-size: 3.2vw; }
    .pic     { left: 74vw; top: 50vh; width: 32vw; }
  }
</style>
</head>
<body>
  <div class="page sparkles">
    <div class="lead">so I'm trying something else —</div>
    <div class="sublead">for every thing I do — 3 lines:</div>
    <div class="bullets">
      · what it is<br />
      · how I feel<br />
      · what I learned
    </div>
    <figure class="polaroid pic">
      <img src="../assets/photos/good.jpg" alt="" />
      <figcaption class="caption">writing</figcaption>
    </figure>
  </div>
</body>
</html>
```

- [ ] **Step 2: Update manifest, snapshot, verify, commit.**

```
npm run snapshot trung
npm run dev   # verify
git add sites/trung/pages/06-3-lines.html sites/trung/manifest.json sites/trung/snapshots
git commit -m "feat(trung): port page 06 — 3 lines"
```

---

## Task 21: Port page 07 — real people (two contrasting tweets)

Source reference: `src/main.js` lines 669–701.

**Files:**
- Create: `sites/trung/pages/07-real-people.html`
- Modify: `sites/trung/manifest.json`

- [ ] **Step 1: Create `07-real-people.html`**

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<link rel="stylesheet" href="../assets/style.css" />
<style>
  body { background: linear-gradient(180deg, #d8f3dc 0%, #b7e4c7 50%, #95d5b2 100%); color: #1f3b3b; }
  .l1 { position: absolute; left: 50%; top: 5vh;   transform: translateX(-50%); font-size: 3.8vw; text-align: center; width: 92vw; }
  .l2 { position: absolute; left: 50%; top: 10vh;  transform: translateX(-50%); font-size: 3.2vw; font-style: italic; color: #2a4d2c; text-align: center; width: 92vw; }
  .l3 { position: absolute; left: 50%; top: 14.5vh; transform: translateX(-50%); font-size: 3.2vw; font-style: italic; color: #2a4d2c; text-align: center; width: 92vw; }
  .l4 { position: absolute; left: 50%; top: 22vh;  transform: translateX(-50%); font-size: 4vw; font-weight: 700; text-align: center; width: 92vw; }
  .t1 { position: absolute; left: 50%; top: 36vh; transform: translate(-50%, -50%) rotate(-1deg); width: 88vw; height: 17vw; }
  .t2 { position: absolute; left: 50%; top: 74vh; transform: translate(-50%, -50%) rotate( 1deg); width: 80vw; height: 49vw; }

  @media (orientation: landscape) {
    .l1 { left: 27vw; top: 32vh; transform: none; text-align: left; font-size: 3.4vw; width: 50vw; }
    .l2 { left: 27vw; top: 42vh; transform: none; text-align: left; font-size: 3vw;   width: 50vw; }
    .l3 { left: 27vw; top: 48vh; transform: none; text-align: left; font-size: 3vw;   width: 50vw; }
    .l4 { left: 27vw; top: 62vh; transform: none; text-align: left; font-size: 3.4vw; width: 50vw; }
    .t1 { left: 72vw; top: 30vh; width: 42vw; height: 8.2vw; }
    .t2 { left: 72vw; top: 68vh; width: 42vw; height: 26.2vw; }
  }
</style>
</head>
<body>
  <div class="page sparkles">
    <div class="l1">I stopped reading opinions on social.</div>
    <div class="l2">I read real people instead —</div>
    <div class="l3">they move slower than the noise.</div>
    <div class="l4">calmer. more creative.</div>
    <div class="tweet t1" data-mark="x"><img src="../assets/photos/not-help.webp" alt=""></div>
    <div class="tweet t2" data-mark="check"><img src="../assets/photos/this-help.webp" alt=""></div>
  </div>
</body>
</html>
```

- [ ] **Step 2: Update manifest, snapshot, verify, commit.**

```
npm run snapshot trung
npm run dev   # verify
git add sites/trung/pages/07-real-people.html sites/trung/manifest.json sites/trung/snapshots
git commit -m "feat(trung): port page 07 — real people"
```

---

## Task 22: Port page 08 — friends (the live final page)

Source reference: `src/main.js` lines 703–728. This is the iframe-mounted final page, so styling must work standalone (it's not on the cloth).

**Files:**
- Modify: `sites/trung/pages/08-friends.html`

- [ ] **Step 1: Replace the stub with the full layout**

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<link rel="stylesheet" href="../assets/style.css" />
<style>
  body { background: linear-gradient(180deg, #ffd6a5 0%, #ffadad 50%, #bdb2ff 100%); color: #3d2c4f; }
  .lead   { position: absolute; left: 50%; top: 10vh; transform: translateX(-50%); font-style: italic; font-size: 6vw; }
  .friend { position: absolute; left: 50%; top: 22vh; transform: translate(-50%,-50%) rotate(-2deg);
            font-size: 16vw; --from: #ff5e8a; --to: #ff9a3c; }
  .underline { position: absolute; left: 0; right: 0; top: 30vh; }
  .pic    { position: absolute; left: 50%; top: 66vh; transform: translate(-50%, -50%) rotate(-2deg); width: 74vw; }

  @media (orientation: landscape) {
    .lead      { left: 28vw; top: 34vh; transform: none; text-align: left; font-size: 4.4vw; }
    .friend    { left: 28vw; top: 50vh; transform: rotate(-2deg); transform-origin: left center; font-size: 9vw; }
    .underline { left: 14vw; right: 56vw; top: 62vh; }
    .pic       { left: 74vw; top: 50vh; width: 32vw; }
  }
</style>
</head>
<body>
  <div class="page sparkles">
    <div class="lead">connect with me</div>
    <div class="grad friend">&amp; be friends</div>
    <div class="wavy underline"></div>
    <figure class="polaroid pic">
      <img src="../assets/photos/say-hi.webp" alt="" />
      <figcaption class="caption">say hi</figcaption>
    </figure>
  </div>
</body>
</html>
```

- [ ] **Step 2: Visually verify the full sequence**

(No new snapshot needed — final page isn't snapshotted.)

Run:
```
npm run dev
```
Tear all the way through pages 1–7. Confirm page 8 mounts as the iframe with the friends content visible and interactive (you can scroll, select text — this is real HTML).

- [ ] **Step 3: Commit**

```
git add sites/trung/pages/08-friends.html
git commit -m "feat(trung): port page 08 — friends (live final page)"
```

---

## Task 23: Add the swap-test site `sites/demo-other/`

Two trivial pages plus a final, to validate that any folder works without runtime changes.

**Files:**
- Create: `sites/demo-other/manifest.json`
- Create: `sites/demo-other/pages/01-front.html`
- Create: `sites/demo-other/pages/02-back.html`
- Create: `sites/demo-other/assets/style.css`

- [ ] **Step 1: Create files**

`sites/demo-other/assets/style.css`:

```css
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; width: 100vw; height: 100vh; overflow: hidden;
             font-family: system-ui, sans-serif; }
.page { position: absolute; inset: 0; display: grid; place-items: center; text-align: center; }
```

`sites/demo-other/pages/01-front.html`:

```html
<!doctype html>
<html><head><meta charset="utf-8"/><link rel="stylesheet" href="../assets/style.css"/>
<style>body { background: #1e293b; color: #f8fafc; } h1 { font-size: 14vw; margin: 0; }</style>
</head>
<body><div class="page"><h1>front</h1></div></body></html>
```

`sites/demo-other/pages/02-back.html`:

```html
<!doctype html>
<html><head><meta charset="utf-8"/><link rel="stylesheet" href="../assets/style.css"/>
<style>body { background: #f97316; color: #1c1917; } h1 { font-size: 14vw; margin: 0; }</style>
</head>
<body><div class="page"><h1>back</h1><p>(real interactive HTML)</p></div></body></html>
```

`sites/demo-other/manifest.json`:

```json
{
  "title": "demo-other",
  "pages": [
    { "html": "pages/01-front.html" },
    { "html": "pages/02-back.html", "final": true }
  ]
}
```

- [ ] **Step 2: Snapshot and verify swap**

Run:
```
npm run snapshot demo-other
npm run dev
```
Visit `http://localhost:5173/demo-other`. Confirm: dark "front" page tears to reveal orange "back" final page. No `src/main.js` changes were needed.

- [ ] **Step 3: Verify the default still works**

In the same dev server, visit `http://localhost:5173/` — the trung site still renders (`/` → `trung`).

Stop the dev server.

- [ ] **Step 4: Commit**

```
git add sites/demo-other
git commit -m "test: add demo-other site to validate folder swap"
```

---

## Task 24: Verify production build serves all routes

**Files:** none (verification only)

- [ ] **Step 1: Build**

Run:
```
npm run build
```
Expected: Vite emits `dist/index.html` + `dist/assets/...` (the bundled JS), and the `cloth-tear` plugin's `closeBundle` copies `sites/` to `dist/sites/`.

Verify the copy:
```
ls dist/sites/trung/snapshots
ls dist/sites/demo-other
```
Expected: PNGs and HTML files present.

- [ ] **Step 2: Preview-serve**

Run:
```
npm run preview
```
Visit each of: `/`, `/trung`, `/demo-other`, `/nonexistent` (port shown in Vite output).

Expected:
- `/` and `/trung` render the full Trung site identically.
- `/demo-other` renders the swap-test site.
- `/nonexistent` renders the "site not found" 404 message from `main.js`.

Stop the preview server (Ctrl-C).

- [ ] **Step 3: No commit needed**

Verification only. If something failed, return to the relevant earlier task to fix.

---

## Task 25: Update repo `.gitignore` and verify final state

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: Inspect current gitignore**

Run:
```
cat .gitignore
```

- [ ] **Step 2: Ensure node_modules and dist are ignored, but snapshots are NOT**

`.gitignore` should include `node_modules`, `dist`, but snapshots ARE intentionally committed. If snapshots are currently ignored (e.g. via a `*.png` rule), narrow the rule.

Final `.gitignore` (merge with whatever's already present):

```
node_modules
dist
.DS_Store
```

- [ ] **Step 3: Verify the repo state is clean**

Run:
```
git status
```
Expected: clean working tree.

```
git log --oneline | head -30
```
Expected: a clean sequence of commits — vitest, route helpers, snapshot helpers, vite middleware, wrangler SPA, playwright, snapshot script, watch mode, runtime refactor, photos move, page ports (8 commits), demo-other, build verification.

- [ ] **Step 4: Final commit if anything dangling**

```
git add .gitignore
git diff --cached
git commit -m "chore: tidy gitignore"
```

(Skip if no diff.)

---

## Self-review notes

- All spec sections covered: layout, manifest, routing (Vite + Workers), snapshot pipeline, runtime (manifest loader + iframe final + orientation swap + 404), migration of 8 pages, swap-test site, build verification.
- Tests added where unit-testable (path resolution, manifest validation, snapshot path derivation). Visual changes have explicit manual-verification steps.
- All file paths absolute or unambiguously relative to repo root. Task numbering preserved across edits.
- Final-page iframe uses no `sandbox` attribute in v1 (per spec — local trusted code). v2 will add it.
- Snapshots are committed; production build is a static-asset upload only.
