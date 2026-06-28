// Workbox service worker — full implementation in Step 7
/// <reference lib="webworker" />
export {};
declare const self: ServiceWorkerGlobalScope;
self.addEventListener('install', () => self.skipWaiting());
