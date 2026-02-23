// 1. Change this version number every time you push an update to GitHub!
const CACHE_NAME = 'blok-cache-v15.3';

// 2. The exact list of files needed for offline mode
// Note: We use './' (relative paths) so it works perfectly on GitHub Pages
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './manifest.json',
    
    // CSS
    './css/variables.css',
    './css/reset.css',
    './css/main.css',
    './css/components.css',
    './css/animations.css',
    
    // JavaScript
    './js/config.js',
    './js/theme.js',
    './js/sound.js',
    './js/storage.js',
    './js/utils.js',
    './js/journal.js',
    './js/ui.js',
    './js/timer.js',
    './js/stopwatch.js',
    './js/app.js',
    
    // Media & Icons
    './assets/favicon.svg',
    './assets/icon-192.png',  // <-- ADD THIS LINE
    './assets/icon-512.png',  // <-- ADD THIS LINE
    './assets/rain.mp3',

    // Fonts (Local)
    './assets/fonts/inter-v20-latin-regular.woff2',
    './assets/fonts/inter-v20-latin-500.woff2',
    './assets/fonts/inter-v20-latin-600.woff2',
    './assets/fonts/jetbrains-mono-v24-latin-regular.woff2',
    './assets/fonts/jetbrains-mono-v24-latin-500.woff2',
    './assets/fonts/jetbrains-mono-v24-latin-700.woff2'
];

// --- INSTALL EVENT: Download everything into the Vault ---
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[Service Worker] Caching all assets');
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .then(() => self.skipWaiting()) // Instantly prepare the new worker
    );
});

// --- ACTIVATE EVENT: Delete the old Vaults ---
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[Service Worker] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    return self.clients.claim(); // Take control of all open tabs immediately
});

// --- FETCH EVENT: Instant Boot (Stale-While-Revalidate) ---
self.addEventListener('fetch', (event) => {
    // Only handle standard GET requests
    if (event.request.method !== 'GET') return;

    event.respondWith(
        caches.match(event.request, { ignoreSearch: true }).then((cachedResponse) => {
            
            // 1. The Background Internet Check
            const fetchPromise = fetch(event.request).then((networkResponse) => {
                // Secretly update the vault in the background for next time
                if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
                }
                return networkResponse;
            }).catch(() => {
                // Network failed, do nothing (they are offline)
            });

            // 2. INSTANT BOOT: Return the cached version immediately if we have it!
            // Only wait for the network if this is the absolute first time they opened the app.
            return cachedResponse || fetchPromise;
        })
    );
});

// --- NEW: Allow the UI Toast to force an immediate update ---
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});