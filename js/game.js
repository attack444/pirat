// ======================== Основная логика игры ========================

import CONFIG from './config.js';
import {
    generateBoard,
    findAllMatches,
    removeMatches,
    applyGravity,
    refillBoard,
    hasValidMoves,
    shuffleBoard,
} from './board.js';
import {
    swapInGrid,
    isAdjacent,
    delay,
} from './utils.js';
import {
    getCellElement,
    highlightCell,
    renderBoard,
    updateScore,
    addTileAnimation,
} from './ui.js';

/**
 * Класс главной игры
 */
export class Game {
    constructor(boardElement, scoreDisplay, restartBtn) {
        this.boardElement = boardElement;
        this.scoreDisplay = scoreDisplay;
        this.restartBtn = restartBtn;
        
        this.grid = [];
        this.score = 0;
        this.selectedCell = null;
        this.isAnimating = false;
        
        this.setupEventListeners();
        this.init();
    }
    
    /**
     * Инициализация обработчиков событий
     */
    setupEventListeners() {
        this.restartBtn.addEventListener('click', () => this.restart());
        
        this.boardElement.addEventListener('cellClick', (e) => {
            const { row, col } = e.detail;
            this.handleCellClick(row, col);
        });
    }
    
    /**
     * Инициализация новой игры
     */
    init() {
        this.selectedCell = null;
        this.isAnimating = false;
        this.score = 0;
        updateScore(this.scoreDisplay, this.score);
        
        this.grid = generateBoard();
        
        if (!hasValidMoves(this.grid)) {
            shuffleBoard(this.grid);
        }
        
        renderBoard(this.boardElement, this.grid);
    }
    
    /**
     * Перезагрузка игры
     */
    restart() {
        if (this.isAnimating) return;
        this.init();
    }
    
    /**
     * Обработка клика по ячейке
     * @param {number} row - строка
     * @param {number} col - колонка
     */
    handleCellClick(row, col) {
        if (this.isAnimating) return;
        
        if (this.selectedCell === null) {
            // Выбираем первую фишку
            this.selectedCell = { row, col };
            highlightCell(this.boardElement, row, col, true);
        } else {
            const sr = this.selectedCell.row;
            const sc = this.selectedCell.col;
            
            // Если кликнули на ту же ячейку — снимаем выделение
            if (sr === row && sc === col) {
                highlightCell(this.boardElement, sr, sc, false);
                this.selectedCell = null;
                return;
            }
            
            // Проверяем соседство
            if (isAdjacent(sr, sc, row, col)) {
                this.performSwap(sr, sc, row, col);
            } else {
                // Клик не на соседнюю — выбираем новую фишку
                highlightCell(this.boardElement, sr, sc, false);
                this.selectedCell = { row, col };
                highlightCell(this.boardElement, row, col, true);
            }
        }
    }
    
    /**
     * Выполнение обмена фишек
     * @param {number} r1 - строка первой фишки
     * @param {number} c1 - колонка первой фишки
     * @param {number} r2 - строка второй фишки
     * @param {number} c2 - колонка второй фишки
     */
    performSwap(r1, c1, r2, c2) {
        this.isAnimating = true;
        highlightCell(this.boardElement, r1, c1, false);
        this.selectedCell = null;
        
        // Выполняем обмен в сетке
        swapInGrid(this.grid, r1, c1, r2, c2);
        renderBoard(this.boardElement, this.grid);
        
        // Проверяем совпадения
        const matches = findAllMatches(this.grid);
        
        if (matches.length > 0) {
            // Успешный обмен — запускаем каскад
            this.processCascade();
        } else {
            // Неудачный обмен — откатываем
            swapInGrid(this.grid, r1, c1, r2, c2);
            renderBoard(this.boardElement, this.grid);
            this.isAnimating = false;
        }
    }
    
    /**
     * Основной игровой цикл каскада
     */
    async processCascade() {
        let matches = findAllMatches(this.grid);
        
        if (matches.length === 0) {
            // Нет совпадений — проверяем deadlock
            if (!hasValidMoves(this.grid)) {
                shuffleBoard(this.grid);
                renderBoard(this.boardElement, this.grid);
            }
            
            this.isAnimating = false;
            return;
        }
        
        // Обновляем счёт
        this.score += matches.length * CONFIG.BASE_SCORE;
        updateScore(this.scoreDisplay, this.score);
        
        // Удаляем совпадения из сетки
        removeMatches(this.grid, matches);
        
        // Добавляем анимацию исчезновения
        addTileAnimation(this.boardElement, matches, 'removing');
        
        // Ждём анимации исчезновения
        await delay(CONFIG.ANIMATION_REMOVE);
        
        // Применяем гравитацию
        applyGravity(this.grid);
        
        // Заполняем пустоты
        const newTiles = refillBoard(this.grid);
        
        // Перерисовываем доску
        renderBoard(this.boardElement, this.grid);
        
        // Добавляем анимацию падения новых фишек
        addTileAnimation(this.boardElement, newTiles, 'dropping');
        
        // Ждём анимации падения
        await delay(CONFIG.ANIMATION_DROP);
        
        // Рекурсивно проверяем новые совпадения
        await this.processCascade();
    }
}

export default Game;
