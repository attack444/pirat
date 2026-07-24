// ======================== Логика игровой сетки и алгоритмы ========================

import CONFIG from './config.js';
import { swapInGrid, getRandomType, shuffleArray } from './utils.js';

/**
 * Генерация поля без начальных совпадений
 * @returns {Array} - 2D массив типов фишек
 */
export function generateBoard() {
    const newGrid = [];
    
    for (let r = 0; r < CONFIG.ROWS; r++) {
        const row = [];
        
        for (let c = 0; c < CONFIG.COLS; c++) {
            let type;
            let attempts = 0;
            
            do {
                type = getRandomType();
                attempts++;
                if (attempts > CONFIG.GENERATION_ATTEMPTS) break;
            } while (
                // Проверка горизонтальной тройки слева
                (c >= 2 && row[c - 1] === type && row[c - 2] === type) ||
                // Проверка вертикальной тройки сверху
                (r >= 2 && newGrid[r - 1][c] === type && newGrid[r - 2][c] === type)
            );
            
            row.push(type);
        }
        
        newGrid.push(row);
    }
    
    return newGrid;
}

/**
 * Поиск всех совпадений (3+ в ряд)
 * @param {Array} grid - 2D массив типов фишек
 * @returns {Array} - массив { row, col } для всех совпавших фишек
 */
export function findAllMatches(grid) {
    const matched = new Set();
    
    // Горизонтальные совпадения
    for (let r = 0; r < CONFIG.ROWS; r++) {
        for (let c = 0; c < CONFIG.COLS; ) {
            const type = grid[r][c];
            if (type === -1) {
                c++;
                continue;
            }
            
            let end = c + 1;
            while (end < CONFIG.COLS && grid[r][end] === type) end++;
            
            if (end - c >= 3) {
                for (let i = c; i < end; i++) {
                    matched.add(`${r},${i}`);
                }
            }
            
            c = end;
        }
    }
    
    // Вертикальные совпадения
    for (let c = 0; c < CONFIG.COLS; c++) {
        for (let r = 0; r < CONFIG.ROWS; ) {
            const type = grid[r][c];
            if (type === -1) {
                r++;
                continue;
            }
            
            let end = r + 1;
            while (end < CONFIG.ROWS && grid[end][c] === type) end++;
            
            if (end - r >= 3) {
                for (let i = r; i < end; i++) {
                    matched.add(`${i},${c}`);
                }
            }
            
            r = end;
        }
    }
    
    // Преобразуем Set в массив координат
    const result = [];
    matched.forEach(key => {
        const [r, c] = key.split(',').map(Number);
        result.push({ row: r, col: c });
    });
    
    return result;
}

/**
 * Удаление совпадений из сетки
 * @param {Array} grid - 2D массив типов фишек
 * @param {Array} matches - массив { row, col } для удаления
 */
export function removeMatches(grid, matches) {
    matches.forEach(({ row, col }) => {
        grid[row][col] = -1;
    });
}

/**
 * Применение гравитации (сдвиг фишек вниз)
 * @param {Array} grid - 2D массив типов фишек
 */
export function applyGravity(grid) {
    for (let c = 0; c < CONFIG.COLS; c++) {
        // Собираем непустые фишки снизу вверх
        const columnTiles = [];
        
        for (let r = CONFIG.ROWS - 1; r >= 0; r--) {
            if (grid[r][c] !== -1) {
                columnTiles.push(grid[r][c]);
            }
        }
        
        // Заполняем колонку снизу вверх
        for (let r = CONFIG.ROWS - 1; r >= 0; r--) {
            const idx = CONFIG.ROWS - 1 - r;
            
            if (idx < columnTiles.length) {
                grid[r][c] = columnTiles[idx];
            } else {
                grid[r][c] = -1;
            }
        }
    }
}

/**
 * Заполнение пустот новыми фишками
 * @param {Array} grid - 2D массив типов фишек
 * @returns {Array} - массив { row, col, type } новых фишек
 */
export function refillBoard(grid) {
    const newTiles = [];
    
    for (let c = 0; c < CONFIG.COLS; c++) {
        for (let r = 0; r < CONFIG.ROWS; r++) {
            if (grid[r][c] === -1) {
                const type = getRandomType();
                grid[r][c] = type;
                newTiles.push({ row: r, col: c, type });
            }
        }
    }
    
    return newTiles;
}

/**
 * Проверка наличия возможных ходов
 * @param {Array} grid - 2D массив типов фишек
 * @returns {boolean}
 */
export function hasValidMoves(grid) {
    for (let r = 0; r < CONFIG.ROWS; r++) {
        for (let c = 0; c < CONFIG.COLS; c++) {
            // Проверяем обмен с правым соседом
            if (c + 1 < CONFIG.COLS) {
                swapInGrid(grid, r, c, r, c + 1);
                if (findAllMatches(grid).length > 0) {
                    swapInGrid(grid, r, c, r, c + 1);
                    return true;
                }
                swapInGrid(grid, r, c, r, c + 1);
            }
            
            // Проверяем обмен с нижним соседом
            if (r + 1 < CONFIG.ROWS) {
                swapInGrid(grid, r, c, r + 1, c);
                if (findAllMatches(grid).length > 0) {
                    swapInGrid(grid, r, c, r + 1, c);
                    return true;
                }
                swapInGrid(grid, r, c, r + 1, c);
            }
        }
    }
    
    return false;
}

/**
 * Перетасовка поля (при deadlock)
 * @param {Array} grid - 2D массив типов фишек
 */
export function shuffleBoard(grid) {
    // Собираем все типы в массив
    const allTypes = [];
    for (let r = 0; r < CONFIG.ROWS; r++) {
        for (let c = 0; c < CONFIG.COLS; c++) {
            allTypes.push(grid[r][c]);
        }
    }
    
    // Перемешиваем
    const shuffled = shuffleArray(allTypes);
    
    // Раскладываем обратно
    let idx = 0;
    for (let r = 0; r < CONFIG.ROWS; r++) {
        for (let c = 0; c < CONFIG.COLS; c++) {
            grid[r][c] = shuffled[idx++];
        }
    }
    
    // Удаляем начальные совпадения
    let matches = findAllMatches(grid);
    while (matches.length > 0) {
        removeMatches(grid, matches);
        applyGravity(grid);
        refillBoard(grid);
        matches = findAllMatches(grid);
    }
    
    // Если нет ходов — рекурсивно перетасовываем
    if (!hasValidMoves(grid)) {
        shuffleBoard(grid);
    }
}

/**
 * Копирование сетки (для тестирования ходов)
 * @param {Array} grid - 2D массив
 * @returns {Array} - глубокая копия сетки
 */
export function copyGrid(grid) {
    return grid.map(row => [...row]);
}

export default {
    generateBoard,
    findAllMatches,
    removeMatches,
    applyGravity,
    refillBoard,
    hasValidMoves,
    shuffleBoard,
    copyGrid,
};
