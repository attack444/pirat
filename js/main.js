// ======================== Инициализация и управление игрой ========================

import Game from './game.js';
import { applyPlatform, hapticLight } from './platform.js';
import { playMove, playMerge, playWin, playGameOver, suspendSound, resumeSound } from './sound.js';
import sdk from './platform-sdk.js';
import { applyLevelWin, applyLevelGameOver, isLevelUnlocked } from './progress.js';
import { resolveConflict, mergeBoardSaves } from './cloud-sync.js';
import { canRevive } from './rewards.js';
import { comboReward, STREAK_THRESHOLD } from './combo.js';
import { LEVELS, levelById, isLastLevel, tideConfigForLevel, movesConfigForLevel } from './levels.js';
import { ACHIEVEMENTS, evaluateAchievements } from './achievements.js';
import { DAILY_TASKS, ensureDaily as ensureDailyState, dailyMetric as dailyMetricState, checkDaily as checkDailyState } from './daily.js';
import { claimDailyLogin, dailyLoginInfo } from './daily-login.js';
import { getShopItem, itemsByType, ownsItem, buyItem, useBoost, boostCount, ownsPerk, applyCoinReward, effectiveUndoLimit } from './shop.js';

const STORAGE_KEY = 'ocean2048_v1';
const SAVE_KEY    = 'ocean2048_saves';

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
        // Жемчужины и кастомизация
        doubloons: 0,
        unlockedSkins: ['gold'],
        unlockedThemes: ['dark'],
        // Экономика: магазин, ежедневный вход
        inventory: {},
        perks: {},
        dailyStreak: { days: 0, lastClaim: '' },
        // Ежедневные задания
        daily: { date: '', tasks: [], claimed: {} },
        dailyCounters: { moves: 0, merges: 0, wins: 0, hints: 0, undos: 0 },
        // Реклама: кулдаун interstitial
        lastAdTime: 0,
        // Фаза 2: одноразовые соц-бонусы за добавление в избранное / на главный экран
        socialBonuses: {},
        // Метка последнего изменения — для разрешения конфликтов облако/локально
        updatedAt: 0,
        // Онбординг уже показан
        tutorialSeen: false,
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

    // Прилив 🌊 (Фаза 2.5 «Глубина ядра») — индикатор и счётчик
    const tideIndicator = $('tide-indicator');
    const tideBarFill   = $('tide-bar-fill');
    const tideCount     = $('tide-count');

    // «Ходы как ресурс» 🧮 (Фаза 2.5 «Глубина ядра») — индикатор «водоворота»
    const threatIndicator = $('threat-indicator');
    const threatBarFill   = $('threat-bar-fill');
    const threatCount     = $('threat-count');

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
    // Подтверждение перезапуска
    const confirmModal       = $('confirm-modal');
    const confirmRestartYes  = $('confirm-restart-yes');
    const confirmRestartNo   = $('confirm-restart-no');
    // Онбординг
    const tutorialModal      = $('tutorial-modal');
    const tutorialOk         = $('tutorial-ok');
    // Жемчужины / ежедневные задания / сообщество
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
    // Фаза 2: соцмеханики VK
    const inviteBtn       = $('invite-btn');
    const requestBtn      = $('request-btn');
    const storyBtn        = $('story-btn');
    const favoritesBtn    = $('favorites-btn');
    const homeScreenBtn   = $('home-screen-btn');
    // Магазин, ежедневный вход, бусты
    const shopBtn          = $('shop-btn');
    const shopModal        = $('shop-modal');
    const shopTabs         = $('shop-tabs');
    const shopGrid         = $('shop-grid');
    const shopDoubloons    = $('shop-doubloons');
    const closeShopBtn     = $('close-shop-btn');
    const dailyLoginEl     = $('daily-login');
    const dlClaimBtn       = $('dl-claim-btn');
    const dlDays           = $('dl-days');
    const dlWeek           = $('dl-week');
    const dlClose          = $('dl-close');
    const boostShuffleBtn  = $('boost-shuffle');
    const boostShuffleCount = $('boost-shuffle-count');
    const boostBombBtn     = $('boost-bomb');
    const boostBombCount   = $('boost-bomb-count');
    const boostX2Btn       = $('boost-x2');
    const boostX2Count     = $('boost-x2-count');

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

    // Веб-версия: лимит бесплатных отмен хода в день, дальше — жемчужины
    const WEB_UNDO_LIMIT = 3;
    const UNDO_COST = 50;

    // Доступность: пользователь просит меньше анимаций
    const reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

    // Фаза 1: пузырьки-фон за доской (создаются один раз, GPU-анимация)
    const bubblesEl = $('bubbles');
    const BUBBLE_COUNT = 14;
    function spawnBubbles() {
        if (!bubblesEl || reduceMotion) return;
        if (bubblesEl.children.length) return; // уже созданы
        const frag = document.createDocumentFragment();
        for (let i = 0; i < BUBBLE_COUNT; i++) {
            const b = document.createElement('i');
            b.className = 'bub';
            const size = 10 + Math.random() * 34;
            b.style.width  = size + 'px';
            b.style.height = size + 'px';
            b.style.left   = (Math.random() * 100) + '%';
            b.style.setProperty('--bo', (0.25 + Math.random() * 0.4).toFixed(2));
            b.style.setProperty('--sway', (Math.random() * 60 - 30).toFixed(0) + 'px');
            b.style.animationDuration = (7 + Math.random() * 9) + 's';
            b.style.animationDelay    = (-Math.random() * 12) + 's'; // сразу «в полёте»
            frag.appendChild(b);
        }
        bubblesEl.appendChild(frag);
    }

    // Фаза 1: счёт-вверх (count-up). Плавно «докручивает» число от prev до score,
    // при reduce-motion или нулевой разнице сразу ставит итог.
    let scoreAnimTimer = null;
    function animateScore(prev, next) {
        const from = Number(prev) || 0;
        const to   = Number(next) || 0;
        if (reduceMotion || to <= from || !scoreEl) {
            scoreEl.textContent = to.toLocaleString('ru');
            return;
        }
        clearTimeout(scoreAnimTimer);
        const dur = Math.min(450, 120 + (to - from) * 0.6);
        const start = performance.now();
        const step = (now) => {
            const t = Math.min(1, (now - start) / dur);
            const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
            const val = Math.round(from + (to - from) * eased);
            scoreEl.textContent = val.toLocaleString('ru');
            if (t < 1) scoreAnimTimer = requestAnimationFrame(step);
        };
        scoreAnimTimer = requestAnimationFrame(step);
    }

    // Подтверждение перезапуска: откуда вызвано (из паузы или с кнопки «Новая игра»)
    let confirmRestartFromPause = false;

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
    // П. 2.14: автоопределение языка — при запуске (не в процессе игры).
    const detectedLang = sdk.getLang();
    if (detectedLang) document.documentElement.lang = detectedLang;
    if (loadingHint) loadingHint.textContent = 'Открываем глубины океана…';
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

    // ── Разметка геймплея (Yandex GameplayAPI, п. 1.19.3) ─────
    // gameplayActive — идёт ли игровой процесс (для GameplayAPI.start()/stop());
    // gameplayWasActive — был ли геймплей активен до паузы платформы (game_api_pause);
    // platformPaused — пауза, вызванная платформой (реклама, сворачивание окна);
    // gameplayStartPending — старт отложен до game_api_resume (стартовая реклама).
    let gameplayActive = false;
    let gameplayWasActive = false;
    let platformPaused = false;
    let gameplayStartPending = false;

    function markGameplayStart() {
        if (gameplayActive) return;
        // Стартовая полноэкранная реклама: если платформа на паузе, откладываем
        // GameplayAPI.start() до game_api_resume (см. пример в документации).
        if (platformPaused) { gameplayStartPending = true; return; }
        gameplayStartPending = false;
        gameplayActive = true;
        sdk.gameplayStart();
    }
    function markGameplayStop() {
        gameplayStartPending = false;
        if (!gameplayActive) return;
        gameplayActive = false;
        sdk.gameplayStop();
    }

    // П. 1.19.4 + стартовая полноэкранная реклама (см. «Пауза и возобновление»).
    // При game_api_pause глушим звук и ставим геймплей на паузу, при
    // game_api_resume — возобновляем. Если геймплей был остановлен игроком
    // (меню/пауза) до срабатывания game_api_pause, после resume не запускаем.
    const onPlatformPause = () => {
        suspendSound();
        platformPaused = true;
        if (gameplayActive) {
            gameplayWasActive = true;
            if (game && !game.gameOver && !game.won && !game.paused) setPaused(true);
            markGameplayStop();
        }
    };
    const onPlatformResume = () => {
        resumeSound();
        platformPaused = false;
        if (gameplayWasActive) {
            gameplayWasActive = false;
            if (game && !game.gameOver && !game.won && game.paused) setPaused(false);
        }
        if (gameplayStartPending) {
            gameplayStartPending = false;
            markGameplayStart();
        }
    };
    sdk.onPause(onPlatformPause);
    sdk.onResume(onPlatformResume);

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

    /** Обновить индикатор прилива: высота воды + сколько ходов до смыва. */
    function updateTideIndicator() {
        if (!tideIndicator) return;
        const t = game ? game.getTide() : null;
        if (!t) {
            tideIndicator.hidden = true;
            return;
        }
        tideIndicator.hidden = false;
        if (tideBarFill) tideBarFill.style.width = (t.level * 100).toFixed(0) + '%';
        if (tideCount) tideCount.textContent = String(t.movesUntilRise);
        // Тревожный режим: осталось меньше warning ходов
        tideIndicator.classList.toggle('warning', t.movesUntilRise <= t.warning);
    }

    /** Вспышка индикатора в момент смыва нижних рядов. */
    function flashTideSweep() {
        if (!tideIndicator || tideIndicator.hidden) return;
        tideIndicator.classList.remove('sweep');
        void tideIndicator.offsetWidth;
        tideIndicator.classList.add('sweep');
    }

    /** Обновить индикатор «водоворота»: заполнение + сколько ходов до штрафа. */
    function updateThreatIndicator() {
        if (!threatIndicator) return;
        const m = game ? game.getMovesPenalty() : null;
        if (!m) {
            threatIndicator.hidden = true;
            return;
        }
        threatIndicator.hidden = false;
        // Полоса растёт по мере накопления бесполезных ходов подряд
        const ratio = Math.min(1, m.movesWithoutMerge / m.maxWithoutMerge);
        if (threatBarFill) threatBarFill.style.width = (ratio * 100).toFixed(0) + '%';
        if (threatCount) threatCount.textContent = String(m.maxWithoutMerge - m.movesWithoutMerge);
        // Тревожный режим: до водоворота остался 1 ход
        threatIndicator.classList.toggle('warning', m.movesWithoutMerge >= m.maxWithoutMerge - 1);
    }

    /** Вспышка индикатора в момент срабатывания «водоворота». */
    function flashThreatSweep() {
        if (!threatIndicator || threatIndicator.hidden) return;
        threatIndicator.classList.remove('sweep');
        void threatIndicator.offsetWidth;
        threatIndicator.classList.add('sweep');
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
        document.body.classList.remove('theme-dark', 'theme-light', 'theme-forest', 'skin-gold', 'skin-wood', 'skin-gem', 'skin-ice', 'skin-fire', 'skin-storm');
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

    // ── Жемчужины — валюта для скинов и тем ──────────────────
    function updateDoubloons() {
        if (doubloonsEl) doubloonsEl.textContent = (state.doubloons || 0).toLocaleString('ru');
    }

    function addDoubloons(n, text, icon = '🦪') {
        // Перк «Жемчужная жила» (+50%) применяется ко всем наградам
        const gained = applyCoinReward(state, n);
        if (gained <= 0) return;
        state.doubloons = (state.doubloons || 0) + gained;
        saveState(state);
        updateDoubloons();
        pushCloudSave();
        showToast(`+${gained} жемчужин${text ? ' — ' + text : ''}`, icon);
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

    // ── Ежедневный вход (награда за визит) ───────────────────
    function renderDailyLogin() {
        if (!dailyLoginEl) return;
        const info = dailyLoginInfo(state);
        if (!info.canClaim) {
            dailyLoginEl.hidden = true;
            return;
        }
        dailyLoginEl.hidden = false;
        if (dlDays) dlDays.textContent = `День ${info.days + 1}`;
        if (dlWeek) {
            dlWeek.innerHTML = info.rewards.map((r, i) => {
                const filled = i < info.claimedInCycle;
                const next = i === info.currentIndex;
                return `<span class="dl-day${filled ? ' filled' : ''}${next ? ' next' : ''}">${i + 1}: ${r}</span>`;
            }).join('');
        }
        if (dlClaimBtn) {
            dlClaimBtn.disabled = false;
            dlClaimBtn.textContent = `Забрать +${info.nextReward} 🪙`;
        }
    }

    function claimDailyLoginReward() {
        const res = claimDailyLogin(state);
        if (!res.ok) return;
        // claimDailyLogin добавляет награду напрямую в state.doubloons,
        // поэтому перк «Жемчужная жила» (+50%) применяем вручную.
        const bonus = applyCoinReward(state, res.reward) - res.reward;
        if (bonus > 0) state.doubloons = (state.doubloons || 0) + bonus;
        saveState(state);
        updateDoubloons();
        pushCloudSave();
        renderDailyLogin();
        showToast(`+${res.reward + bonus} жемчужин (день ${res.days})`, '🎁');
    }

    // ── Рынок у рифа (магазин) ───────────────────────────────
    let shopCategory = 'boost';

    function updateShopBalance() {
        if (shopDoubloons) shopDoubloons.textContent = (state.doubloons || 0).toLocaleString('ru');
    }

    function renderShop() {
        if (!shopGrid) return;
        shopGrid.innerHTML = '';
        const items = itemsByType(shopCategory);
        for (const item of items) {
            const owned = ownsItem(state, item);
            const canBuy = (state.doubloons || 0) >= (item.price || 0);
            const el = document.createElement('div');
            el.className = 'shop-item' + (owned ? ' owned' : '');
            let badge = '';
            if (item.type === 'boost') badge = `В запасе: ${boostCount(state, item.key)}`;
            else if (owned) badge = item.type === 'perk' ? '✓ Куплен' : '✓ Открыт';
            el.innerHTML = `
                <div class="shop-icon">${item.icon}</div>
                <div class="shop-info">
                    <div class="shop-name">${item.name}</div>
                    <div class="shop-desc">${item.desc}</div>
                    ${badge ? `<div class="shop-base">${badge}</div>` : ''}
                </div>
                ${owned && item.type !== 'boost'
                    ? '<div class="shop-buy owned">✓</div>'
                    : `<button class="btn btn-small shop-buy${canBuy ? '' : ' disabled'}" data-shop-id="${item.id}">${item.price} 🦪</button>`}
            `;
            shopGrid.appendChild(el);
        }
        shopGrid.querySelectorAll('.shop-buy[data-shop-id]').forEach(btn => {
            btn.addEventListener('click', () => buyFromShop(btn.dataset.shopId));
        });
    }

    function buyFromShop(id) {
        const item = getShopItem(id);
        if (!item) return;
        const res = buyItem(state, item);
        if (!res.ok) {
            if (res.reason === 'not_enough') showToast(`Не хватает жемчужин — нужно ${item.price}`, '🦪');
            else if (res.reason === 'owned') showToast('Уже куплено', '✅');
            return;
        }
        saveState(state);
        updateDoubloons();
        updateShopBalance();
        updateBoostBar();
        updateSettingsUI();
        pushCloudSave();
        if (item.type === 'skin') { state.skin = item.key; applyAppearance(); updateSettingsUI(); }
        if (item.type === 'theme') { state.theme = item.key; applyAppearance(); updateSettingsUI(); }
        renderShop();
        showToast(`${item.name} — куплено!`, '🛍️');
    }

    function openShopModal() {
        shopCategory = 'boost';
        if (shopTabs) shopTabs.querySelectorAll('.shop-tab').forEach(b => b.classList.toggle('active', b.dataset.cat === 'boost'));
        updateShopBalance();
        renderShop();
        showModal(shopModal);
    }

    // ── Панель бустов ─────────────────────────────────────────
    function updateBoostBar() {
        const defs = [
            ['shuffle', boostShuffleBtn, boostShuffleCount],
            ['bomb',    boostBombBtn,    boostBombCount],
            ['x2',      boostX2Btn,      boostX2Count],
        ];
        for (const [key, btn, cntEl] of defs) {
            const c = boostCount(state, key);
            if (cntEl) cntEl.textContent = c.toLocaleString('ru');
            if (!btn) continue;
            const disabled = c <= 0 || !game || game.gameOver || game.won || game._busy;
            btn.disabled = disabled;
            btn.classList.toggle('has-count', c > 0);
            btn.classList.toggle('active', key === 'x2' && !!game && game.getScoreMultiplierMoves() > 0);
        }
    }

    function useBoostFromBar(key) {
        if (!game || game.gameOver || game.won || game._busy) return;
        if (!useBoost(state, key)) {
            showToast('Буста нет — купи в лавке', '🛒');
            return;
        }
        let ok = false;
        if (key === 'shuffle') {
            ok = game.shuffle() === true;
        } else if (key === 'bomb') {
            ok = game.removeHighestTile() !== null;
        } else if (key === 'x2') {
            game.activateScoreMultiplier(3);
            ok = true;
        }
        if (!ok) {
            // Возвращаем буст, если применить не удалось
            state.inventory = state.inventory || {};
            state.inventory[key] = (state.inventory[key] || 0) + 1;
            showToast('Сейчас нельзя использовать буст', '⚠️');
            updateBoostBar();
            return;
        }
        saveState(state);
        updateBoostBar();
        updateDoubloons();
        pushCloudSave();
        const msgs = {
            shuffle: 'Плитки перемешаны!',
            bomb:    'Самая большая плитка убрана!',
            x2:      'Двойные очки на 3 хода со слиянием!',
        };
        showToast(msgs[key], { shuffle: '🔄', bomb: '💣', x2: '⚡' }[key]);
        if (state.sound !== false) playMove();
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
        if (!confettiEl || reduceMotion) return;
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
        const data = { app: 'ocean2048', version: 1, exported: Date.now(), state, saves: loadSaves() };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'ocean2048-save.json';
        a.click();
        URL.revokeObjectURL(url);
        showToast('Прогресс сохранён в файл', '💾');
    }

    function importData(file) {
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const data = JSON.parse(reader.result);
                if (!data || data.app !== 'ocean2048' || !data.state) throw new Error('bad file');
                state = { ...loadState(), ...data.state };
                saveState(state);
                if (data.saves) {
                    try { localStorage.setItem(SAVE_KEY, JSON.stringify(data.saves)); } catch (_) {}
                }
                applyAppearance();
                updateSettingsUI();
                renderDailyLogin();
                updateBoostBar();
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

    function showModal(el) {
        if (el) el.classList.add('visible');
        // П. 1.19.3: при открытии любого окна игровой процесс приостанавливается.
        markGameplayStop();
    }
    function hideModal(el) {
        if (el) el.classList.remove('visible');
        // П. 1.19.3: при закрытии окна, если партия продолжается, геймплей возобновляется.
        if (game && !game.gameOver && !game.won && !game.paused) markGameplayStart();
    }

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
            tide:          tideConfigForLevel(state.currentLevel),
            moves:         movesConfigForLevel(state.currentLevel),
            onScoreUpdate: (score) => {
                const prev = lastScore;
                const isNewBest = score > (state.bestTotal || 0);
                lastScore = score;
                // Фаза 1: счёт-вверх (count-up)
                animateScore(prev, score);
                if (isNewBest) {
                    state.bestTotal = score;
                    saveState(state);
                    // Пульс рекорда при обновлении
                    if (bestEl) {
                        bestEl.classList.remove('best-pulse');
                        void bestEl.offsetWidth;
                        bestEl.classList.add('best-pulse');
                    }
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
                updateTideIndicator();
                updateThreatIndicator();
            },
            onTide:  (swept) => {
                // Прилив смыл нижние ряды: вспышка индикатора + уведомление о возврате очков
                flashTideSweep();
                const total = swept.reduce((acc, s) => acc + s.gain, 0);
                if (total > 0) showToast(`Прилив унёс плитки! +${total} очков`, '🌊');
                else if (swept.length > 0) showToast('Прилив очистил нижний ряд', '🌊');
            },
            onThreat: (swept) => {
                // «Водоворот» за серию бесполезных ходов: смыв без возврата очков
                flashThreatSweep();
                const total = swept.reduce((acc, s) => acc + s.value, 0);
                if (total > 0) showToast(`Водоворот унёс плитки (−${total})`, '🌪️');
                else if (swept.length > 0) showToast('Водоворот очистил нижний ряд', '🌪️');
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
            onSave:  () => { saveBoard(); saveState(state); updateUndoState(); updateMoves(); updateTideIndicator(); updateThreatIndicator(); updateBoostBar(); checkAchievements(); checkDaily(); pushCloudSave(); },
            onTarget: (score) => {
                // Бесконечный режим: цель достигнута — празднуем и продолжаем
                if (state.sound !== false) playWin();
                spawnConfetti(90, true);
                showToast(`Цель достигнута! Очки: ${score.toLocaleString('ru')}`, '🎉');
            },
            onWin: (score) => {
                const isNewBest = !state.bestScores[state.currentLevel] || score > state.bestScores[state.currentLevel];
                state = applyLevelWin(state, score);
                // Жемчужины за победу
                addDoubloons(100, 'победа');
                if (isNewBest) addDoubloons(200, 'новый рекорд уровня', '🏆');
                state.dailyCounters.wins = (state.dailyCounters.wins || 0) + 1;
                saveState(state);
                checkAchievements();
                checkDaily();
                pushCloudSave();
                if (sdk.isPlatform()) sdk.submitScore(score, state.currentLevel);
                // VK: запись очков идёт сервером (secure.addAppEvent, Фаза 4);
                // на клиенте после партии показываем системную таблицу с результатом.
                if (sdk.host === 'vk') sdk.showLeaderboard(score, state.currentLevel);
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
                if (sdk.isPlatform()) sdk.submitScore(score, state.currentLevel);
                // VK: системная таблица после партии (смотри, кого обошёл / кто впереди).
                if (sdk.host === 'vk') sdk.showLeaderboard(score, state.currentLevel);
                if (state.sound !== false) playGameOver();
                showGameOverModal(score);
                // Реклама при проигрыше (interstitial) с кулдауном 4 минуты
                const now = Date.now();
                if (sdk.isPlatform() && now - (state.lastAdTime || 0) > 4 * 60 * 1000) {
                    state.lastAdTime = now;
                    saveState(state);
                    pendingInterstitial = setTimeout(() => { runWithAdPause(() => sdk.showInterstitial()); }, 1200);
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
            // Перк «Бонусная плитка»: новая партия начинается с плиткой 4
            if (ownsPerk(state, 'bonusTile')) {
                game.addBonusTile(4);
                saveBoard();
            }
        }
        updateUndoState();
        updateMoves();
        updateTideIndicator();
        updateThreatIndicator();
        updateBoostBar();
        // П. 1.19.3: запуск уровня — начало игрового процесса.
        if (!loadingScreen || loadingScreen.classList.contains('hidden')) markGameplayStart();
    }

    function resetCurrentGame() {
        if (!game) return;
        clearBoardSave(state.currentLevel);
        lastScore = 0;
        reviveCount = 0;
        reviveBusy = false;
        game.init();
        // Перк «Бонусная плитка»: новая партия начинается с плиткой 4
        if (ownsPerk(state, 'bonusTile')) {
            game.addBonusTile(4);
            saveBoard();
        }
        scoreEl.textContent = '0';
        state.gamesPlayed = (state.gamesPlayed || 0) + 1;
        saveState(state);
        updateStats();
        updateUndoState();
        updateMoves();
        updateTideIndicator();
        updateThreatIndicator();
        updateBoostBar();
        checkAchievements();
        // П. 1.19.3: перезапуск партии — игровой процесс снова активен.
        markGameplayStart();
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
        modalTitle.textContent   = isLast ? 'Ты — Хозяин Моря!' : 'Уровень пройден!';
        modalMessage.textContent = isLast
            ? 'Все 7 уровней позади. Ты — легенда океана!'
            : `Ты достиг ${currentLevelDef().target.toLocaleString('ru')}! Поздравляем!`;
        modalScore.textContent   = score.toLocaleString('ru');

        clearModalActions();

        if (!isLast) {
            addModalBtn('🐬 Следующий уровень', 'btn-primary', () => {
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
            // П. 1.19.3: партия продолжается — геймплей возобновляется.
            markGameplayStart();
        });

        addModalBtn('🔄 Заново', 'btn-ghost', () => {
            hideModal(gameModal);
            resetCurrentGame();
        });

        addModalBtn('📣 Поделиться', 'btn-secondary', () => shareResult(score));

        // VK: кнопка системной таблицы результатов (друзья/все).
        if (sdk.host === 'vk') {
            addModalBtn('🏆 Таблица', 'btn-secondary', () => sdk.showLeaderboard(score, state.currentLevel));
        }

        // VK: пригласить друзей сыграть (retention-механика, Фаза 2).
        if (sdk.host === 'vk') {
            addModalBtn('👥 Пригласить друзей', 'btn-secondary', () => runSocial(() => sdk.showInvite('ocean2048_invite')));
        }

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
                const ok = await runWithAdPause(() => sdk.showRewarded());
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
                    // П. 1.19.3: после спасения партия продолжается — геймплей активен.
                    markGameplayStart();
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

        // VK: кнопка системной таблицы результатов (друзья/все).
        if (sdk.host === 'vk') {
            addModalBtn('🏆 Таблица', 'btn-ghost', () => sdk.showLeaderboard(score, state.currentLevel));
        }

        // VK: пригласить друзей сыграть (retention-механика, Фаза 2).
        if (sdk.host === 'vk') {
            addModalBtn('👥 Пригласить друзей', 'btn-ghost', () => runSocial(() => sdk.showInvite('ocean2048_invite')));
        }

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

    restartBtn.addEventListener('click', () => openRestartConfirm(false));

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
                showToast(`Не хватает жемчужин — нужно ${price}`, '🦪');
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
                showToast(`Не хватает жемчужин — нужно ${price}`, '🦪');
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
            const ok = await runWithAdPause(() => sdk.showRewarded());
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
        // На площадках отмена хода — за rewarded-рекламу
        if (sdk.isPlatform()) {
            showToast('За отмену хода — реклама', '🎬');
            const ok = await runWithAdPause(() => sdk.showRewarded());
            if (!ok) { showToast('Реклама не показана', '⚠️'); return; }
        } else {
            // Веб: N бесплатных отмен в день, дальше — дублоны
            // (защита от «прочитывания» партии бесконечными отменами)
            ensureDaily();
            const used = state.dailyCounters.undos || 0;
            const undoLimit = effectiveUndoLimit(state, WEB_UNDO_LIMIT);
            if (used >= undoLimit) {
                if ((state.doubloons || 0) < UNDO_COST) {
                    showToast(`Лимит бесплатных отмен: ${undoLimit}/день. Дальше — ${UNDO_COST} 🪙`, '⚠️');
                    return;
                }
                state.doubloons -= UNDO_COST;
                updateDoubloons();
                showToast(`Отмена за ${UNDO_COST} 🪙`, '🪙');
            } else {
                state.dailyCounters.undos = used + 1;
            }
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
        // VK: клиентского чтения таблицы нет — открываем системную таблицу
        // (друзья/все) через VKWebAppShowLeaderBoardBox с текущим результатом.
        if (sdk.host === 'vk') {
            sdk.showLeaderboard(state.bestTotal || 0, state.currentLevel);
            return;
        }
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
            leaderboardList.innerHTML = '<div class="lb-empty">Пока пусто. Сыграй и побей рекорд! 🌊</div>';
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
        const text = `🌊 Я набрал ${(score || 0).toLocaleString('ru')} очков в «Океан 2048»! Сможешь больше?`;
        const ok = await sdk.share(text);
        if (ok) {
            if (!sdk.isPlatform()) showToast('Ссылка скопирована — отправь друзьям!', '📣');
        } else {
            showToast('Не удалось поделиться', '⚠️');
        }
    }

    shareBtn.addEventListener('click', () => shareResult(state.bestTotal || 0));

    // ── Соцмеханики VK (Фаза 2) ───────────────────────────────
    // Показываем кнопки только на платформе VK. По требованиям VK между раундами
    // открываем не чаще одного диалога — кнопки живут в настройках (меню), где
    // игрок сознательно открывает соц-действие.

    // Одноразовый бонус жемчужинами за соц-действие (избранное / главный экран).
    // Ключ хранится в state.socialBonuses, чтобы награда начислялась один раз.
    function grantSocialBonus(key, amount, text, icon) {
        const bonuses = state.socialBonuses || {};
        if (bonuses[key]) return false; // уже получал
        bonuses[key] = true;
        state.socialBonuses = bonuses;
        saveState(state);
        addDoubloons(amount, text, icon);
        return true;
    }

    // Защита от двойного нажатия: пока диалог открыт — кнопка «занята».
    let socialBusy = false;
    async function runSocial(action) {
        if (socialBusy) return;
        socialBusy = true;
        try { await action(); } finally { socialBusy = false; }
    }

    if (sdk.host === 'vk') {
        if (inviteBtn) inviteBtn.hidden = false;
        if (requestBtn) requestBtn.hidden = false;
        if (storyBtn) storyBtn.hidden = false;
        if (favoritesBtn) favoritesBtn.hidden = false;
        if (homeScreenBtn) homeScreenBtn.hidden = false;
    }

    if (inviteBtn) inviteBtn.addEventListener('click', () => runSocial(async () => {
        const ok = await sdk.showInvite('ocean2048_invite');
        showToast(ok ? 'Приглашение отправлено!' : 'Не удалось пригласить', ok ? '👥' : '⚠️');
    }));

    if (requestBtn) requestBtn.addEventListener('click', () => runSocial(async () => {
        const best = state.bestTotal || 0;
        const msg = `🌊 Я набрал ${best.toLocaleString('ru')} очков в «Океан 2048». Сможешь больше?`;
        const ok = await sdk.showRequest(undefined, msg);
        showToast(ok ? 'Вызов отправлен!' : 'Не удалось отправить вызов', ok ? '💪' : '⚠️');
    }));

    if (storyBtn) storyBtn.addEventListener('click', () => runSocial(async () => {
        const best = state.bestTotal || 0;
        const ok = await sdk.showStory({
            text: `Мой рекорд — ${best.toLocaleString('ru')} 🌊 Океан 2048`,
        });
        showToast(ok ? 'История опубликована!' : 'Не удалось открыть истории', ok ? '📸' : '⚠️');
    }));

    if (favoritesBtn) favoritesBtn.addEventListener('click', () => runSocial(async () => {
        const ok = await sdk.addToFavorites();
        if (!ok) { showToast('Не удалось добавить в избранное', '⚠️'); return; }
        // Награду (с тостом «+50 жемчужин») показывает addDoubloons один раз
        const gained = grantSocialBonus('favorites', 50, 'добавление в избранное', '⭐');
        if (!gained) showToast('Уже в избранном', '⭐');
    }));

    if (homeScreenBtn) homeScreenBtn.addEventListener('click', () => runSocial(async () => {
        const ok = await sdk.addToHomeScreen();
        if (!ok) { showToast('Не удалось добавить на главный экран', '⚠️'); return; }
        const gained = grantSocialBonus('homeScreen', 50, 'добавление на главный экран', '📱');
        if (!gained) showToast('Уже добавлено', '📱');
    }));

    // ── Контексты запуска (диплинки VK, Фаза 2) ────────────────
    // vk_request_key — игрок пришёл по приглашению/запросу друга. Приветствуем.
    const launchParams = sdk.getLaunchParams();
    if (sdk.host === 'vk' && launchParams.vk_request_key) {
        showToast('Друг позвал тебя в океан! 🌊', '🐬');
    }

    // ── Магазин / ежедневный вход / бусты ────────────────────
    if (shopBtn) shopBtn.addEventListener('click', openShopModal);
    if (closeShopBtn) closeShopBtn.addEventListener('click', () => hideModal(shopModal));
    if (shopModal) shopModal.addEventListener('click', (e) => {
        if (e.target === shopModal) hideModal(shopModal);
    });
    if (shopTabs) shopTabs.addEventListener('click', (e) => {
        const btn = e.target.closest('.shop-tab');
        if (!btn || !btn.dataset.cat) return;
        shopCategory = btn.dataset.cat;
        shopTabs.querySelectorAll('.shop-tab').forEach(b => b.classList.toggle('active', b === btn));
        renderShop();
    });
    if (boostShuffleBtn) boostShuffleBtn.addEventListener('click', () => useBoostFromBar('shuffle'));
    if (boostBombBtn)    boostBombBtn.addEventListener('click', () => useBoostFromBar('bomb'));
    if (boostX2Btn)      boostX2Btn.addEventListener('click', () => useBoostFromBar('x2'));
    if (dlClaimBtn)      dlClaimBtn.addEventListener('click', claimDailyLoginReward);
    if (dlClose) dlClose.addEventListener('click', () => {
        if (dailyLoginEl) dailyLoginEl.hidden = true;
    });

    // ── Пауза ────────────────────────────────────────────────
    function setPaused(paused) {
        if (game) game.setPaused(paused);
        if (pauseOverlay) pauseOverlay.classList.toggle('visible', !!paused);
        // П. 1.19.3: пауза — стоп геймплея, снятие паузы — возобновление.
        if (paused) markGameplayStop();
        else if (game && !game.gameOver && !game.won) markGameplayStart();
    }

    // ── Показ полноэкранной рекламы: звук и геймплей на паузу (п. 4.7) ──
    // Перед показом глушим звук и приостанавливаем игру, после закрытия — возвращаем.
    async function runWithAdPause(action) {
        const wasPaused = !!(game && game.paused);
        suspendSound();
        // П. 1.19.3: перед рекламой игровой процесс останавливается.
        markGameplayStop();
        if (game && !game.gameOver && !game.won && !game.paused) {
            game.setPaused(true);
        }
        try {
            return await action();
        } finally {
            resumeSound();
            if (game && !wasPaused && !game.gameOver && !game.won) {
                game.setPaused(false);
                // П. 1.19.3: после рекламы геймплей возобновляется.
                markGameplayStart();
            }
        }
    }

    pauseBtn.addEventListener('click', () => {
        if (!game || game.won || game.gameOver) return;
        setPaused(!game.paused);
    });

    resumeBtn.addEventListener('click', () => setPaused(false));

    pauseRestartBtn.addEventListener('click', () => openRestartConfirm(true));

    // Авто-пауза при скрытии вкладки / переключении приложения (п. 1.3):
    // звук глушится сразу, игра ставится на паузу, при возврате — возобновляется.
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            suspendSound();
            // На Яндекс Играх паузу при сворачивании/смене вкладки ставит сама
            // платформа через событие game_api_pause (п. 1.19.4) — обработчик
            // onPlatformPause. Для VK и веба оставляем резервный механизм.
            if (sdk.host !== 'yandex' && game && !game.paused && !game.gameOver && !game.won
                && !document.querySelector('.modal-overlay.visible')) {
                setPaused(true);
            }
        } else {
            resumeSound();
        }
    });

    // Потеря фокуса окна/iframe — звук останавливается (п. 1.3), при возврате — возобновляется.
    window.addEventListener('blur', () => suspendSound());
    window.addEventListener('focus', () => resumeSound());

    // Запрет контекстного меню на игровом поле (п. 1.6.1.8 / 1.6.2.7):
    // правый клик на десктопе и долгое нажатие на мобильных не открывают меню.
    document.addEventListener('contextmenu', (e) => {
        if (e.target.closest && e.target.closest('.board, .dpad')) e.preventDefault();
    });

    // Esc — выход из паузы
    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        if (confirmModal && confirmModal.classList.contains('visible')) {
            confirmRestartNo.click();
            return;
        }
        if (pauseOverlay && pauseOverlay.classList.contains('visible')) {
            setPaused(false);
        }
    });

    // ── Подтверждение перезапуска ────────────────────────────
    function openRestartConfirm(fromPause) {
        confirmRestartFromPause = !!fromPause;
        if (!game) return;
        game.setPaused(true);
        showModal(confirmModal);
    }

    confirmRestartYes.addEventListener('click', () => {
        hideModal(confirmModal);
        if (pauseOverlay) pauseOverlay.classList.remove('visible');
        if (game) game.setPaused(false);
        resetCurrentGame();
    });

    confirmRestartNo.addEventListener('click', () => {
        hideModal(confirmModal);
        // Если подтверждение открыто не из паузы — возвращаем игру (и геймплей).
        if (!confirmRestartFromPause) setPaused(false);
    });

    confirmModal.addEventListener('click', (e) => {
        if (e.target === confirmModal) confirmRestartNo.click();
    });

    // ── Онбординг (первый запуск) ────────────────────────────
    function showTutorial() {
        if (!tutorialModal) return;
        // П. 1.19.3: онбординг приостанавливает игровой процесс.
        if (game) setPaused(true);
        showModal(tutorialModal);
    }

    tutorialOk.addEventListener('click', () => {
        hideModal(tutorialModal);
        // П. 1.19.3: после онбординга игровой процесс возобновляется.
        if (game) setPaused(false);
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

    // ── Service Worker (только standalone-веб / PWA) ─────────
    // На площадках (VK / Яндекс) SW не регистрируем: там свой кэш/подгрузка,
    // и service worker в iframe не нужен.

    if (platform.isWeb && sdk.host === 'web' && 'serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js').catch(() => {});
    }

    // ── Перерисовка при изменении размеров (полный экран / поворот) ──

    let resizeTimer = null;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => { if (game) game.render(); }, 120);
    });

    // ── Старт ────────────────────────────────────────────────

    // Фаза 1: пузырьки-фон сразу (если анимации разрешены)
    spawnBubbles();

    applyAppearance();
    updateHeader();
    updateDoubloons();
    ensureDaily();
    renderDaily();
    renderDailyLogin();
    startLevel(state.currentLevel);
    updateBoostBar();

    // Загрузочный экран завершён
    if (loadingBarFill) loadingBarFill.style.width = '100%';
    sdk.setLoadingProgress(100);
    if (loadingScreen) loadingScreen.classList.add('hidden');
    sdk.loadingReady();

    // Доступность: убираем анимации, если пользователь запросил это
    if (reduceMotion) document.body.classList.add('reduce-motion');

    // Онбординг при первом запуске — после загрузочного экрана
    if (!state.tutorialSeen) {
        state.tutorialSeen = true;
        saveState(state);
        showTutorial();
    } else {
        // П. 1.19.3: игра готова и загрузочный экран скрыт — начинаем геймплей.
        markGameplayStart();
    }

    console.log(`🌊 Океан 2048 — платформа: ${platform.name}, SDK: ${sdk.host}`);
});
