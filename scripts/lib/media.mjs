// Общие утилиты для медиа-пайплайнов «Океан 2048» (баннеры, reels, скриншоты).
// Используется Playwright (рендер HTML/CSS → PNG/видео) + ffmpeg (конвертация, склейка).
/* global console, setTimeout */
import { chromium } from 'playwright';
import { mkdirSync, existsSync, readdirSync, statSync, writeFileSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const MEDIA_DIR = join(ROOT, 'store', 'media');

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- ffmpeg ----------
const FFMPEG_CANDIDATES = [
  'D:/tools/ffmpeg/ffmpeg-9.0.1-essentials_build/bin/ffmpeg.exe',
  'ffmpeg',
];
const FFPROBE_CANDIDATES = [
  'D:/tools/ffmpeg/ffmpeg-9.0.1-essentials_build/bin/ffprobe.exe',
  'ffprobe',
];

function findBin(candidates, name) {
  for (const c of candidates) {
    try {
      const r = spawnSync(c, ['-version'], { encoding: 'utf8', timeout: 10000 });
      if (r.status === 0) return c;
    } catch {
      /* пробуем следующий */
    }
  }
  throw new Error(`${name} не найден. Установите ffmpeg или проверьте PATH.`);
}

let _ffmpeg;
let _ffprobe;
export const ffmpeg = () => (_ffmpeg ??= findBin(FFMPEG_CANDIDATES, 'ffmpeg'));
export const ffprobe = () => (_ffprobe ??= findBin(FFPROBE_CANDIDATES, 'ffprobe'));

// ---------- Playwright ----------
export async function openPage({ width, height, videoDir = null, videoSize = null } = {}) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 1,
    ...(videoDir && videoSize
      ? { recordVideo: { dir: videoDir, size: videoSize } }
      : {}),
  });
  const page = await context.newPage();
  page.on('pageerror', (e) => console.log(`  [pageerror] ${e.message}`));
  return { browser, context, page };
}

// Рендер HTML-строки в изображение (PNG) через Playwright.
export async function renderHtmlToPng({ html, width, height, outPath, waitMs = 300 }) {
  mkdirSync(dirname(outPath), { recursive: true });
  const { browser, page } = await openPage({ width, height });
  try {
    await page.setContent(html, { waitUntil: 'load' });
    await sleep(waitMs);
    await page.screenshot({ path: outPath });
  } finally {
    await browser.close();
  }
  console.log('  PNG:', outPath);
  return outPath;
}

// Запись видео из HTML-сцены заданной длительности.
export async function recordHtmlVideo({ html, width, height, outDir, seconds, onFrame }) {
  mkdirSync(outDir, { recursive: true });
  const { browser, context, page } = await openPage({
    width,
    height,
    videoDir: outDir,
    videoSize: { width, height },
  });
  try {
    await page.setContent(html, { waitUntil: 'load' });
    await sleep(300);
    const start = Date.now();
    let i = 0;
    while (Date.now() - start < seconds * 1000) {
      if (onFrame) await onFrame({ page, i, t: (Date.now() - start) / 1000 });
      await sleep(50);
      i++;
    }
  } finally {
    await context.close(); // финализирует .webm
    await browser.close();
  }
  const webm = findNewestWebm(outDir);
  if (!webm) throw new Error('Видео .webm не найдено в ' + outDir);
  return webm;
}

export function findNewestWebm(dir) {
  const files = [];
  const walk = (d) => {
    for (const f of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, f.name);
      if (f.isDirectory()) walk(p);
      else if (f.name.endsWith('.webm')) files.push(p);
    }
  };
  walk(dir);
  files.sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
  return files[0];
}

// ---------- ffmpeg-обёртки (возвращают {status, stdout, stderr}) ----------
export function runFfmpeg(args) {
  const r = spawnSync(ffmpeg(), ['-y', ...args], { encoding: 'utf8', timeout: 600000 });
  if (r.status !== 0) {
    console.error('  ffmpeg failed:', (r.stderr || '').slice(-2000));
  }
  return r;
}

// Конвертация в MP4 (H.264 + AAC, 30fps, faststart) — стандарт для соцсетей.
export function toMp4(input, output, { fps = 30, crf = 20, scale = null, audio = null } = {}) {
  mkdirSync(dirname(output), { recursive: true });
  const vf = ['fps=' + fps, scale ? 'scale=' + scale : null].filter(Boolean).join(',');
  const args = ['-i', input, '-vf', vf, '-c:v', 'libx264', '-preset', 'medium', '-crf', String(crf), '-pix_fmt', 'yuv420p'];
  if (audio) {
    args.push('-c:a', 'aac', '-b:a', '128k');
  } else {
    args.push('-an');
  }
  args.push('-movflags', '+faststart', output);
  const r = runFfmpeg(args);
  return r.status === 0 ? output : null;
}

// GIF-превью (палитра) из видео.
export function toGif(input, output, { seconds = 5, fps = 12, scale = '480:-1' } = {}) {
  mkdirSync(dirname(output), { recursive: true });
  const vf = `fps=${fps},scale=${scale}:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse`;
  const r = runFfmpeg(['-i', input, '-t', String(seconds), '-vf', vf, output]);
  return r.status === 0 ? output : null;
}

// Склейка списка видео в один MP4 (concat demuxer).
export function concatVideos(inputs, output, { fps = 30 } = {}) {
  mkdirSync(dirname(output), { recursive: true });
  // Приводим все к единым параметрам, чтобы concat не падал
  const norm = inputs.map((p, i) => {
    const tmp = join(dirname(output), `._norm_${i}.mp4`);
    toMp4(p, tmp, { fps });
    return tmp;
  });
  const listFile = join(dirname(output), '._concat.txt');
  writeFileSync(listFile, norm.map((p) => `file '${p.replace(/\\/g, '/')}'`).join('\n'));
  const r = runFfmpeg(['-f', 'concat', '-safe', '0', '-i', listFile, '-c', 'copy', output]);
  norm.forEach((p) => rmSync(p, { force: true }));
  rmSync(listFile, { force: true });
  return r.status === 0 ? output : null;
}

export { existsSync };
