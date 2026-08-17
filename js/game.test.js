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
    Game.prototype._addNewTile = function () {};
    Game.prototype.render = function () {};
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
    game.tiles = new Array(game.size * game.size).fill(null);
    game.score = 0;
    game.won = false;
    game.gameOver = false;
    game.winCelebrated = false;
    return game;
}

describe('Game._mergeLine', () => {
    it('merges a simple pair and scores the doubled value', () => {
        const g = makeGame();
        const line = [2, 2, null, null];
        g._mergeLine(line);
        assert.deepEqual(line, [4, null, null, null]);
        assert.equal(g.score, 4);
    });

    it('merges from the left once per pair (classic 2048)', () => {
        const g = makeGame();
        const line = [2, 2, 2, null];
        g._mergeLine(line);
        assert.deepEqual(line, [4, 2, null, null]);
        assert.equal(g.score, 4);
    });

    it('merges two pairs in one line', () => {
        const g = makeGame();
        const line = [4, 4, 8, 8];
        g._mergeLine(line);
        assert.deepEqual(line, [8, 16, null, null]);
        assert.equal(g.score, 8 + 16);
    });
});

describe('Game.handleMove', () => {
    it('slides left and does not spawn when movement is mocked off', () => {
        const g = makeGame();
        g.tiles = [
            null, 2, null, 2,
            null, null, null, null,
            null, null, null, null,
            null, null, null, null,
        ];
        g._addNewTile = () => {};
        g.render = () => {};
        g.handleMove('left');
        assert.deepEqual(g.tiles.slice(0, 4), [4, null, null, null]);
        assert.equal(g.score, 4);
    });

    it('is a no-op when nothing can move', () => {
        const g = makeGame();
        g.tiles = [
            2, 4, 8, 16,
            null, null, null, null,
            null, null, null, null,
            null, null, null, null,
        ];
        const before = g.tiles.slice();
        g._addNewTile = () => { throw new Error('should not spawn'); };
        g.render = () => {};
        g.handleMove('left');
        assert.deepEqual(g.tiles, before);
    });
});

describe('Game win / lose', () => {
    it('detects win when a tile reaches target', () => {
        const g = makeGame({ target: 16 });
        g.tiles[0] = 16;
        assert.equal(g._checkWin(), true);
    });

    it('detects game over on a full board with no merges', () => {
        const g = makeGame();
        g.tiles = [
            2, 4, 8, 16,
            4, 8, 16, 32,
            8, 16, 32, 64,
            16, 32, 64, 128,
        ];
        assert.equal(g._checkGameOver(), true);
    });

    it('is not game over when a merge is still possible', () => {
        const g = makeGame();
        g.tiles = [
            2, 4, 8, 16,
            4, 8, 16, 32,
            8, 16, 32, 64,
            16, 32, 64, 64,
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
