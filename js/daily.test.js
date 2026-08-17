import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DAILY_TASKS, dailyDateStr, rollDailyTasks, ensureDaily, dailyMetric, checkDaily } from './daily.js';

function baseState() {
    return {
        dailyCounters: { moves: 0, merges: 0, wins: 0, hints: 0, undos: 0 },
        bestTile: 0,
        bestTotal: 0,
    };
}

test('DAILY_TASKS: 7 заданий с уникальными id', () => {
    assert.equal(DAILY_TASKS.length, 7);
    const ids = new Set(DAILY_TASKS.map(t => t.id));
    assert.equal(ids.size, DAILY_TASKS.length);
});

test('dailyDateStr форматирует дату YYYY-MM-DD', () => {
    assert.equal(dailyDateStr(new Date(2026, 7, 17)), '2026-08-17');
    assert.equal(dailyDateStr(new Date(2026, 0, 5)), '2026-01-05');
});

test('rollDailyTasks детерминирован для одной даты', () => {
    const a = rollDailyTasks('2026-08-17');
    const b = rollDailyTasks('2026-08-17');
    assert.deepEqual(a, b);
    assert.equal(a.length, 3);
    assert.ok(a.every(t => t.id && t.done === false && t.claimed === false));
});

test('rollDailyTasks различается между датами', () => {
    const a = rollDailyTasks('2026-08-17').map(t => t.id).join(',');
    const b = rollDailyTasks('2026-08-18').map(t => t.id).join(',');
    assert.notEqual(a, b);
});

test('ensureDaily выдаёт задания в новый день и обнуляет счётчики', () => {
    const state = baseState();
    state.dailyCounters.moves = 5;
    assert.equal(ensureDaily(state, '2026-08-17'), true);
    assert.equal(state.daily.date, '2026-08-17');
    assert.equal(state.daily.tasks.length, 3);
    assert.deepEqual(state.dailyCounters, { moves: 0, merges: 0, wins: 0, hints: 0, undos: 0 });
    // Тот же день — без изменений
    assert.equal(ensureDaily(state, '2026-08-17'), false);
    assert.equal(state.daily.tasks.length, 3);
});

test('ensureDaily перевыдаёт задания при смене дня', () => {
    const state = baseState();
    ensureDaily(state, '2026-08-17');
    const day1 = state.daily.tasks.map(t => t.id).join(',');
    ensureDaily(state, '2026-08-18');
    assert.equal(state.daily.date, '2026-08-18');
    assert.notEqual(state.daily.tasks.map(t => t.id).join(','), day1);
});

test('dailyMetric собирает метрики из state', () => {
    const state = {
        dailyCounters: { moves: 3, merges: 5, wins: 1, hints: 0 },
        bestTile: 512,
        bestTotal: 2000,
    };
    assert.deepEqual(dailyMetric(state), {
        moves: 3, merges: 5, wins: 1, hints: 0, tile: 512, score: 2000,
    });
});

test('checkDaily отмечает выполненные задания', () => {
    const state = baseState();
    state.daily = { date: '2026-08-17', tasks: [{ id: 'moves30', done: false, claimed: false }], claimed: {} };
    state.dailyCounters.moves = 40;
    assert.equal(checkDaily(state), true);
    assert.equal(state.daily.tasks[0].done, true);
});

test('checkDaily не отмечает незавершённое задание', () => {
    const state = baseState();
    state.daily = { date: '2026-08-17', tasks: [{ id: 'moves30', done: false, claimed: false }], claimed: {} };
    state.dailyCounters.moves = 10;
    assert.equal(checkDaily(state), false);
    assert.equal(state.daily.tasks[0].done, false);
});

test('checkDaily пропускает уже выполненные задания', () => {
    const state = baseState();
    state.daily = { date: '2026-08-17', tasks: [{ id: 'moves30', done: true, claimed: false }], claimed: {} };
    state.dailyCounters.moves = 40;
    assert.equal(checkDaily(state), true); // уже done — «выполнено» всё равно true
});
