/**
 * Unit tests for the rewarded-ads revive logic (rewards.js).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { REVIVE_MAX_PER_GAME, canRevive } from './rewards.js';

describe('rewards.REVIVE_MAX_PER_GAME', () => {
    it('is exactly 1 (one revive per game)', () => {
        assert.equal(REVIVE_MAX_PER_GAME, 1);
    });
});

describe('rewards.canRevive', () => {
    const ready = () => ({ platform: true, canUndo: true, reviveCount: 0, gameOver: true, won: false });

    it('allows revive when everything is in place', () => {
        assert.equal(canRevive(ready()), true);
    });

    it('rejects on web (no platform ads)', () => {
        assert.equal(canRevive({ ...ready(), platform: false }), false);
    });

    it('rejects when there is nothing to undo', () => {
        assert.equal(canRevive({ ...ready(), canUndo: false }), false);
    });

    it('rejects when the revive limit is reached', () => {
        assert.equal(canRevive({ ...ready(), reviveCount: 1 }), false);
        assert.equal(canRevive({ ...ready(), reviveCount: 5 }), false);
    });

    it('rejects when the game is not over', () => {
        assert.equal(canRevive({ ...ready(), gameOver: false }), false);
    });

    it('rejects on a won game', () => {
        assert.equal(canRevive({ ...ready(), won: true }), false);
    });

    it('treats missing opts as false / zero', () => {
        assert.equal(canRevive({}), false);
        assert.equal(canRevive({ platform: true, canUndo: true }), false); // gameOver missing
        assert.equal(canRevive({ platform: true, canUndo: true, gameOver: true }), true);
    });

    it('coerces reviveCount values safely', () => {
        assert.equal(canRevive({ ...ready(), reviveCount: '0' }), true);
        assert.equal(canRevive({ ...ready(), reviveCount: '1' }), false);
        assert.equal(canRevive({ ...ready(), reviveCount: null }), true);
        assert.equal(canRevive({ ...ready(), reviveCount: undefined }), true);
    });
});
