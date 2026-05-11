# thiiss.me — quick playable demo

## Goal

Add a second deployment target to this repo that lets anyone upload 3–6 photos at `thiiss.me/create` and get a tearable cloth site at `<random-two-word>.thiiss.me` that lives for 7 days. The existing cloth-tear runtime is reused unchanged except for one routing tweak.

This is a "quick playable demo" — anonymous, ephemeral, no accounts, minimal moderation. It is **not** the full hosted-SaaS v2 in `2026-05-10-cloth-tear-template-design.md` — that doc remains the long-term direction and this slice intentionally drops auth, persistence, editing, custom domains, and customization knobs.

## Non-goals

- Accounts, login, edit-after-create.
- User-chosen slugs (random only).
- Captions, names, page reorder, theming.
- Live HTML on the cloth (snapshots only, same as v1).
- Long-lived hosting (7-day TTL is the contract).
- Content moderation pipeline. The demo is share-by-link only, no discovery surface; abuse blast radius is limited to people the link was sent to. If something objectionable appears, slug-banning by manual KV write is the escape hatch.
- Load testing, accessibility audit, cross-browser matrix beyond Chrome + Safari.

## URL scheme

| URL | Behavior |
|---|---|
| `thiiss.me/` | Tiny landing page with a single "make yours →" link to `/create`. |
| `thiiss.me/create` | Upload SPA (drag-and-drop photos, single submit button). |
| `thiiss.me/api/create` | `POST` endpoint: accepts photos, returns `{ slug, url }`. |
| `thiiss.me/photo/<slug>/<i>.jpg` | Reads photo original from R2. Used both by Browser Rendering during snapshotting and by the final live page at runtime. |
| `<slug>.thiiss.me/` | Cloth-tear runtime; resolves siteName from hostname. |
| `<slug>.thiiss.me/sites/<slug>/manifest.json` | KV lookup. 404 if expired/unknown. |
| `<slug>.thiiss.me/sites/<slug>/snapshots/<base>.<orient>.png` | R2 read. |
| `<slug>.thiiss.me/sites/<slug>/pages/<n>-final.html` | Regenerated on demand by `renderPage('final', …)`. The only page fetched live by the runtime (in the final-state iframe). |

DNS is a wildcard `*.thiiss.me` CNAME to Cloudflare, so unknown subdomains route to the Worker and fall through to the existing "site not found" cloth screen via the runtime's manifest-404 path.

## User flow

1. Visit `thiiss.me/` → click **make yours →** → land on `/create`.
2. Drag-and-drop or pick 3–6 photos. Thumbnail strip appears; drag to reorder; × to remove. Each photo is client-side resized on a `<canvas>` to ≤1600px long edge and exported as JPEG quality 0.85. This normalizes HEIC (iOS Safari decodes HEIC into canvas natively) and caps payload size.
3. Click **weave my page** → `POST /api/create` with `multipart/form-data`. Single spinner with cycling text "uploading photos…" / "weaving the cloth…" / "almost there…". No real progress events.
4. Worker responds `200 { slug, url }` after the synchronous snapshot pipeline (typically 8–15s for 4 photos). Client redirects to the slug URL.
5. Cloth-tear runtime loads, user tears through pages, lands on the final live page with a **tear your own →** CTA back to `/create`.
6. 7 days later, KV expires the manifest and the R2 lifecycle rule deletes the slug's blobs. Subsequent visits get the "site not found" screen.

## Page model

Three page kinds, generated server-side by a pure function `renderPage(kind, opts)` returning a self-contained HTML string (inline `<style>`, absolute `https://thiiss.me/photo/<slug>/<i>.jpg` references).

1. **Intro** (1 page, snapshot). Gradient background `#ffd6a5 → #ffadad → #bdb2ff` (same as `sites/trung/pages/01-hello.html`). Big italic "**this is me**" centered. Sparkle pattern overlay. Small "tear →" hint at the bottom. No photo.
2. **Photo pages** (3–6, snapshots). Polaroid frame reused from `sites/trung/assets/style.css` (white paper, soft shadow). Photo fills the square area. **No caption text.** Rotation alternates `-3°, +3°, -2°, +4°, -3°, +2°` per page index so the cloth feels handmade. Background gradient cycles through a fixed 6-palette set so consecutive pages don't repeat colors.
3. **Final live** (1 page, served live in iframe). Same polaroid styling, the user's last uploaded photo as the hero, big italic "**tear your own →**" with a button linking to `https://thiiss.me/create`. This page is regenerated on each request from the manifest — no snapshot.

Manifest (slug = `honey-river`, 4 photos):

