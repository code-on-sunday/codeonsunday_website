// scripts/seed-test-slug.mjs
//
// Seeds the wrangler-dev KV + R2 persistent stores with a `test-slug` site
// built from the existing sites/trung/snapshots PNG set.
//
// Usage: node scripts/seed-test-slug.mjs
// Prereq: run `npx wrangler dev --config wrangler.thiiss.jsonc --persist-to .wrangler/state`
//         in another terminal at least once so the storage dirs exist.

import { execSync } from 'node:child_process';
import path from 'node:path';

const SLUG = 'test-slug';
const SITE = 'trung';
const PAGES = [
  '01-hello', '02-hanoi', '03-badminton', '04-grew-up',
  '05-side-projects', '06-3-lines', '07-real-people',
];
// The final page (08-friends) is served live, not from R2, so it isn't seeded.

const manifest = {
  title: 'test slug — seeded from trung snapshots',
  pages: [
    ...PAGES.map((base) => ({ html: `pages/${base}.html` })),
    { html: 'pages/08-final.html', final: true },
  ],
};

function wrangler(args) {
  execSync(`npx wrangler ${args}`, { stdio: 'inherit' });
}

async function main() {
  // KV manifest
  wrangler(
    `kv key put --binding=KV_MANIFESTS --config=wrangler.thiiss.jsonc --local --persist-to=.wrangler/state ${SLUG} '${JSON.stringify(manifest)}'`
  );

  // R2 snapshots
  for (const base of PAGES) {
    for (const orient of ['portrait', 'landscape']) {
      const local = path.resolve(`sites/${SITE}/snapshots/${base}.${orient}.png`);
      const r2Key = `snapshots/${SLUG}/${base}.${orient}.png`;
      wrangler(
        `r2 object put thiiss-blobs/${r2Key} --file=${local} --config=wrangler.thiiss.jsonc --local --persist-to=.wrangler/state`
      );
    }
  }
  console.log(`seeded test-slug. visit http://test-slug.thiiss-me.workers.local:8787/`);
}

main().catch((err) => { console.error(err); process.exit(1); });
