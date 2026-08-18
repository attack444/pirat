// ======================== Адаптер SDK площадок (VK / Яндекс / Web) ========================
// Единый интерфейс для VK Mini Apps, Yandex Games и обычного веба (PWA / локальный запуск).
// Все методы безопасны: на вебе без SDK они «вырождаются» в локальные/пустые операции.

const LB_NAME = 'pirat2048_top';

function detectHost() {
    const params = new URLSearchParams(location.search);
    const forced = (params.get('platform') || '').toLowerCase();
    if (forced === 'vk') return 'vk';
    if (forced === 'yandex' || forced === 'ya') return 'yandex';

    // VK Mini Apps: мост уже встроен хостом
    if (window.vkBridge || window.VKWebApp) return 'vk';
    if (params.get('vk_app_id') || params.get('vk_platform') || params.get('vk_user_id')) return 'vk';

    // Yandex Games: SDK уже встроен хостом
    if (window.ysdk || window.YaGames) return 'yandex';

    return 'web';
}

// Подгрузка SDK-скриптов для локального предпросмотра (?platform=vk / ?platform=yandex)
function loadScript(src) {
    return new Promise((resolve) => {
        window.__sdkScripts = window.__sdkScripts || {};
        if (window.__sdkScripts[src]) return resolve();
        const s = document.createElement('script');
        s.src = src;
        s.async = true;
        s.onload = () => { window.__sdkScripts[src] = true; resolve(); };
        s.onerror = () => resolve();
        document.head.appendChild(s);
    });
}

// Ограничиваем время инициализации, чтобы игра не «зависала» на загрузочном
// экране, если SDK недоступен (важно для прохождения модерации п.1.1).
function withTimeout(promise, ms = 5000) {
    return new Promise((resolve) => {
        let done = false;
        const timer = setTimeout(() => { if (!done) { done = true; resolve(null); } }, ms);
        const finish = (v) => { if (!done) { done = true; clearTimeout(timer); resolve(v); } };
        try { Promise.resolve(promise).then(finish, () => finish(null)); }
        catch (_) { finish(null); }
    });
}

async function ensureBridge() {
    if (window.vkBridge) return window.vkBridge;
    await loadScript('https://unpkg.com/@vkontakte/vk-bridge/dist/browser.min.js');
    return window.vkBridge || null;
}

async function ensureYaGames() {
    if (window.ysdk) return window.ysdk;
    if (window.YaGames) {
        try { window.ysdk = await withTimeout(window.YaGames.init()); } catch (_) {}
        return window.ysdk || null;
    }
    // Официальная схема подключения SDK Яндекс Игр (п.1.1 требований платформы):
    // https://yandex.ru/dev/games/doc/ru/sdk/sdk-about.html — раздел «Подключение».
    // Относительный /sdk.js проксируется платформой для игр, загруженных архивом
    // на сервер Яндекса (рекомендуемый путь, проверяется модерацией).
    // ВАЖНО (п.1.7): в программном коде нет абсолютных URL на S3-серверы Яндекса.
    if (!window.__yaSdkScriptLoaded) {
        await loadScript('/sdk.js');
        window.__yaSdkScriptLoaded = true;
    }
    if (window.YaGames) {
        try { window.ysdk = await withTimeout(window.YaGames.init()); } catch (_) {}
    }
    return window.ysdk || null;
}

