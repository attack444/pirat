import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ACHIEVEMENTS, evaluateAchievements } from './achievements.js';

function makeState(overrides = {}) {
    return {
        bestTile: 0,
        bestTotal: 0,
        bestScores: {},
        gamesPlayed: 0,
        undoCount: 0,
        hintsUsed: 0,
        achievements: {},
        ...overrides,
    };
}

test('ACHIEVEMENTS: 12 ачивок с уникальными id', () => {
    assert.equal(ACHIEVEMENTS.length, 12);
    const ids = new Set(ACHIEVEMENTS.map(a => a.id));
    assert.equal(ids.size, ACHIEVEMENTS.length);
});

test('evaluateAchievements открывает ачивки по условиям и не повторяет', () => {
    const state = makeState({
        bestTile: 2048,
        bestTotal: 1500,
        bestScores: { 1: 300, 2: 600, 3: 1200, 4: 2200, 5: 2500, 6: 4500, 7: 5000 },
        gamesPlayed: 12,
        hintsUsed: 2,
        undoCount: 1,
    });
    const gs = { merges: 5, maxMerge: 2048, moves: 120 };
    const newly = evaluateAchievements(state, gs);
    const ids = newly.map(a => a.id);
    for (const expected of ['first_merge', 'tile_2048', 'win_all', 'win_first', 'games_10', 'score_1000', 'moves_100', 'undo_1', 'hint_1']) {
        assert.ok(ids.includes(expected), `ожидалась ачивка ${expected}`);
    }
    // Повторный вызов не открывает заново
    assert.equal(evaluateAchievements(state, gs).length, 0);
});

test('evaluateAchievements работает без gs для ачивок, которые его не требуют', () => {
    const state = makeState({ bestTile: 64 });
    const newly = evaluateAchievements(state);
    assert.deepEqual(newly.map(a => a.id), ['tile_64']);
});

test('evaluateAchievements помечает timestamp в state.achievements', () => {
    const state = makeState({ bestTile: 512 });
    evaluateAchievements(state);
    assert.ok(typeof state.achievements.tile_512 === 'number');
    assert.ok(state.achievements.tile_512 > 0);
});

test('win_all требует прохождения всех уровней', () => {
    const partial = makeState({ bestScores: { 1: 300 } });
    const partialIds = evaluateAchievements(partial).map(a => a.id);
    assert.ok(!partialIds.includes('win_all'));
    const full = makeState({ bestScores: { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7 } });
    const fullIds = evaluateAchievements(full).map(a => a.id);
    assert.ok(fullIds.includes('win_all'));
});
