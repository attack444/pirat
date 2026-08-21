/* global console */
/**
 * Генерация всех PNG-иконок игры из единого SVG (icons/icon.svg).
 * Использует Playwright с собственным Chromium (как make-store-shots.mjs).
 *
 * Выход:
 *   icons/icon-32.png       32×32
 *   icons/icon-192.png      192×192
 *   icons/icon-512.png      512×512
 *   icons/icon-1024.png     1024×1024
 *   icons/icon-maskable-192.png   192×192 (maskable, фон на всю площадь)
 *   icons/icon-maskable-512.png   512×512 (maskable)
 *   icons/apple-touch-icon.png    180×180 (без прозрачности/скругления для iOS)
 *   store/assets/app-store-icon-1024.png 1024×1024 (без скругления, без альфы)
 *
 * Запуск: node scripts/gen-icons.mjs
 */
import { chromium } from 'playwright';
import { readFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const svg = readFileSync(join(root, 'icons', 'icon.svg'), 'utf8');

// Версия для App Store / Apple: квадрат без скруглённых углов и без альфы
const svgSquare = svg.replace(/rx="96"/g, 'rx="0"');

async function renderSvg(source, size, out) {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
    const html = `<!doctype html><html><head><meta charset="utf-8"><style>
      * { margin:0; padding:0; }
      html,body { width:${size}px; height:${size}px; overflow:hidden; background:#0a2a4a; }
      svg { width:${size}px; height:${size}px; display:block; }
    </style></head><body>${source}</body></html>`;
    await page.setContent(html, { waitUntil: 'load' });
    await page.screenshot({ path: out, omitBackground: true });
    console.log('  OK', `${size}x${size}`, out.split('/').pop());
  } finally {
    await browser.close();
  }
}

mkdirSync(join(root, 'icons'), { recursive: true });
mkdirSync(join(root, 'store', 'assets'), { recursive: true });

console.log('Генерация иконок из icons/icon.svg…');
await renderSvg(svg, 32,  join(root, 'icons', 'icon-32.png'));
await renderSvg(svg, 192, join(root, 'icons', 'icon-192.png'));
await renderSvg(svg, 512, join(root, 'icons', 'icon-512.png'));
await renderSvg(svg, 1024, join(root, 'icons', 'icon-1024.png'));
await renderSvg(svg, 192, join(root, 'icons', 'icon-maskable-192.png'));
await renderSvg(svg, 512, join(root, 'icons', 'icon-maskable-512.png'));
// Apple Touch Icon: 180×180, без скругления (iOS скругляет сам)
await renderSvg(svgSquare, 180, join(root, 'icons', 'apple-touch-icon.png'));
// App Store: 1024×1024 без альфы
await renderSvg(svgSquare, 1024, join(root, 'store', 'assets', 'app-store-icon-1024.png'));

console.log('Готово. Все иконки перегенерированы.');
