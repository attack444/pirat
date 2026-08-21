// Промо-видео для «Океан 2048»: горизонтальное (16:9), вертикальное (9:16) и рекламное.
//
// Конвейер:
//   1) Записывает реальный геймплей игры (localhost:4173) через Playwright recordVideo;
//   2) Генерирует HTML-заставки (интро/аутро/вертикальный фон) через Playwright;
//   3) Собирает готовые MP4 через ffmpeg:
//      - promo-landscape.mp4 (1280×720):  интро → геймплей → аутро (склейка);
//      - promo-portrait.mp4  (1080×1920): геймплей в центре на вертикальном фоне;
//      - promo-ad.mp4        (1080×1920): короткий рекламный вертикальный с усиленным CTA.
//
// Запуск:  node scripts/make-promo.mjs [секунды геймплея]   (по умолчанию 12)
// Выход:   store/media/promo/
// Требует: сервер :4173 (npm run serve) + playwright + ffmpeg.
/* global console, process, document, getComputedStyle */
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import {
  openPage, recordHtmlVideo, toMp4, concatVideos, runFfmpeg, findNewestWebm,
  sleep, MEDIA_DIR, ROOT,
} from './lib/media.mjs';

const OUT_DIR = join(MEDIA_DIR, 'promo');
const BASE = 'http://localhost:4173';
const icon = readFileSync(join(ROOT, 'icons', 'icon-512.png')).toString('base64');
const STEP_MS = 420;
const MOVES = ['ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown'];

// ---------- 1) Реальный геймплей ----------
async function recordGameplay(seconds, dir) {
  const { browser, context, page } = await openPage({
    width: 1280, height: 720,
    videoDir: dir, videoSize: { width: 1280, height: 720 },
  });
  try {
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 20000 });
    const start = Date.now();
    while (Date.now() - start < 20000) {
      const st = await page.evaluate(() => {
        const el = document.querySelector('#loading-screen');
        if (!el) return 'ready';
        const cs = getComputedStyle(el);
        return cs.display === 'none' || cs.opacity === '0' ? 'ready' : 'loading';
      }).catch(() => 'loading');
      if (st === 'ready') break;
      await sleep(120);
    }
    const visible = (sel) => page.evaluate((s) => {
      const el = document.querySelector(s);
      if (!el) return false;
      const r = el.getBoundingClientRect();
      const st = getComputedStyle(el);
      return st.display !== 'none' && st.visibility !== 'hidden' && r.width > 0 && r.height > 0;
    }, sel).catch(() => false);
    if (await visible('#tutorial-modal')) { await page.click('#tutorial-ok').catch(() => {}); await sleep(400); }
    if (await visible('#daily-login')) { await page.click('#dl-claim-btn').catch(() => {}); await sleep(400); }

    console.log(`  геймплей ${seconds}с...`);
    let i = 0;
    const t0 = Date.now();
    while (Date.now() - t0 < seconds * 1000) {
      await page.keyboard.press(MOVES[i % MOVES.length]);
      await sleep(STEP_MS);
      i++;
    }
    console.log(`  ходов: ${i}`);
  } finally {
    await context.close();
    await browser.close();
  }
  const webm = findNewestWebm(dir);
  if (!webm) throw new Error('Геймплей .webm не найден в ' + dir);
  return webm;
}

