/**
 * Unit tests for level unlock / persistence (Node built-in test runner).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    LEVELS,
    STORAGE_KEY,
    defaultState,
    normalizeState,
    loadState,
    saveState,
    applyLevelWin,
    applyLevelGameOver,
    isLevelUnlocked,
} from './progress.js';

function memoryStorage(seed = {}) {
    const map = new Map(Object.entries(seed));
    return {
        getItem(key) {
            return map.has(key) ? map.get(key) : null;
        },
        setItem(key, value) {
            map.set(key, String(value));
        },
        _map: map,
    };
}

describe('LEVELS', () => {
    it('defines seven ascending targets and board sizes', () => {
        assert.equal(LEVELS.length, 7);
        assert.equal(LEVELS[0].target, 256);
        assert.equal(LEVELS[6].id, 7);
        assert.equal(LEVELS[6].size, 6);
        assert.ok(LEVELS.every((lv, i) => lv.id === i + 1));
    });
});

describe('normalizeState', () => {
    it('returns defaults for corrupt payloads', () => {
        assert.deepEqual(normalizeState(null), defaultState());
        assert.deepEqual(normalizeState('x'), defaultState());
        assert.deepEqual(normalizeState({ unlockedLevels: 'all' }).unlockedLevels, [1]);
    });

    it('clamps impossible unlocks and current level', () => {
        const s = normalizeState({
            currentLevel: 99,
            unlockedLevels: [1, 2, 99, -1, '3', 3.5],
            bestScores: { 2: 100, bad: 1, 9: 50 },
            bestTotal: -10,
        });
        assert.deepEqual(s.unlockedLevels, [1, 2, 3]);
        assert.equal(s.currentLevel, 3);
        assert.deepEqual(s.bestScores, { 2: 100 });
        assert.equal(s.bestTotal, 0);
    });

    it('always keeps level 1 unlocked', () => {
        const s = normalizeState({ unlockedLevels: [4], currentLevel: 4 });
        assert.ok(s.unlockedLevels.includes(1));
        assert.ok(s.unlockedLevels.includes(4));
    });
});

describe('loadState / saveState', () => {
    it('round-trips through storage', () => {
        const storage = memoryStorage();
        const state = {
            currentLevel: 2,
            unlockedLevels: [1, 2],
            bestScores: { 1: 400 },
            bestTotal: 400,
        };
        saveState(state, storage);
        assert.ok(storage.getItem(STORAGE_KEY));
        assert.deepEqual(loadState(storage), state);
    });

    it('falls back when JSON is broken', () => {
        const storage = memoryStorage({ [STORAGE_KEY]: '{broken' });
        assert.deepEqual(loadState(storage), defaultState());
    });

    it('normalizes persisted over-unlocks on load', () => {
        const storage = memoryStorage({
            [STORAGE_KEY]: JSON.stringify({
                currentLevel: 1,
                unlockedLevels: [1, 2, 3, 4, 5, 6, 7, 8],
                bestScores: {},
                bestTotal: 0,
            }),
        });
        const s = loadState(storage);
        assert.deepEqual(s.unlockedLevels, [1, 2, 3, 4, 5, 6, 7]);
    });
});

describe('applyLevelWin', () => {
    it('unlocks the next level once and updates best score', () => {
        let state = defaultState();
        state = applyLevelWin(state, 1200);
        assert.deepEqual(state.unlockedLevels, [1, 2]);
        assert.equal(state.bestScores[1], 1200);

        state = applyLevelWin(state, 900);
        assert.deepEqual(state.unlockedLevels, [1, 2]);
        assert.equal(state.bestScores[1], 1200);
    });

    it('does not unlock past the final level', () => {
        let state = {
            currentLevel: 7,
            unlockedLevels: [1, 2, 3, 4, 5, 6, 7],
            bestScores: {},
            bestTotal: 0,
        };
        state = applyLevelWin(state, 5000);
        assert.deepEqual(state.unlockedLevels, [1, 2, 3, 4, 5, 6, 7]);
        assert.equal(state.bestScores[7], 5000);
    });
});

describe('applyLevelGameOver', () => {
    it('updates best only when score improves', () => {
        let state = { ...defaultState(), currentLevel: 2, unlockedLevels: [1, 2], bestScores: { 2: 300 } };
        const same = applyLevelGameOver(state, 200);
        assert.equal(same, state);

        state = applyLevelGameOver(state, 450);
        assert.equal(state.bestScores[2], 450);
        assert.deepEqual(state.unlockedLevels, [1, 2]);
    });
});

describe('isLevelUnlocked', () => {
    it('reports unlock membership', () => {
        const state = { ...defaultState(), unlockedLevels: [1, 2] };
        assert.equal(isLevelUnlocked(state, 2), true);
        assert.equal(isLevelUnlocked(state, 3), false);
    });
});
