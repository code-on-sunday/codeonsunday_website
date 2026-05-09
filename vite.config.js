import { defineConfig } from 'vite';

export default defineConfig({
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
