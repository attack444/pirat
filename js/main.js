// ======================== Инициализация и управление игрой ========================

import Game from './game.js';
import { applyPlatform, hapticLight } from './platform.js';
import { playMove, playMerge, playWin, playGameOver } from './sound.js';
import sdk from './platform-sdk.js';
import { applyLevelWin, applyLevelGameOver, isLevelUnlocked } from './progress.js';
import { resolveConflict, mergeBoardSaves } from './cloud-sync.js';
import { canRevive } from './rewards.js';
import { comboReward, STREAK_THRESHOLD } from './combo.js';
import { LEVELS, levelById, isLastLevel } from './levels.js';
import { ACHIEVEMENTS, evaluateAchievements } from './achievements.js';
import { DAILY_TASKS, ensureDaily as ensureDailyState, dailyMetric as dailyMetricState, checkDaily as checkDailyState } from './daily.js';

const STORAGE_KEY = 'pirate2048_v1';
const SAVE_KEY    = 'pirate2048_saves';

// ──────────────────────────────────────────────────────────
// Хранилище прогресса
// ──────────────────────────────────────────────────────────
function loadState() {
    const defaults = {
        currentLevel: 1,
        unlockedLevels: [1],
        bestScores: {},
        bestTotal: 0,
        gamesPlayed: 0,
        bestTile: 0,
        sound: true,
        theme: 'dark',
        skin: 'gold',
        infinity: false,
        achievements: {},
        hintsUsed: 0,
        undoCount: 0,
        // Дублоны и кастомизация
        doubloons: 0,
        unlockedSkins: ['gold'],
        unlockedThemes: ['dark'],
        // Ежедневные задания
        daily: { date: '', tasks: [], claimed: {} },
        dailyCounters: { moves: 0, merges: 0, wins: 0, hints: 0 },
        // Реклама: кулдаун interstitial
        lastAdTime: 0,
        // Метка последнего изменения — для разрешения конфликтов облако/локально
        updatedAt: 0,
    };
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) return { ...defaults, ...JSON.parse(raw) };
    } catch (_) {}
    return defaults;
}

function saveState(state) {
    state.updatedAt = Date.now();
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_) {}
}

