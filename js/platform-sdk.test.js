/**
 * Unit tests for the SDK adapter (platform-sdk.js).
 * Stubs window / location / document / navigator — no browser required.
 * Each test gets a fresh sdk instance (Object.create) so the shared singleton
 * is never polluted between tests.
 */
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// ── Global stubs ─────────────────────────────────────────────────────────
// loadScript() appends a <script> and resolves on onload — fire it synchronously
// so the "load SDK script for local preview" path cannot hang.
globalThis.document = {
    createElement() {
        return { src: '', async: false, onload: null, onerror: null };
    },
    head: {
        appendChild(el) {
            if (typeof el.onload === 'function') el.onload();
            else if (typeof el.onerror === 'function') el.onerror();
        },
    },
};

function setSearch(search) {
    globalThis.location = { search, href: 'https://pirat.example/game' };
}

function setWindow(win) {
    globalThis.window = win || {};
}

function setNavigator(nav) {
    Object.defineProperty(globalThis, 'navigator', {
        value: nav || {},
        configurable: true,
        writable: true,
    });
}

// Load the module once; per-test fresh copies via prototype chain.
const sdk = (await import('./platform-sdk.js')).default;

function makeSdk() {
    return Object.assign(Object.create(sdk), {
        host: 'web',
        vk: null,
        ya: null,
        player: null,
        initialized: false,
    });
}

beforeEach(() => {
    setSearch('');
    setWindow({});
    setNavigator({});
});

// ── Host detection / init ────────────────────────────────────────────────
describe('sdk.init / host detection', () => {
    it('defaults to web when no SDK and no forced platform', async () => {
        const s = makeSdk();
        assert.equal(await s.init(), 'web');
        assert.equal(s.initialized, true);
        assert.equal(s.isPlatform(), false);
    });

    it('forces vk via ?platform=vk', async () => {
        setSearch('?platform=vk');
        setWindow({ vkBridge: { send: async () => {} } });
        const s = makeSdk();
        assert.equal(await s.init(), 'vk');
        assert.equal(s.host, 'vk');
        assert.ok(s.vk, 'vk bridge should be attached');
        assert.equal(s.isPlatform(), true);
    });

    it('detects vk from window.vkBridge without a forced param', async () => {
        setWindow({ vkBridge: { send: async () => {} } });
        const s = makeSdk();
        assert.equal(await s.init(), 'vk');
    });

    it('detects vk from ?vk_user_id', async () => {
        setSearch('?vk_user_id=123');
        const s = makeSdk();
        assert.equal(await s.init(), 'vk');
        // no bridge present — host is vk, but vk stays null
        assert.equal(s.vk, null);
    });

    it('forces yandex via ?platform=yandex', async () => {
        setSearch('?platform=yandex');
        setWindow({ ysdk: { getPlayer: async () => ({}) } });
        const s = makeSdk();
        assert.equal(await s.init(), 'yandex');
        assert.equal(s.host, 'yandex');
        assert.ok(s.ya);
        assert.equal(s.isPlatform(), true);
    });

    it('accepts ?platform=ya as a yandex alias', async () => {
        setSearch('?platform=ya');
        setWindow({ ysdk: { getPlayer: async () => ({}) } });
        const s = makeSdk();
        assert.equal(await s.init(), 'yandex');
    });

    it('detects yandex from window.ysdk and inits the player', async () => {
        setWindow({ ysdk: { getPlayer: async () => ({ name: 'Пират' }) } });
        const s = makeSdk();
        assert.equal(await s.init(), 'yandex');
        assert.deepEqual(s.player, { name: 'Пират' });
    });
});

