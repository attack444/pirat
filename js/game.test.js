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

describe('Game shuffle boost', () => {
    it('returns false when the board has fewer than 2 tiles', () => {
        const g = makeGame();
        g.tiles = [
            { id: 1, value: 2 }, null, null, null,
            null, null, null, null,
            null, null, null, null,
            null, null, null, null,
        ];
        assert.equal(g.shuffle(), false);
    });

    it('returns false when the game is over', () => {
        const g = makeGame();
        g.tiles = [
            { id: 1, value: 2 }, { id: 2, value: 4 }, null, null,
            null, null, null, null,
            null, null, null, null,
            null, null, null, null,
        ];
        g.gameOver = true;
        assert.equal(g.shuffle(), false);
    });

    it('preserves the multiset of tile values when shuffling', () => {
        const g = makeGame();
        g.render = () => {};
        g.tiles = [
            { id: 1, value: 2 }, { id: 2, value: 4 }, { id: 3, value: 8 }, null,
            null, null, null, null,
            null, null, null, null,
            null, null, null, null,
        ];
        const before = g.tiles.filter(Boolean).map(t => t.value).sort((a, b) => a - b);
        assert.equal(g.shuffle(), true);
        const after = g.tiles.filter(Boolean).map(t => t.value).sort((a, b) => a - b);
        assert.deepEqual(after, before);
    });

    it('reorders tiles deterministically when Math.random is fixed', () => {
        const g = makeGame();
        g.render = () => {};
        g.tiles = [
            { id: 1, value: 2 }, { id: 2, value: 4 }, { id: 3, value: 8 }, null,
            null, null, null, null,
            null, null, null, null,
            null, null, null, null,
        ];
        const orig = Math.random;
        Math.random = () => 0; // Фишер–Йетс с j = 0
        try {
            g.shuffle();
        } finally {
            Math.random = orig;
        }
        // [2,4,8] → i=2: меняем местами idx2 и idx0 → [8,4,2]; i=1: idx1 и idx0 → [4,8,2]
        assert.deepEqual(g.tiles.filter(Boolean).map(t => t.value), [4, 8, 2]);
    });
});

describe('Game bomb boost (removeHighestTile)', () => {
    it('removes the highest-value tile and returns its value', () => {
        const g = makeGame();
        g.render = () => {};
        g.tiles = [
            { id: 1, value: 2 }, { id: 2, value: 16 }, { id: 3, value: 4 }, null,
            null, null, null, null,
            null, null, null, null,
            null, null, null, null,
        ];
        assert.equal(g.removeHighestTile(), 16);
        const remaining = g.tiles.filter(Boolean).map(t => t.value);
        assert.ok(!remaining.includes(16));
        assert.equal(remaining.length, 2);
    });

    it('removes a single tile when the maximum value appears twice', () => {
        const g = makeGame();
        g.render = () => {};
        g.tiles = [
            { id: 1, value: 8 }, { id: 2, value: 8 }, null, null,
            null, null, null, null,
            null, null, null, null,
            null, null, null, null,
        ];
        assert.equal(g.removeHighestTile(), 8);
        assert.equal(g.tiles.filter(Boolean).length, 1);
    });

    it('returns null when the board is empty', () => {
        const g = makeGame();
        g.tiles = Array(16).fill(null);
        assert.equal(g.removeHighestTile(), null);
    });
});

describe('Game bonus tile perk (addBonusTile)', () => {
    it('spawns a tile of the requested value on a random empty cell', () => {
        const g = makeGame();
        g.render = () => {};
        g.tiles = Array(16).fill(null);
        assert.equal(g.addBonusTile(4), true);
        const filled = g.tiles.filter(Boolean);
        assert.equal(filled.length, 1);
        assert.equal(filled[0].value, 4);
        assert.equal(filled[0].justSpawned, true);
    });

    it('returns false when the board is full', () => {
        const g = makeGame();
        g.tiles = [
            { id: 1, value: 2 }, { id: 2, value: 4 }, { id: 3, value: 8 }, { id: 4, value: 16 },
            { id: 5, value: 4 }, { id: 6, value: 8 }, { id: 7, value: 16 }, { id: 8, value: 32 },
            { id: 9, value: 8 }, { id: 10, value: 16 }, { id: 11, value: 32 }, { id: 12, value: 64 },
            { id: 13, value: 16 }, { id: 14, value: 32 }, { id: 15, value: 64 }, { id: 16, value: 128 },
        ];
        assert.equal(g.addBonusTile(4), false);
        assert.equal(g.tiles.filter(Boolean).length, 16);
    });
});

describe('Game score multiplier boost (x2)', () => {
    it('starts with no active multiplier', () => {
        const g = makeGame();
        assert.equal(g.getScoreMultiplierMoves(), 0);
    });

    it('activateScoreMultiplier sets the remaining merging moves', () => {
        const g = makeGame();
        g.render = () => {};
        g.activateScoreMultiplier(3);
        assert.equal(g.getScoreMultiplierMoves(), 3);
        g.activateScoreMultiplier(0);
        assert.equal(g.getScoreMultiplierMoves(), 0);
    });

    it('doubles merge-gained score and spends a charge only on merging moves', () => {
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
        g.activateScoreMultiplier(2);
        g.handleMove('left'); // слияние 2+2 → +4, ×2 → +8
        assert.equal(g.score, 8);
        assert.equal(g.getScoreMultiplierMoves(), 1);

        // Ход с перемещением, но без слияния — ×2 не тратится и очки не удваиваются
        g.tiles = [
            null, { id: 3, value: 4 }, null, null,
            null, null, null, null,
            null, null, null, null,
            null, null, null, null,
        ];
        g.handleMove('left');
        assert.equal(g.score, 8);
        assert.equal(g.getScoreMultiplierMoves(), 1);
    });

    it('resets the multiplier in init and loadState', () => {
        const g = makeGame();
        g.render = () => {};
        g.activateScoreMultiplier(2);
        g.init();
        assert.equal(g.getScoreMultiplierMoves(), 0);

        g.activateScoreMultiplier(2);
        g.loadState({ tiles: Array(16).fill(null), score: 0, moves: 0, nextTileId: 1 });
        assert.equal(g.getScoreMultiplierMoves(), 0);
    });
});
