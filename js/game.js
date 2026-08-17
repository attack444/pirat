// ======================== Класс основной логики игры 2048 ========================

/**
 * Плитка: { id, value }
 * Доска — плоский массив [size*size], каждый элемент — плитка или null.
 */
export default class Game {
    constructor(config) {
        this.boardElement  = config.boardElement;
        this.size          = config.size          || 4;
        this.target        = config.target        || 2048;
        this.onWin         = config.onWin         || (() => {});
        this.onGameOver    = config.onGameOver    || (() => {});
        this.onScoreUpdate = config.onScoreUpdate || (() => {});
        this.onMove        = config.onMove        || null;
        this.onMerge       = config.onMerge       || null;
        this.onSave        = config.onSave        || null;
        this.onTarget      = config.onTarget      || null;
        this.infinity      = !!config.infinity;

        this.tiles         = [];
        this.score         = 0;
        this.won           = false;
        this.gameOver      = false;
        this.winCelebrated = false;

        // История для кнопки «Отменить ход» (Undo)
        this._history      = [];
        this._nextTileId   = 1;
        this._busy         = false;

        // Пауза (кнопка / авто-пауза при скрытии вкладки)
        this.paused        = false;

        // Статистика партии (для счётчика ходов и достижений)
        this.movesCount        = 0;
        this.totalMerges       = 0;
        this.maxMerge          = 0;
        this.movesWithoutMerge = 0;

        // Рендер (абсолютное позиционирование плиток)
        this._tileEls      = new Map();
        this._pad          = 8;
        this._gap          = 8;
        this._cell         = 100;

        // Touch state
        this._touchStartX = 0;
        this._touchStartY = 0;

        // Bound handlers (нужны для removeEventListener)
        this._keyHandler        = (e) => this._handleKeyPress(e);
        this._touchStartHandler = (e) => this._handleTouchStart(e);
        this._touchEndHandler   = (e) => this._handleTouchEnd(e);

        this.init();
        this._attachEventListeners();
    }

    // ──────────────────────────────────────────────────────────
    // Lifecycle
    // ──────────────────────────────────────────────────────────

    init() {
        this.tiles         = new Array(this.size * this.size).fill(null);
        this.score         = 0;
        this.won           = false;
        this.gameOver      = false;
        this.winCelebrated = false;
        this._history      = [];
        this._nextTileId   = 1;
        this._busy         = false;
        this.paused        = false;
        this.movesCount        = 0;
        this.totalMerges       = 0;
        this.maxMerge          = 0;
        this.movesWithoutMerge = 0;

        this._addNewTile();
        this._addNewTile();

        this._updateGridCSS();
        this.render();
        this.onScoreUpdate(0);
    }

    detachEventListeners() {
        document.removeEventListener('keydown', this._keyHandler);
        this.boardElement.removeEventListener('touchstart', this._touchStartHandler);
        this.boardElement.removeEventListener('touchend',   this._touchEndHandler);
    }

    // ──────────────────────────────────────────────────────────
    // Public interface
    // ──────────────────────────────────────────────────────────

    /** Движение в направлении (D-pad, свайпы, клавиатура). */
    handleMove(direction) {
        if (this.paused || this.gameOver || this._busy) return;

        const prev = {
            tiles: this.tiles.map(t => (t ? { id: t.id, value: t.value } : null)),
            score: this.score,
        };

        const { moved, moves, merges } = this._move(direction);
        if (!moved) return;

        this.movesCount++;
        if (merges === 0) this.movesWithoutMerge++;
        else this.movesWithoutMerge = 0;
        this.totalMerges += merges;
        for (const m of moves) if (m.merge && m.value > this.maxMerge) this.maxMerge = m.value;

        if (this._history.length >= 20) this._history.shift();
        this._history.push(prev);

        this._busy = true;
        this._animateMove(moves, () => {
            this._busy = false;
            this._addNewTile();
            this.render();
            this.onScoreUpdate(this.score);
            if (this.onMove) this.onMove();
            if (merges > 0 && this.onMerge) this.onMerge(merges);
            if (this.onSave) this.onSave();

            if (!this.winCelebrated && this._checkWin()) {
                this.won           = true;
                this.winCelebrated = true;
                if (this.infinity && this.onTarget) {
                    setTimeout(() => this.onTarget(this.score), 350);
                } else {
                    setTimeout(() => this.onWin(this.score), 350);
                }
            } else if (!this.won && this._checkGameOver()) {
                this.gameOver = true;
                setTimeout(() => this.onGameOver(this.score), 350);
            }
        });
    }

