import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS, levelById, isLastLevel, tideConfigForLevel, movesConfigForLevel } from './levels.js';

test('LEVELS: 7 уровней с возрастающими требованиями', () => {
    assert.equal(LEVELS.length, 7);
    assert.equal(LEVELS[0].id, 1);
    assert.equal(LEVELS[LEVELS.length - 1].id, 7);
    assert.equal(LEVELS[0].target, 256);
    assert.equal(LEVELS[3].target, 2048);
    assert.equal(LEVELS[3].size, 4);
    assert.equal(LEVELS[6].size, 6);
});

test('levelById возвращает нужный уровень', () => {
    assert.equal(levelById(3).name, 'Медуза');
    assert.equal(levelById('5').size, 5);
    assert.equal(levelById(6).rank, '🦈');
});

test('levelById фолбэчит на первый уровень для неизвестного id', () => {
    assert.equal(levelById(999).id, 1);
    assert.equal(levelById(0).id, 1);
    assert.equal(levelById(null).id, 1);
});

test('isLastLevel распознаёт финальный уровень', () => {
    assert.equal(isLastLevel(7), true);
    assert.equal(isLastLevel('7'), true);
    assert.equal(isLastLevel(6), false);
    assert.equal(isLastLevel(1), false);
});

test('tideConfigForLevel: ранние уровни без прилива, угроза растёт с глубиной', () => {
    assert.equal(tideConfigForLevel(1), null);
    assert.equal(tideConfigForLevel(2), null);
    assert.equal(tideConfigForLevel(3), null);

    const tide4 = tideConfigForLevel(4);
    assert.ok(tide4);
    assert.equal(tide4.depth, 1);

    const tide6 = tideConfigForLevel(6);
    assert.ok(tide6);
    assert.equal(tide6.depth, 2);
    // Чем глубже уровень, тем меньше ходов до прилива (интервал уменьшается)
    assert.ok(tideConfigForLevel(7).interval < tideConfigForLevel(4).interval);
});

test('movesConfigForLevel: ранние уровни без штрафа, наказание растёт с глубиной', () => {
    assert.equal(movesConfigForLevel(1), null);
    assert.equal(movesConfigForLevel(2), null);
    assert.equal(movesConfigForLevel(3), null);

    const moves4 = movesConfigForLevel(4);
    assert.ok(moves4);
    assert.equal(moves4.maxWithoutMerge, 6);
    assert.equal(moves4.tideStep, 1);

    // Чем глубже уровень, тем меньше порог бесполезных ходов
    assert.ok(movesConfigForLevel(7).maxWithoutMerge < movesConfigForLevel(4).maxWithoutMerge);
    // На финальном уровне штраф сильнее (tideStep выше и водоворот глубже)
    assert.equal(movesConfigForLevel(7).tideStep, 2);
    assert.equal(movesConfigForLevel(7).depth, 2);
});
