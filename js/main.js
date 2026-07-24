// ======================== Точка входа приложения ========================

import Game from './game.js';

/**
 * Инициализация игры при загрузке страницы
 */
document.addEventListener('DOMContentLoaded', () => {
    const boardElement = document.getElementById('board');
    const scoreDisplay = document.getElementById('score');
    const restartBtn = document.getElementById('restart-btn');
    
    // Проверяем наличие элементов
    if (!boardElement || !scoreDisplay || !restartBtn) {
        console.error('Не найдены необходимые элементы DOM');
        return;
    }
    
    // Создаём экземпляр игры
    const game = new Game(boardElement, scoreDisplay, restartBtn);
    
    console.log('🎮 Игра инициализирована успешно!');
});

export default {};
