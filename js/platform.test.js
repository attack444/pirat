/**
 * Unit tests for platform detection (query override / native markers).
 */
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { detectPlatform } from './platform.js';

describe('detectPlatform', () => {
    const original = {
        search: globalThis.location?.search,
        Capacitor: globalThis.Capacitor,
        __cap: globalThis.__cap,
        body: globalThis.document?.body,
    };

    beforeEach(() => {
        globalThis.location = { search: '' };
        globalThis.window = globalThis;
        globalThis.Capacitor = undefined;
        globalThis.__cap = undefined;
        globalThis.document = {
            body: {
                dataset: {},
                classList: { contains: () => false },
            },
        };
    });

    afterEach(() => {
        if (original.search !== undefined) {
            globalThis.location = { search: original.search };
        }
        globalThis.Capacitor = original.Capacitor;
        globalThis.__cap = original.__cap;
    });

    it('honors ?platform=ios|android|web', () => {
        globalThis.location.search = '?platform=ios';
        assert.deepEqual(detectPlatform(), { name: 'ios', isNative: true, isWeb: false });

        globalThis.location.search = '?platform=android';
        assert.deepEqual(detectPlatform(), { name: 'android', isNative: true, isWeb: false });

        globalThis.location.search = '?platform=web';
        assert.deepEqual(detectPlatform(), { name: 'web', isNative: false, isWeb: true });
    });

    it('detects Capacitor native platform', () => {
        globalThis.location.search = '';
        globalThis.Capacitor = {
            isNativePlatform: () => true,
            getPlatform: () => 'ios',
        };
        assert.deepEqual(detectPlatform(), { name: 'ios', isNative: true, isWeb: false });
    });

    it('falls back to web', () => {
        globalThis.location.search = '';
        assert.deepEqual(detectPlatform(), { name: 'web', isNative: false, isWeb: true });
    });
});
