// 1. Change this version number every time you push an update to GitHub!
const CACHE_NAME = 'blok-cache-v14.6';

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
    './assets/rain.mp3'
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

// --- FETCH EVENT: The Bulletproof Offline Engine ---
self.addEventListener('fetch', (event) => {
    event.respondWith(
        // 1. Look in the vault, but IGNORE secret browser tracking parameters
        caches.match(event.request, { ignoreSearch: true })
            .then((cachedResponse) => {
                // If we found it in the vault, serve it instantly!
                if (cachedResponse) {
                    return cachedResponse;
                }
                
                // 2. If it's NOT in the vault, try to get it from the network
                return fetch(event.request).catch(() => {
                    // 🛑 3. THE ULTIMATE SAFETY NET 🛑
                    // If the network is completely dead (Live Server closed) 
                    // and the app is just trying to open the main page, force it to load the UI!
                    if (event.request.mode === 'navigate' || event.request.headers.get('accept').includes('text/html')) {
                        return caches.match('./index.html');
                    }
                });
            })
    );
});

// --- NEW: Allow the UI Toast to force an immediate update ---
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});