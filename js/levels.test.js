import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS, levelById, isLastLevel } from './levels.js';

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
    assert.equal(levelById(3).name, 'Буканьер');
    assert.equal(levelById('5').size, 5);
    assert.equal(levelById(6).rank, '🏴‍☠️');
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
