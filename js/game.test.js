/**
 * Unit tests for 2048 merge / win / lose / swipe (Node built-in test runner).
 * Uses a minimal DOM stub — no browser required.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Game attaches keydown listeners on construction.
globalThis.document = {
    addEventListener() {},
    removeEventListener() {},
    createElement() {
        return {
            className: '',
            dataset: {},
            textContent: '',
        };
    },
    body: { classList: { contains: () => false }, dataset: {} },
};

const { default: Game } = await import('./game.js');

function stubBoard() {
    const listeners = new Map();
    return {
        style: {},
        className: '',
        classList: {
            toggle() {},
            add() {},
            remove() {},
            contains() { return false; },
        },
        innerHTML: '',
        addEventListener(type, fn) {
            listeners.set(type, fn);
        },
        removeEventListener(type, fn) {
            if (listeners.get(type) === fn) listeners.delete(type);
        },
        appendChild() {},
        _listeners: listeners,
    };
}

function makeGame(opts = {}) {
    const board = stubBoard();
    // Avoid random tiles / DOM during construction.
    const addTile = Game.prototype._addNewTile;
    const render = Game.prototype.render;
    const animate = Game.prototype._animateMove;
    Game.prototype._addNewTile = function () {};
    Game.prototype.render = function () {};
    // handleMove is async via _animateMove (setTimeout) — resolve synchronously in tests.
    Game.prototype._animateMove = function (moves, cb) { cb(); };
    const game = new Game({
        boardElement: board,
        size: opts.size || 4,
        target: opts.target || 2048,
        onWin: opts.onWin || (() => {}),
        onGameOver: opts.onGameOver || (() => {}),
        onScoreUpdate: opts.onScoreUpdate || (() => {}),
    });
    Game.prototype._addNewTile = addTile;
    Game.prototype.render = render;
    Game.prototype._animateMove = animate;
    game.tiles = new Array(game.size * game.size).fill(null);
    game.score = 0;
    game.won = false;
    game.gameOver = false;
    game.winCelebrated = false;
    return game;
}

describe('Game._move (left merge)', () => {
    it('merges a simple pair and scores the doubled value', () => {
        const g = makeGame();
        g.tiles = [
            { id: 1, value: 2 }, { id: 2, value: 2 }, null, null,
            null, null, null, null,
            null, null, null, null,
            null, null, null, null,
        ];
        const { moved, merges } = g._move('left');
        assert.equal(moved, true);
        assert.equal(merges, 1);
        assert.deepEqual(g.tiles.slice(0, 4).map(t => (t ? t.value : null)), [4, null, null, null]);
        assert.equal(g.score, 4);
    });

    it('merges from the left once per pair (classic 2048)', () => {
        const g = makeGame();
        g.tiles = [
            { id: 1, value: 2 }, { id: 2, value: 2 }, { id: 3, value: 2 }, null,
            null, null, null, null,
            null, null, null, null,
            null, null, null, null,
        ];
        const { merges } = g._move('left');
        assert.equal(merges, 1);
        assert.deepEqual(g.tiles.slice(0, 4).map(t => (t ? t.value : null)), [4, 2, null, null]);
        assert.equal(g.score, 4);
    });

    it('merges two pairs in one line', () => {
        const g = makeGame();
        g.tiles = [
            { id: 1, value: 4 }, { id: 2, value: 4 }, { id: 3, value: 8 }, { id: 4, value: 8 },
            null, null, null, null,
            null, null, null, null,
            null, null, null, null,
        ];
        const { merges } = g._move('left');
        assert.equal(merges, 2);
        assert.deepEqual(g.tiles.slice(0, 4).map(t => (t ? t.value : null)), [8, 16, null, null]);
        assert.equal(g.score, 24);
    });
});

describe('Game.handleMove', () => {
    it('slides left and spawns exactly once after a successful move', () => {
        const g = makeGame();
        g.tiles = [
            null, { id: 2, value: 2 }, null, { id: 4, value: 2 },
            null, null, null, null,
            null, null, null, null,
            null, null, null, null,
        ];
        let spawned = 0;
        g._addNewTile = () => { spawned++; };
        g._animateMove = (moves, cb) => cb();
        g.render = () => {};
        g.handleMove('left');
        assert.deepEqual(g.tiles.slice(0, 4).map(t => (t ? t.value : null)), [4, null, null, null]);
        assert.equal(g.score, 4);
        assert.equal(spawned, 1);
    });

    it('is a no-op when nothing can move (no spawn)', () => {
        const g = makeGame();
        g.tiles = [
            { id: 1, value: 2 }, { id: 2, value: 4 }, { id: 3, value: 8 }, { id: 4, value: 16 },
            null, null, null, null,
            null, null, null, null,
            null, null, null, null,
        ];
        const before = g.tiles.map(t => (t ? t.value : null));
        let spawned = 0;
        g._addNewTile = () => { spawned++; };
        g.render = () => {};
        g.handleMove('left');
        assert.deepEqual(g.tiles.map(t => (t ? t.value : null)), before);
        assert.equal(spawned, 0);
    });
});

describe('Game win / lose', () => {
    it('detects win when a tile reaches target', () => {
        const g = makeGame({ target: 16 });
        g.tiles[0] = { id: 1, value: 16 };
        assert.equal(g._checkWin(), true);
    });

    it('detects game over on a full board with no merges', () => {
        const g = makeGame();
        g.tiles = [
            { id: 1, value: 2 },   { id: 2, value: 4 },   { id: 3, value: 8 },   { id: 4, value: 16 },
            { id: 5, value: 4 },   { id: 6, value: 8 },   { id: 7, value: 16 },  { id: 8, value: 32 },
            { id: 9, value: 8 },   { id: 10, value: 16 }, { id: 11, value: 32 }, { id: 12, value: 64 },
            { id: 13, value: 16 }, { id: 14, value: 32 }, { id: 15, value: 64 }, { id: 16, value: 128 },
        ];
        assert.equal(g._checkGameOver(), true);
    });

    it('is not game over when a merge is still possible', () => {
        const g = makeGame();
        g.tiles = [
            { id: 1, value: 2 },   { id: 2, value: 4 },   { id: 3, value: 8 },   { id: 4, value: 16 },
            { id: 5, value: 4 },   { id: 6, value: 8 },   { id: 7, value: 16 },  { id: 8, value: 32 },
            { id: 9, value: 8 },   { id: 10, value: 16 }, { id: 11, value: 32 }, { id: 12, value: 64 },
            { id: 13, value: 16 }, { id: 14, value: 32 }, { id: 15, value: 64 }, { id: 16, value: 64 },
        ];
        assert.equal(g._checkGameOver(), false);
    });
});

describe('Game swipe threshold', () => {
    it('ignores short swipes and accepts horizontal/vertical past 40px', () => {
        const g = makeGame();
        const moves = [];
        g.handleMove = (dir) => moves.push(dir);

        g._handleTouchStart({
            touches: [{ clientX: 100, clientY: 100 }],
            preventDefault() {},
        });
        g._handleTouchEnd({
            changedTouches: [{ clientX: 139, clientY: 100 }],
            preventDefault() {},
        });
        assert.deepEqual(moves, []);

        g._handleTouchStart({
            touches: [{ clientX: 100, clientY: 100 }],
            preventDefault() {},
        });
        g._handleTouchEnd({
            changedTouches: [{ clientX: 140, clientY: 100 }],
            preventDefault() {},
        });
        assert.deepEqual(moves, ['right']);

        g._handleTouchStart({
            touches: [{ clientX: 100, clientY: 100 }],
            preventDefault() {},
        });
        g._handleTouchEnd({
            changedTouches: [{ clientX: 100, clientY: 50 }],
            preventDefault() {},
        });
        assert.deepEqual(moves, ['right', 'up']);
    });
});

describe('Game streak & addScore', () => {
    it('increments the streak on a merging move and resets on a plain move', () => {
        const g = makeGame();
        g._addNewTile = () => {};
        g._animateMove = (moves, cb) => cb();
        g.render = () => {};

        g.tiles = [
            { id: 1, value: 2 }, { id: 2, value: 2 }, null, null,
            null, null, null, null,
            null, null, null, null,
            null, null, null, null,
        ];
        g.handleMove('left');
        assert.equal(g.streak, 1);

        // Ход без слияния, но с перемещением — серия сбрасывается
        g.tiles = [
            null, { id: 3, value: 2 }, null, { id: 4, value: 4 },
            null, null, null, null,
            null, null, null, null,
            null, null, null, null,
        ];
        g.handleMove('left');
        assert.equal(g.streak, 0);
    });

    it('undo restores the streak of the previous position', () => {
        const g = makeGame();
        g._addNewTile = () => {};
        g._animateMove = (moves, cb) => cb();
        g.render = () => {};

        g.tiles = [
            { id: 1, value: 2 }, { id: 2, value: 2 }, null, null,
            null, null, null, null,
            null, null, null, null,
            null, null, null, null,
        ];
        g.handleMove('left');
        assert.equal(g.streak, 1);
        g.undo();
        assert.equal(g.streak, 0);
    });

    it('addScore adds bonus points and notifies the score callback', () => {
        const g = makeGame();
        let notified = null;
        g.onScoreUpdate = (s) => { notified = s; };
        g.score = 100;
        const added = g.addScore(50);
        assert.equal(added, 50);
        assert.equal(g.score, 150);
        assert.equal(notified, 150);
    });

    it('addScore ignores non-positive amounts', () => {
        const g = makeGame();
        g.score = 10;
        assert.equal(g.addScore(0), 0);
        assert.equal(g.addScore(-5), 0);
        assert.equal(g.score, 10);
    });

    it('tracks the streak in getStats', () => {
        const g = makeGame();
        g.streak = 4;
        assert.equal(g.getStats().streak, 4);
    });
});
