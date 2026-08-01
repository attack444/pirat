// ======================== Инициализация и управление игрой ========================

import Game from './game.js';
import { applyPlatform, hapticLight } from './platform.js';

// ──────────────────────────────────────────────────────────
// Уровни: ранг, размер поля, целевое значение плитки
// ──────────────────────────────────────────────────────────
const LEVELS = [
    { id: 1, name: 'Юнга',             rank: '⚓',    size: 4, target: 256  },
    { id: 2, name: 'Матрос',            rank: '🗺️',   size: 4, target: 512  },
    { id: 3, name: 'Буканьер',          rank: '⚔️',   size: 4, target: 1024 },
    { id: 4, name: 'Корсар',            rank: '🦜',    size: 4, target: 2048 },
    { id: 5, name: 'Капитан',           rank: '🚢',    size: 5, target: 2048 },
    { id: 6, name: 'Адмирал',           rank: '🏴‍☠️', size: 5, target: 4096 },
    { id: 7, name: 'Пиратский Король',  rank: '👑',    size: 6, target: 4096 },
];

const STORAGE_KEY = 'pirate2048_v1';

// ──────────────────────────────────────────────────────────
// Хранилище прогресса
// ──────────────────────────────────────────────────────────
function loadState() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) return JSON.parse(raw);
    } catch (_) {}
    return { currentLevel: 1, unlockedLevels: [1], bestScores: {}, bestTotal: 0 };
}

function saveState(state) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_) {}
}

// ──────────────────────────────────────────────────────────
// Вспомогательные функции DOM
// ──────────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);

function showModal(el) {
    el.classList.add('visible');
}

function hideModal(el) {
    el.classList.remove('visible');
}

