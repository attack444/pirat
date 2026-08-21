// ======================== Уровни: ранги, размеры поля и цели ========================
// Чистые данные и хелперы уровней (без DOM/localStorage).

export const LEVELS = [
    { id: 1, name: 'Ракушка',        rank: '🐚',   size: 4, target: 256  },
    { id: 2, name: 'Краб',           rank: '🦀',   size: 4, target: 512  },
    { id: 3, name: 'Медуза',         rank: '🪼',   size: 4, target: 1024 },
    { id: 4, name: 'Черепаха',       rank: '🐢',   size: 4, target: 2048 },
    { id: 5, name: 'Осьминог',       rank: '🐙',   size: 5, target: 2048 },
    { id: 6, name: 'Акула',          rank: '🦈',   size: 5, target: 4096 },
    { id: 7, name: 'Хозяин Моря',    rank: '👑',   size: 6, target: 4096 },
];

/**
 * Уровень по id (строковому или числовому). Неизвестный id — первый уровень.
 */
export function levelById(id) {
    const n = Number(id);
    return LEVELS.find(l => l.id === n) || LEVELS[0];
}

/**
 * Финальный ли это уровень (после него — победа «Хозяин Моря»)?
 */
export function isLastLevel(id) {
    return Number(id) === LEVELS[LEVELS.length - 1].id;
}
