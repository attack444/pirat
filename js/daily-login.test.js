/**
 * Unit tests for the daily login streak logic (daily-login.js).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    DAILY_LOGIN_REWARDS,
    yesterdayStr,
    isConsecutive,
    claimDailyLogin,
    dailyLoginInfo,
} from './daily-login.js';

describe('daily-login.yesterdayStr', () => {
    it('computes the previous calendar day', () => {
        assert.equal(yesterdayStr('2026-08-17'), '2026-08-16');
        assert.equal(yesterdayStr('2026-08-01'), '2026-07-31');
        assert.equal(yesterdayStr('2026-01-01'), '2025-12-31');
    });
});

describe('daily-login.isConsecutive', () => {
    it('true only when the last claim was yesterday', () => {
        assert.equal(isConsecutive('2026-08-16', '2026-08-17'), true);
        assert.equal(isConsecutive('2026-08-15', '2026-08-17'), false);
        assert.equal(isConsecutive('', '2026-08-17'), false);
    });
});

describe('daily-login.claimDailyLogin', () => {
    it('first-ever claim starts the streak at day 1 with 50 doubloons', () => {
        const st = { doubloons: 0, dailyStreak: { days: 0, lastClaim: '' } };
        const res = claimDailyLogin(st, '2026-08-17');
        assert.equal(res.ok, true);
        assert.equal(res.days, 1);
        assert.equal(res.reward, DAILY_LOGIN_REWARDS[0]);
        assert.equal(res.isNewStreak, true);
        assert.equal(st.doubloons, 50);
        assert.deepEqual(st.dailyStreak, { days: 1, lastClaim: '2026-08-17' });
    });
    it('cannot claim twice on the same day', () => {
        const st = { doubloons: 0, dailyStreak: { days: 0, lastClaim: '' } };
        claimDailyLogin(st, '2026-08-17');
        const res = claimDailyLogin(st, '2026-08-17');
        assert.equal(res.ok, false);
        assert.equal(res.reason, 'already_claimed');
        assert.equal(st.doubloons, 50);
    });
    it('continues the streak the next day with the next reward', () => {
        const st = { doubloons: 0, dailyStreak: { days: 0, lastClaim: '' } };
        claimDailyLogin(st, '2026-08-17');
        const res = claimDailyLogin(st, '2026-08-18');
        assert.equal(res.ok, true);
        assert.equal(res.days, 2);
        assert.equal(res.isNewStreak, false);
        assert.equal(res.reward, DAILY_LOGIN_REWARDS[1]);
        assert.equal(st.doubloons, 50 + DAILY_LOGIN_REWARDS[1]);
    });
    it('resets to day 1 after a missed day', () => {
        const st = { doubloons: 0, dailyStreak: { days: 3, lastClaim: '2026-08-14' } };
        const res = claimDailyLogin(st, '2026-08-17');
        assert.equal(res.ok, true);
        assert.equal(res.days, 1);
        assert.equal(res.isNewStreak, true);
        assert.equal(res.reward, DAILY_LOGIN_REWARDS[0]);
    });
    it('follows the weekly reward cycle (day 7 → 250, day 8 → 50)', () => {
        const st = { doubloons: 0, dailyStreak: { days: 0, lastClaim: '' } };
        const dates = ['2026-08-10', '2026-08-11', '2026-08-12', '2026-08-13', '2026-08-14', '2026-08-15', '2026-08-16', '2026-08-17'];
        const rewards = dates.map(d => claimDailyLogin(st, d).reward);
        assert.deepEqual(rewards, DAILY_LOGIN_REWARDS.concat([DAILY_LOGIN_REWARDS[0]]));
        assert.equal(st.dailyStreak.days, 8);
    });
});

describe('daily-login.dailyLoginInfo', () => {
    it('reports claim availability before the first claim', () => {
        const st = { doubloons: 0, dailyStreak: { days: 0, lastClaim: '' } };
        const info = dailyLoginInfo(st, '2026-08-17');
        assert.equal(info.canClaim, true);
        assert.equal(info.claimedToday, false);
        assert.equal(info.currentIndex, 0);
        assert.equal(info.claimedInCycle, 0);
        assert.equal(info.nextReward, DAILY_LOGIN_REWARDS[0]);
        assert.equal(info.rewards.length, 7);
    });
    it('marks today as claimed and advances the cycle index', () => {
        const st = { doubloons: 0, dailyStreak: { days: 2, lastClaim: '2026-08-18' } };
        const info = dailyLoginInfo(st, '2026-08-18');
        assert.equal(info.canClaim, false);
        assert.equal(info.claimedToday, true);
        assert.equal(info.claimedInCycle, 2);
        assert.equal(info.currentIndex, 2);
        assert.equal(info.nextReward, DAILY_LOGIN_REWARDS[2]);
    });
    it('resets the shown cycle index after a broken streak', () => {
        const st = { doubloons: 0, dailyStreak: { days: 5, lastClaim: '2026-08-12' } };
        const info = dailyLoginInfo(st, '2026-08-17');
        assert.equal(info.canClaim, true);
        assert.equal(info.currentIndex, 0);
        assert.equal(info.claimedInCycle, 0);
    });
    it('handles missing state gracefully', () => {
        const info = dailyLoginInfo(null, '2026-08-17');
        assert.equal(info.canClaim, true);
        assert.equal(info.days, 0);
        assert.equal(info.currentIndex, 0);
    });
});
