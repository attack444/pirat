// ======================== Класс основной логики игры 2048 ========================

export default class Game {
    constructor(boardElement, scoreDisplay, restartBtn) {
        this.boardElement = boardElement;
        this.scoreDisplay = scoreDisplay;
        this.restartBtn = restartBtn;
        
        this.size = 4; // 4x4 сетка
        this.tiles = [];
        this.score = 0;
        this.won = false;
        this.gameOver = false;
        
        this.init();
        this.attachEventListeners();
    }

    /**
     * Инициализация новой игры
     */
    init() {
        this.tiles = [];
        this.score = 0;
        this.won = false;
        this.gameOver = false;
        
        // Создаём пустую сетку
        for (let i = 0; i < this.size * this.size; i++) {
            this.tiles.push(null);
        }
        
        // Добавляем две начальные плитки
        this.addNewTile();
        this.addNewTile();
        
        this.render();
    }

    /**
     * Присоединяет обработчики событий
     */
    attachEventListeners() {
        // Кнопка перезагрузки
        this.restartBtn.addEventListener('click', () => this.init());
        
        // Клавиатура
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
    }

    /**
     * Обработка нажатия клавиш
     */
    handleKeyPress(e) {
        if (this.gameOver || this.won) return;
        
        let moved = false;
        
        switch (e.key) {
            case 'ArrowUp':
                e.preventDefault();
                moved = this.move('up');
                break;
            case 'ArrowDown':
                e.preventDefault();
                moved = this.move('down');
                break;
            case 'ArrowLeft':
                e.preventDefault();
                moved = this.move('left');
                break;
            case 'ArrowRight':
                e.preventDefault();
                moved = this.move('right');
                break;
        }
        
        if (moved) {
            this.addNewTile();
            this.render();
            
            // Проверяем win/lose
            if (this.checkWin()) {
                this.won = true;
                setTimeout(() => alert('🎉 Поздравляем! Вы достигли 2048!'), 300);
            } else if (this.checkGameOver()) {
                this.gameOver = true;
                setTimeout(() => alert('💀 Игра окончена! Нет возможных ходов.'), 300);
            }
        }
    }

    /**
     * Движение плиток в заданном направлении
     */
    move(direction) {
        const oldTiles = JSON.stringify(this.tiles);
        
        switch (direction) {
            case 'left':
                this.moveLeft();
                break;
            case 'right':
                this.moveRight();
                break;
            case 'up':
                this.moveUp();
                break;
            case 'down':
                this.moveDown();
                break;
        }
        
        // Проверяем, изменилась ли сетка
        return oldTiles !== JSON.stringify(this.tiles);
    }

    /**
     * Движение влево
     */
    moveLeft() {
        for (let r = 0; r < this.size; r++) {
            const row = this.getRow(r);
            this.mergeLine(row);
            this.setRow(r, row);
        }
    }

    /**
     * Движение вправо
     */
    moveRight() {
        for (let r = 0; r < this.size; r++) {
            const row = this.getRow(r).reverse();
            this.mergeLine(row);
            this.setRow(r, row.reverse());
        }
    }

    /**
     * Движение вверх
     */
    moveUp() {
        for (let c = 0; c < this.size; c++) {
            const col = this.getColumn(c);
            this.mergeLine(col);
            this.setColumn(c, col);
        }
    }

    /**
     * Движение вниз
     */
    moveDown() {
        for (let c = 0; c < this.size; c++) {
            const col = this.getColumn(c).reverse();
            this.mergeLine(col);
            this.setColumn(c, col.reverse());
        }
    }

    /**
     * Объединяет линию плиток (движение + слияние)
     */
    mergeLine(line) {
        // Сдвигаем все ненулевые элементы влево
        const non_null = line.filter(val => val !== null);
        const zeros = Array(line.length - non_null.length).fill(null);
        
        // Объединяем одинаковые соседние плитки
        for (let i = 0; i < non_null.length - 1; i++) {
            if (non_null[i] === non_null[i + 1]) {
                non_null[i] *= 2;
                this.score += non_null[i];
                non_null.splice(i + 1, 1);
                zeros.push(null);
            }
        }
        
        // Возвращаем нули в конец
        const result = non_null.concat(zeros);
        for (let i = 0; i < line.length; i++) {
            line[i] = result[i];
        }
    }

    /**
     * Получить строку
     */
    getRow(r) {
        const row = [];
        for (let c = 0; c < this.size; c++) {
            row.push(this.tiles[r * this.size + c]);
        }
        return row;
    }

    /**
     * Установить строку
     */
    setRow(r, row) {
        for (let c = 0; c < this.size; c++) {
            this.tiles[r * this.size + c] = row[c];
        }
    }

    /**
     * Получить колонку
     */
    getColumn(c) {
        const col = [];
        for (let r = 0; r < this.size; r++) {
            col.push(this.tiles[r * this.size + c]);
        }
        return col;
    }

    /**
     * Установить колонку
     */
    setColumn(c, col) {
        for (let r = 0; r < this.size; r++) {
            this.tiles[r * this.size + c] = col[r];
        }
    }

    /**
     * Добавляет новую плитку (2 или 4) в случайное пустое место
     */
    addNewTile() {
        const emptyIndices = [];
        for (let i = 0; i < this.tiles.length; i++) {
            if (this.tiles[i] === null) {
                emptyIndices.push(i);
            }
        }
        
        if (emptyIndices.length === 0) return;
        
        const randomIndex = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
        this.tiles[randomIndex] = Math.random() < 0.9 ? 2 : 4;
    }

    /**
     * Проверка победы (достижение 2048)
     */
    checkWin() {
        return this.tiles.some(tile => tile === 2048);
    }

    /**
     * Проверка конца игры (нет пустых ячеек и нет возможных ходов)
     */
    checkGameOver() {
        // Если есть пустые ячейки, ещё можно играть
        if (this.tiles.some(tile => tile === null)) {
            return false;
        }
        
        // Проверяем, возможно ли объединить какие-то плитки
        for (let r = 0; r < this.size; r++) {
            for (let c = 0; c < this.size; c++) {
                const current = this.tiles[r * this.size + c];
                
                // Проверяем соседей
                if (c + 1 < this.size && this.tiles[r * this.size + c + 1] === current) {
                    return false; // Возможно слияние вправо
                }
                if (r + 1 < this.size && this.tiles[(r + 1) * this.size + c] === current) {
                    return false; // Возможно слияние вниз
                }
            }
        }
        
        return true;
    }

    /**
     * Отрисовка доски
     */
    render() {
        this.boardElement.innerHTML = '';
        this.scoreDisplay.textContent = this.score;
        
        for (let i = 0; i < this.tiles.length; i++) {
            const cell = document.createElement('div');
            
            // Если плитка имеет значение, добавляем классы и атрибуты
            if (this.tiles[i] !== null) {
                cell.className = 'tile';
                cell.textContent = this.tiles[i];
                cell.dataset.value = this.tiles[i];
            }
            
            this.boardElement.appendChild(cell);
        }
        
        // Добавляем визуальные эффекты
        if (this.won) {
            this.boardElement.classList.add('won');
        }
    }
}
