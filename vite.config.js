import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  plugins: [
    {
      name: 'dev-rewrite',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url === '/' || req.url === '/index.html' || req.url?.startsWith('/index.html?')) {
            req.url = req.url.replace('/index.html', '/index.source.html');
            if (req.url === '/') req.url = '/index.source.html';
          }
          next();
        });
      }
    }
  ],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      input: {
        main: './index.source.html'
      }
    }
  }
});
