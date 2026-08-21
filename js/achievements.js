// ======================== Достижения (ачивки) ========================
// Чистая логика: данные ачивок и расчёт вновь открытых (без DOM/localStorage).

import { LEVELS } from './levels.js';

export const ACHIEVEMENTS = [
    { id: 'first_merge', icon: '✨', name: 'Первое слияние',      desc: 'Слить плитки впервые',                 check: (s, p) => (p.gs && p.gs.merges >= 1) },
    { id: 'tile_64',     icon: '🐟', name: 'Рыбка',              desc: 'Собрать плитку 64',                    check: (s) => s.bestTile >= 64 },
    { id: 'tile_512',    icon: '🐠', name: 'Коралловый сад',     desc: 'Собрать плитку 512',                   check: (s) => s.bestTile >= 512 },
    { id: 'tile_2048',   icon: '🏆', name: 'Легенда глубин',     desc: 'Собрать плитку 2048',                  check: (s) => s.bestTile >= 2048 },
    { id: 'big_merge',   icon: '💥', name: 'Волна',              desc: 'Слить две плитки 512 в одну',          check: (s, p) => (p.gs && p.gs.maxMerge >= 1024) },
    { id: 'score_1000',  icon: '🦪', name: 'Полная жемчужница',  desc: 'Набрать 1000 очков за партию',         check: (s) => s.bestTotal >= 1000 },
    { id: 'moves_100',   icon: '⏳', name: 'Сто гребней волны',  desc: 'Сделать 100 ходов за партию',          check: (s, p) => (p.gs && p.gs.moves >= 100) },
    { id: 'win_first',   icon: '🐚', name: 'Первое погружение',  desc: 'Пройти первый уровень',                check: (s) => !!s.bestScores[1] },
    { id: 'win_all',     icon: '👑', name: 'Хозяин Моря',        desc: 'Пройди все 7 уровней',                 check: (s) => LEVELS.every(l => s.bestScores[l.id]) },
    { id: 'undo_1',      icon: '↩️', name: 'Назад по течению',   desc: 'Отменить ход',                         check: (s) => (s.undoCount || 0) >= 1 },
    { id: 'hint_1',      icon: '💡', name: 'Маяк',               desc: 'Воспользоваться подсказкой',           check: (s) => (s.hintsUsed || 0) >= 1 },
    { id: 'games_10',    icon: '🎲', name: 'Обитатель океана',   desc: 'Сыграть 10 партий',                    check: (s) => (s.gamesPlayed || 0) >= 10 },
];

/**
 * Пометить вновь открытые ачивки и вернуть их список.
 * Мутирует state.achievements (ставит Date.now()), но не трогает хранилище/DOM.
 */
export function evaluateAchievements(state, gs = null) {
    const newly = [];
    for (const a of ACHIEVEMENTS) {
        if (state.achievements[a.id]) continue;
        if (a.check(state, { gs })) {
            state.achievements[a.id] = Date.now();
            newly.push(a);
        }
    }
    return newly;
}