// ──────────────────────────────────────────────────────────
// Запуск приложения
// ──────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    const platform = await applyPlatform();

    // DOM-элементы
    const boardEl        = $('board');
    const scoreEl        = $('score');
    const bestEl         = $('best-score');
    const levelNumEl     = $('level-display');
    const levelNameEl    = $('level-name');
    const levelTargetEl  = $('level-target');
    const restartBtn     = $('restart-btn');
    const levelSelectBtn = $('level-select-btn');
    const fullscreenBtn  = $('fullscreen-btn');

    const gameModal      = $('game-modal');
    const modalIcon      = $('modal-icon');
    const modalTitle     = $('modal-title');
    const modalMessage   = $('modal-message');
    const modalScore     = $('modal-score-value');
    const modalActions   = $('modal-actions');

    const levelModal     = $('level-modal');
    const levelsGrid     = $('levels-grid');
    const closeLevelBtn  = $('close-level-modal');

    const dpadUp    = $('dpad-up');
    const dpadDown  = $('dpad-down');
    const dpadLeft  = $('dpad-left');
    const dpadRight = $('dpad-right');

    let state = loadState();
    let game  = null;
    let lastScore = 0;

    // На нативных приложениях кнопка fullscreen не нужна — уже полный экран
    if (platform.isNative && fullscreenBtn) {
        fullscreenBtn.hidden = true;
    }

    // ── Helpers ──────────────────────────────────────────────

    function currentLevelDef() {
        return LEVELS.find(l => l.id === state.currentLevel) || LEVELS[0];
    }

    function updateHeader() {
        const lv = currentLevelDef();
        levelNumEl.textContent    = lv.id;
        levelNameEl.textContent   = `${lv.rank} ${lv.name}`;
        levelTargetEl.textContent = lv.target.toLocaleString('ru');
        bestEl.textContent        = (state.bestTotal || 0).toLocaleString('ru');
    }

    // ── Запуск уровня ────────────────────────────────────────

    function startLevel(levelId) {
        if (game) game.detachEventListeners();

        state.currentLevel = levelId;
        lastScore = 0;
        saveState(state);
        updateHeader();

        const lv = currentLevelDef();

        game = new Game({
            boardElement:  boardEl,
            size:          lv.size,
            target:        lv.target,
            onScoreUpdate: (score) => {
                const prev = lastScore;
                lastScore = score;
                scoreEl.textContent = score.toLocaleString('ru');
                if (score > (state.bestTotal || 0)) {
                    state.bestTotal = score;
                    bestEl.textContent = score.toLocaleString('ru');
                    saveState(state);
                }
                // Вибрация только при слиянии (рост очков) — iOS/Android
                if (platform.isNative && score > prev) hapticLight();
            },
            onWin: (score) => {
                // Разблокируем следующий уровень
                const next = state.currentLevel + 1;
                if (next <= LEVELS.length && !state.unlockedLevels.includes(next)) {
                    state.unlockedLevels.push(next);
                }
                if (!state.bestScores[state.currentLevel] || score > state.bestScores[state.currentLevel]) {
                    state.bestScores[state.currentLevel] = score;
                }
                saveState(state);
                showWinModal(score, state.currentLevel === LEVELS.length);
            },
            onGameOver: (score) => {
                if (!state.bestScores[state.currentLevel] || score > state.bestScores[state.currentLevel]) {
                    state.bestScores[state.currentLevel] = score;
                    saveState(state);
                }
                showGameOverModal(score);
            },
        });
    }

    // ── Модальные окна ───────────────────────────────────────

    function clearModalActions() { modalActions.innerHTML = ''; }

    function addModalBtn(text, cls, onClick) {
        const btn = document.createElement('button');
        btn.className = `btn ${cls}`;
        btn.textContent = text;
        btn.addEventListener('click', onClick);
        modalActions.appendChild(btn);
    }

    function showWinModal(score, isLast) {
        modalIcon.textContent    = isLast ? '👑' : '🎉';
        modalTitle.textContent   = isLast ? 'Ты — Пиратский Король!' : 'Уровень пройден!';
        modalMessage.textContent = isLast
            ? 'Все 7 уровней позади. Ты — легенда!'
            : `Ты достиг ${currentLevelDef().target.toLocaleString('ru')}! Поздравляем!`;
        modalScore.textContent   = score.toLocaleString('ru');

        clearModalActions();

        if (!isLast) {
            addModalBtn('⚓ Следующий уровень', 'btn-primary', () => {
                hideModal(gameModal);
                startLevel(state.currentLevel + 1);
            });
        } else {
            addModalBtn('🔄 Играть сначала', 'btn-primary', () => {
                hideModal(gameModal);
                startLevel(1);
            });
        }

        addModalBtn('▶ Продолжить игру', 'btn-secondary', () => {
            hideModal(gameModal);
            game.won = false;
        });

        addModalBtn('🔄 Заново', 'btn-ghost', () => {
            hideModal(gameModal);
            game.init();
            scoreEl.textContent = '0';
        });

        showModal(gameModal);
    }

    function showGameOverModal(score) {
        modalIcon.textContent    = '💀';
        modalTitle.textContent   = 'Игра окончена';
        modalMessage.textContent = 'Нет доступных ходов. Попробуй ещё!';
        modalScore.textContent   = score.toLocaleString('ru');

        clearModalActions();

        addModalBtn('🔄 Попробовать снова', 'btn-primary', () => {
            hideModal(gameModal);
            game.init();
            scoreEl.textContent = '0';
        });

        addModalBtn('📜 Выбор уровня', 'btn-secondary', () => {
            hideModal(gameModal);
            openLevelModal();
        });

        showModal(gameModal);
    }

    // ── Выбор уровня ─────────────────────────────────────────

    function buildLevelsGrid() {
        levelsGrid.innerHTML = '';

        LEVELS.forEach(lv => {
            const unlocked  = state.unlockedLevels.includes(lv.id);
            const best      = state.bestScores[lv.id];
            const completed = best !== undefined;
            const isCurrent = lv.id === state.currentLevel;

            const card = document.createElement('div');
            card.className = [
                'level-card',
                unlocked  ? 'unlocked'  : 'locked',
                isCurrent ? 'current'   : '',
                completed ? 'completed' : '',
            ].filter(Boolean).join(' ');

            card.innerHTML = `
                <div class="lc-header">
                    <span class="lc-num">${unlocked ? lv.id : '🔒'}</span>
                    ${completed ? '<span class="lc-check">✓</span>' : ''}
                </div>
                <div class="lc-rank">${lv.rank}</div>
                <div class="lc-name">${lv.name}</div>
                <div class="lc-grid">${lv.size}×${lv.size}</div>
                <div class="lc-target">→ ${lv.target.toLocaleString('ru')}</div>
                ${best ? `<div class="lc-best">🏆 ${best.toLocaleString('ru')}</div>` : ''}
            `;

            if (unlocked) {
                card.addEventListener('click', () => {
                    hideModal(levelModal);
                    startLevel(lv.id);
                });
            }

            levelsGrid.appendChild(card);
        });
    }

    function openLevelModal() {
        buildLevelsGrid();
        showModal(levelModal);
    }

    // ── Полный экран ─────────────────────────────────────────

    function toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {});
        } else {
            document.exitFullscreen().catch(() => {});
        }
    }

    document.addEventListener('fullscreenchange', () => {
        const fs = !!document.fullscreenElement;
        document.body.classList.toggle('is-fullscreen', fs);
        fullscreenBtn.textContent = fs ? '⊡' : '⛶';
        fullscreenBtn.title       = fs ? 'Выйти из полного экрана' : 'Полный экран';
    });

    // ── Кнопки управления ────────────────────────────────────

    restartBtn.addEventListener('click', () => {
        if (game) { lastScore = 0; game.init(); scoreEl.textContent = '0'; }
    });

    levelSelectBtn.addEventListener('click', openLevelModal);
    fullscreenBtn.addEventListener('click',  toggleFullscreen);

    closeLevelBtn.addEventListener('click', () => hideModal(levelModal));
    levelModal.addEventListener('click', (e) => {
        if (e.target === levelModal) hideModal(levelModal);
    });

    gameModal.addEventListener('click', (e) => {
        if (e.target === gameModal) hideModal(gameModal);
    });

    // ── D-pad (кнопки-стрелки на экране) ────────────────────

    [[dpadUp, 'up'], [dpadDown, 'down'], [dpadLeft, 'left'], [dpadRight, 'right']].forEach(([btn, dir]) => {
        // click — резервный вариант для мышки/тачпада
        btn.addEventListener('click', () => game?.handleMove(dir));
        // touchstart — быстрее, без задержки 300 мс
        btn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            game?.handleMove(dir);
        }, { passive: false });
    });

    // ── Service Worker (только веб / PWA) ────────────────────

    if (platform.isWeb && 'serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js').catch(() => {});
    }

    // ── Старт ────────────────────────────────────────────────

    updateHeader();
    startLevel(state.currentLevel);

    console.log(`🏴‍☠️ Пират 2048 — платформа: ${platform.name}`);
});
