import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4'
};

function serveLegacyStatic() {
  const rootDir = path.resolve(__dirname, '..');
  return {
    name: 'serve-legacy-static',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const rawUrl = req.url || '';
        const pathname = rawUrl.split('?')[0];
        // The old static files (the remaining .html pages, images, db.js ...). The login page is
        // no longer one of them: /index.html is the React landing page now (see AppRoutes).
        if (/^\/(pages|images|assets|css|data|js|games|vendor)\//.test(pathname)) {
          const filePath = path.join(rootDir, decodeURIComponent(pathname));
          if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            const ext = path.extname(filePath).toLowerCase();
            const mime = mimeTypes[ext] || 'application/octet-stream';
            res.setHeader('Content-Type', mime);
            return fs.createReadStream(filePath).pipe(res);
          }
        }
        next();
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), serveLegacyStatic()],
  server: {
    port: 5173,
    fs: {
      allow: ['..']
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true
      }
    }
  }
});
