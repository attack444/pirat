// ======================== Service Worker — Пиратская 2048 ========================
// Версию кэша меняй при каждом релизе (принудительно обновит файлы у пользователей)
const CACHE = 'pirate-2048-v3';

const ASSETS = [
    './',
    './index.html',
    './css/styles.css',
    './js/main.js',
    './js/game.js',
    './js/platform.js',
    './js/sound.js',
    './js/platform-sdk.js',
    './js/progress.js',
    './js/cloud-sync.js',
    './js/rewards.js',
    './js/combo.js',
    './js/levels.js',
    './js/achievements.js',
    './js/daily.js',
    './manifest.json',
    './icons/icon.svg',
    './icons/icon-192.png',
    './icons/icon-512.png',
    './icons/apple-touch-icon.png',
];

// ── Установка: кэшируем все статические файлы ──────────────
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE)
            .then((cache) => cache.addAll(ASSETS))
            .then(() => self.skipWaiting())
    );
});

// ── Активация: удаляем устаревшие кэши ─────────────────────
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(
                keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))
            ))
            .then(() => self.clients.claim())
    );
});

// ── Fetch: сначала кэш, потом сеть ─────────────────────────
self.addEventListener('fetch', (event) => {
    // Только GET-запросы, не трогаем chrome-extension и прочее
    if (event.request.method !== 'GET') return;
    if (!event.request.url.startsWith('http')) return;

    // Privacy Policy НЕ кэшируем: всегда network-first (юридический документ
    // должен быть актуальным; при офлайне — фолбэк на кэш)
    if (event.request.url.includes('privacy-policy')) {
        event.respondWith(
            fetch(event.request).catch(() => caches.match(event.request))
        );
        return;
    }

    event.respondWith(
        caches.match(event.request).then((cached) => {
            if (cached) return cached;

            return fetch(event.request).then((response) => {
                // Кэшируем только успешные ответы нашего origin
                if (response && response.status === 200 && response.type === 'basic') {
                    const clone = response.clone();
                    caches.open(CACHE).then((cache) => cache.put(event.request, clone));
                }
                return response;
            }).catch(() => {
                // Офлайн-фолбэк: возвращаем index.html для навигации
                if (event.request.mode === 'navigate') {
                    return caches.match('./index.html');
                }
            });
        })
    );
});
