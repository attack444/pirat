// ======================== Класс основной логики игры 2048 ========================

export default class Game {
    /**
     * @param {object} config
     * @param {HTMLElement} config.boardElement
     * @param {number}      [config.size=4]      grid size (4, 5 or 6)
     * @param {number}      [config.target=2048]  tile value needed to win
     * @param {function}    [config.onWin]        called with (score) when target reached
     * @param {function}    [config.onGameOver]   called with (score) when no moves remain
     * @param {function}    [config.onScoreUpdate] called with (score) on every score change
     */
    constructor(config) {
        this.boardElement  = config.boardElement;
        this.size          = config.size          || 4;
        this.target        = config.target        || 2048;
        this.onWin         = config.onWin         || (() => {});
        this.onGameOver    = config.onGameOver    || (() => {});
        this.onScoreUpdate = config.onScoreUpdate || (() => {});

        this.tiles         = [];
        this.score         = 0;
        this.won           = false;
        this.gameOver      = false;
        this.winCelebrated = false;

        // Touch state
        this._touchStartX = 0;
        this._touchStartY = 0;

        // Bound handlers (needed for removeEventListener)
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

    /** Move in a direction from external code (D-pad buttons, etc.) */
    handleMove(direction) {
        if (this.gameOver) return;

        const moved = this._move(direction);

        if (moved) {
            this._addNewTile();
            this.render();
            this.onScoreUpdate(this.score);

            if (!this.winCelebrated && this._checkWin()) {
                this.won           = true;
                this.winCelebrated = true;
                setTimeout(() => this.onWin(this.score), 350);
            } else if (!this.won && this._checkGameOver()) {
                this.gameOver = true;
                setTimeout(() => this.onGameOver(this.score), 350);
            }
        }
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

    _getRow(r) {
        return Array.from({ length: this.size }, (_, c) => this.tiles[r * this.size + c]);
    }

    _setRow(r, row) {
        for (let c = 0; c < this.size; c++) this.tiles[r * this.size + c] = row[c];
    }

    _getCol(c) {
        return Array.from({ length: this.size }, (_, r) => this.tiles[r * this.size + c]);
    }

    _setCol(c, col) {
        for (let r = 0; r < this.size; r++) this.tiles[r * this.size + c] = col[r];
    }

    // ──────────────────────────────────────────────────────────
    // Move & merge logic
    // ──────────────────────────────────────────────────────────

    _move(direction) {
        const snapshot = JSON.stringify(this.tiles);

        switch (direction) {
            case 'left':  for (let r = 0; r < this.size; r++) { const row = this._getRow(r); this._mergeLine(row); this._setRow(r, row); } break;
            case 'right': for (let r = 0; r < this.size; r++) { const row = this._getRow(r).reverse(); this._mergeLine(row); this._setRow(r, row.reverse()); } break;
            case 'up':    for (let c = 0; c < this.size; c++) { const col = this._getCol(c); this._mergeLine(col); this._setCol(c, col); } break;
            case 'down':  for (let c = 0; c < this.size; c++) { const col = this._getCol(c).reverse(); this._mergeLine(col); this._setCol(c, col.reverse()); } break;
        }

        return snapshot !== JSON.stringify(this.tiles);
    }

    _mergeLine(line) {
        const vals = line.filter(v => v !== null);

        for (let i = 0; i < vals.length - 1; i++) {
            if (vals[i] === vals[i + 1]) {
                vals[i] *= 2;
                this.score += vals[i];
                vals.splice(i + 1, 1);
            }
        }

        while (vals.length < line.length) vals.push(null);
        for (let i = 0; i < line.length; i++) line[i] = vals[i];
    }

    // ──────────────────────────────────────────────────────────
    // Tile spawning
    // ──────────────────────────────────────────────────────────

    _addNewTile() {
        const empty = this.tiles.reduce((acc, v, i) => (v === null ? [...acc, i] : acc), []);
        if (empty.length === 0) return;
        const idx = empty[Math.floor(Math.random() * empty.length)];
        this.tiles[idx] = Math.random() < 0.9 ? 2 : 4;
    }

    // ──────────────────────────────────────────────────────────
    // Win / loss checks
    // ──────────────────────────────────────────────────────────

    _checkWin() {
        return this.tiles.some(v => v !== null && v >= this.target);
    }

    _checkGameOver() {
        if (this.tiles.some(v => v === null)) return false;

        for (let r = 0; r < this.size; r++) {
            for (let c = 0; c < this.size; c++) {
                const cur = this.tiles[r * this.size + c];
                if (c + 1 < this.size && this.tiles[r * this.size + c + 1] === cur) return false;
                if (r + 1 < this.size && this.tiles[(r + 1) * this.size + c]  === cur) return false;
            }
        }
        return true;
    }

    // ──────────────────────────────────────────────────────────
    // Rendering
    // ──────────────────────────────────────────────────────────

    render() {
        this.boardElement.innerHTML = '';

        this.tiles.forEach(value => {
            const cell = document.createElement('div');
            if (value !== null) {
                cell.className       = 'tile';
                cell.dataset.value   = value;
                cell.textContent     = value;
            }
            this.boardElement.appendChild(cell);
        });

        this.boardElement.classList.toggle('won', this.won);
    }
}
