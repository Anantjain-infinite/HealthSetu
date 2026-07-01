import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Service worker source is injected by workbox at build time
      injectRegister: 'auto',
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'service-worker.ts',
      manifest: {
        name: 'HealthSetu — Rural Telemedicine',
        short_name: 'HealthSetu',
        description: 'Connect with doctors from anywhere in rural India',
        theme_color: '#0ea5e9',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
      workbox: {
        // Glob patterns of files to precache — this list IS used by
        // injectManifest to build self.__WB_MANIFEST in service-worker.ts.
        // NOTE: runtimeCaching here would be IGNORED under the
        // 'injectManifest' strategy — all runtime caching logic
        // (cache-first prescriptions/history, network-first everything
        // else) is written by hand in src/service-worker.ts instead.
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true, // Expose dev server on local network (e.g. http://192.168.x.x:5173)
    // Proxy API calls to the backend during local development
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        ws: true, // Enable WebSocket proxying
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    // Improve chunk splitting for better caching
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunk — large stable libraries
          vendor: ['react', 'react-dom', 'react-router-dom'],
          query: ['@tanstack/react-query'],
          tiptap: ['@tiptap/react', '@tiptap/starter-kit'],
        },
      },
    },
  },
});
