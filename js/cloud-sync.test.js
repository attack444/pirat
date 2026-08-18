/**
 * Unit tests for the cloud save conflict strategy (cloud-sync.js).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { updatedAt, resolveConflict, mergeBoardSaves, bumpUpdatedAt } from './cloud-sync.js';

const baseLocal = {
    updatedAt: 100,
    currentLevel: 2,
    unlockedLevels: [1, 2],
    bestScores: { 1: 100, 2: 400 },
    bestTotal: 500,
    bestTile: 128,
    gamesPlayed: 7,
    sound: true,
    theme: 'light',
    skin: 'gold',
    infinity: false,
    achievements: { first_merge: 1 },
    doubloons: 50,
    unlockedSkins: ['gold'],
    unlockedThemes: ['dark', 'light'],
    lastAdTime: 1000,
    daily: { date: '2026-08-17', tasks: [], claimed: { a: 1 } },
    dailyCounters: { moves: 10, merges: 4, wins: 1, hints: 2 },
    inventory: { shuffle: 2, bomb: 0, x2: 1 },
    perks: { coinBonus: true },
    dailyStreak: { days: 3, lastClaim: '2026-08-16' },
};

const baseCloud = {
    updatedAt: 200,
    currentLevel: 3,
    unlockedLevels: [1, 2, 3],
    bestScores: { 1: 80, 3: 700 },
    bestTotal: 700,
    bestTile: 256,
    gamesPlayed: 4,
    sound: false,
    theme: 'dark',
    skin: 'wood',
    infinity: true,
    achievements: { tile_64: 1, first_merge: 2 },
    doubloons: 30,
    unlockedSkins: ['gold', 'wood'],
    unlockedThemes: ['dark'],
    lastAdTime: 500,
    daily: { date: '2026-08-17', tasks: [], claimed: { b: 1 } },
    dailyCounters: { moves: 20, merges: 0, wins: 0, hints: 0 },
    inventory: { shuffle: 1, bomb: 3, x2: 0 },
    perks: { extraUndos: true },
    dailyStreak: { days: 2, lastClaim: '2026-08-15' },
};

describe('cloud-sync.updatedAt', () => {
    it('reads the numeric timestamp with a fallback to 0', () => {
        assert.equal(updatedAt({ updatedAt: 42 }), 42);
        assert.equal(updatedAt({}), 0);
        assert.equal(updatedAt(null), 0);
        assert.equal(updatedAt(undefined), 0);
    });
});

describe('cloud-sync.resolveConflict', () => {
    it('returns the only available side', () => {
        assert.deepEqual(resolveConflict(null, baseCloud), baseCloud);
        assert.deepEqual(resolveConflict(baseLocal, null), baseLocal);
        assert.deepEqual(resolveConflict(null, null), {});
    });

    it('treats the newer side as the base (settings win by last write)', () => {
        const m = resolveConflict(baseLocal, baseCloud); // cloud newer (200 > 100)
        assert.equal(m.theme, 'dark');
        assert.equal(m.sound, false);
        assert.equal(m.infinity, true);
        assert.equal(m.currentLevel, 3);
        assert.equal(m.updatedAt, 200);
    });

    it('is symmetric — the newer side always wins', () => {
        const m = resolveConflict(baseCloud, baseLocal);
        assert.equal(m.theme, 'dark');
        assert.equal(m.updatedAt, 200);
    });

    it('unions progression and economy (max) so nothing is lost', () => {
        const m = resolveConflict(baseLocal, baseCloud);
        assert.equal(m.bestTotal, 700);
        assert.equal(m.bestTile, 256);
        assert.equal(m.gamesPlayed, 7);
        assert.equal(m.doubloons, 50);
        assert.equal(m.hintsUsed, 0);
        assert.equal(m.undoCount, 0);
        assert.equal(m.lastAdTime, 1000);
        assert.deepEqual(m.unlockedLevels, [1, 2, 3]);
        assert.deepEqual(m.bestScores, { 1: 100, 2: 400, 3: 700 });
        assert.deepEqual(m.unlockedSkins, ['gold', 'wood']);
        assert.deepEqual(m.unlockedThemes, ['dark', 'light']);
        assert.deepEqual(m.achievements, { first_merge: 2, tile_64: 1 }); // base (newer) wins on conflict
    });

    it('merges daily counters and claimed tasks when the date matches', () => {
        const m = resolveConflict(baseLocal, baseCloud);
        assert.deepEqual(m.dailyCounters, { moves: 20, merges: 4, wins: 1, hints: 2 });
        assert.deepEqual(m.daily.claimed, { b: 1, a: 1 });
    });

    it('merges shop boosts, perks and the daily-login streak', () => {
        const m = resolveConflict(baseLocal, baseCloud); // cloud newer → base
        // Запасы бустов — по максимуму каждого ключа
        assert.deepEqual(m.inventory, { shuffle: 2, bomb: 3, x2: 1 });
        // Перки — OR-объединение флагов
        assert.deepEqual(m.perks, { coinBonus: true, extraUndos: true });
        // Серия входа: максимум дней, метка последнего захода от base (новее)
        assert.equal(m.dailyStreak.days, 3);
        assert.equal(m.dailyStreak.lastClaim, '2026-08-15');
    });

    it('keeps the shop keys when only one side has them', () => {
        const local = { ...baseLocal };
        delete local.inventory;
        delete local.perks;
        delete local.dailyStreak;
        const m = resolveConflict(local, baseCloud);
        assert.deepEqual(m.inventory, baseCloud.inventory);
        assert.deepEqual(m.perks, baseCloud.perks);
        assert.deepEqual(m.dailyStreak, baseCloud.dailyStreak);
    });

    it('keeps the base daily block when dates differ', () => {
        const local = { ...baseLocal };
        const cloud = {
            ...baseCloud,
            daily: { date: '2026-08-16', tasks: [], claimed: {} },
            dailyCounters: { moves: 99, merges: 0, wins: 0, hints: 0 },
        };
        const m = resolveConflict(local, cloud); // cloud newer
        assert.deepEqual(m.daily, cloud.daily);
        assert.deepEqual(m.dailyCounters, cloud.dailyCounters);
    });

    it('clamps currentLevel to the max unlocked level if it regressed', () => {
        const local = { ...baseLocal, updatedAt: 300, currentLevel: 9, unlockedLevels: [1, 2] };
        const cloud = { ...baseCloud, unlockedLevels: [1, 2, 3] };
        const m = resolveConflict(local, cloud);
        assert.equal(m.currentLevel, 3);
    });

    it('keeps unknown keys from both sides', () => {
        const local = { ...baseLocal, updatedAt: 300, newLocalKey: 'x' };
        const cloud = { ...baseCloud, newCloudKey: 'y' };
        const m = resolveConflict(local, cloud);
        assert.equal(m.newLocalKey, 'x');
        assert.equal(m.newCloudKey, 'y');
    });
});

describe('cloud-sync.mergeBoardSaves', () => {
    it('keeps the newer save per level', () => {
        const local = { 1: { board: {}, ts: 100 }, 2: { board: {}, ts: 200 } };
        const cloud = { 1: { board: {}, ts: 150 }, 3: { board: {}, ts: 300 } };
        const m = mergeBoardSaves(local, cloud);
        assert.equal(m[1].ts, 150); // cloud newer
        assert.equal(m[2].ts, 200); // only local
        assert.equal(m[3].ts, 300); // only cloud
    });

    it('breaks ts ties toward local', () => {
        const local = { 1: { board: { a: 1 }, ts: 100 } };
        const cloud = { 1: { board: { b: 2 }, ts: 100 } };
        const m = mergeBoardSaves(local, cloud);
        assert.deepEqual(m[1].board, { a: 1 });
    });

    it('handles missing or empty inputs', () => {
        assert.deepEqual(mergeBoardSaves(null, null), {});
        assert.deepEqual(mergeBoardSaves(undefined, { 1: { ts: 5 } }), { 1: { ts: 5 } });
        assert.deepEqual(mergeBoardSaves({ 1: { ts: 5 } }, null), { 1: { ts: 5 } });
    });
});

describe('cloud-sync.bumpUpdatedAt', () => {
    it('sets the timestamp without mutating the input', () => {
        const s = { score: 1 };
        const out = bumpUpdatedAt(s, 123);
        assert.equal(out.updatedAt, 123);
        assert.equal(s.updatedAt, undefined);
        assert.equal(out.score, 1);
    });

    it('defaults to Date.now()', () => {
        const out = bumpUpdatedAt({});
        assert.equal(typeof out.updatedAt, 'number');
        assert.ok(out.updatedAt > 0);
    });
});
