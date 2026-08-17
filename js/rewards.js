// ======================== Наградная реклама: «Шанс на спасение» ========================
// Чистая, тестируемая логика механики rewarded-рекламы.
// После game over на площадках (VK / Яндекс) игрок может ОДИН раз за партию
// посмотреть rewarded-ролик и продолжить с предыдущей позиции (game.undo()).

// Максимум «спасений» за одну партию
export const REVIVE_MAX_PER_GAME = 1;

/**
 * Можно ли предложить «спасение» (показать rewarded-кнопку в модалке game over)?
 * opts: { platform, canUndo, reviveCount, gameOver, won }
 * - platform    — игра идёт на площадке (VK / Яндекс), где доступна rewarded-реклама
 * - canUndo     — есть что откатывать (история ходов не пуста)
 * - reviveCount — сколько «спасений» уже использовано в текущей партии
 * - gameOver    — партия действительно окончена
 * - won         — партия НЕ должна быть выиграна (после победы «спасение» не нужно)
 */
export function canRevive(opts = {}) {
    const {
        platform = false,
        canUndo = false,
        reviveCount = 0,
        gameOver = false,
        won = false,
    } = opts;
    return Boolean(platform)
        && Boolean(canUndo)
        && Boolean(gameOver)
        && !Boolean(won)
        && (Number(reviveCount) || 0) < REVIVE_MAX_PER_GAME;
}
