// ======================== UI и работа с DOM ========================

import CONFIG from './config.js';
import { getSymbol } from './utils.js';

/**
 * Получение элемента ячейки по координатам
 * @param {HTMLElement} boardElement - контейнер доски
 * @param {number} row - строка
 * @param {number} col - колонка
 * @returns {HTMLElement|null}
 */
export function getCellElement(boardElement, row, col) {
    return boardElement.querySelector(`[data-row="${row}"][data-col="${col}"]`);
}

/**
 * Подсветка/снятие подсветки ячейки
 * @param {HTMLElement} boardElement - контейнер доски
 * @param {number} row - строка
 * @param {number} col - колонка
 * @param {boolean} state - включить/выключить подсветку
 */
export function highlightCell(boardElement, row, col, state) {
    const cell = getCellElement(boardElement, row, col);
    if (cell) {
        if (state) {
            cell.classList.add('selected');
        } else {
            cell.classList.remove('selected');
        }
    }
}

/**
 * Полный рендер игровой доски
 * @param {HTMLElement} boardElement - контейнер доски
 * @param {Array} grid - 2D массив типов фишек
 */
export function renderBoard(boardElement, grid) {
    boardElement.innerHTML = '';
    
    for (let r = 0; r < CONFIG.ROWS; r++) {
        for (let c = 0; c < CONFIG.COLS; c++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.row = r;
            cell.dataset.col = c;
            
            // Добавляем обработчик клика (будет установлен в game.js)
            cell.addEventListener('click', function(e) {
                // Событие будет обработано через делегирование в game.js
                e.currentTarget.dispatchEvent(new CustomEvent('cellClick', {
                    detail: { row: r, col: c },
                    bubbles: true,
                    cancelable: true
                }));
            });
            
            const type = grid[r][c];
            if (type !== -1) {
                const tile = document.createElement('div');
                tile.className = 'tile';
                tile.dataset.type = type;
                tile.textContent = getSymbol(type);
                cell.appendChild(tile);
            }
            
            boardElement.appendChild(cell);
        }
    }
}

/**
 * Обновление отображения счёта
 * @param {HTMLElement} scoreDisplay - элемент для отображения счёта
 * @param {number} score - текущий счёт
 */
export function updateScore(scoreDisplay, score) {
    scoreDisplay.textContent = score;
}

/**
 * Добавление класса анимации для фишек
 * @param {HTMLElement} boardElement - контейнер доски
 * @param {Array} tiles - массив { row, col } или { row, col, type }
 * @param {string} animationClass - класс анимации ('removing' или 'dropping')
 */
export function addTileAnimation(boardElement, tiles, animationClass) {
    tiles.forEach(({ row, col }) => {
        const cell = getCellElement(boardElement, row, col);
        if (cell) {
            const tile = cell.querySelector('.tile');
            if (tile) {
                tile.classList.add(animationClass);
            }
        }
    });
}

/**
 * Удаление класса анимации для фишек
 * @param {HTMLElement} boardElement - контейнер доски
 * @param {Array} tiles - массив { row, col }
 * @param {string} animationClass - класс анимации
 */
export function removeTileAnimation(boardElement, tiles, animationClass) {
    tiles.forEach(({ row, col }) => {
        const cell = getCellElement(boardElement, row, col);
        if (cell) {
            const tile = cell.querySelector('.tile');
            if (tile) {
                tile.classList.remove(animationClass);
            }
        }
    });
}

/**
 * Показ сообщения (для потенциальных уведомлений)
 * @param {string} message - текст сообщения
 * @param {number} duration - длительность показа (мс)
 */
export function showMessage(message, duration = 2000) {
    console.log(`[Game Message] ${message}`);
    // Можно расширить для визуального вывода
}

export default {
    getCellElement,
    highlightCell,
    renderBoard,
    updateScore,
    addTileAnimation,
    removeTileAnimation,
    showMessage,
};
