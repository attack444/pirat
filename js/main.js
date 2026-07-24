// ======================== Инициализация игры 2048 ========================

import Game from './game.js';

document.addEventListener('DOMContentLoaded', () => {
    // Получаем элементы DOM
    const boardElement = document.getElementById('board');
    const scoreDisplay = document.getElementById('score');
    const restartBtn = document.getElementById('restart-btn');
    
    // Проверяем наличие элементов
    if (!boardElement || !scoreDisplay || !restartBtn) {
        console.error('Не найдены необходимые элементы DOM');
        return;
    }
    
    // Инициализируем игру
    const game = new Game(boardElement, scoreDisplay, restartBtn);
    
    console.log('🏴‍☠️ Пиратская версия 2048 загружена и готова к игре!');
    console.log('Используйте стрелки для движения плиток.');
});