    /** Отменить последний ход. */
    undo() {
        if (this._busy) return false;
        const prev = this._history.pop();
        if (!prev) return false;

        this.tiles         = prev.tiles;
        this.score         = prev.score;
        this.won           = false;
        this.gameOver      = false;
        this.winCelebrated = false;
        if (this.movesCount > 0) this.movesCount--;

        this.render();
        this.onScoreUpdate(this.score);
        if (this.onSave) this.onSave();
        return true;
    }

    canUndo() { return this._history.length > 0; }

    /** Приостановить / возобновить игру (блокирует ходы). */
    setPaused(paused) {
        this.paused = !!paused;
    }

    /** Сериализация текущей партии для сохранения. */
    getState() {
        return {
            tiles: this.tiles.map(t => (t ? { value: t.value } : null)),
            score: this.score,
            nextTileId: this._nextTileId,
            moves: this.movesCount,
        };
    }

    /** Восстановление сохранённой партии. */
    loadState(state) {
        this.tiles = (state.tiles || []).map(t =>
            t ? { id: this._nextTileId++, value: t.value } : null
        );
        if (this.tiles.length !== this.size * this.size) {
            this.init();
            return;
        }
        this.score         = state.score || 0;
        this.won           = false;
        this.gameOver      = false;
        this.winCelebrated = false;
        this._history      = [];
        this._nextTileId   = Math.max(this._nextTileId, state.nextTileId || this.tiles.length + 1);
        this.movesCount    = state.moves || 0;

        this._updateGridCSS();
        this.render();
        this.onScoreUpdate(this.score);
    }

    /** Максимальное значение плитки на доске. */
    getMaxTile() {
        let max = 0;
        for (const t of this.tiles) if (t && t.value > max) max = t.value;
        return max;
    }

    /** Количество сделанных ходов в текущей партии. */
    getMoves() { return this.movesCount; }

    /** Статистика партии для достижений. */
    getStats() {
        return {
            moves:       this.movesCount,
            merges:      this.totalMerges,
            maxMerge:    this.maxMerge,
            movesWithoutMerge: this.movesWithoutMerge,
        };
    }

    /**
     * Подсказка: оценивает все 4 направления и возвращает лучший ход.
     * @returns {{direction:string, fromIndices:number[]} | null}
     */
    hint() {
        if (this.gameOver || this._busy) return null;

        const dirs         = ['up', 'down', 'left', 'right'];
        const original     = this.tiles;
        const originalScore = this.score;
        const snapshot     = () => original.map(t => (t ? { id: t.id, value: t.value } : null));

        let bestDir  = null;
        let bestEval = -Infinity;

        for (const dir of dirs) {
            this.tiles = snapshot();
            this.score = 0;
            const { moved } = this._move(dir);
            if (!moved) {
                this.tiles  = original;
                this.score  = originalScore;
                continue;
            }
            const ev = this._evalBoard(this.tiles);
            this.tiles = original;
            this.score = originalScore;
            if (ev > bestEval) { bestEval = ev; bestDir = dir; }
        }

        if (!bestDir) return null;

        // Индексы плиток, которые сдвинутся/сольются при лучшем ходе
        const after = snapshot();
        this.tiles = after;
        this.score = 0;
        this._move(bestDir);
        this.tiles = original;
        this.score = originalScore;

        const fromIndices = [];
        for (let i = 0; i < original.length; i++) {
            if (original[i] && (!after[i] || after[i].value !== original[i].value)) {
                fromIndices.push(i);
            }
        }

        return { direction: bestDir, fromIndices };
    }

