// ======================== Серии и комбо (streak / combo) ========================
// Чистая, тестируемая логика бонусов за слияния.
// - Комбо (combo): число слияний в одном ходе (merges) → множитель и бонус очков.
// - Серия (streak): ходы подряд, каждый из которых содержит хотя бы одно слияние.
// Модуль не трогает DOM и состояние игры — только расчёты.

// Базовые очки комбо (за «лишнее» слияние в одном ходе)
export const COMBO_BASE_SCORE = 50;

// Серия «включается» с этого количества ходов подряд со слиянием
export const STREAK_THRESHOLD = 3;
// Очки серии за каждый ход после порога
export const STREAK_SCORE_PER_STEP = 10;

// Жемчужины за крупные комбо / серии (имена констант не меняем — это не ключи БД)
export const COMBO_DOUBLOONS = { triple: 2, mega: 5 };
export const STREAK_DOUBLOONS = 3;
export const STREAK_DOUBLOONS_THRESHOLD = 8;

/**
 * Множитель комбо за число слияний в одном ходе:
 * 0-1 → ×1, 2 → ×2, 3 → ×3, 4+ → ×4 (кап).
 */
export function comboMultiplier(merges = 0) {
    const n = Number(merges) || 0;
    if (n >= 4) return 4;
    return n >= 2 ? n : 1;
}

/**
 * Бонус очков за комбо в ходе: (merges - 1) * COMBO_BASE_SCORE.
 * Одиночное слияние бонуса не даёт.
 */
export function comboBonusScore(merges = 0) {
    const n = Number(merges) || 0;
    if (n < 2) return 0;
    return (n - 1) * COMBO_BASE_SCORE;
}

/**
 * Следующее значение серии: ход со слиянием — +1, ход без слияния — сброс в 0.
 */
export function advanceStreak(streak = 0, merges = 0) {
    return (Number(merges) || 0) > 0 ? (Number(streak) || 0) + 1 : 0;
}

/**
 * Бонус очков за серию: от STREAK_THRESHOLD и выше — streak * STREAK_SCORE_PER_STEP.
 */
export function streakBonusScore(streak = 0) {
    const s = Number(streak) || 0;
    return s >= STREAK_THRESHOLD ? s * STREAK_SCORE_PER_STEP : 0;
}

/**
 * Жемчужины за крупные комбо и длинные серии (маленькая поощряющая награда).
 */
export function comboDoubloons({ merges = 0, streak = 0 } = {}) {
    let d = 0;
    const m = Number(merges) || 0;
    const s = Number(streak) || 0;
    if (m >= 4) d += COMBO_DOUBLOONS.mega;
    else if (m === 3) d += COMBO_DOUBLOONS.triple;
    if (s >= STREAK_DOUBLOONS_THRESHOLD) d += STREAK_DOUBLOONS;
    return d;
}

/**
 * Итоговая награда за ход: { mult, score, doubloons, streak }.
 * score — сумма бонусов комбо и серии; streak — новое значение серии.
 * Бонус серии начисляется только за ход СО слиянием (ход без слияния серию обрывает).
 */
export function comboReward({ merges = 0, streak = 0 } = {}) {
    const m = Number(merges) || 0;
    const s = Number(streak) || 0;
    return {
        mult: comboMultiplier(m),
        score: comboBonusScore(m) + (m > 0 ? streakBonusScore(s) : 0),
        doubloons: comboDoubloons({ merges: m, streak: s }),
        streak: advanceStreak(s, m),
    };
}
