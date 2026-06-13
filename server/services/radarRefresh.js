/**
 * Автообновление «Радара новинок»: ходит в живой веб через OpenAI Responses API
 * (встроенный инструмент web_search) и переписывает radar.json + radar-matrix.json.
 * Использует тот же OPENAI_API_KEY. Любая ошибка → радар остаётся прежним (не ломаем).
 *
 * Управление через .env:
 *   RADAR_REFRESH=on|off            (по умолчанию on, если есть ключ)
 *   RADAR_PROVIDER=openai|perplexity (по умолчанию openai)
 *   RADAR_REFRESH_HOURS=24          (как часто; 0 = только вручную)
 *   PERPLEXITY_API_KEY=...          (если provider=perplexity)
 */
import { readFileSync, writeFileSync, existsSync, renameSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONTENT = resolve(__dirname, '../content');
const RADAR_PATH = resolve(CONTENT, 'radar.json');
const MATRIX_PATH = resolve(CONTENT, 'radar-matrix.json');
const STAMP_PATH = resolve(CONTENT, 'radar-updated.json');

const ROLES = ['crm', 'performance', 'smm', 'pr', 'design', 'product', 'analytics', 'growth', 'general'];
const CATS = ['llm', 'agents', 'video', 'image', 'audio', 'automation', 'analytics', 'writing'];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function buildPrompt() {
  const today = new Date().toISOString().slice(0, 10);
  return `Сегодня ${today}. Найди через веб-поиск САМЫЕ СВЕЖИЕ и грядущие AI-модели и инструменты, актуальные для growth-команды сервиса психотерапии Ясно (Россия): маркетинг, контент, аналитика, дизайн, продукт. Ищи новости за последние недели и анонсы на ближайшее будущее.

Верни СТРОГО один JSON-объект (без markdown), форма:
{
  "radar": [
    {
      "id": "kebab-case-уникальный",
      "name": "Название",
      "vendor": "Компания",
      "category": "llm|agents|video|image|audio|automation|analytics|writing",
      "date": "YYYY-MM реального релиза/анонса",
      "status": "released" | "upcoming",
      "hot": true|false,
      "what": "что это и что нового, 1-2 предложения, по-русски, бережный тон, без канцелярита",
      "bestFor": "для каких задач лучше всего подходит — конкретно",
      "url": "https://официальный-url",
      "forRoles": { "default": "как применить любому в growth", "<роль>": "сценарий" }
    }
  ],
  "matrix": [
    { "task": "тип задачи", "pick": "какую модель брать сейчас и почему", "budget": "дешёвая альтернатива" }
  ]
}

Требования:
- radar: 16-20 элементов. Сначала released, отсортированные по date (свежее — выше), затем 4-5 status:"upcoming" (анонсы/превью/ожидается) — чтобы команда знала заранее. hot:true у 4-6 самых важных/свежих.
- Даты реальные (по найденным источникам). Если не уверен в факте — НЕ включай (никаких выдумок).
- Категорий минимум 5 разных. Роли в forRoles только из: ${ROLES.join(', ')}. Для каждого элемента 2-4 роли + default.
- РФ-реалии: где уместно — YandexGPT/Алиса, GigaChat; без инструкций обхода блокировок и без политики.
- matrix: 8-12 пар «задача → какую модель брать».
- Тон бережный (тема ментального здоровья), всё по-русски.`;
}

/** OpenAI Responses API с инструментом web_search. */
async function fetchOpenAI(key) {
  const base = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '');
  const model = process.env.OPENAI_MODEL || 'gpt-5.5';
  const res = await fetch(`${base}/responses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      tools: [{ type: 'web_search' }],
      input: buildPrompt(),
      max_output_tokens: 8000,
    }),
    signal: AbortSignal.timeout(180000),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  // output_text — удобное поле; иначе собираем из output[].content[].text
  let text = data.output_text;
  if (!text && Array.isArray(data.output)) {
    text = data.output
      .flatMap((o) => (o.content || []).map((c) => c.text || ''))
      .join('');
  }
  return text;
}

/** Perplexity Chat API (sonar) — запасной живой источник. */
async function fetchPerplexity(key) {
  const res = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: process.env.PERPLEXITY_MODEL || 'sonar-pro',
      messages: [{ role: 'user', content: buildPrompt() }],
    }),
    signal: AbortSignal.timeout(180000),
  });
  if (!res.ok) throw new Error(`Perplexity ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  return data?.choices?.[0]?.message?.content || '';
}

function extractJSON(text) {
  if (!text) return null;
  // вырезаем возможные ```json ... ```
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced ? fenced[1] : text;
  const start = body.indexOf('{');
  const end = body.lastIndexOf('}');
  if (start < 0 || end < 0) return null;
  try { return JSON.parse(body.slice(start, end + 1)); } catch { return null; }
}

/** Валидация и нормализация одного элемента радара. */
function cleanItem(it, i) {
  if (!it || typeof it !== 'object') return null;
  const id = String(it.id || `item-${i}`).toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 48);
  if (!it.name || !CATS.includes(it.category) || !/^\d{4}-\d{2}$/.test(it.date || '')) return null;
  if (!/^https?:\/\//.test(it.url || '')) return null;
  if (!it.what || String(it.what).length < 30) return null;
  const forRoles = (it.forRoles && typeof it.forRoles === 'object') ? it.forRoles : {};
  if (!forRoles.default) forRoles.default = it.bestFor || 'Свежий инструмент — присмотрись, как применить в своей роли.';
  // оставляем только известные роли
  const cleanRoles = { default: String(forRoles.default).slice(0, 400) };
  for (const r of ROLES) if (forRoles[r]) cleanRoles[r] = String(forRoles[r]).slice(0, 400);
  return {
    id,
    name: String(it.name).slice(0, 60),
    vendor: String(it.vendor || '').slice(0, 40),
    category: it.category,
    date: it.date,
    status: it.status === 'upcoming' ? 'upcoming' : 'released',
    hot: !!it.hot,
    what: String(it.what).slice(0, 400),
    bestFor: it.bestFor ? String(it.bestFor).slice(0, 300) : null,
    url: it.url,
    forRoles: cleanRoles,
  };
}

function atomicWrite(path, obj) {
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, JSON.stringify(obj, null, 2), 'utf8');
  renameSync(tmp, path);
}

