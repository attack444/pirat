// ======================== Уровни: ранги, размеры поля и цели ========================
// Чистые данные и хелперы уровней (без DOM/localStorage).

export const LEVELS = [
    { id: 1, name: 'Юнга',             rank: '⚓',    size: 4, target: 256  },
    { id: 2, name: 'Матрос',            rank: '🗺️',   size: 4, target: 512  },
    { id: 3, name: 'Буканьер',          rank: '⚔️',   size: 4, target: 1024 },
    { id: 4, name: 'Корсар',            rank: '🦜',    size: 4, target: 2048 },
    { id: 5, name: 'Капитан',           rank: '🚢',    size: 5, target: 2048 },
    { id: 6, name: 'Адмирал',           rank: '🏴‍☠️', size: 5, target: 4096 },
    { id: 7, name: 'Пиратский Король',  rank: '👑',    size: 6, target: 4096 },
];

/**
 * Уровень по id (строковому или числовому). Неизвестный id — первый уровень.
 */
export function levelById(id) {
    const n = Number(id);
    return LEVELS.find(l => l.id === n) || LEVELS[0];
}

/**
 * Финальный ли это уровень (после него — победа «Пиратский Король»)?
 */
export function isLastLevel(id) {
    return Number(id) === LEVELS[LEVELS.length - 1].id;
}