    /** Эвристическая оценка доски: пустые клетки, слияния, монотонность. */
    _evalBoard(tiles) {
        const n = this.size;
        let s = 0;
        for (const t of tiles) if (t === null) s += 60;
        for (const t of tiles) if (t) s += t.value * 0.8;
        for (let r = 0; r < n; r++) {
            for (let c = 0; c < n; c++) {
                const v = tiles[r * n + c] ? tiles[r * n + c].value : 0;
                if (c + 1 < n) {
                    const v2 = tiles[r * n + c + 1] ? tiles[r * n + c + 1].value : 0;
                    if (v && v === v2) s += v * 1.6;
                }
                if (r + 1 < n) {
                    const v2 = tiles[(r + 1) * n + c] ? tiles[(r + 1) * n + c].value : 0;
                    if (v && v === v2) s += v * 1.6;
                }
            }
        }
        s += this._monotonicScore(tiles);
        return s;
    }

    /** Поощряем «лестницы» значений в строках и столбцах. */
    _monotonicScore(tiles) {
        const n = this.size;
        let score = 0;
        for (let r = 0; r < n; r++) {
            for (let c = 0; c < n - 1; c++) {
                const a = tiles[r * n + c] ? tiles[r * n + c].value : 0;
                const b = tiles[r * n + c + 1] ? tiles[r * n + c + 1].value : 0;
                if (a >= b) score += (a - b) + 1;
                else score -= (b - a) * 0.1;
            }
        }
        for (let c = 0; c < n; c++) {
            for (let r = 0; r < n - 1; r++) {
                const a = tiles[r * n + c] ? tiles[r * n + c].value : 0;
                const b = tiles[(r + 1) * n + c] ? tiles[(r + 1) * n + c].value : 0;
                if (a >= b) score += (a - b) + 1;
                else score -= (b - a) * 0.1;
            }
        }
        return score;
    }

    // ──────────────────────────────────────────────────────────
    // Event handling
    // ──────────────────────────────────────────────────────────

    _attachEventListeners() {
        document.addEventListener('keydown', this._keyHandler);
        this.boardElement.addEventListener('touchstart', this._touchStartHandler, { passive: false });
        this.boardElement.addEventListener('touchend',   this._touchEndHandler,   { passive: false });
    }

    _handleKeyPress(e) {
        // Ctrl+Z / Cmd+Z или Backspace — отменить ход
        if ((e.key === 'z' || e.key === 'Z') && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            this.undo();
            return;
        }
        if (e.key === 'Backspace') {
            e.preventDefault();
            this.undo();
            return;
        }

        const map = {
            ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
            w: 'up', W: 'up', s: 'down', S: 'down', a: 'left', A: 'left', d: 'right', D: 'right',
        };
        const dir = map[e.key];
        if (dir) {
            e.preventDefault();
            this.handleMove(dir);
        }
    }

    _handleTouchStart(e) {
        if (e.touches.length !== 1) return;
        this._touchStartX = e.touches[0].clientX;
        this._touchStartY = e.touches[0].clientY;
        e.preventDefault();
    }

    _handleTouchEnd(e) {
        if (e.changedTouches.length !== 1) return;
        const dx = e.changedTouches[0].clientX - this._touchStartX;
        const dy = e.changedTouches[0].clientY - this._touchStartY;
        const MIN_SWIPE = 40;

        if (Math.abs(dx) > Math.abs(dy)) {
            if (Math.abs(dx) >= MIN_SWIPE) this.handleMove(dx > 0 ? 'right' : 'left');
        } else {
            if (Math.abs(dy) >= MIN_SWIPE) this.handleMove(dy > 0 ? 'down' : 'up');
        }
        e.preventDefault();
    }