// ──────────────────────────────────────────────────────────
// Вспомогательные функции DOM
// ──────────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);

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
    const undoBtn        = $('undo-btn');
    const soundBtn       = $('sound-btn');
    const settingsBtn    = $('settings-btn');
    const hintBtn        = $('hint-btn');
    const movesEl        = $('moves');

    const gameModal      = $('game-modal');
    const modalIcon      = $('modal-icon');
    const modalTitle     = $('modal-title');
    const modalMessage   = $('modal-message');
    const modalScore     = $('modal-score-value');
    const modalActions   = $('modal-actions');

    const levelModal     = $('level-modal');
    const levelsGrid     = $('levels-grid');
    const closeLevelBtn  = $('close-level-modal');

    const settingsModal     = $('settings-modal');
    const closeSettingsBtn  = $('close-settings-btn');
    const themeOptions      = $('theme-options');
    const skinOptions       = $('skin-options');
    const settingsSound     = $('settings-sound');
    const settingsInfinity  = $('settings-infinity');
    const exportBtn         = $('export-btn');
    const importBtn         = $('import-btn');
    const importFile        = $('import-file');
    const installBtn        = $('install-btn');
    const achievementsGrid  = $('achievements-grid');

    // Загрузочный экран (VK / Yandex)
    const loadingScreen    = $('loading-screen');
    const loadingBarFill   = $('loading-bar-fill');
    const loadingHint      = $('loading-hint');
    // Пауза
    const pauseBtn         = $('pause-btn');
    const pauseOverlay     = $('pause-overlay');
    const resumeBtn        = $('resume-btn');
    const pauseRestartBtn  = $('pause-restart-btn');
    // Дублоны / ежедневные задания / сообщество
    const doubloonsEl      = $('doubloons');
    const comboEl          = $('combo');
    const themePriceHint   = $('theme-price-hint');
    const skinPriceHint    = $('skin-price-hint');
    const dailyList        = $('daily-list');
    const leaderboardBtn   = $('leaderboard-btn');
    const leaderboardModal = $('leaderboard-modal');
    const leaderboardList  = $('leaderboard-list');
    const closeLeaderboardBtn = $('close-leaderboard-btn');
    const shareBtn         = $('share-btn');

    const confettiEl    = $('confetti');
    const toastContainer = $('toast-container');

    const dpadUp    = $('dpad-up');
    const dpadDown  = $('dpad-down');
    const dpadLeft  = $('dpad-left');
    const dpadRight = $('dpad-right');

    let state = loadState();
    let game  = null;
    let lastScore = 0;
    let cloudSaveTimer = null;
    // «Спасение» после game over: счётчик использований в текущей партии,
    // защита от двойного нажатия и отложенный interstitial (отменяется при спасении)
    let reviveCount = 0;
    let reviveBusy = false;
    let pendingInterstitial = null;

    // Сохранение текущей партии (доска + очки) — отдельно для каждого уровня.
    // Живут здесь, т.к. используют game/state из замыкания.
    function loadSaves() {
        try { return JSON.parse(localStorage.getItem(SAVE_KEY)) || {}; } catch (_) { return {}; }
    }

    function saveBoard() {
        if (!game) return;
        const saves = loadSaves();
        saves[state.currentLevel] = { board: game.getState(), ts: Date.now() };
        try { localStorage.setItem(SAVE_KEY, JSON.stringify(saves)); } catch (_) {}
    }

    function clearBoardSave(levelId) {
        const saves = loadSaves();
        delete saves[levelId];
        try { localStorage.setItem(SAVE_KEY, JSON.stringify(saves)); } catch (_) {}
    }

    function restoreBoardIfAny() {
        const saves = loadSaves();
        const saved = saves[state.currentLevel];
        if (!saved || !saved.board || !saved.board.tiles) return false;
        game.loadState(saved.board);
        return true;
    }

    // ── SDK площадок: инициализация + загрузочный экран ──────
    if (loadingBarFill) loadingBarFill.style.width = '10%';
    sdk.setLoadingProgress(10);
    await sdk.init();
    if (loadingHint) loadingHint.textContent = 'Открываем карту сокровищ…';
    if (loadingBarFill) loadingBarFill.style.width = '40%';
    sdk.setLoadingProgress(40);
    if (sdk.isPlatform()) {
        const cloud = await sdk.loadCloud();
        if (cloud) {
            // Единая стратегия: локальное ∪ облачное, настройки — последняя запись.
            // Результат сохраняем локально и возвращаем обратно в облако (сходимость).
            state = resolveConflict(state, cloud.state);
            saveState(state);
            const mergedSaves = mergeBoardSaves(loadSaves(), cloud.saves);
            try { localStorage.setItem(SAVE_KEY, JSON.stringify(mergedSaves)); } catch (_) {}
            pushCloudSave();
        }
    }
    if (loadingHint) loadingHint.textContent = 'Готовим корабль к плаванию…';
    if (loadingBarFill) loadingBarFill.style.width = '70%';
    sdk.setLoadingProgress(70);

    // На нативных приложениях кнопка fullscreen не нужна — уже полный экран
    if (platform.isNative && fullscreenBtn) {
        fullscreenBtn.hidden = true;
    }

    // ── Helpers ──────────────────────────────────────────────

    function currentLevelDef() {
        return levelById(state.currentLevel);
    }

    function updateStats() {
        if (bestEl) bestEl.textContent = (state.bestTotal || 0).toLocaleString('ru');
        const gp = $('games-played'); if (gp) gp.textContent = (state.gamesPlayed || 0).toLocaleString('ru');
        const bt = $('best-tile');    if (bt) bt.textContent = (state.bestTile || 0).toLocaleString('ru');
        if (soundBtn) soundBtn.textContent = state.sound === false ? '🔇' : '🔊';
        updateDoubloons();
    }

    function renderCombo() {
        if (!comboEl) return;
        const s = game ? (game.streak || 0) : 0;
        comboEl.textContent = s.toLocaleString('ru');
        comboEl.classList.toggle('active', s >= STREAK_THRESHOLD);
    }

    function updateMoves() {
        if (movesEl) movesEl.textContent = (game ? game.getMoves() : 0).toLocaleString('ru');
        renderCombo();
    }

    function updateHeader() {
        const lv = currentLevelDef();
        levelNumEl.textContent    = lv.id;
        levelNameEl.textContent   = `${lv.rank} ${lv.name}`;
        levelTargetEl.textContent = lv.target.toLocaleString('ru');
        updateStats();
        updateMoves();
    }

    function updateUndoState() {
        if (undoBtn) undoBtn.disabled = !(game && game.canUndo());
    }

    // Внешний вид: тема и скин
    function applyAppearance() {
        document.body.classList.remove('theme-dark', 'theme-light', 'skin-gold', 'skin-wood', 'skin-gem');
        document.body.classList.add('theme-' + (state.theme || 'dark'));
        document.body.classList.add('skin-' + (state.skin || 'gold'));
    }

    function settingLabel(btn) {
        return btn.dataset.orig || (btn.dataset.orig = btn.textContent.trim().replace(/\s*🔒\s*$/, ''));
    }

    function updateSettingsUI() {
        if (settingsSound)    settingsSound.checked    = state.sound !== false;
        if (settingsInfinity) settingsInfinity.checked = !!state.infinity;
        if (themeOptions) themeOptions.querySelectorAll('.setting-btn').forEach(b => {
            const price = Number(b.dataset.price) || 0;
            const unlocked = price === 0 || (state.unlockedThemes || []).includes(b.dataset.theme);
            b.classList.toggle('locked', !unlocked);
            b.classList.toggle('active', b.dataset.theme === (state.theme || 'dark') && unlocked);
            b.textContent = settingLabel(b) + (unlocked ? '' : ' 🔒');
        });
        if (skinOptions) skinOptions.querySelectorAll('.setting-btn').forEach(b => {
            const price = Number(b.dataset.price) || 0;
            const unlocked = price === 0 || (state.unlockedSkins || []).includes(b.dataset.skin);
            b.classList.toggle('locked', !unlocked);
            b.classList.toggle('active', b.dataset.skin === (state.skin || 'gold') && unlocked);
            b.textContent = settingLabel(b) + (unlocked ? '' : ' 🔒');
        });
        if (themePriceHint) {
            const cur = state.theme || 'dark';
            const b = themeOptions ? themeOptions.querySelector(`.setting-btn[data-theme="${cur}"]`) : null;
            const p = Number(b && b.dataset.price) || 0;
            themePriceHint.textContent = p > 0 ? `· ${p} 🪙` : '';
        }
        if (skinPriceHint) {
            const cur = state.skin || 'gold';
            const b = skinOptions ? skinOptions.querySelector(`.setting-btn[data-skin="${cur}"]`) : null;
            const p = Number(b && b.dataset.price) || 0;
            skinPriceHint.textContent = p > 0 ? `· ${p} 🪙` : '';
        }
        if (installBtn) {
            installBtn.hidden = !installBtn.dataset.available;
        }
    }

    // ── Дублоны — валюта для скинов и тем ────────────────────
    function updateDoubloons() {
        if (doubloonsEl) doubloonsEl.textContent = (state.doubloons || 0).toLocaleString('ru');
    }

    function addDoubloons(n, text, icon = '🪙') {
        if (!n || n <= 0) return;
        state.doubloons = (state.doubloons || 0) + n;
        saveState(state);
        updateDoubloons();
        pushCloudSave();
        showToast(`+${n} дублонов${text ? ' — ' + text : ''}`, icon);
    }

    // ── Облачные сохранения (VK / Yandex) ────────────────────
    function pushCloudSave() {
        if (!sdk.isPlatform()) return;
        clearTimeout(cloudSaveTimer);
        cloudSaveTimer = setTimeout(() => {
            sdk.saveCloud({ state, saves: loadSaves(), ts: Date.now() });
        }, 1500);
    }

    function mergeArr(a, b, fallback) {
        const set = new Set([...(a || []), ...(b || []), ...(fallback || [])]);
        return [...set];
    }


    function escapeHtml(str) {
        return String(str).replace(/[&<>"']/g, (c) => {
            if (c === '&') return '&' + 'amp;';
            if (c === '<') return '&' + 'lt;';
            if (c === '>') return '&' + 'gt;';
            if (c === '"') return '&' + 'quot;';
            return '&' + '#39;';
        });
    }

    // ── Ежедневные задания ───────────────────────────────────
    // Чистая логика (выдача, счётчики, прогресс) — в daily.js.
    function ensureDaily() {
        if (ensureDailyState(state)) saveState(state);
    }

    function checkDaily() {
        ensureDaily();
        checkDailyState(state);
        saveState(state);
        renderDaily();
    }

    function renderDaily() {
        if (!dailyList) return;
        ensureDaily();
        dailyList.innerHTML = '';
        const metrics = dailyMetricState(state);
        for (const t of state.daily.tasks) {
            const def = DAILY_TASKS.find(d => d.id === t.id);
            if (!def) continue;
            const val = Math.min(metrics[def.metric] || 0, def.goal);
            const pct = Math.round((val / def.goal) * 100);
            const el = document.createElement('div');
            el.className = 'daily-task' + (t.done ? ' done' : '');
            el.innerHTML = `
                <div class="daily-head">
                    <span class="daily-icon">${def.icon}</span>
                    <span class="daily-name">${def.name}</span>
                    <span class="daily-reward">+${def.reward} 🪙</span>
                </div>
                <div class="daily-desc">${def.desc}</div>
                <div class="daily-progress"><div class="daily-progress-fill" style="width:${pct}%"></div></div>
                <div class="daily-bottom">
                    <span class="daily-count">${val.toLocaleString('ru')} / ${def.goal.toLocaleString('ru')}</span>
                    ${t.done && !t.claimed
                        ? `<button class="btn btn-small daily-claim" data-daily-id="${t.id}">Забрать</button>`
                        : (t.claimed ? '<span class="daily-claimed">✓ Получено</span>' : '')}
                </div>
            `;
            dailyList.appendChild(el);
        }
        dailyList.querySelectorAll('.daily-claim').forEach(b => {
            b.addEventListener('click', () => claimDaily(b.dataset.dailyId));
        });
    }

    function claimDaily(id) {
        const t = state.daily.tasks.find(x => x.id === id);
        if (!t || !t.done || t.claimed) return;
        const def = DAILY_TASKS.find(d => d.id === id);
        t.claimed = true;
        saveState(state);
        addDoubloons(def ? def.reward : 0, 'ежедневное задание', '📅');
        renderDaily();
    }

    // ── Уведомления (тосты) ──────────────────────────────────

    function showToast(text, icon = '🏆') {
        if (!toastContainer) return;
        const t = document.createElement('div');
        t.className = 'toast';
        t.innerHTML = `<span class="toast-icon">${icon}</span><span>${text}</span>`;
        toastContainer.appendChild(t);
        requestAnimationFrame(() => t.classList.add('show'));
        setTimeout(() => {
            t.classList.remove('show');
            setTimeout(() => t.remove(), 450);
        }, 3500);
    }

    // ── Конфетти (победа / праздник) ─────────────────────────

    function spawnConfetti(count = 80, isBig = false) {
        if (!confettiEl) return;
        confettiEl.innerHTML = '';
        const colors = ['#ffd700', '#ff6b6b', '#4ecdc4', '#ffe66d', '#ff9f43', '#54a0ff', '#f368e0', '#fffa65'];
        const frag = document.createDocumentFragment();
        for (let i = 0; i < count; i++) {
            const p = document.createElement('i');
            p.className = 'confetti-piece';
            p.style.left = (Math.random() * 100) + 'vw';
            p.style.background = colors[i % colors.length];
            p.style.animationDelay = (Math.random() * 0.9) + 's';
            p.style.animationDuration = (2.4 + Math.random() * 2) + 's';
            if (Math.random() < 0.5) p.style.borderRadius = '50%';
            if (isBig) {
                p.style.width  = (8 + Math.random() * 8) + 'px';
                p.style.height = (8 + Math.random() * 8) + 'px';
            }
            frag.appendChild(p);
        }
        confettiEl.appendChild(frag);
        setTimeout(() => { confettiEl.innerHTML = ''; }, 5500);
    }

    // ── Достижения ───────────────────────────────────────────

    function refreshAchievements() {
        if (!achievementsGrid) return;
        achievementsGrid.innerHTML = '';
        for (const a of ACHIEVEMENTS) {
            const unlocked = !!state.achievements[a.id];
            const el = document.createElement('div');
            el.className = 'achievement' + (unlocked ? ' unlocked' : '');
            el.innerHTML = `
                <span class="ach-icon">${unlocked ? a.icon : '🔒'}</span>
                <span class="ach-name">${a.name}</span>
                <span class="ach-desc">${a.desc}</span>
            `;
            achievementsGrid.appendChild(el);
        }
    }

    function checkAchievements() {
        const gs = game ? game.getStats() : null;
        const newly = evaluateAchievements(state, gs);
        if (!newly.length) return;
        saveState(state);
        for (const a of newly) showToast(`${a.name} — ${a.desc}`, a.icon);
        refreshAchievements();
        if (state.sound !== false) playWin();
    }

    // ── Экспорт / импорт сохранений ──────────────────────────

    function exportData() {
        const data = { app: 'pirat2048', version: 1, exported: Date.now(), state, saves: loadSaves() };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'pirat2048-save.json';
        a.click();
        URL.revokeObjectURL(url);
        showToast('Прогресс сохранён в файл', '💾');
    }

    function importData(file) {
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const data = JSON.parse(reader.result);
                if (!data || data.app !== 'pirat2048' || !data.state) throw new Error('bad file');
                state = { ...loadState(), ...data.state };
                saveState(state);
                if (data.saves) {
                    try { localStorage.setItem(SAVE_KEY, JSON.stringify(data.saves)); } catch (_) {}
                }
                applyAppearance();
                updateSettingsUI();
                refreshAchievements();
                startLevel(state.currentLevel || 1);
                showToast('Прогресс загружен из файла', '📂');
            } catch (_) {
                showToast('Не удалось прочитать файл', '⚠️');
            }
        };
        reader.readAsText(file);
    }

    // ── Модальные окна ───────────────────────────────────────

    function showModal(el) { if (el) el.classList.add('visible'); }
    function hideModal(el) { if (el) el.classList.remove('visible'); }

    // ── Запуск уровня ────────────────────────────────────────

    function startLevel(levelId) {
        if (game) game.detachEventListeners();
        if (pauseOverlay) pauseOverlay.classList.remove('visible');

        state.currentLevel = levelId;
        lastScore = 0;
        reviveCount = 0;
        reviveBusy = false;
        saveState(state);
        updateHeader();

        const lv = currentLevelDef();

        game = new Game({
            boardElement:  boardEl,
            size:          lv.size,
            target:        lv.target,
            infinity:      state.infinity === true,
            onScoreUpdate: (score) => {
                const prev = lastScore;
                lastScore = score;
                scoreEl.textContent = score.toLocaleString('ru');
                if (score > (state.bestTotal || 0)) {
                    state.bestTotal = score;
                    saveState(state);
                }
                if (game) {
                    const mt = game.getMaxTile();
                    if (mt > (state.bestTile || 0)) {
                        state.bestTile = mt;
                        saveState(state);
                    }
                }
                updateStats();
                // Вибрация только при слиянии (рост очков) — iOS/Android
                if (platform.isNative && score > prev) hapticLight();
            },
            onMove:  () => {
                if (state.sound !== false) playMove();
                state.dailyCounters.moves = (state.dailyCounters.moves || 0) + 1;
            },
            onMerge: (n) => {
                if (state.sound !== false) playMerge();
                state.dailyCounters.merges = (state.dailyCounters.merges || 0) + (n || 1);
                // Серии и комбо: бонус за множественные слияния в ходе и ходы подряд
                const reward = comboReward({ merges: n, streak: game.streak });
                if (reward.score > 0) {
                    game.addScore(reward.score);
                    showToast(`Комбо ×${reward.mult}! +${reward.score} очков`, '⚡');
                }
                if (reward.doubloons > 0) {
                    addDoubloons(reward.doubloons, reward.mult > 1 ? `комбо ×${reward.mult}` : 'серия');
                }
            },
            onSave:  () => { saveBoard(); saveState(state); updateUndoState(); updateMoves(); checkAchievements(); checkDaily(); pushCloudSave(); },
            onTarget: (score) => {
                // Бесконечный режим: цель достигнута — празднуем и продолжаем
                if (state.sound !== false) playWin();
                spawnConfetti(90, true);
                showToast(`Цель достигнута! Очки: ${score.toLocaleString('ru')}`, '🎉');
            },
            onWin: (score) => {
                const isNewBest = !state.bestScores[state.currentLevel] || score > state.bestScores[state.currentLevel];
                state = applyLevelWin(state, score);
                // Дублоны за победу
                addDoubloons(100, 'победа');
                if (isNewBest) addDoubloons(200, 'новый рекорд уровня', '🏆');
                state.dailyCounters.wins = (state.dailyCounters.wins || 0) + 1;
                saveState(state);
                checkAchievements();
                checkDaily();
                pushCloudSave();
                if (sdk.isPlatform()) sdk.submitScore(score);
                if (state.sound !== false) playWin();
                const isLast = isLastLevel(state.currentLevel);
                spawnConfetti(isLast ? 140 : 80, true);
                showWinModal(score, isLast);
            },
            onGameOver: (score) => {
                const next = applyLevelGameOver(state, score);
                if (next !== state) {
                    state = next;
                    saveState(state);
                }
                checkAchievements();
                checkDaily();
                pushCloudSave();
                if (sdk.isPlatform()) sdk.submitScore(score);
                if (state.sound !== false) playGameOver();
                showGameOverModal(score);
                // Реклама при проигрыше (interstitial) с кулдауном 4 минуты
                const now = Date.now();
                if (sdk.isPlatform() && now - (state.lastAdTime || 0) > 4 * 60 * 1000) {
                    state.lastAdTime = now;
                    saveState(state);
                    pendingInterstitial = setTimeout(() => sdk.showInterstitial(), 1200);
                }
            },
        });

        const restored = restoreBoardIfAny();
        if (restored) {
            lastScore = game.score;
        } else {
            state.gamesPlayed = (state.gamesPlayed || 0) + 1;
            saveState(state);
            updateStats();
        }
        updateUndoState();
        updateMoves();
    }

    function resetCurrentGame() {
        if (!game) return;
        clearBoardSave(state.currentLevel);
        lastScore = 0;
        reviveCount = 0;
        reviveBusy = false;
        game.init();
        scoreEl.textContent = '0';
        state.gamesPlayed = (state.gamesPlayed || 0) + 1;
        saveState(state);
        updateStats();
        updateUndoState();
        updateMoves();
        checkAchievements();
    }

    // ── Модальные окна: победа / конец игры ──────────────────

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
                clearBoardSave(1);
                startLevel(1);
            });
        }

        addModalBtn('▶ Продолжить игру', 'btn-secondary', () => {
            hideModal(gameModal);
            game.won = false;
        });

        addModalBtn('🔄 Заново', 'btn-ghost', () => {
            hideModal(gameModal);
            resetCurrentGame();
        });

        addModalBtn('📣 Поделиться', 'btn-secondary', () => shareResult(score));

        showModal(gameModal);
    }

    function showGameOverModal(score) {
        modalIcon.textContent    = '💀';
        modalTitle.textContent   = 'Игра окончена';
        modalMessage.textContent = 'Нет доступных ходов. Попробуй ещё!';
        modalScore.textContent   = score.toLocaleString('ru');

        clearModalActions();

        // Награда: после game over на площадках — rewarded-ролик, дающий ОДИН шанс
        // продолжить партию с предыдущей позиции (game.undo()).
        if (canRevive({
            platform:   sdk.isPlatform(),
            canUndo:    !!(game && game.canUndo()),
            reviveCount,
            gameOver:   !!(game && game.gameOver),
            won:        !!(game && game.won),
        })) {
            addModalBtn('🎬 Шанс на спасение', 'btn-primary', async () => {
                if (reviveBusy) return;
                reviveBusy = true;
                // Отменяем отложенный interstitial, чтобы не было двух роликов подряд
                clearTimeout(pendingInterstitial);
                const ok = await sdk.showRewarded();
                if (!ok) {
                    reviveBusy = false;
                    showToast('Реклама не показана — попробуй ещё', '⚠️');
                    return;
                }
                reviveCount += 1;
                hideModal(gameModal);
                if (game.undo()) {
                    updateUndoState();
                    updateMoves();
                    showToast('Шанс использован — продолжаем плавание!', '🎬');
                } else {
                    // Крайний случай: история опустела — начинаем партию заново
                    resetCurrentGame();
                }
                reviveBusy = false;
            });
        }

        addModalBtn('🔄 Попробовать снова', 'btn-primary', () => {
            hideModal(gameModal);
            resetCurrentGame();
        });

        addModalBtn('📜 Выбор уровня', 'btn-secondary', () => {
            hideModal(gameModal);
            openLevelModal();
        });

        addModalBtn('📣 Поделиться', 'btn-ghost', () => shareResult(score));

        showModal(gameModal);
    }

    // ── Выбор уровня ─────────────────────────────────────────

    function buildLevelsGrid() {
        levelsGrid.innerHTML = '';

        LEVELS.forEach(lv => {
            const unlocked  = isLevelUnlocked(state, lv.id);
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

    // ── Настройки ────────────────────────────────────────────

    function openSettingsModal() {
        updateSettingsUI();
        refreshAchievements();
        updateDoubloons();
        renderDaily();
        showModal(settingsModal);
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

    // ── PWA: установка приложения ────────────────────────────

    let deferredPrompt = null;
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        if (installBtn) installBtn.dataset.available = '1';
        updateSettingsUI();
    });

    window.addEventListener('appinstalled', () => {
        deferredPrompt = null;
        if (installBtn) { delete installBtn.dataset.available; }
        updateSettingsUI();
        showToast('Приложение установлено!', '📲');
    });

    // ── Кнопки управления ────────────────────────────────────

    restartBtn.addEventListener('click', resetCurrentGame);

    levelSelectBtn.addEventListener('click', openLevelModal);
    fullscreenBtn.addEventListener('click',  toggleFullscreen);

    soundBtn.addEventListener('click', () => {
        state.sound = state.sound === false ? true : false;
        saveState(state);
        updateStats();
        updateSettingsUI();
        if (state.sound !== false) playMerge();
    });

    settingsBtn.addEventListener('click', openSettingsModal);
    closeSettingsBtn.addEventListener('click', () => hideModal(settingsModal));
    settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) hideModal(settingsModal);
    });

    // Тема
    themeOptions.addEventListener('click', (e) => {
        const btn = e.target.closest('.setting-btn');
        if (!btn || !btn.dataset.theme) return;
        const theme = btn.dataset.theme;
        const price = Number(btn.dataset.price) || 0;
        if (price > 0 && !(state.unlockedThemes || []).includes(theme)) {
            if ((state.doubloons || 0) < price) {
                showToast(`Не хватает дублонов — нужно ${price}`, '🪙');
                return;
            }
            state.doubloons -= price;
            state.unlockedThemes = mergeArr(state.unlockedThemes, [theme], ['dark']);
            updateDoubloons();
            saveState(state);
            pushCloudSave();
            showToast('Тема куплена!', '🛍️');
        }
        state.theme = theme;
        saveState(state);
        applyAppearance();
        updateSettingsUI();
    });

    // Скин плиток
    skinOptions.addEventListener('click', (e) => {
        const btn = e.target.closest('.setting-btn');
        if (!btn || !btn.dataset.skin) return;
        const skin = btn.dataset.skin;
        const price = Number(btn.dataset.price) || 0;
        if (price > 0 && !(state.unlockedSkins || []).includes(skin)) {
            if ((state.doubloons || 0) < price) {
                showToast(`Не хватает дублонов — нужно ${price}`, '🪙');
                return;
            }
            state.doubloons -= price;
            state.unlockedSkins = mergeArr(state.unlockedSkins, [skin], ['gold']);
            updateDoubloons();
            saveState(state);
            pushCloudSave();
            showToast('Скин куплен!', '🛍️');
        }
        state.skin = skin;
        saveState(state);
        applyAppearance();
        updateSettingsUI();
        if (state.sound !== false) playMerge();
    });

    // Звук (в настройках)
    settingsSound.addEventListener('change', () => {
        state.sound = settingsSound.checked;
        saveState(state);
        updateStats();
        updateSettingsUI();
        if (state.sound !== false) playMerge();
    });

    // Бесконечный режим
    settingsInfinity.addEventListener('change', () => {
        state.infinity = settingsInfinity.checked;
        saveState(state);
        updateSettingsUI();
    });

    // Экспорт / импорт
    exportBtn.addEventListener('click', exportData);
    importBtn.addEventListener('click', () => importFile && importFile.click());
    importFile.addEventListener('change', () => {
        if (importFile.files && importFile.files[0]) importData(importFile.files[0]);
        importFile.value = '';
    });

    // Установка приложения
    installBtn.addEventListener('click', async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        await deferredPrompt.userChoice;
        deferredPrompt = null;
        if (installBtn) { delete installBtn.dataset.available; }
        updateSettingsUI();
    });

    // Подсказка
    hintBtn.addEventListener('click', async () => {
        if (!game || game.paused) return;
        // На площадках после 3 бесплатных подсказок — реклама за награду
        if (sdk.isPlatform() && (state.hintsUsed || 0) >= 3) {
            showToast('За подсказку — реклама', '🎬');
            const ok = await sdk.showRewarded();
            if (!ok) { showToast('Реклама не показана — попробуй ещё', '⚠️'); return; }
        }
        const h = game.hint();
        if (!h) return;

        state.hintsUsed = (state.hintsUsed || 0) + 1;
        state.dailyCounters.hints = (state.dailyCounters.hints || 0) + 1;
        saveState(state);

        boardEl.querySelectorAll('.tile.hint-flash').forEach(el => el.classList.remove('hint-flash'));
        for (const idx of h.fromIndices) {
            const tile = game.tiles[idx];
            if (!tile) continue;
            const el = boardEl.querySelector(`.tile[data-id="${tile.id}"]`);
            if (el) el.classList.add('hint-flash');
        }
        setTimeout(() => {
            boardEl.querySelectorAll('.tile.hint-flash').forEach(el => el.classList.remove('hint-flash'));
        }, 1100);

        checkAchievements();
        checkDaily();
        if (state.sound !== false) playMove();
    });

    undoBtn.addEventListener('click', async () => {
        if (!game) return;
        // На площадках отмена хода — за рекламу
        if (sdk.isPlatform()) {
            showToast('За отмену хода — реклама', '🎬');
            const ok = await sdk.showRewarded();
            if (!ok) { showToast('Реклама не показана', '⚠️'); return; }
        }
        if (game.undo()) {
            state.undoCount = (state.undoCount || 0) + 1;
            saveState(state);
            checkAchievements();
        }
        updateUndoState();
        updateMoves();
    });

    closeLevelBtn.addEventListener('click', () => hideModal(levelModal));
    levelModal.addEventListener('click', (e) => {
        if (e.target === levelModal) hideModal(levelModal);
    });

    gameModal.addEventListener('click', (e) => {
        if (e.target === gameModal) hideModal(gameModal);
    });

    // ── Лидерборды ───────────────────────────────────────────
    async function openLeaderboard() {
        if (!leaderboardModal || !leaderboardList) return;
        showModal(leaderboardModal);
        leaderboardList.innerHTML = '<div class="lb-loading">⏳ Загружаем рейтинг…</div>';
        let rows = [];
        if (sdk.isPlatform()) rows = await sdk.getLeaderboard();
        if (!rows.length) {
            // Фолбэк для веба: локальный рекорд + рекорды уровней
            const best = state.bestTotal || 0;
            if (best > 0) rows.push({ name: 'Ты (локально)', score: best, isMe: true });
            for (const [id, sc] of Object.entries(state.bestScores || {})) {
                rows.push({ name: `Уровень ${id}`, score: sc, isMe: false });
            }
            rows.sort((a, b) => b.score - a.score);
        }
        if (!rows.length) {
            leaderboardList.innerHTML = '<div class="lb-empty">Пока пусто. Сыграй и побей рекорд! 🏴‍☠️</div>';
            return;
        }
        leaderboardList.innerHTML = '';
        rows.slice(0, 50).forEach((r, i) => {
            const el = document.createElement('div');
            el.className = 'leaderboard-row' + (r.isMe ? ' me' : '');
            el.innerHTML = `
                <span class="lb-pos">${i + 1}</span>
                <span class="lb-name">${r.isMe ? '⭐ ' : ''}${escapeHtml(r.name)}</span>
                <span class="lb-score">${Number(r.score).toLocaleString('ru')}</span>
            `;
            leaderboardList.appendChild(el);
        });
    }

    leaderboardBtn.addEventListener('click', openLeaderboard);
    closeLeaderboardBtn.addEventListener('click', () => hideModal(leaderboardModal));
    leaderboardModal.addEventListener('click', (e) => {
        if (e.target === leaderboardModal) hideModal(leaderboardModal);
    });

    // ── Поделиться результатом ───────────────────────────────
    async function shareResult(score) {
        const text = `🏴‍☠️ Я набрал ${(score || 0).toLocaleString('ru')} очков в «Пират 2048»! Сможешь больше?`;
        const ok = await sdk.share(text);
        if (ok) {
            if (!sdk.isPlatform()) showToast('Ссылка скопирована — отправь друзьям!', '📣');
        } else {
            showToast('Не удалось поделиться', '⚠️');
        }
    }

    shareBtn.addEventListener('click', () => shareResult(state.bestTotal || 0));

    // ── Пауза ────────────────────────────────────────────────
    function setPaused(paused) {
        if (game) game.setPaused(paused);
        if (pauseOverlay) pauseOverlay.classList.toggle('visible', !!paused);
    }

    pauseBtn.addEventListener('click', () => {
        if (!game || game.won || game.gameOver) return;
        setPaused(!game.paused);
    });

    resumeBtn.addEventListener('click', () => setPaused(false));

    pauseRestartBtn.addEventListener('click', () => {
        setPaused(false);
        resetCurrentGame();
    });

    // Авто-пауза при скрытии вкладки / переключении приложения
    document.addEventListener('visibilitychange', () => {
        if (document.hidden && game && !game.paused && !game.gameOver && !game.won
            && !document.querySelector('.modal-overlay.visible')) {
            setPaused(true);
        }
    });

    // Esc — выход из паузы
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && pauseOverlay && pauseOverlay.classList.contains('visible')) {
            setPaused(false);
        }
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

    // ── Перерисовка при изменении размеров (полный экран / поворот) ──

    let resizeTimer = null;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => { if (game) game.render(); }, 120);
    });

    // ── Старт ────────────────────────────────────────────────

    applyAppearance();
    updateHeader();
    updateDoubloons();
    ensureDaily();
    renderDaily();
    startLevel(state.currentLevel);

    // Загрузочный экран завершён
    if (loadingBarFill) loadingBarFill.style.width = '100%';
    sdk.setLoadingProgress(100);
    if (loadingScreen) loadingScreen.classList.add('hidden');
    sdk.loadingReady();

    console.log(`🏴‍☠️ Пират 2048 — платформа: ${platform.name}, SDK: ${sdk.host}`);
});
