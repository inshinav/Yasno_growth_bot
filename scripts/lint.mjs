/* Синтаксис-проверка всех JS/MJS (node --check) + парс всех JSON контента.
   Запуск: npm run lint */
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve, dirname, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SKIP = new Set(['node_modules', '.git', 'data', 'shots', 'dist', 'logs']);

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else yield p;
  }
}

let errors = 0;
let js = 0, json = 0;
for (const f of walk(ROOT)) {
  const ext = extname(f);
  if (ext === '.js' || ext === '.mjs' || ext === '.cjs') {
    try {
      execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' });
      js++;
    } catch (e) {
      errors++;
      console.error(`✗ ${f}\n${e.stderr?.toString().slice(0, 400)}`);
    }
  } else if (ext === '.json') {
    try {
      JSON.parse(readFileSync(f, 'utf8'));
      json++;
    } catch (e) {
      errors++;
      console.error(`✗ ${f}: ${e.message}`);
    }
  }
}

if (errors) {
  console.error(`✗ Ошибок: ${errors}`);
  process.exit(1);
}
console.log(`✓ lint: ${js} js + ${json} json — чисто`);