    // ──────────────────────────────────────────────────────────
    // Grid helpers
    // ──────────────────────────────────────────────────────────

    _updateGridCSS() {
        this.boardElement.style.gridTemplateColumns = `repeat(${this.size}, 1fr)`;
        this.boardElement.style.gridTemplateRows    = `repeat(${this.size}, 1fr)`;
        this.boardElement.className = `board size-${this.size}`;
    }

    /** Линии чтения по направлению: массив массивов индексов. */
    _getLines(direction) {
        const lines = [];
        for (let a = 0; a < this.size; a++) {
            const line = [];
            for (let b = 0; b < this.size; b++) {
                let idx;
                if (direction === 'left')  idx = a * this.size + b;
                if (direction === 'right') idx = a * this.size + (this.size - 1 - b);
                if (direction === 'up')    idx = b * this.size + a;
                if (direction === 'down')  idx = (this.size - 1 - b) * this.size + a;
                line.push(idx);
            }
            lines.push(line);
        }
        return lines;
    }

    /**
     * Перемещение и слияние. Мутирует this.tiles.
     * @returns {{moved:boolean, moves:Array, merges:number}}
     * moves: { id, from, to, consumed, merge, value }
     */
    _move(direction) {
        const lines  = this._getLines(direction);
        const moves  = [];
        let moved    = false;
        let merges   = 0;

        for (const indices of lines) {
            const items = [];
            for (const idx of indices) {
                const t = this.tiles[idx];
                if (t !== null) items.push({ from: idx, tile: t });
            }

            let wi = 0; // курсор записи в линии
            for (let k = 0; k < items.length; k++) {
                const { from, tile } = items[k];
                const to   = indices[wi];
                const next = items[k + 1];

                if (next && next.tile.value === tile.value) {
                    const survivor = { id: tile.id, value: tile.value * 2 };
                    this.tiles[to] = survivor;
                    moves.push({ id: tile.id, from, to, consumed: false, merge: true, value: survivor.value });
                    moves.push({ id: next.tile.id, from: next.from, to, consumed: true, merge: true, value: survivor.value });
                    this.score += survivor.value;
                    merges++;
                    k++; // поглощённая плитка пропускается
                } else {
                    this.tiles[to] = tile;
                    if (from !== to) moved = true;
                    moves.push({ id: tile.id, from, to, consumed: false, merge: false, value: tile.value });
                }
                wi++;
            }

            while (wi < indices.length) {
                const idx = indices[wi];
                if (this.tiles[idx] !== null) moved = true;
                this.tiles[idx] = null;
                wi++;
            }
        }

        return { moved, moves, merges };
    }

    // ──────────────────────────────────────────────────────────
    // Tile spawning
    // ──────────────────────────────────────────────────────────

    _addNewTile() {
        const empty = [];
        for (let i = 0; i < this.tiles.length; i++) if (this.tiles[i] === null) empty.push(i);
        if (empty.length === 0) return;
        const idx = empty[Math.floor(Math.random() * empty.length)];
        this.tiles[idx] = { id: this._nextTileId++, value: Math.random() < 0.9 ? 2 : 4, justSpawned: true };
    }

    // ──────────────────────────────────────────────────────────
    // Win / loss checks
    // ──────────────────────────────────────────────────────────

    _checkWin() {
        return this.tiles.some(t => t !== null && t.value >= this.target);
    }

    _checkGameOver() {
        if (this.tiles.some(t => t === null)) return false;

        for (let r = 0; r < this.size; r++) {
            for (let c = 0; c < this.size; c++) {
                const cur = this.tiles[r * this.size + c];
                if (c + 1 < this.size && this.tiles[r * this.size + c + 1].value === cur.value) return false;
                if (r + 1 < this.size && this.tiles[(r + 1) * this.size + c].value  === cur.value) return false;
            }
        }
        return true;
    }

