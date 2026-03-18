import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'fs'
import path from 'path'

function servePublicSubdirs(): import('vite').Plugin {
  return {
    name: 'serve-public-subdirs',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.startsWith('/slides/') && req.url.endsWith('/')) {
          const filePath = path.join(process.cwd(), 'public', req.url, 'index.html')
          if (fs.existsSync(filePath)) {
            res.setHeader('Content-Type', 'text/html')
            fs.createReadStream(filePath).pipe(res)
            return
          }
        }
        next()
      })
    },
  }
}

export default defineConfig({
  plugins: [servePublicSubdirs(), react(), tailwindcss()],
})
