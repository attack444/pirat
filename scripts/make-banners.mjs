// Генерация рекламных баннеров «Океан 2048» через HTML+Playwright (PNG).
// Платформы и размеры:
//   vk      VK Group / VK Ads            1280×720
//   telegram  Telegram post preview      1200×630
//   youtube  YouTube thumbnail           1280×720
//   story    VK/IG/TG Story               1080×1920 (9:16)
//   banner  Play Feature / малый баннер   728×90
// Запуск:  node scripts/make-banners.mjs [all|vk|telegram|youtube|story|banner]
// Выход:   store/media/banners/*.png
/* global console, process */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderHtmlToPng, MEDIA_DIR, ROOT } from './lib/media.mjs';

const icon = readFileSync(join(ROOT, 'icons', 'icon-512.png')).toString('base64');

function shell({ width, height, title, sub, cta }) {
  return `<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><style>
  * { margin:0; padding:0; box-sizing:border-box; }
  html,body { width:${width}px; height:${height}px; overflow:hidden;
    font-family:'Segoe UI', Roboto, Arial, sans-serif; }
  body { background: radial-gradient(1200px 700px at 18% -12%, #2a5a85 0%, #1c3b5a 45%, #0f2233 100%); }
  .wrap { position:relative; width:100%; height:100%; display:flex; flex-direction:column;
    align-items:center; justify-content:center; text-align:center; }
  .tile { position:absolute; width:${Math.round(width * 0.055)}px; height:${Math.round(width * 0.055)}px;
    border-radius:14px; display:flex; align-items:center; justify-content:center;
    font-size:${Math.round(width * 0.03)}px; font-weight:700; color:#fff; opacity:.9;
    box-shadow:0 8px 18px rgba(0,0,0,.35); }
  .t1 { background:#e3b23c; left:6%; top:8%; transform:rotate(-10deg); }
  .t2 { background:#d27c2c; right:6%; top:8%; transform:rotate(9deg); }
  .t3 { background:#b0bec5; left:7%; bottom:9%; transform:rotate(7deg); }
  .t4 { background:#8d6e63; right:7%; bottom:9%; transform:rotate(-9deg); }
  .content { position:relative; z-index:1; display:flex; flex-direction:column; align-items:center; }
  .icon { width:${Math.round(width * 0.14)}px; height:${Math.round(width * 0.14)}px;
    border-radius:${Math.round(width * 0.03)}px; box-shadow:0 16px 34px rgba(0,0,0,.5); margin-bottom:${Math.round(height * 0.02)}px; }
  h1 { font-size:${Math.round(width * 0.062)}px; font-weight:800; color:#ffd24a;
    letter-spacing:1px; text-shadow:0 4px 0 rgba(0,0,0,.4); }
  .sub { margin-top:${Math.round(height * 0.014)}px; font-size:${Math.round(width * 0.024)}px; color:#dce8f2; letter-spacing:.5px; }
  .cta { margin-top:${Math.round(height * 0.03)}px; font-size:${Math.round(width * 0.026)}px; font-weight:700;
    color:#0f2233; background:linear-gradient(180deg,#ffe27a,#ffc93c); padding:${Math.round(height * 0.014)}px ${Math.round(width * 0.03)}px;
    border-radius:999px; box-shadow:0 8px 20px rgba(0,0,0,.35); }
</style></head><body>
  <div class="wrap">
    <div class="tile t1">2</div><div class="tile t2">4</div>
    <div class="tile t3">8</div><div class="tile t4">16</div>
    <div class="content">
      <img class="icon" src="data:image/png;base64,${icon}" alt=""/>
      <h1>${title}</h1>
      <div class="sub">${sub}</div>
      ${cta ? `<div class="cta">${cta}</div>` : ''}
    </div>
  </div>
</body></html>`;
}

const TARGETS = {
  vk:      { width: 1280, height: 720,  title: 'Океан 2048', sub: 'Головоломка в подводном стиле · 7 рангов', cta: 'Играть бесплатно', emoji: '🌊' },
  telegram: { width: 1200, height: 630, title: 'Океан 2048', sub: 'Соединяй плитки и исследуй глубины', cta: 'Попробовать', emoji: '🌊' },
  youtube: { width: 1280, height: 720,  title: 'Океан 2048', sub: 'Головоломка в подводном стиле', cta: 'Смотреть', emoji: '🌊' },
  story:   { width: 1080, height: 1920, title: 'Океан 2048', sub: 'Собери 2048 в подводном мире', cta: 'Играть', emoji: '🌊' },
  banner:  { width: 728,  height: 90,   title: 'Океан 2048', sub: 'Головоломка', cta: 'Играть', emoji: '🌊' },
};

const outDir = join(MEDIA_DIR, 'banners');
const which = process.argv[2] || 'all';

async function main() {
  console.log('Баннеры →', outDir);
  for (const [name, t] of Object.entries(TARGETS)) {
    if (which !== 'all' && which !== name) continue;
    const html = shell(t);
    await renderHtmlToPng({
      html,
      width: t.width,
      height: t.height,
      outPath: join(outDir, `banner-${name}.png`),
      waitMs: 300,
    });
  }
  console.log('Готово.');
}

main().catch((e) => { console.error('Ошибка:', e.message); process.exit(1); });