// ── Yandex SDK connection path (модерация п.1.1 требований) ──────────────
describe('sdk Yandex connection path', () => {
    it('initializes via window.YaGames.init() when the SDK script is present', async () => {
        setSearch('?platform=yandex');
        let initCalls = 0;
        setWindow({
            YaGames: {
                init: async () => { initCalls++; return { features: { LoadingAPI: {} } }; },
            },
        });
        const s = makeSdk();
        assert.equal(await s.init(), 'yandex');
        assert.equal(initCalls, 1);
        assert.ok(s.ya, 'sdk.ya should hold the YaGames.init() result');
    });

    it('loads only the official relative /sdk.js (п. 1.7: без URL на S3-серверы)', async () => {
        setSearch('?platform=yandex');
        setWindow({});
        const srcs = [];
        const origCreate = globalThis.document.createElement;
        globalThis.document.createElement = (tag) => {
            const el = origCreate(tag);
            let _src = '';
            Object.defineProperty(el, 'src', {
                get() { return _src; },
                set(v) { _src = v; srcs.push(v); },
                configurable: true,
            });
            return el;
        };
        try {
            const s = makeSdk();
            assert.equal(await s.init(), 'yandex');
            assert.deepEqual(srcs, ['/sdk.js'], 'подключается только относительный /sdk.js');
            assert.ok(srcs.every((src) => !/s3[.-]/.test(src) && !src.includes('yandex.net')),
                'в коде не должно быть абсолютных URL на S3-серверы Яндекса');
        } finally {
            globalThis.document.createElement = origCreate;
        }
    });

    it('detects the user language at startup (п. 2.14)', async () => {
        setSearch('?platform=yandex');
        setWindow({
            ysdk: {
                getPlayer: async () => ({}),
                environment: { i18n: { lang: 'ru' } },
            },
        });
        const s = makeSdk();
        assert.equal(await s.init(), 'yandex');
        assert.equal(s.getLang(), 'ru');
    });

    it('returns null language when SDK has no i18n environment', async () => {
        setSearch('?platform=yandex');
        setWindow({ ysdk: { getPlayer: async () => ({}) } });
        const s = makeSdk();
        assert.equal(await s.init(), 'yandex');
        assert.equal(s.getLang(), null);
    });

    it('does not hang when YaGames.init() never resolves (timeout guard)', async () => {
        setSearch('?platform=yandex');
        setWindow({ YaGames: { init: () => new Promise(() => {}) } });
        const s = makeSdk();
        const start = Date.now();
        const host = await s.init();
        assert.equal(host, 'yandex');
        assert.equal(s.ya, null);
        assert.ok(Date.now() - start < 10000, 'should resolve well before the 5s timeout');
    });
});

// ── Cloud saves ──────────────────────────────────────────────────────────
describe('sdk.saveCloud / loadCloud', () => {
    it('saves to VK storage and returns true', async () => {
        const s = makeSdk();
        s.host = 'vk';
        const sent = [];
        s.vk = { send: async (method, params) => { sent.push([method, params]); return {}; } };
        assert.equal(await s.saveCloud({ score: 42 }), true);
        assert.equal(sent.length, 1);
        assert.equal(sent[0][0], 'VKWebAppStorageSet');
        assert.equal(sent[0][1].key, 'pirat2048_save');
        assert.equal(sent[0][1].value, JSON.stringify({ score: 42 }));
    });

    it('returns false when the VK save throws', async () => {
        const s = makeSdk();
        s.host = 'vk';
        s.vk = { send: async () => { throw new Error('denied'); } };
        assert.equal(await s.saveCloud({ a: 1 }), false);
    });

    it('loads and parses a VK cloud save', async () => {
        const s = makeSdk();
        s.host = 'vk';
        s.vk = {
            send: async () => ({ keys: [{ key: 'pirat2048_save', value: '{"score":7}' }] }),
        };
        assert.deepEqual(await s.loadCloud(), { score: 7 });
    });

    it('returns null for an empty VK save', async () => {
        const s = makeSdk();
        s.host = 'vk';
        s.vk = { send: async () => ({ keys: [{ value: '' }] }) };
        assert.equal(await s.loadCloud(), null);
    });

    it('returns null when the VK storage read fails', async () => {
        const s = makeSdk();
        s.host = 'vk';
        s.vk = { send: async () => { throw new Error('boom'); } };
        assert.equal(await s.loadCloud(), null);
    });

    it('saves to Yandex player data', async () => {
        const s = makeSdk();
        s.host = 'yandex';
        let saved = null;
        s.player = { setData: async (data) => { saved = data; } };
        assert.equal(await s.saveCloud({ a: 1 }), true);
        assert.deepEqual(saved, { pirat2048: '{"a":1}' });
    });

    it('loads Yandex player data', async () => {
        const s = makeSdk();
        s.host = 'yandex';
        s.player = { getData: async () => ({ pirat2048: '{"level":3}' }) };
        assert.deepEqual(await s.loadCloud(), { level: 3 });
    });

    it('returns null on invalid Yandex JSON', async () => {
        const s = makeSdk();
        s.host = 'yandex';
        s.player = { getData: async () => ({ pirat2048: 'not-json' }) };
        assert.equal(await s.loadCloud(), null);
    });

    it('is a no-op on web', async () => {
        const s = makeSdk();
        s.host = 'web';
        assert.equal(await s.saveCloud({ a: 1 }), false);
        assert.equal(await s.loadCloud(), null);
    });
});