    // ──────────────────────────────────────────────────────────
    // Rendering (плитки позиционируются абсолютно внутри .board)
    // ──────────────────────────────────────────────────────────

    render() {
        this._ensureCells();
        this.boardElement.querySelectorAll('.tile').forEach(el => el.remove());
        this._tileEls.clear();
        this._layout();

        this.tiles.forEach((tile, i) => {
            if (!tile) return;
            const appear = !!tile.justSpawned;
            tile.justSpawned = false;
            this._createTileEl(tile, i, appear);
        });

        this.boardElement.classList.toggle('won', this.won);
    }

    _ensureCells() {
        const count = this.size * this.size;
        const cells = this.boardElement.querySelectorAll(':scope > .cell');
        if (cells.length !== count) {
            this.boardElement.innerHTML = '';
            this._tileEls.clear();
            for (let i = 0; i < count; i++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                this.boardElement.appendChild(cell);
            }
        }
    }

    _layout() {
        const style = getComputedStyle(this.boardElement);
        const pad   = parseFloat(style.paddingLeft) || 8;
        const gap   = parseFloat(style.columnGap)   || 8;
        const inner = this.boardElement.clientWidth - pad * 2;
        const cell  = (inner - gap * (this.size - 1)) / this.size;
        this._pad  = pad;
        this._gap  = gap;
        this._cell = Math.max(cell, 1);
    }

    _posForIndex(i) {
        const r = Math.floor(i / this.size);
        const c = i % this.size;
        return {
            x: this._pad + c * (this._cell + this._gap),
            y: this._pad + r * (this._cell + this._gap),
        };
    }

    _createTileEl(tile, i, appear) {
        const el = document.createElement('div');
        el.className = 'tile' + (appear ? ' new' : '');
        el.dataset.value = tile.value;
        el.dataset.id = tile.id;
        el.textContent = tile.value;

        const { x, y } = this._posForIndex(i);
        el.style.width  = this._cell + 'px';
        el.style.height = this._cell + 'px';
        el.style.setProperty('--tx', x + 'px');
        el.style.setProperty('--ty', y + 'px');

        this._tileEls.set(tile.id, el);
        this.boardElement.appendChild(el);
        return el;
    }

    /** Анимация скольжения + «отскок» слитых плиток, затем финальный рендер. */
    _animateMove(moves, cb) {
        this._layout();

        const affected = [];
        for (const m of moves) {
            const el = this._tileEls.get(m.id);
            if (!el) continue;
            affected.push({ el, m });
            el.style.transition = 'none';
            const p = this._posForIndex(m.from);
            el.style.transform = `translate(${p.x}px, ${p.y}px)`;
        }

        // Force reflow — «from»-позиции должны примениться до начала перехода
        void this.boardElement.offsetWidth;

        for (const { el, m } of affected) {
            const p = this._posForIndex(m.to);
            el.style.transition = 'transform 140ms ease-in-out, opacity 140ms ease-in-out';
            if (m.consumed) {
                el.style.opacity = '0';
            } else if (m.merge) {
                el.textContent  = m.value;
                el.dataset.value = m.value;
                el.style.transform = `translate(${p.x}px, ${p.y}px) scale(1.18)`;
            } else {
                el.style.transform = `translate(${p.x}px, ${p.y}px)`;
            }
        }

        // «Отскок» слитых плиток к нормальному размеру
        const mergedEls = affected.filter(({ m }) => m.merge && !m.consumed);
        setTimeout(() => {
            for (const { el, m } of mergedEls) {
                const p = this._posForIndex(m.to);
                el.style.transition = 'transform 130ms ease-in-out';
                el.style.transform = `translate(${p.x}px, ${p.y}px) scale(1)`;
            }
        }, 70);

        setTimeout(() => {
            for (const { el } of affected) el.remove();
            cb();
        }, 220);
    }
}
