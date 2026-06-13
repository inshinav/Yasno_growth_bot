/* Валидатор контента: node scripts/check.mjs [role|all|radar]
   Проверяет схему уроков и радара. Выход 1 при ошибках. */
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONTENT = resolve(__dirname, '../server/content');

const ROLES = ['crm', 'performance', 'smm', 'pr', 'design', 'product', 'analytics', 'growth', 'general'];
const LEVELS = ['beginner', 'practitioner', 'advanced'];
const BLOCK_TYPES = ['text', 'tip', 'prompt', 'tool', 'checklist'];
const RADAR_CATS = ['llm', 'agents', 'video', 'image', 'audio', 'automation', 'analytics', 'writing', 'info'];

const errors = [];
const err = (f, m) => errors.push(`${f}: ${m}`);

function checkLessonFile(role) {
  const file = `lessons/${role}.json`;
  let items;
  try {
    items = JSON.parse(readFileSync(resolve(CONTENT, file), 'utf8'));
  } catch (e) {
    err(file, `JSON не парсится: ${e.message}`);
    return;
  }
  if (!Array.isArray(items)) return err(file, 'не массив');

  const perLevel = { beginner: 0, practitioner: 0, advanced: 0 };
  const ids = new Set();

  items.forEach((l, i) => {
    const tag = `${file}[${i}] ${l.id || '?'}`;
    if (!l.id || ids.has(l.id)) err(tag, 'нет id или дубль');
    ids.add(l.id);
    if (l.role !== role) err(tag, `role=${l.role}, ожидалось ${role}`);
    if (!LEVELS.includes(l.level)) err(tag, `level=${l.level}`);
    else perLevel[l.level]++;
    if (!l.title || l.title.length < 8) err(tag, 'title короткий/нет');
    if (!(l.minutes >= 3 && l.minutes <= 5)) err(tag, `minutes=${l.minutes}, нужно 3-5`);
    if (!l.emoji) err(tag, 'нет emoji');
    if (!l.tagline || l.tagline.length < 15) err(tag, 'tagline короткий/нет');
    if (!Array.isArray(l.blocks) || l.blocks.length < 3 || l.blocks.length > 7) {
      err(tag, `blocks=${l.blocks?.length}, нужно 3-7`);
    } else {
      l.blocks.forEach((b, j) => {
        if (!BLOCK_TYPES.includes(b.type)) err(tag, `block[${j}].type=${b.type}`);
        if (b.type === 'prompt' && (!b.text || b.text.length < 80)) err(tag, `block[${j}] prompt слишком короткий`);
        if (b.type === 'tool' && !/^https?:\/\//.test(b.url || '')) err(tag, `block[${j}] tool без url`);
        if (b.type === 'checklist' && (!Array.isArray(b.items) || b.items.length < 2)) err(tag, `block[${j}] checklist <2 пунктов`);
        if ((b.type === 'text' || b.type === 'tip') && !(b.md || '').trim()) err(tag, `block[${j}] пустой md`);
      });
      if (!l.blocks.some((b) => b.type === 'prompt')) err(tag, 'нет ни одного prompt-блока');
    }
    if (!l.quiz?.q || !Array.isArray(l.quiz?.options) || l.quiz.options.length !== 3
      || !(l.quiz.correct >= 0 && l.quiz.correct <= 2) || !l.quiz.explain) {
      err(tag, 'quiz неполный (q, options[3], correct 0-2, explain)');
    }
    if (!l.action || l.action.length < 20) err(tag, 'action короткий/нет');
    const stub = /заглушк|placeholder|lorem|TODO|скоро здесь/i;
    if (stub.test(JSON.stringify(l))) err(tag, 'похоже на заглушку');
  });

  for (const lv of LEVELS) {
    if (perLevel[lv] < 3) err(file, `${lv}: ${perLevel[lv]} уроков, нужно ≥3`);
  }
}

function checkRadar() {
  const file = 'radar.json';
  let items;
  try {
    items = JSON.parse(readFileSync(resolve(CONTENT, file), 'utf8'));
  } catch (e) {
    err(file, `JSON не парсится: ${e.message}`);
    return;
  }
  if (!Array.isArray(items) || items.length < 10) err(file, `элементов ${items?.length}, нужно ≥10`);
  const ids = new Set();
  items.forEach((it, i) => {
    const tag = `${file}[${i}] ${it.id || '?'}`;
    if (!it.id || ids.has(it.id)) err(tag, 'нет id или дубль');
    ids.add(it.id);
    if (!it.name) err(tag, 'нет name');
    if (!RADAR_CATS.includes(it.category)) err(tag, `category=${it.category}`);
    if (!/^\d{4}-\d{2}$/.test(it.date || '')) err(tag, `date=${it.date}, нужно YYYY-MM`);
    if (!it.what || it.what.length < 40) err(tag, 'what короткий');
    if (!/^https?:\/\//.test(it.url || '')) err(tag, 'нет url');
    if (!it.forRoles?.default) err(tag, 'нет forRoles.default');
    const roleKeys = Object.keys(it.forRoles || {}).filter((k) => k !== 'default');
    if (roleKeys.some((k) => !ROLES.includes(k))) err(tag, `неизвестные роли: ${roleKeys}`);
    // released — минимум 1 ролевой разбор + default; beta/upcoming достаточно default
    const minRoles = it.status === 'released' ? 1 : 0;
    if (roleKeys.length < minRoles) err(tag, `мало ролевых разборов (нужно ≥${minRoles} + default)`);
  });
}

const target = process.argv[2] || 'all';
if (target === 'radar') checkRadar();
else if (target === 'all') { ROLES.forEach((r) => { try { checkLessonFile(r); } catch { err(r, 'файл отсутствует'); } }); checkRadar(); }
else if (ROLES.includes(target)) checkLessonFile(target);
else { console.error(`Неизвестная цель: ${target}`); process.exit(2); }

if (errors.length) {
  console.error(`✗ Ошибок: ${errors.length}`);
  errors.forEach((e) => console.error('  - ' + e));
  process.exit(1);
} else {
  console.log(`✓ ${target}: контент валиден`);
}