// ── Leaderboards ─────────────────────────────────────────────────────────
describe('sdk.submitScore / getLeaderboard', () => {
    it('submits to VK with level = floor(score / 10)', async () => {
        const s = makeSdk();
        s.host = 'vk';
        const sent = [];
        s.vk = { send: async (m, p) => { sent.push([m, p]); return {}; } };
        assert.equal(await s.submitScore(1000), true);
        assert.deepEqual(sent[0], ['VKWebAppSaveToLeaderBoard', { level: 100, score: 1000 }]);
    });

    it('keeps the VK level at minimum 1 for tiny scores', async () => {
        const s = makeSdk();
        s.host = 'vk';
        const sent = [];
        s.vk = { send: async (m, p) => { sent.push([m, p]); return {}; } };
        await s.submitScore(5);
        assert.equal(sent[0][1].level, 1);
    });

    it('submits to the Yandex leaderboard', async () => {
        const s = makeSdk();
        s.host = 'yandex';
        const calls = [];
        s.ya = {
            getLeaderboards: async () => ({
                setLeaderboardScore: async (name, score) => calls.push([name, score]),
            }),
        };
        assert.equal(await s.submitScore(500), true);
        assert.deepEqual(calls, [['pirat2048_top', 500]]);
    });

    it('returns false when the leaderboard submission fails', async () => {
        const s = makeSdk();
        s.host = 'vk';
        s.vk = { send: async () => { throw new Error('x'); } };
        assert.equal(await s.submitScore(10), false);
    });

    it('maps VK leaderboard rows', async () => {
        const s = makeSdk();
        s.host = 'vk';
        s.vk = {
            send: async () => ({
                leaderboard: [
                    { first_name: 'Иван', last_name: 'П', score: '500', me: false },
                    { first_name: '', last_name: '', score: '300', me: true },
                ],
            }),
        };
        const lb = await s.getLeaderboard();
        assert.deepEqual(lb, [
            { name: 'Иван П', score: 500, isMe: false },
            { name: 'Пират', score: 300, isMe: true },
        ]);
    });

    it('parses the Yandex leaderboard and marks my row', async () => {
        const s = makeSdk();
        s.host = 'yandex';
        s.ya = {
            getLeaderboards: async () => ({
                getLeaderboardEntries: async () => ({
                    entries: [
                        { player: { publicName: 'Пират' }, score: 300 },
                        { player: { publicName: 'Игрок' }, score: 200 },
                    ],
                    userScore: 200,
                }),
            }),
        };
        const lb = await s.getLeaderboard();
        assert.deepEqual(lb, [
            { name: 'Пират', score: 300, isMe: false },
            { name: 'Игрок', score: 200, isMe: true },
        ]);
    });

    it('appends the user row when absent from the Yandex top', async () => {
        const s = makeSdk();
        s.host = 'yandex';
        s.ya = {
            getLeaderboards: async () => ({
                getLeaderboardEntries: async () => ({
                    entries: [{ player: { publicName: 'X' }, score: 50 }],
                    userScore: 999,
                }),
            }),
        };
        const lb = await s.getLeaderboard();
        assert.deepEqual(lb, [
            { name: 'Я', score: 999, isMe: true },
            { name: 'X', score: 50, isMe: false },
        ]);
    });

    it('returns an empty list on web', async () => {
        const s = makeSdk();
        s.host = 'web';
        assert.deepEqual(await s.getLeaderboard(), []);
    });
});

// ── Interstitial ads ─────────────────────────────────────────────────────
describe('sdk.showInterstitial', () => {
    it('shows a VK native interstitial', async () => {
        const s = makeSdk();
        s.host = 'vk';
        const sent = [];
        s.vk = { send: async (m, p) => { sent.push([m, p]); return {}; } };
        assert.equal(await s.showInterstitial(), true);
        assert.deepEqual(sent[0], ['VKWebAppShowNativeAds', { ad_format: 'interstitial' }]);
    });

    it('shows a Yandex fullscreen and resolves true on close', async () => {
        const s = makeSdk();
        s.host = 'yandex';
        let callbacks = null;
        s.ya = { adv: { showFullscreenAdv(opts) { callbacks = opts.callbacks; } } };
        const promise = s.showInterstitial();
        callbacks.onClose();
        assert.equal(await promise, true);
    });

    it('resolves false when the Yandex fullscreen errors', async () => {
        const s = makeSdk();
        s.host = 'yandex';
        let callbacks = null;
        s.ya = { adv: { showFullscreenAdv(opts) { callbacks = opts.callbacks; } } };
        const promise = s.showInterstitial();
        callbacks.onError();
        assert.equal(await promise, false);
    });

    it('resolves false on web', async () => {
        const s = makeSdk();
        s.host = 'web';
        assert.equal(await s.showInterstitial(), false);
    });
});

