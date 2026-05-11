import { defineConfig } from 'vite';
import path from 'node:path';
import { rename, rm } from 'node:fs/promises';

const __dirname = import.meta.dirname;

export default defineConfig({
  publicDir: false,
  build: {
    outDir: 'dist-thiiss',
    emptyOutDir: true,
    target: 'es2020',
    minify: 'terser',
    terserOptions: {
      mangle: true,
      compress: { drop_console: true },
      format: { comments: false },
    },
    sourcemap: false,
    rollupOptions: {
      input: {
        index: path.resolve(__dirname, 'index.html'),
        create: path.resolve(__dirname, 'src/create/create.html'),
      },
    },
  },
  plugins: [
    {
      name: 'flatten-create',
      apply: 'build',
      async closeBundle() {
        const from = path.resolve(__dirname, 'dist-thiiss/src/create/create.html');
        const to = path.resolve(__dirname, 'dist-thiiss/create.html');
        await rename(from, to).catch(() => {});
        await rm(path.resolve(__dirname, 'dist-thiiss/src'), { recursive: true, force: true });
      },
    },
  ],
});
