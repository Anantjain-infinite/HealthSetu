/**
 * @file src/main.tsx
 * @description React application entry point.
 * Mounts the React tree with all required providers:
 *   - QueryClientProvider (TanStack Query)
 *   - BrowserRouter (React Router)
 *   - Toaster (react-hot-toast)
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast';
import { registerSW } from 'virtual:pwa-register';
import { queryClient } from './shared/lib/queryClient';
import App from './App';
import './index.css';

// ── Register the Workbox service worker (spec 5.12) ────────────────────────
// `virtual:pwa-register` is a module vite-plugin-pwa generates at build time
// that wraps navigator.serviceWorker.register() with update-detection hooks.
// Only runs in production builds and on secure contexts (HTTPS or localhost) —
// silently does nothing in dev unless devOptions.enabled is set.
if ('serviceWorker' in navigator) {
  registerSW({
    immediate: true,
    onNeedRefresh() {
      // A new version of the app was installed — prompt the user to reload.
      toast(
        (t) => (
          <span className="flex items-center gap-3">
            New version available.
            <button
              onClick={() => {
                window.location.reload();
                toast.dismiss(t.id);
              }}
              className="px-2 py-1 text-xs font-semibold bg-primary-600 text-white rounded-md hover:bg-primary-700"
            >
              Reload
            </button>
          </span>
        ),
        { duration: 10000, id: 'sw-update' }
      );
    },
    onOfflineReady() {
      toast.success('App ready to work offline.', { id: 'sw-offline-ready' });
    },
    onRegisterError(error: unknown) {
      // Log only — never block the app if SW registration fails
      // eslint-disable-next-line no-console
      console.error('Service worker registration failed:', error);
    },
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element #root not found in index.html');

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              borderRadius: '10px',
              fontSize:     '14px',
              maxWidth:     '380px',
            },
            success: { iconTheme: { primary: '#22c55e', secondary: '#fff' } },
            error:   { iconTheme: { primary: '#f43f5e', secondary: '#fff' } },
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>
);
