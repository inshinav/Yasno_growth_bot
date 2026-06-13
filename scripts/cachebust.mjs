/* Версионирование статики для обхода кэша Telegram WebView.
   Добавляет ?v=<версия> ко всем относительным импортам в public/js/**.js
   и к ссылкам css/js в public/index.html. Идемпотентно (заменяет старую версию).
   Запуск: node scripts/cachebust.mjs [версия]   (по умолчанию — растущее число) */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PUB = resolve(ROOT, 'public');
const VER = process.argv[2] || String(Date.now());

function* jsFiles(dir) {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) yield* jsFiles(p);
    else if (n.endsWith('.js')) yield p;
  }
}

const stripV = (s) => s.replace(/\?v=[^'"]*/g, '');
let changed = 0;

// 1. Импорты в JS-модулях: from './x.js' / import('./x.js')
for (const f of jsFiles(resolve(PUB, 'js'))) {
  let src = readFileSync(f, 'utf8');
  const out = src.replace(/(from\s+['"]|import\(\s*['"])(\.[^'"]+?\.js)(\?v=[^'"]*)?(['"])/g,
    (_, pre, path, _v, q) => `${pre}${stripV(path)}?v=${VER}${q}`);
  if (out !== src) { writeFileSync(f, out, 'utf8'); changed++; }
}

// 2. Ссылки в index.html
const htmlPath = resolve(PUB, 'index.html');
let html = readFileSync(htmlPath, 'utf8');
html = html.replace(/(href=")(css\/[^"?]+\.css)(\?v=[^"]*)?(")/g, (_, a, p, _v, b) => `${a}${p}?v=${VER}${b}`);
html = html.replace(/(src=")(js\/[^"?]+\.js)(\?v=[^"]*)?(")/g, (_, a, p, _v, b) => `${a}${p}?v=${VER}${b}`);
writeFileSync(htmlPath, html, 'utf8');

console.log(`✓ cache-bust v=${VER}: обновлено ${changed} JS-файлов + index.html`);
