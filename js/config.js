// ======================== Конфигурация игры ========================

const CONFIG = {
    // Размеры сетки
    ROWS: 8,
    COLS: 8,
    
    // Типы фишек
    TYPES: 6,
    SYMBOLS: ['☠', '📦', '🗺', '⚓', '🧭', '💰'],
    
    // Очки
    BASE_SCORE: 10,
    
    // Таймеры анимаций (мс)
    ANIMATION_REMOVE: 300,
    ANIMATION_DROP: 300,
    ANIMATION_DELAY: 350,
    
    // Максимум попыток при генерации
    GENERATION_ATTEMPTS: 100,
};

Object.freeze(CONFIG);

export default CONFIG;
