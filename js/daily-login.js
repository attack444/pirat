// ======================== Ежедневный вход (награда за визит) ========================
// Чистая логика серии ежедневных входов и еженедельного цикла наград.
// Серия: если заход был «вчера» — серия продолжается (+1 день),
// если перерыв — серия сбрасывается на 1.
import { dailyDateStr } from './daily.js';

// Еженедельный цикл наград: день 1…7; на 8-й день цикл повторяется.
export const DAILY_LOGIN_REWARDS = [50, 75, 100, 125, 150, 175, 250];

/** Строка «вчера» в формате YYYY-MM-DD. */
export function yesterdayStr(date = dailyDateStr()) {
    const [y, m, d] = date.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() - 1);
    return dailyDateStr(dt);
}

/** Серия продолжается, если прошлый заход был именно «вчера». */
export function isConsecutive(lastClaim, today = dailyDateStr()) {
    return !!lastClaim && lastClaim === yesterdayStr(today);
}

/**
 * Снять награду за сегодняшний вход. Мутирует state.
 * @returns {{ok:true, reward:number, days:number, isNewStreak:boolean}
 *          | {ok:false, reason:'no_state'|'already_claimed', days:number}}
 */
export function claimDailyLogin(state, date = dailyDateStr()) {
    if (!state) return { ok: false, reason: 'no_state', days: 0 };
    state.dailyStreak = state.dailyStreak || { days: 0, lastClaim: '' };
    if (state.dailyStreak.lastClaim === date) {
        return { ok: false, reason: 'already_claimed', days: state.dailyStreak.days || 0 };
    }
    const cont = isConsecutive(state.dailyStreak.lastClaim, date);
    const newDays = cont ? (state.dailyStreak.days || 0) + 1 : 1;
    const reward = DAILY_LOGIN_REWARDS[(newDays - 1) % DAILY_LOGIN_REWARDS.length];
    state.dailyStreak = { days: newDays, lastClaim: date };
    state.doubloons = (state.doubloons || 0) + reward;
    return { ok: true, reward, days: newDays, isNewStreak: !cont };
}

/**
 * Информация для UI (трек недели): можно ли забрать, какой день цикла следующий,
 * сколько ячеек уже «закрыто» в текущем недельном цикле.
 */
export function dailyLoginInfo(state, date = dailyDateStr()) {
    const st = (state && state.dailyStreak) || { days: 0, lastClaim: '' };
    const days = st.days || 0;
    const claimedToday = !!st.lastClaim && st.lastClaim === date;
    const cont = claimedToday || isConsecutive(st.lastClaim, date);
    // Индекс награды, которую игрок получит при следующем заходе (0..6).
    const currentIndex = claimedToday
        ? (days % DAILY_LOGIN_REWARDS.length)
        : (cont ? (days % DAILY_LOGIN_REWARDS.length) : 0);
    // Сколько ячеек недельного цикла уже заполнено (0..7).
    const claimedInCycle = claimedToday
        ? (((Math.max(days, 1) - 1) % DAILY_LOGIN_REWARDS.length) + 1)
        : (cont ? (days % DAILY_LOGIN_REWARDS.length) : 0);
    return {
        days,
        claimedToday,
        canClaim: !claimedToday,
        currentIndex,
        claimedInCycle,
        nextReward: DAILY_LOGIN_REWARDS[currentIndex],
        rewards: DAILY_LOGIN_REWARDS,
    };
}
