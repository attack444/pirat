// ======================== Утилиты и вспомогательные функции ========================

import CONFIG from './config.js';

/**
 * Обмен элементов в двумерном массиве
 * @param {Array} grid - 2D массив
 * @param {number} r1 - строка первого элемента
 * @param {number} c1 - колонка первого элемента
 * @param {number} r2 - строка второго элемента
 * @param {number} c2 - колонка второго элемента
 */
export function swapInGrid(grid, r1, c1, r2, c2) {
    const temp = grid[r1][c1];
    grid[r1][c1] = grid[r2][c2];
    grid[r2][c2] = temp;
}

/**
 * Проверка соседства двух ячеек (горизонталь или вертикаль)
 * @param {number} r1 - строка первой ячейки
 * @param {number} c1 - колонка первой ячейки
 * @param {number} r2 - строка второй ячейки
 * @param {number} c2 - колонка второй ячейки
 * @returns {boolean}
 */
export function isAdjacent(r1, c1, r2, c2) {
    const dr = Math.abs(r1 - r2);
    const dc = Math.abs(c1 - c2);
    return (dr === 1 && dc === 0) || (dr === 0 && dc === 1);
}

/**
 * Перемешивание массива (Fisher-Yates)
 * @param {Array} arr - массив для перемешивания
 * @returns {Array} - перемешанный массив
 */
export function shuffleArray(arr) {
    const shuffled = [...arr];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

/**
 * Получение случайного типа фишки
 * @returns {number} - тип фишки (0...TYPES-1)
 */
export function getRandomType() {
    return Math.floor(Math.random() * CONFIG.TYPES);
}

/**
 * Получение символа по типу фишки
 * @param {number} type - тип фишки
 * @returns {string} - символ фишки
 */
export function getSymbol(type) {
    return CONFIG.SYMBOLS[type] || '?';
}

/**
 * Создание задержки (для async/await)
 * @param {number} ms - миллисекунды
 * @returns {Promise}
 */
export function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export default {
    swapInGrid,
    isAdjacent,
    shuffleArray,
    getRandomType,
    getSymbol,
    delay,
};
