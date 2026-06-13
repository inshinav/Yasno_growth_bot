import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONTENT = resolve(__dirname, '../content');

export const ROLES = {
  crm: { title: 'CRM-маркетинг', short: 'CRM' },
  performance: { title: 'Performance', short: 'Perf' },
  smm: { title: 'SMM', short: 'SMM' },
  pr: { title: 'PR и коммуникации', short: 'PR' },
  design: { title: 'Дизайн', short: 'Дизайн' },
  product: { title: 'Продукт (мобайл/веб)', short: 'Продукт' },
  analytics: { title: 'Аналитика', short: 'Аналитика' },
  growth: { title: 'Growth', short: 'Growth' },
  general: { title: 'Общий трек', short: 'Общий' },
};

export const LEVELS = {
  beginner: { title: 'Новичок', mascot: 'mascot-beginner.png', metaphor: 'росток' },
  practitioner: { title: 'Практик', mascot: 'mascot-practitioner.png', metaphor: 'ракета' },
  advanced: { title: 'Продвинутый', mascot: 'mascot-advanced.png', metaphor: 'мозг' },
};

function loadLessons() {
  const dir = resolve(CONTENT, 'lessons');
  const all = [];
  for (const f of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
    try {
      const items = JSON.parse(readFileSync(resolve(dir, f), 'utf8'));
      all.push(...items);
    } catch (e) {
      console.error(`[content] не смог прочитать ${f}:`, e?.message);
    }
  }
  return all;
}

function readJsonSafe(file, fallback) {
  try { return JSON.parse(readFileSync(resolve(CONTENT, file), 'utf8')); }
  catch { return fallback; }
}

let LESSONS = loadLessons();
let RADAR = readJsonSafe('radar.json', []);
let RADAR_MATRIX = readJsonSafe('radar-matrix.json', []);
let RADAR_STAMP = readJsonSafe('radar-updated.json', null);

export const lessons = () => LESSONS;
export const radar = () => RADAR;
export const radarMatrix = () => RADAR_MATRIX;
export const radarUpdated = () => RADAR_STAMP;

/** Перечитать радар с диска (после автообновления). */
export function reloadRadar() {
  RADAR = readJsonSafe('radar.json', RADAR);
  RADAR_MATRIX = readJsonSafe('radar-matrix.json', RADAR_MATRIX);
  RADAR_STAMP = readJsonSafe('radar-updated.json', RADAR_STAMP);
}

export const lessonsFor = (role, level) =>
  LESSONS.filter((l) => l.role === role && l.level === level);

export const getLesson = (id) => LESSONS.find((l) => l.id === id) || null;

/** Детерминированный «урок дня»: по дате, среди непройденных, иначе по кругу. */
export function lessonOfDay(role, level, doneIds, dateStr) {
  const pool = lessonsFor(role, level);
  if (!pool.length) return null;
  const fresh = pool.filter((l) => !doneIds.includes(l.id));
  const pick = fresh.length ? fresh : pool;
  let h = 0;
  for (const ch of `${dateStr}|${role}|${level}`) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return pick[h % pick.length];
}
