// Генерация вертикальных рекламных роликов 9:16 (VK Клипы / Reels / Shorts).
// Сцена: анимированный HTML (пузырьки, плитки, заголовок, CTA) → Playwright recordVideo → ffmpeg MP4/GIF.
// Запуск:  node scripts/make-reels.mjs [секунды]   (по умолчанию 15)
// Выход:   store/media/reels/reel.mp4 (1080×1920, 30fps) + reel-preview.gif
/* global console, process */
import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import { recordHtmlVideo, toMp4, toGif, MEDIA_DIR, ROOT } from './lib/media.mjs';

const icon = readFileSync(join(ROOT, 'icons', 'icon-512.png')).toString('base64');

function sceneHtml() {
  return `<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><style>
  * { margin:0; padding:0; box-sizing:border-box; }
  html,body { width:1080px; height:1920px; overflow:hidden;
    font-family:'Segoe UI', Roboto, Arial, sans-serif;
    background: radial-gradient(1400px 1000px at 25% -10%, #2a5a85 0%, #1c3b5a 45%, #0f2233 100%); }
  .wrap { position:relative; width:100%; height:100%; display:flex; flex-direction:column;
    align-items:center; justify-content:center; text-align:center; }
  .icon { width:240px; height:240px; border-radius:56px; box-shadow:0 24px 60px rgba(0,0,0,.55);
    margin-bottom:40px; animation: bob 3s ease-in-out infinite; }
  h1 { font-size:128px; font-weight:800; color:#ffd24a; text-shadow:0 6px 0 rgba(0,0,0,.45); }
  .sub { margin-top:24px; font-size:44px; color:#dce8f2; letter-spacing:1px; }
  .cta { margin-top:80px; font-size:52px; font-weight:700; color:#0f2233;
    background:linear-gradient(180deg,#ffe27a,#ffc93c); padding:28px 72px; border-radius:999px;
    box-shadow:0 16px 40px rgba(0,0,0,.4); animation: pulse 2s ease-in-out infinite; }
  /* пузырьки поднимаются снизу вверх */
  .b { position:absolute; bottom:-80px; border-radius:50%;
    background:radial-gradient(circle at 30% 30%, rgba(255,255,255,.5), rgba(255,255,255,.06) 70%);
    animation: rise linear infinite; }
  @keyframes bob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-18px)} }
  @keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.05)} }
  @keyframes rise { 0%{transform:translateY(0)} 100%{transform:translateY(-2100px)} }
</style></head><body>
  <div class="wrap">
    <div class="b" style="left:8%;  width:60px; height:60px; animation-duration:7s;"></div>
    <div class="b" style="left:22%; width:34px; height:34px; animation-duration:5s;"></div>
    <div class="b" style="left:45%; width:80px; height:80px; animation-duration:9s;"></div>
    <div class="b" style="left:63%; width:42px; height:42px; animation-duration:6s;"></div>
    <div class="b" style="left:82%; width:56px; height:56px; animation-duration:8s;"></div>
    <div class="b" style="left:91%; width:28px; height:28px; animation-duration:4.5s;"></div>
    <img class="icon" src="data:image/png;base64,${icon}" alt=""/>
    <h1>Океан 2048</h1>
    <div class="sub">Соединяй плитки · Исследуй глубины</div>
    <div class="cta">🌊 Играть бесплатно</div>
  </div>
</body></html>`;
}

const outDir = join(MEDIA_DIR, 'reels');

async function main() {
  const seconds = Number(process.argv[2] || 15);
  console.log(`Reel 1080×1920, ${seconds}с →`, outDir);
  const webm = await recordHtmlVideo({
    html: sceneHtml(),
    width: 1080,
    height: 1920,
    outDir,
    seconds,
  });
  console.log('  raw:', webm);

  const mp4 = toMp4(webm, join(outDir, 'reel.mp4'), { fps: 30, crf: 22, scale: '1080:1920' });
  const gif = toGif(webm, join(outDir, 'reel-preview.gif'), { seconds: 5, fps: 12, scale: '360:-1' });
  console.log('\nРезультаты:');
  if (mp4) console.log('  MP4:', mp4);
  if (gif) console.log('  GIF:', gif);
}

main().catch((e) => { console.error('Ошибка:', e.message); process.exit(1); });