```json
{
  "title": "this is me",
  "pages": [
    { "html": "pages/00-intro.html" },
    { "html": "pages/01-photo.html" },
    { "html": "pages/02-photo.html" },
    { "html": "pages/03-photo.html" },
    { "html": "pages/04-photo.html" },
    { "html": "pages/05-final.html", "final": true }
  ]
}
```

Filenames are synthetic — they don't exist on disk. They drive `snapshotBasename`-style derivation in the existing runtime (`05-final` → no snapshot needed since `final: true`; the others → `<base>.portrait.png` / `<base>.landscape.png`). This shape passes the existing `validateManifest` (`src/lib/route.js:7`) without modification.

## Architecture

One Worker. One repo. Wildcard subdomain. New wrangler target `thiiss-me` parallel to the existing `codeonsunday-website` target, deployed independently with its own bindings.

### Bindings

| Binding | Purpose |
|---|---|
| `ASSETS` | Workers Static Assets — serves the cloth-tear runtime (`index.html`) and the upload SPA (`create.html`) from `dist-thiiss/`. |
| `R2_BLOBS` | R2 bucket. Keys: `photos/<slug>/<i>.jpg`, `snapshots/<slug>/<base>.<orient>.png`. |
| `KV_MANIFESTS` | KV namespace. Key = slug, value = manifest JSON. Written with `expirationTtl: 604800` (7 days). |
| `BROWSER` | Cloudflare Browser Rendering binding. |

R2 lifecycle rule deletes `photos/` and `snapshots/` prefixes after 8 days (one-day grace beyond KV TTL).

### Wrangler routing

```jsonc
// wrangler.thiiss.jsonc
{
  "name": "thiiss-me",
  "main": "src/worker/index.js",
  "compatibility_date": "2026-05-11",
  "routes": [
    { "pattern": "thiiss.me/*", "zone_name": "thiiss.me" },
    { "pattern": "*.thiiss.me/*", "zone_name": "thiiss.me" }
  ],
  "assets": { "directory": "./dist-thiiss", "binding": "ASSETS" },
  "r2_buckets": [{ "binding": "R2_BLOBS", "bucket_name": "thiiss-blobs" }],
  "kv_namespaces": [{ "binding": "KV_MANIFESTS", "id": "<id>" }],
  "browser": { "binding": "BROWSER" }
}
```

### Worker request routing

Single `fetch` handler dispatches on hostname first, then path:

```
host = thiiss.me                            host = <slug>.thiiss.me
─────────────────────                       ──────────────────────────
GET  /                  → ASSETS create.html GET  /                       → ASSETS index.html
GET  /create            → ASSETS create.html GET  /sites/<slug>/manifest.json
POST /api/create        → handleCreate()                                  → KV lookup
GET  /photo/<slug>/<i>  → R2 read            GET  /sites/<slug>/snapshots/* → R2 read
*                       → 404 page           GET  /sites/<slug>/pages/<n>-final.html
                                                                          → renderPage('final', …)
                                             GET  /photo/<slug>/<i>       → R2 read
                                             *                            → ASSETS (cloth 404 UI)
```

### Runtime change

`resolveSiteName(pathname, default)` becomes `resolveSiteName(hostname, pathname, default)` in `src/lib/route.js`. New rule: if `hostname` matches `^[a-z]+-[a-z]+(-[0-9a-f]{3})?\.thiiss\.me$`, return the first label. Otherwise fall through to existing path-based logic. Call site in `src/main.js:14` updated accordingly. Cloth physics, mesh, tear behavior, snapshot fetching, orientation handling — all untouched.

### Repo layout (additions)

```
cloth-tear/
  src/
    main.js                   # unchanged except resolveSiteName call site
    lib/route.js              # hostname-aware resolveSiteName
    worker/
      index.js                # fetch handler, route table
      handlers/
        create.js             # POST /api/create
        photo.js              # GET /photo/<slug>/<i>
        manifest.js           # GET /sites/<slug>/manifest.json
        snapshot.js           # GET /sites/<slug>/snapshots/...
        page.js               # GET /sites/<slug>/pages/<n>-final.html
      lib/
        slug.js               # generateSlug() with collision retry
        wordlist.js           # exports adjectives[], nouns[]
        render-page.js        # renderPage(kind, opts) -> html string
        snapshot.js           # Browser Rendering pipeline
        wordlist.json         # 200 adjectives × 200 nouns
    create/
      create.html             # upload SPA entry
      main.js                 # upload UI logic
  wrangler.thiiss.jsonc       # new deploy target
  wrangler.jsonc              # existing codeonsunday-website target, unchanged
```