// ---------- 2) HTML-сцены ----------
function introHtml() {
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><style>
  * { margin:0; padding:0; box-sizing:border-box; }
  html,body { width:1280px; height:720px; overflow:hidden;
    font-family:'Segoe UI', Roboto, Arial, sans-serif;
    background: radial-gradient(1200px 700px at 20% -10%, #2a5a85 0%, #1c3b5a 45%, #0f2233 100%); }
  .wrap { width:100%; height:100%; display:flex; flex-direction:column;
    align-items:center; justify-content:center; text-align:center; }
  .icon { width:180px; height:180px; border-radius:40px; box-shadow:0 20px 50px rgba(0,0,0,.55);
    animation: pop .7s ease-out; }
  h1 { margin-top:26px; font-size:96px; font-weight:800; color:#ffd24a;
    text-shadow:0 5px 0 rgba(0,0,0,.45); animation: pop 1s ease-out .15s backwards; }
  .sub { margin-top:12px; font-size:34px; color:#dce8f2; letter-spacing:1px;
    animation: pop 1s ease-out .3s backwards; }
  .tile { position:absolute; width:64px; height:64px; border-radius:14px; display:flex;
    align-items:center; justify-content:center; font-size:28px; font-weight:700; color:#fff; opacity:.9;
    box-shadow:0 8px 18px rgba(0,0,0,.35); animation: pop 1s ease-out .4s backwards; }
  .t1 { background:#e3b23c; left:60px; top:80px; transform:rotate(-10deg); }
  .t2 { background:#d27c2c; right:60px; top:80px; transform:rotate(9deg); }
  .t3 { background:#b0bec5; left:70px; bottom:80px; transform:rotate(7deg); }
  .t4 { background:#8d6e63; right:70px; bottom:80px; transform:rotate(-9deg); }
  @keyframes pop { 0%{opacity:0; transform:scale(.8)} 100%{opacity:1; transform:scale(1)} }
</style></head><body>
  <div class="wrap">
    <div class="tile t1">2</div><div class="tile t2">4</div>
    <div class="tile t3">8</div><div class="tile t4">16</div>
    <img class="icon" src="data:image/png;base64,${icon}" alt=""/>
    <h1>Океан 2048</h1>
    <div class="sub">Соединяй плитки · Исследуй глубины</div>
  </div>
</body></html>`;
}

function outroHtml() {
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><style>
  * { margin:0; padding:0; box-sizing:border-box; }
  html,body { width:1280px; height:720px; overflow:hidden;
    font-family:'Segoe UI', Roboto, Arial, sans-serif;
    background: radial-gradient(1200px 700px at 20% -10%, #2a5a85 0%, #1c3b5a 45%, #0f2233 100%); }
  .wrap { width:100%; height:100%; display:flex; flex-direction:column;
    align-items:center; justify-content:center; text-align:center; }
  h2 { font-size:72px; font-weight:800; color:#fff; text-shadow:0 5px 0 rgba(0,0,0,.4);
    animation: pop 1s ease-out; }
  .cta { margin-top:40px; font-size:44px; font-weight:700; color:#0f2233;
    background:linear-gradient(180deg,#ffe27a,#ffc93c); padding:24px 60px; border-radius:999px;
    box-shadow:0 16px 40px rgba(0,0,0,.45); animation: pulse 1.6s ease-in-out infinite; }
  .icon { position:absolute; left:40px; top:40px; width:96px; height:96px; border-radius:22px;
    box-shadow:0 12px 30px rgba(0,0,0,.4); }
  @keyframes pop { 0%{opacity:0; transform:scale(.85)} 100%{opacity:1; transform:scale(1)} }
  @keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.06)} }
</style></head><body>
  <img class="icon" src="data:image/png;base64,${icon}" alt=""/>
  <div class="wrap">
    <h2>Готов покорить глубины?</h2>
    <div class="cta">🌊 Играть бесплатно</div>
  </div>
</body></html>`;
}

// Вертикальный фон: заголовок сверху, CTA снизу, тёмная плашка в центре под геймплей.
function portraitBgHtml({ ad = false } = {}) {
  const title = ad ? 'Океан 2048 — уже в браузере' : 'Океан 2048';
  const sub = ad ? 'Бесплатно · Без рекламы' : 'Соединяй плитки · Исследуй глубины';
  const cta = ad ? '🎮 Играть сейчас' : '🌊 Играть бесплатно';
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><style>
  * { margin:0; padding:0; box-sizing:border-box; }
  html,body { width:1080px; height:1920px; overflow:hidden;
    font-family:'Segoe UI', Roboto, Arial, sans-serif;
    background: radial-gradient(1400px 1000px at 25% -10%, #2a5a85 0%, #1c3b5a 45%, #0f2233 100%); }
  .head { position:absolute; top:120px; left:0; right:0; text-align:center; z-index:2; }
  .head h1 { font-size:96px; font-weight:800; color:#ffd24a; text-shadow:0 5px 0 rgba(0,0,0,.45); }
  .head .sub { margin-top:16px; font-size:38px; color:#dce8f2; letter-spacing:1px; }
  .slot { position:absolute; left:0; right:0; top:560px; bottom:560px; z-index:1;
    background:rgba(6,20,34,.55); border-radius:36px; margin:0 34px;
    box-shadow:inset 0 0 120px rgba(0,0,0,.6); }
  .foot { position:absolute; bottom:170px; left:0; right:0; text-align:center; z-index:2; }
  .cta { display:inline-block; font-size:56px; font-weight:700; color:#0f2233;
    background:linear-gradient(180deg,#ffe27a,#ffc93c); padding:34px 90px; border-radius:999px;
    box-shadow:0 18px 46px rgba(0,0,0,.5); animation: pulse 2s ease-in-out infinite; }
  .b { position:absolute; bottom:-80px; border-radius:50%;
    background:radial-gradient(circle at 30% 30%, rgba(255,255,255,.5), rgba(255,255,255,.06) 70%);
    animation: rise linear infinite; z-index:0; }
  @keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.05)} }
  @keyframes rise { 0%{transform:translateY(0)} 100%{transform:translateY(-2100px)} }
</style></head><body>
  <div class="b" style="left:8%; width:70px; height:70px; animation-duration:7s;"></div>
  <div class="b" style="left:22%; width:38px; height:38px; animation-duration:5s;"></div>
  <div class="b" style="left:48%; width:90px; height:90px; animation-duration:9s;"></div>
  <div class="b" style="left:66%; width:46px; height:46px; animation-duration:6s;"></div>
  <div class="b" style="left:84%; width:62px; height:62px; animation-duration:8s;"></div>
  <div class="b" style="left:93%; width:30px; height:30px; animation-duration:4.5s;"></div>
  <div class="slot"></div>
  <div class="head"><h1>${title}</h1><div class="sub">${sub}</div></div>
  <div class="foot"><div class="cta">${cta}</div></div>
</body></html>`;
}

// ---------- 3) Сборка ----------
// Ландшафт: интро + геймплей + аутро (конкатенация однородных частей).
async function buildLandscape(parts, outName) {
  const normParts = [];
  for (let i = 0; i < parts.length; i++) {
    const tmp = join(OUT_DIR, `._part${i}.mp4`);
    const mp4 = toMp4(parts[i], tmp, { fps: 30, crf: 20, scale: '1280:720' });
    if (!mp4) throw new Error('Не удалось нормализовать часть ' + parts[i]);
    normParts.push(mp4);
  }
  const out = join(OUT_DIR, outName);
  const ok = concatVideos(normParts, out, { fps: 30 });
  normParts.forEach((p) => rmSync(p, { force: true }));
  if (!ok) throw new Error('Не удалось склеить ' + outName);
  return out;
}

// Вертикаль: фон + геймплей по центру (overlay через filter_complex).
function buildPortrait(bgWebm, gameplayWebm, outName) {
  const bgMp4 = join(OUT_DIR, '._bg.mp4');
  const gMp4 = join(OUT_DIR, '._game.mp4');
  if (!toMp4(bgWebm, bgMp4, { fps: 30, crf: 22, scale: '1080:1920' })) throw new Error('bg mp4');
  if (!toMp4(gameplayWebm, gMp4, { fps: 30, crf: 22, scale: '1280:720' })) throw new Error('game mp4');

  const out = join(OUT_DIR, outName);
  // Геймплей 1280×720 → ширина 1000, центр по X, чуть выше геометрического центра.
  const fc =
    '[1:v]scale=1000:-1,format=yuv420p[g];' +
    '[0:v][g]overlay=(W-w)/2:((H-h)/2)-40:shortest=1[v]';
  const args = [
    '-i', bgMp4, '-i', gMp4,
    '-filter_complex', fc,
    '-map', '[v]',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '21', '-pix_fmt', 'yuv420p',
    '-r', '30', '-movflags', '+faststart', out,
  ];
  const r = runFfmpeg(args);
  if (r.status !== 0) throw new Error('Не удалось собрать вертикаль ' + outName);
  return out;
}

// ---------- main ----------
async function main() {
  const gameplaySeconds = Number(process.argv[2] || 12);
  const introS = 3;
  const outroS = 3;
  const bgS = gameplaySeconds + 2;

  console.log(`Промо-видео → ${OUT_DIR}`);
  console.log('Шаг 1/4: геймплей...');
  const gameplay = await recordGameplay(gameplaySeconds, OUT_DIR);
  console.log('  gameplay:', gameplay);

  console.log('Шаг 2/4: заставки (интро/аутро/фон)...');
  const intro = await recordHtmlVideo({ html: introHtml(), width: 1280, height: 720, outDir: OUT_DIR, seconds: introS });
  const outro = await recordHtmlVideo({ html: outroHtml(), width: 1280, height: 720, outDir: OUT_DIR, seconds: outroS });
  const bgPortrait = await recordHtmlVideo({ html: portraitBgHtml(), width: 1080, height: 1920, outDir: OUT_DIR, seconds: bgS });
  const bgAd = await recordHtmlVideo({ html: portraitBgHtml({ ad: true }), width: 1080, height: 1920, outDir: OUT_DIR, seconds: bgS });
  console.log('  intro/outro/bg готовы');

  console.log('Шаг 3/4: сборка горизонтального (16:9)...');
  const landscape = await buildLandscape([intro, gameplay, outro], 'promo-landscape.mp4');
  console.log('  →', landscape);

  console.log('Шаг 4/4: сборка вертикальных (9:16)...');
  const portrait = buildPortrait(bgPortrait, gameplay, 'promo-portrait.mp4');
  console.log('  →', portrait);
  const ad = buildPortrait(bgAd, gameplay, 'promo-ad.mp4');
  console.log('  →', ad);

  console.log('\nГотово:');
  console.log('  16:9  ', landscape);
  console.log('  9:16  ', portrait);
  console.log('  реклама', ad);
}

main().catch((e) => { console.error('Ошибка:', e.message); process.exit(1); });
