// ======================== Прогресс уровней (pure, testable) ========================

export const STORAGE_KEY = 'pirate2048_v1';

export const LEVELS = [
    { id: 1, name: 'Юнга',             rank: '⚓',    size: 4, target: 256  },
    { id: 2, name: 'Матрос',            rank: '🗺️',   size: 4, target: 512  },
    { id: 3, name: 'Буканьер',          rank: '⚔️',   size: 4, target: 1024 },
    { id: 4, name: 'Корсар',            rank: '🦜',    size: 4, target: 2048 },
    { id: 5, name: 'Капитан',           rank: '🚢',    size: 5, target: 2048 },
    { id: 6, name: 'Адмирал',           rank: '🏴‍☠️', size: 5, target: 4096 },
    { id: 7, name: 'Пиратский Король',  rank: '👑',    size: 6, target: 4096 },
];

export function defaultState() {
    return { currentLevel: 1, unlockedLevels: [1], bestScores: {}, bestTotal: 0 };
}

/**
 * Normalize persisted progress so corrupt / partial payloads cannot unlock everything.
 */
export function normalizeState(raw, levels = LEVELS) {
    const base = defaultState();
    if (!raw || typeof raw !== 'object') return base;

    const maxId = levels.length;
    let currentLevel = Number(raw.currentLevel);

    const unlocked = Array.isArray(raw.unlockedLevels)
        ? raw.unlockedLevels
            .map((n) => Number(n))
            .filter((n) => Number.isInteger(n) && n >= 1 && n <= maxId)
        : [];
    if (!unlocked.includes(1)) unlocked.unshift(1);
    const unlockedLevels = [...new Set(unlocked)].sort((a, b) => a - b);

    if (
        !Number.isInteger(currentLevel)
        || currentLevel < 1
        || currentLevel > maxId
        || !unlockedLevels.includes(currentLevel)
    ) {
        currentLevel = unlockedLevels[unlockedLevels.length - 1] || 1;
    }

    const bestScores = {};
    if (raw.bestScores && typeof raw.bestScores === 'object') {
        for (const [k, v] of Object.entries(raw.bestScores)) {
            const id = Number(k);
            const score = Number(v);
            if (Number.isInteger(id) && id >= 1 && id <= maxId && Number.isFinite(score) && score >= 0) {
                bestScores[id] = score;
            }
        }
    }

    const bestTotal = Number(raw.bestTotal);
    return {
        currentLevel,
        unlockedLevels,
        bestScores,
        bestTotal: Number.isFinite(bestTotal) && bestTotal >= 0 ? bestTotal : 0,
    };
}

export function loadState(storage = globalThis.localStorage, levels = LEVELS) {
    try {
        const raw = storage?.getItem?.(STORAGE_KEY);
        if (raw) return normalizeState(JSON.parse(raw), levels);
    } catch (_) {}
    return defaultState();
}

export function saveState(state, storage = globalThis.localStorage) {
    try {
        storage?.setItem?.(STORAGE_KEY, JSON.stringify(state));
    } catch (_) {}
}

/** Apply win rewards: unlock next level + best score for current level. */
export function applyLevelWin(state, score, levels = LEVELS) {
    const next = state.currentLevel + 1;
    const unlockedLevels = state.unlockedLevels.slice();
    if (next <= levels.length && !unlockedLevels.includes(next)) {
        unlockedLevels.push(next);
    }
    const bestScores = { ...state.bestScores };
    const prevBest = bestScores[state.currentLevel];
    if (prevBest == null || score > prevBest) {
        bestScores[state.currentLevel] = score;
    }
    return { ...state, unlockedLevels, bestScores };
}

/** Update per-level best on game over (no unlock). */
export function applyLevelGameOver(state, score) {
    const bestScores = { ...state.bestScores };
    const prevBest = bestScores[state.currentLevel];
    if (prevBest == null || score > prevBest) {
        bestScores[state.currentLevel] = score;
        return { ...state, bestScores };
    }
    return state;
}

export function isLevelUnlocked(state, levelId) {
    return state.unlockedLevels.includes(levelId);
}