The existing `codeonsunday-website` deployment is not touched. `dist/` continues to build for the current site; `dist-thiiss/` is a separate Vite build for the thiiss.me Worker.

### Vite multi-build

Two Vite configs, two npm scripts, two output directories:

- `vite.config.js` (existing) — input `index.html`, output `dist/`. Used by `npm run build` for codeonsunday-website.
- `vite.config.thiiss.js` (new) — inputs `index.html` + `src/create/create.html`, output `dist-thiiss/`. Used by `npm run build:thiiss` for the thiiss.me target.

The shared `index.html` is consumed by both builds; the upload SPA is unique to the thiiss build. Two configs are clearer than one config branching on env var, and keep the existing build path untouched.

## Data flow: `POST /api/create`

Synchronous pipeline. Total wall time 8–15s for the typical 4-photo case.

1. **Parse + validate** the multipart body. Reject on:
   - photo count outside 3–6 → `400 { error: 'photo_count' }`
   - any part > 2 MB → `400 { error: 'photo_too_large' }`
   - content type ≠ `image/jpeg` → `400 { error: 'bad_format' }`
   - total payload > 12 MB → `413`
2. **Generate slug.** `<adj>-<noun>` from `wordlist.json` (200×200 = 40k combos). `KV_MANIFESTS.get(slug)`; on hit, retry up to 3 times. After 3 hits, append `-<3-digit-hex>` for guaranteed uniqueness.
3. **Upload originals.** `Promise.all` of `R2_BLOBS.put('photos/<slug>/<i>.jpg', bytes)` for each photo. On partial failure: best-effort `R2_BLOBS.delete` of any successful writes, then `500 { error: 'upload_failed' }`.
4. **Generate HTML** for all N+2 pages via `renderPage(kind, opts)`. Pure, in-memory.
5. **Snapshot** the N+1 non-final pages via Browser Rendering. One browser, one page, reused:
   ```js
   const browser = await puppeteer.launch(env.BROWSER);
   const page = await browser.newPage();
   try {
     for (const { base, html } of nonFinalPages) {
       await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1.5 });
       await page.setContent(html, { waitUntil: 'networkidle0' });
       const portrait = await page.screenshot({ type: 'png' });
       await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1.5 });
       const landscape = await page.screenshot({ type: 'png' });
       await Promise.all([
         env.R2_BLOBS.put(`snapshots/${slug}/${base}.portrait.png`, portrait),
         env.R2_BLOBS.put(`snapshots/${slug}/${base}.landscape.png`, landscape),
       ]);
     }
   } finally {
     await browser.close();
   }
   ```
   On any throw inside the try block: best-effort cleanup of every R2 key under `photos/<slug>/` and `snapshots/<slug>/`, no KV write, respond `500 { error: 'snapshot_failed' }`.
6. **Write manifest** to KV: `KV_MANIFESTS.put(slug, JSON.stringify(manifest), { expirationTtl: 604800 })`.
7. **Respond** `200 { slug, url: 'https://<slug>.thiiss.me/' }`. Client redirects.

## Read paths

- `GET /sites/<slug>/manifest.json` → `KV_MANIFESTS.get(slug)`. Miss → 404 → existing runtime's "site not found" screen.
- `GET /sites/<slug>/snapshots/<base>.<orient>.png` → `R2_BLOBS.get('snapshots/<slug>/<base>.<orient>.png')`. Miss → 404.
- `GET /sites/<slug>/pages/<n>-final.html` → re-fetch manifest from KV, call `renderPage('final', {photoUrl: …})`, return HTML. Stateless.
- `GET /photo/<slug>/<i>.jpg` → `R2_BLOBS.get('photos/<slug>/<i>.jpg')`. Miss → 404.

All read paths return short-cache headers (`cache-control: public, max-age=300`) since content is immutable for the 7-day TTL — fine for the demo without further tuning.

## Rate limiting

Cloudflare Rate Limiting rule on `POST /api/create`: max 10 / 5 min / IP. Tuned for "playable demo" — enough headroom for a friend to make a few sites in a row, low enough to block trivial scripted abuse. Configured in the Cloudflare dashboard, not in wrangler config.

## Loading state UX

Client shows a single full-screen overlay during the upload:

- Spinner (CSS-only, simple)
- Cycling text every 3s: "uploading photos…" → "weaving the cloth…" → "almost there…"
- No real progress events; the cycle repeats indefinitely until the response lands
- On 4xx error: show inline error message with the server's `error` code mapped to friendly text, keep the upload form populated so the user can fix and retry
- On 5xx error: show "something went wrong, try again" with a single retry button that resubmits the same form

No background recovery, no queue, no retry-with-backoff. One-shot flow.

