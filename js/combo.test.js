/**
 * Unit tests for the streak/combo rewards logic (combo.js).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    COMBO_BASE_SCORE,
    STREAK_THRESHOLD,
    STREAK_SCORE_PER_STEP,
    comboMultiplier,
    comboBonusScore,
    advanceStreak,
    streakBonusScore,
    comboDoubloons,
    comboReward,
} from './combo.js';

describe('combo.comboMultiplier', () => {
    it('returns 1 for a single merge or none', () => {
        assert.equal(comboMultiplier(0), 1);
        assert.equal(comboMultiplier(1), 1);
        assert.equal(comboMultiplier(undefined), 1);
    });
    it('scales with merges and caps at 4', () => {
        assert.equal(comboMultiplier(2), 2);
        assert.equal(comboMultiplier(3), 3);
        assert.equal(comboMultiplier(4), 4);
        assert.equal(comboMultiplier(9), 4);
    });
});

describe('combo.comboBonusScore', () => {
    it('gives no bonus for 0-1 merges', () => {
        assert.equal(comboBonusScore(0), 0);
        assert.equal(comboBonusScore(1), 0);
    });
    it('rewards each extra merge with the base score', () => {
        assert.equal(comboBonusScore(2), COMBO_BASE_SCORE);
        assert.equal(comboBonusScore(3), 2 * COMBO_BASE_SCORE);
        assert.equal(comboBonusScore(4), 3 * COMBO_BASE_SCORE);
    });
});

describe('combo.advanceStreak', () => {
    it('increments on a merging move', () => {
        assert.equal(advanceStreak(0, 1), 1);
        assert.equal(advanceStreak(2, 1), 3);
    });
    it('resets to 0 on a non-merging move', () => {
        assert.equal(advanceStreak(5, 0), 0);
        assert.equal(advanceStreak(5, undefined), 0);
    });
});

describe('combo.streakBonusScore', () => {
    it('is zero below the threshold', () => {
        assert.equal(streakBonusScore(0), 0);
        assert.equal(streakBonusScore(2), 0);
    });
    it('scales linearly from the threshold', () => {
        assert.equal(streakBonusScore(STREAK_THRESHOLD), STREAK_THRESHOLD * STREAK_SCORE_PER_STEP);
        assert.equal(streakBonusScore(5), 5 * STREAK_SCORE_PER_STEP);
    });
});

describe('combo.comboDoubloons', () => {
    it('gives none for small combos and short streaks', () => {
        assert.equal(comboDoubloons({ merges: 1, streak: 1 }), 0);
        assert.equal(comboDoubloons({}), 0);
    });
    it('rewards triple and mega combos', () => {
        assert.equal(comboDoubloons({ merges: 3 }), 2);
        assert.equal(comboDoubloons({ merges: 4 }), 5);
    });
    it('rewards long streaks additionally', () => {
        assert.equal(comboDoubloons({ merges: 1, streak: 8 }), 3);
        assert.equal(comboDoubloons({ merges: 3, streak: 8 }), 5);
    });
});

describe('combo.comboReward', () => {
    it('is neutral for a plain single merge', () => {
        assert.deepEqual(comboReward({ merges: 1, streak: 0 }), {
            mult: 1, score: 0, doubloons: 0, streak: 1,
        });
    });
    it('combines combo and streak bonuses', () => {
        const r = comboReward({ merges: 2, streak: 3 });
        assert.equal(r.mult, 2);
        assert.equal(r.score, COMBO_BASE_SCORE + 3 * STREAK_SCORE_PER_STEP);
        assert.equal(r.streak, 4);
    });
    it('resets the streak on a non-merging move', () => {
        assert.equal(comboReward({ merges: 0, streak: 6 }).streak, 0);
        assert.equal(comboReward({ merges: 0, streak: 6 }).score, 0);
    });
    it('handles missing inputs gracefully', () => {
        assert.deepEqual(comboReward({}), { mult: 1, score: 0, doubloons: 0, streak: 0 });
    });
});
