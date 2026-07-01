/**
 * @file src/service-worker.ts
 * @description Workbox service worker — spec 5.12.
 *
 * Strategy: injectManifest (configured in vite.config.ts).
 * This means Vite injects the precache manifest at build time via
 * `self.__WB_MANIFEST`, and ALL runtime caching logic is written here
 * manually — the `workbox.runtimeCaching` array in vite.config.ts is
 * NOT used by injectManifest strategy (that's only for generateSW).
 *
 * Caching rules (spec 5.12):
 *   1. Precache all static assets (JS, CSS, fonts, icons) — automatic via __WB_MANIFEST
 *   2. Cache-first: GET /api/v1/prescriptions          (prescription list + downloads)
 *   3. Cache-first: GET /api/v1/consultations/history   (last 20 items, patient history)
 *   4. Network-first: all other /api/v1/* calls (auth, live queue, SOS — must be fresh)
 *
 * Cache-first = serve from cache immediately if present, update cache in background.
 * Network-first = try network first, fall back to cache if offline (with timeout).
 */

/// <reference lib="webworker" />
export {};
declare const self: ServiceWorkerGlobalScope;

import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

// ── 1. Precache all build-time static assets ──────────────────────────────
// self.__WB_MANIFEST is injected by vite-plugin-pwa at build time —
// it's a list of every hashed JS/CSS/font/icon file Vite produced.
precacheAndRoute(self.__WB_MANIFEST);

// Remove caches from previous service worker versions on activation
cleanupOutdatedCaches();

// ── 2. Cache-first: prescriptions ──────────────────────────────────────────
// Patients need to view/download past prescriptions even with no signal.
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/v1/prescriptions'),
  new CacheFirst({
    cacheName: 'prescriptions-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries:    50,
        maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
        purgeOnQuotaError: true,
      }),
    ],
  })
);

// ── 3. Cache-first: consultation history (last 20 items) ──────────────────
registerRoute(
  ({ url }) => url.pathname === '/api/v1/consultations/history',
  new CacheFirst({
    cacheName: 'consultation-history-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries:    20,
        maxAgeSeconds: 60 * 60 * 24, // 24 hours
        purgeOnQuotaError: true,
      }),
    ],
  })
);

// ── 4. Network-first: everything else under /api/v1/ ──────────────────────
// Covers: /auth/*, /consultations (live queue), /emergency/sos, /doctors, etc.
// These must always try the network first since they're time-sensitive —
// only fall back to cache if the network genuinely fails (offline).
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/v1/'),
  new NetworkFirst({
    cacheName: 'api-network-first-cache',
    networkTimeoutSeconds: 10,
    plugins: [
      new ExpirationPlugin({
        maxEntries:    100,
        maxAgeSeconds: 60 * 5, // 5 minutes
        purgeOnQuotaError: true,
      }),
    ],
  })
);

// ── 5. Activate immediately — don't wait for old tabs to close ────────────
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});