## Migration plan

The work is structured as five layers, each independently testable before the next is wired up.

1. **Worker skeleton + routing.** New wrangler config, single `fetch` handler that returns hardcoded responses for each route. Deploy. Verify `curl https://thiiss.me/create` and `curl https://anything.thiiss.me/` both hit the right branch.
2. **Static asset serving.** Build the two HTML entry points (`index.html` reused from main repo, `create.html` new). Verify both are served by `ASSETS` binding under the right hostnames.
3. **Read paths.** Implement `/sites/<slug>/manifest.json`, `/sites/<slug>/snapshots/*`, `/photo/<slug>/*`, `/sites/<slug>/pages/<n>-final.html`. Seed KV + R2 with a hand-built test site (call it `test-slug`). Visit `test-slug.thiiss.me` end-to-end. Should run the cloth flow as if it were `sites/trung/` — proving the runtime change works for hostname-resolved sites.
4. **Page generator.** Implement `renderPage(kind, opts)` for all three kinds. Snapshot tests compare output to fixtures. No Browser Rendering yet.
5. **Upload pipeline.** Implement `POST /api/create` end-to-end: validation → R2 upload → snapshot via Browser Rendering → KV write → response. Implement the upload SPA. End-to-end: real user uploads → real slug → cloth runs.

Step 3 is the highest-risk integration check: it proves the runtime works under wildcard-subdomain routing with KV/R2 backed assets, before we add the more complex Browser Rendering pipeline on top.

## Test plan

### Unit (vitest, no network)

- `renderPage('intro' | 'photo' | 'final', opts)` returns deterministic HTML strings. Snapshot tests catch regressions.
- Slug generator: 1000 invocations produce 1000 well-formed `<adj>-<noun>` strings; collision retry caps at 3 then appends hex.
- Manifest builder for N=3..6 photos produces shapes that pass the existing `validateManifest` from `src/lib/route.js`.
- `resolveSiteName('honey-river.thiiss.me', '/', 'trung')` returns `'honey-river'`; `resolveSiteName('thiiss.me', '/create', 'trung')` returns `'trung'`; `resolveSiteName('localhost', '/trung', 'trung')` returns `'trung'` (existing behavior preserved).

### Integration (`wrangler dev` with real Cloudflare bindings)

- `POST /api/create` with 3 valid JPEGs → 200 + slug; KV has manifest; R2 has 3 originals and 8 snapshots (4 non-final pages × 2 orientations); response URL responds with the runtime HTML.
- `POST /api/create` with 2 photos → 400 `photo_count`.
- `POST /api/create` with a 3 MB payload in one part → 400 `photo_too_large`.
- `POST /api/create` with total payload > 12 MB → 413.
- `GET /sites/<slug>/manifest.json` after creation → 200 valid JSON.
- `GET /sites/unknown/manifest.json` → 404.

### Manual browser tests

- Desktop Chrome on `localhost`: upload 4 photos via drag-and-drop on `localhost:8787/create` → redirect to the slug URL → cloth runs end-to-end → tear into final page → CTA returns to `/create`.
- iOS Safari: open `/create` on phone → tap photo input → pick 5 from camera roll (HEIC) → upload succeeds → cloth runs in portrait → rotate device → textures swap to landscape mid-tear → simulation continues.
- Desktop browser, resize across portrait↔landscape mid-tear on a slug page: snapshot textures swap to the matching breakpoint set, cloth physics keep going.
- Visit `nonsense-not-real.thiiss.me`: cloth runtime loads, manifest fetch 404s, "site not found" screen renders.
- Visit a slug after TTL expiry (or simulate by writing KV with `expirationTtl: 60` and waiting): same "site not found" path.

### Production smoke test post-deploy

- `curl https://thiiss.me/create` → returns the upload SPA HTML.
- One end-to-end upload from a real browser against the deployed Worker → cloth site loads at the returned URL.
- Same site loaded from a second device (cold cache, different IP) confirms no localhost-only assumptions leak into the served HTML.

## Out of scope — explicit

These are deliberately deferred to a later iteration, not forgotten:

- **Re-edit after create.** Submit-once is the contract.
- **User-chosen slugs.** Random-only.
- **Captions, names, page reorder, theming.**
- **Live HTML on the cloth.** Snapshots only.
- **Content moderation pipeline.** Manual slug-banning is the escape hatch.
- **Accounts, login, multi-site-per-user, custom domains.** That is the long-term v2 in `2026-05-10-cloth-tear-template-design.md`.
- **Background queue + retry.** Snapshot pipeline is synchronous in v1.
- **Load testing, accessibility audit, broad browser matrix.**