export const sdk = {
    host: 'web',          // 'vk' | 'yandex' | 'web'
    vk: null,
    ya: null,
    player: null,
    lang: null,           // автоопределённый язык (п. 2.14) — из environment.i18n.lang
    initialized: false,

    async init() {
        this.host = detectHost();
        if (this.host === 'vk') {
            this.vk = await ensureBridge();
        } else if (this.host === 'yandex') {
            this.ya = await ensureYaGames();
            if (this.ya) {
                try { this.player = await this.ya.getPlayer({ scopes: false }); } catch (_) {}
            }
        }
        // П. 2.14: автоопределение языка — строго при запуске, не в процессе игры.
        // ysdk.environment.i18n.lang доступен сразу после YaGames.init().
        this.lang = this.ya?.environment?.i18n?.lang || null;
        this.initialized = true;
        return this.host;
    },

    isPlatform() { return this.host === 'vk' || this.host === 'yandex'; },

    // ── Язык (п. 2.14) ─────────────────────────────────────────
    getLang() {
        return this.lang;
    },

    // ── Загрузочный экран (Yandex LoadingAPI) ──────────────────
    setLoadingProgress(p) {
        try {
            if (this.ya?.features?.LoadingAPI?.setLoadingProgress) {
                this.ya.features.LoadingAPI.setLoadingProgress(Math.max(0, Math.min(100, p)));
            }
        } catch (_) {}
    },
    loadingReady() {
        try {
            if (this.ya?.features?.LoadingAPI?.ready) {
                this.ya.features.LoadingAPI.ready();
            }
        } catch (_) {}
    },

    // ── Облачные сохранения ────────────────────────────────────
    // obj — произвольный JSON-сериализуемый объект
    async saveCloud(obj) {
        if (this.host === 'vk' && this.vk) {
            try {
                await this.vk.send('VKWebAppStorageSet', {
                    key: 'pirat2048_save',
                    value: JSON.stringify(obj),
                });
                return true;
            } catch (_) { return false; }
        }
        if (this.host === 'yandex' && this.player) {
            try {
                await this.player.setData({ pirat2048: JSON.stringify(obj) });
                return true;
            } catch (_) { return false; }
        }
        return false;
    },
    async loadCloud() {
        if (this.host === 'vk' && this.vk) {
            try {
                const res = await this.vk.send('VKWebAppStorageGet', { keys: ['pirat2048_save'] });
                const val = res?.keys?.[0]?.value;
                if (!val) return null;
                return JSON.parse(val);
            } catch (_) { return null; }
        }
        if (this.host === 'yandex' && this.player) {
            try {
                const data = await this.player.getData();
                const raw = data?.pirat2048;
                if (!raw) return null;
                return JSON.parse(raw);
            } catch (_) { return null; }
        }
        return null;
    },

    // ── Лидерборды ─────────────────────────────────────────────
    async submitScore(score) {
        if (this.host === 'vk' && this.vk) {
            try {
                await this.vk.send('VKWebAppSaveToLeaderBoard', {
                    level: Math.max(1, Math.floor(score / 10)),
                    score: Math.round(score),
                });
                return true;
            } catch (_) { return false; }
        }
        if (this.host === 'yandex' && this.ya) {
            try {
                const lb = await this.ya.getLeaderboards();
                await lb.setLeaderboardScore(LB_NAME, Math.round(score));
                return true;
            } catch (_) { return false; }
        }
        return false;
    },
    async getLeaderboard() {
        // Возвращает [{ name, score, isMe }] или []
        if (this.host === 'vk' && this.vk) {
            try {
                const res = await this.vk.send('VKWebAppGetLeaderBoard', { user_result_type: 1, global: true });
                const rows = res?.leaderboard || [];
                return rows.map(r => ({
                    name: [r.first_name, r.last_name].filter(Boolean).join(' ') || 'Пират',
                    score: Number(r.score) || 0,
                    isMe: !!r.me,
                })).sort((a, b) => b.score - a.score).slice(0, 50);
            } catch (_) { return []; }
        }
        if (this.host === 'yandex' && this.ya) {
            try {
                const lb = await this.ya.getLeaderboards();
                const res = await lb.getLeaderboardEntries(LB_NAME, { quantityTop: 10, includeUser: true });
                const rows = res?.entries || [];
                const meScore = res?.userScore;
                const list = rows.map(r => ({
                    name: r.player?.publicName || 'Игрок',
                    score: Number(r.score) || 0,
                    isMe: !!meScore && Number(r.score) === Number(meScore),
                }));
                if (meScore !== undefined && meScore !== null && !list.some(x => x.isMe)) {
                    list.push({ name: 'Я', score: Number(meScore), isMe: true });
                    list.sort((a, b) => b.score - a.score);
                }
                return list;
            } catch (_) { return []; }
        }
        return [];
    },

    // ── Реклама ────────────────────────────────────────────────
    // showInterstitial: true — реклама показана (или закрыта)
    async showInterstitial() {
        if (this.host === 'vk' && this.vk) {
            try {
                await this.vk.send('VKWebAppShowNativeAds', { ad_format: 'interstitial' });
                return true;
            } catch (_) { return false; }
        }
        if (this.host === 'yandex' && this.ya?.adv) {
            return new Promise((resolve) => {
                try {
                    this.ya.adv.showFullscreenAdv({
                        callbacks: {
                            onClose: () => resolve(true),
                            onError: () => resolve(false),
                            onOffline: () => resolve(false),
                        },
                    });
                } catch (_) { resolve(false); }
            });
        }
        return false;
    },
    // showRewarded: true — награда получена (ролик досмотрен до конца)
    async showRewarded() {
        if (this.host === 'vk' && this.vk) {
            try {
                await this.vk.send('VKWebAppShowNativeAds', { ad_format: 'reward' });
                return true;
            } catch (_) { return false; }
        }
        if (this.host === 'yandex' && this.ya?.adv) {
            return new Promise((resolve) => {
                let rewarded = false;
                try {
                    this.ya.adv.showRewardedVideo({
                        callbacks: {
                            onRewarded: () => { rewarded = true; },
                            onClose: () => resolve(rewarded),
                            onError: () => resolve(false),
                        },
                    });
                } catch (_) { resolve(false); }
            });
        }
        return false;
    },

    // ── Поделиться ─────────────────────────────────────────────
    // Возвращает true, если действие выполнено (диалог/копирование)
    async share(text, link) {
        const url = link || location.href;
        if (this.host === 'vk' && this.vk) {
            try {
                await this.vk.send('VKWebAppShare', { link: url });
                return true;
            } catch (_) {}
            try {
                await this.vk.send('VKWebAppShowWallPostBox', { message: text });
                return true;
            } catch (_) { return false; }
        }
        // Яндекс / веб: Web Share API, иначе копируем ссылку
        if (navigator.share) {
            try { await navigator.share({ text, url }); return true; } catch (_) { return false; }
        }
        if (navigator.clipboard) {
            try { await navigator.clipboard.writeText(url); return true; } catch (_) {}
        }
        return false;
    },
};

export default sdk;
