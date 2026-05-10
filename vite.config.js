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
            if (!filePath.startsWith(sitesRoot + path.sep)) {
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
      await cp(sitesRoot, path.join(root, 'dist', 'sites'), { recursive: true })
        .catch((e) => { if (e.code !== 'ENOENT') throw e; });
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