/**
 * Один прогон обновления. Возвращает {ok, count, error}.
 */
export async function refreshRadar({ force = false } = {}) {
  const provider = (process.env.RADAR_PROVIDER || 'openai').toLowerCase();
  const key = provider === 'perplexity' ? process.env.PERPLEXITY_API_KEY : process.env.OPENAI_API_KEY;
  if (!key) return { ok: false, error: 'no-key' };

  try {
    const text = provider === 'perplexity' ? await fetchPerplexity(key) : await fetchOpenAI(key);
    const parsed = extractJSON(text);
    const rawItems = Array.isArray(parsed?.radar) ? parsed.radar : (Array.isArray(parsed) ? parsed : null);
    if (!rawItems) return { ok: false, error: 'no-json' };

    const items = rawItems.map(cleanItem).filter(Boolean);
    // защита от деградации: не перезаписываем хороший радар куцым результатом
    const prev = existsSync(RADAR_PATH) ? JSON.parse(readFileSync(RADAR_PATH, 'utf8')) : [];
    if (items.length < 10) {
      if (!force || items.length < 6) return { ok: false, error: `too-few(${items.length})` };
    }
    if (items.length < Math.floor(prev.length * 0.6) && !force) {
      return { ok: false, error: `degraded(${items.length}<${prev.length})` };
    }

    atomicWrite(RADAR_PATH, items);
    if (Array.isArray(parsed?.matrix) && parsed.matrix.length) {
      const matrix = parsed.matrix
        .filter((m) => m?.task && m?.pick)
        .map((m) => ({ task: String(m.task).slice(0, 80), pick: String(m.pick).slice(0, 240), budget: m.budget ? String(m.budget).slice(0, 160) : null }))
        .slice(0, 14);
      if (matrix.length) atomicWrite(MATRIX_PATH, matrix);
    }
    atomicWrite(STAMP_PATH, { updatedAt: new Date().toISOString(), day: todayStr(), provider, count: items.length });

    // сбрасываем кэш контента, чтобы /api/radar отдавал свежее
    try { const c = await import('./content.js'); c.reloadRadar?.(); } catch { /* noop */ }

    console.log(`[radar] обновлён: ${items.length} элементов (${provider})`);
    return { ok: true, count: items.length };
  } catch (e) {
    console.error('[radar] refresh:', e?.message);
    return { ok: false, error: e?.message };
  }
}

export function radarUpdatedAt() {
  try { return JSON.parse(readFileSync(STAMP_PATH, 'utf8')); } catch { return null; }
}

/** Нужно ли обновлять (старше N часов). */
export function isStale(hours) {
  const stamp = radarUpdatedAt();
  if (!stamp?.updatedAt) return true;
  return (Date.now() - new Date(stamp.updatedAt).getTime()) > hours * 3600 * 1000;
}