// ── Rewarded ads ─────────────────────────────────────────────────────────
describe('sdk.showRewarded', () => {
    it('grants a reward only after the Yandex onRewarded callback', async () => {
        const s = makeSdk();
        s.host = 'yandex';
        let callbacks = null;
        s.ya = { adv: { showRewardedVideo(opts) { callbacks = opts.callbacks; } } };
        const promise = s.showRewarded();
        callbacks.onRewarded();
        callbacks.onClose();
        assert.equal(await promise, true);
    });

    it('does not grant a reward when the user closes early', async () => {
        const s = makeSdk();
        s.host = 'yandex';
        let callbacks = null;
        s.ya = { adv: { showRewardedVideo(opts) { callbacks = opts.callbacks; } } };
        const promise = s.showRewarded();
        callbacks.onClose();
        assert.equal(await promise, false);
    });

    it('shows a VK reward ad', async () => {
        const s = makeSdk();
        s.host = 'vk';
        const sent = [];
        s.vk = { send: async (m, p) => { sent.push([m, p]); return {}; } };
        assert.equal(await s.showRewarded(), true);
        assert.deepEqual(sent[0], ['VKWebAppShowNativeAds', { ad_format: 'reward' }]);
    });
});

// ── Yandex Loading API ───────────────────────────────────────────────────
describe('sdk loading API', () => {
    it('clamps progress to 0..100 and forwards to the Yandex LoadingAPI', () => {
        const s = makeSdk();
        const values = [];
        s.ya = {
            features: {
                LoadingAPI: {
                    setLoadingProgress: (v) => values.push(v),
                    ready: () => {},
                },
            },
        };
        s.setLoadingProgress(150);
        s.setLoadingProgress(-5);
        s.setLoadingProgress(42);
        assert.deepEqual(values, [100, 0, 42]);
    });

    it('calls ready() on the Yandex LoadingAPI', () => {
        const s = makeSdk();
        let readyCalled = 0;
        s.ya = {
            features: {
                LoadingAPI: {
                    setLoadingProgress: () => {},
                    ready: () => { readyCalled++; },
                },
            },
        };
        s.loadingReady();
        assert.equal(readyCalled, 1);
    });

    it('is safe without the Yandex SDK', () => {
        const s = makeSdk();
        assert.doesNotThrow(() => s.setLoadingProgress(50));
        assert.doesNotThrow(() => s.loadingReady());
    });
});

// ── Share ────────────────────────────────────────────────────────────────
describe('sdk.share', () => {
    it('uses the Web Share API when available', async () => {
        setNavigator({ share: async () => {}, clipboard: {} });
        const s = makeSdk();
        s.host = 'web';
        let shared = null;
        globalThis.navigator.share = async (data) => { shared = data; };
        assert.equal(await s.share('text', 'https://x.test/'), true);
        assert.deepEqual(shared, { text: 'text', url: 'https://x.test/' });
    });

    it('falls back to copying the link on web', async () => {
        setNavigator({ clipboard: {} });
        const s = makeSdk();
        s.host = 'web';
        let copied = '';
        globalThis.navigator.clipboard.writeText = async (t) => { copied = t; };
        assert.equal(await s.share('text', 'https://x.test/'), true);
        assert.equal(copied, 'https://x.test/');
    });

    it('uses location.href when the link is omitted', async () => {
        setSearch('?x=1');
        setNavigator({ clipboard: {} });
        const s = makeSdk();
        s.host = 'web';
        let copied = '';
        globalThis.navigator.clipboard.writeText = async (t) => { copied = t; };
        assert.equal(await s.share('text'), true);
        assert.equal(copied, 'https://pirat.example/game');
    });

    it('returns false when the user cancels the Web Share dialog', async () => {
        setNavigator({ share: async () => { throw new Error('AbortError'); }, clipboard: {} });
        const s = makeSdk();
        s.host = 'web';
        assert.equal(await s.share('text', 'https://x.test/'), false);
    });

    it('returns false when nothing is available', async () => {
        setNavigator({});
        const s = makeSdk();
        s.host = 'web';
        assert.equal(await s.share('text', 'https://x.test/'), false);
    });
});
