// ======================== Ежедневные задания ========================
// Чистая логика: список заданий, детерминированная выдача на день, прогресс.

export const DAILY_TASKS = [
    { id: 'moves30',   icon: '🌊', name: 'Тридцать волн',     desc: 'Сделай 30 ходов за день',     goal: 30,   metric: 'moves', reward: 100 },
    { id: 'tile256',   icon: '🐠', name: 'Стайка рыбок',      desc: 'Собери плитку 256',           goal: 256,  metric: 'tile',  reward: 120 },
    { id: 'score5000', icon: '🦪', name: 'Жемчужное дно',     desc: 'Набери 5000 очков за партию', goal: 5000, metric: 'score', reward: 150 },
    { id: 'merges10',  icon: '✨', name: 'Десять слияний',    desc: 'Слей плитки 10 раз за день',  goal: 10,   metric: 'merges', reward: 120 },
    { id: 'winlevel',  icon: '🐬', name: 'Победа',            desc: 'Пройди уровень',              goal: 1,    metric: 'wins',  reward: 150 },
    { id: 'hint2',     icon: '💡', name: 'Маяк',              desc: 'Используй 2 подсказки',       goal: 2,    metric: 'hints', reward: 80 },
    { id: 'max512',    icon: '🐋', name: 'Кит глубин',        desc: 'Собери плитку 512',           goal: 512,  metric: 'tile',  reward: 180 },
];

/**
 * Строка текущей даты YYYY-MM-DD (для детерминированной выдачи заданий).
 */
export function dailyDateStr(date = new Date()) {
    const d = date;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Детерминированная выдача N заданий по дате (перемешивание Фишера–Йетса на seed от строки даты).
 */
export function rollDailyTasks(dateStr, pool = DAILY_TASKS, count = 3) {
    let seed = 0;
    for (const ch of dateStr) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
    const rnd = () => { seed = (seed * 1103515245 + 12345) >>> 0; return seed / 0xFFFFFFFF; };
    const arr = [...pool];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(rnd() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr.slice(0, count).map(t => ({ id: t.id, done: false, claimed: false }));
}

/**
 * Подготовить state к сегодняшнему дню. Если день сменился — выдаёт новые задания
 * и обнуляет счётчики. Возвращает true, если state был обновлён (новый день).
 */
export function ensureDaily(state, date = dailyDateStr()) {
    state.daily = state.daily || { date: '', tasks: [], claimed: {} };
    state.dailyCounters = state.dailyCounters || { moves: 0, merges: 0, wins: 0, hints: 0, undos: 0 };
    if (state.daily.date === date) return false;
    state.daily = { date, tasks: rollDailyTasks(date), claimed: {} };
    state.dailyCounters = { moves: 0, merges: 0, wins: 0, hints: 0, undos: 0 };
    return true;
}

/**
 * Текущие значения метрик ежедневных заданий.
 */
export function dailyMetric(state) {
    return {
        moves:  state.dailyCounters.moves,
        merges: state.dailyCounters.merges,
        wins:   state.dailyCounters.wins,
        hints:  state.dailyCounters.hints,
        tile:   state.bestTile || 0,
        score:  state.bestTotal || 0,
    };
}

/**
 * Отметить выполненные задания по текущим метрикам. Возвращает true, если
 * хотя бы одно задание стало выполненным в этот вызов.
 */
export function checkDaily(state) {
    const metrics = dailyMetric(state);
    for (const t of state.daily.tasks) {
        if (t.done) continue;
        const def = DAILY_TASKS.find(d => d.id === t.id);
        if (def && metrics[def.metric] >= def.goal) t.done = true;
    }
    return state.daily.tasks.some(t => t.done);
}
