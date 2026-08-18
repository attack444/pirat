// ======================== Звуковые эффекты (Web Audio API, без файлов) ========================

let ctx = null;
let masterGain = null;
let muted = false;      // глушение: потеря фокуса (п. 1.3), полноэкранная реклама (п. 4.7)

/** Создание/возобновление AudioContext (по первому жесту пользователя). */
function ensure() {
    if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        try {
            ctx = new AC();
            masterGain = ctx.createGain();
            masterGain.gain.value = 0.35;
            masterGain.connect(ctx.destination);
        } catch (_) {
            return null;
        }
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
}

/**
 * Короткий тон с огибающей.
 * @param {object} opts
 * @param {number} [opts.freq]      начальная частота (Гц)
 * @param {number} [opts.end]       конечная частота (Гц)
 * @param {number} [opts.dur]       длительность (с)
 * @param {string} [opts.type]      тип волны: sine | triangle | square | sawtooth
 * @param {number} [opts.vol]       громкость 0..1
 * @param {number} [opts.delay]     задержка старта (с)
 */
function tone({ freq = 440, end = freq, dur = 0.08, type = 'sine', vol = 0.5, delay = 0 }) {
    if (muted) return;   // пока звук заглушён, новые звуки не ставим
    const c = ensure();
    if (!c) return;

    const t0 = c.currentTime + delay;
    const osc = c.createOscillator();
    const gain = c.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (end !== freq) osc.frequency.exponentialRampToValueAtTime(Math.max(end, 1), t0 + dur);

    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(Math.max(vol, 0.0001), t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(t0);
    osc.stop(t0 + dur + 0.03);
}

/** Движение плитки (лёгкий «шорох»). */
export function playMove() {
    tone({ freq: 300, end: 240, dur: 0.05, type: 'triangle', vol: 0.22 });
}

/** Слияние плиток (короткий «бодрый» сигнал). */
export function playMerge() {
    tone({ freq: 500, end: 760, dur: 0.09, type: 'triangle', vol: 0.4 });
    tone({ freq: 1000, dur: 0.06, type: 'sine', vol: 0.18, delay: 0.02 });
}

/** Победа (восходящий арпеджио). */
export function playWin() {
    [523, 659, 784, 1046].forEach((f, i) => tone({
        freq: f, dur: 0.16, type: 'triangle', vol: 0.35, delay: i * 0.11,
    }));
}

/** Поражение (нисходящий гудок). */
export function playGameOver() {
    tone({ freq: 392, end: 196, dur: 0.5, type: 'sawtooth', vol: 0.22 });
}

// ── Глушение звука (п. 1.3 «потеря фокуса», п. 4.7 «полноэкранная реклама») ──
/** Приостановить воспроизведение и запретить новые звуки. */
export function suspendSound() {
    muted = true;
    try {
        if (ctx && ctx.state === 'running') ctx.suspend().catch(() => {});
    } catch (_) {}
}

/** Возобновить воспроизведение. */
export function resumeSound() {
    muted = false;
    try {
        if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
    } catch (_) {}
}
