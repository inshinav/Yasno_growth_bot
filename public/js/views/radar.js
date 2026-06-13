/* «Радар новинок»: свежие AI-инструменты + «как применить в твоей роли»,
   раздел «на подходе» и матрица «какая модель под задачу». */
import { api } from '../api.js';
import { $, esc, skeletonList } from '../ui.js';
import { misc } from '../icons.js';
import { openLink, haptic } from '../tg.js';

const CATEGORY = {
  llm: { label: 'Модели', emoji: '🧠' },
  agents: { label: 'Агенты', emoji: '🤖' },
  video: { label: 'Видео', emoji: '🎬' },
  image: { label: 'Картинки', emoji: '🎨' },
  audio: { label: 'Звук', emoji: '🎙' },
  automation: { label: 'Автоматизация', emoji: '⚙️' },
  analytics: { label: 'Аналитика', emoji: '📊' },
  writing: { label: 'Тексты', emoji: '✍️' },
  info: { label: 'Инфо', emoji: 'ℹ️' },
};

let activeFilter = 'all';

export async function renderRadar(view) {
  view.innerHTML = `
    <div class="view__head">
      <h2>Радар новинок 📡</h2>
      <p class="muted">Свежие AI-инструменты — сразу с разбором под твою роль</p>
    </div>
    <div id="radar-body">${skeletonList(4, 120)}</div>`;

  let data;
  try {
    data = await api.radar();
  } catch {
    $('#radar-body', view).innerHTML = `
      <div class="empty">
        <div class="empty__art" style="color:var(--azure)">${misc.radar || misc.cloud}</div>
        <h3>Радар не ловит сигнал</h3>
        <p class="small" style="margin-top:6px">Проверь сеть и попробуй ещё раз</p>
        <button class="btn btn--ghost btn--sm" data-retry style="margin-top:14px">Повторить</button>
      </div>`;
    $('[data-retry]', view)?.addEventListener('click', () => renderRadar(view));
    return;
  }

  const items = data.items || [];
  const matrix = data.matrix || [];
  const released = items.filter((i) => i.status !== 'upcoming');
  const upcoming = items.filter((i) => i.status === 'upcoming');
  const cats = [...new Set(items.map((i) => i.category))].filter((c) => CATEGORY[c]);

  function paint() {
    const pool = activeFilter === 'all' ? released : released.filter((i) => i.category === activeFilter);
    const up = activeFilter === 'all' ? upcoming : upcoming.filter((i) => i.category === activeFilter);
    $('#radar-body', view).innerHTML = `
      ${freshnessLine(data.updated)}
      <div class="radar-filters">
        <button class="chip ${activeFilter === 'all' ? 'chip--active' : ''}" data-f="all">Всё</button>
        ${cats.map((c) => `
          <button class="chip ${activeFilter === c ? 'chip--active' : ''}" data-f="${c}" style="white-space:nowrap">
            ${CATEGORY[c].emoji} ${CATEGORY[c].label}
          </button>`).join('')}
      </div>

      ${pool.map(itemHTML).join('')}

      ${up.length ? `
        <div class="radar-section">
          <h3>🔜 На подходе</h3>
          <p class="small muted" style="margin:2px 0 12px">Анонсы и превью — знаем заранее, готовимся</p>
        </div>
        ${up.map(itemHTML).join('')}
      ` : ''}

      ${matrix.length ? matrixHTML(matrix) : ''}

      <p class="small muted" style="text-align:center;margin-top:16px">
        ${data.updated ? 'Лента обновляется автоматически из живого веба 🛰' : 'Лента курируется growth-командой · скоро — живой мониторинг 🛰'}
      </p>`;

    view.querySelectorAll('[data-f]').forEach((b) =>
      b.addEventListener('click', () => { activeFilter = b.dataset.f; haptic('light'); paint(); }));
    view.querySelectorAll('[data-url]').forEach((b) =>
      b.addEventListener('click', () => openLink(b.dataset.url)));
  }
  paint();
}

const itemHTML = (it) => `
  <div class="card radar-item ${it.status === 'upcoming' ? 'radar-item--soon' : ''}">
    ${it.status === 'upcoming' ? '<span class="soon-tag">скоро</span>' : (it.hot ? '<span class="hot-flame">🔥 hot</span>' : '')}
    <div class="radar-item__head">
      <div class="radar-item__logo">${esc((it.name || '?')[0].toUpperCase())}</div>
      <div style="min-width:0;padding-right:64px">
        <h3>${esc(it.name)}</h3>
        <p class="vendor">${esc(it.vendor || '')} · ${esc(fmtDate(it.date))} · ${CATEGORY[it.category]?.emoji || ''} ${CATEGORY[it.category]?.label || ''}</p>
      </div>
    </div>
    <p class="radar-item__what">${esc(it.what || '')}</p>
    ${it.bestFor ? `<div class="radar-item__best">✦ <b>Лучше всего для:</b> ${esc(it.bestFor)}</div>` : ''}
    ${it.apply ? `<div class="radar-item__apply"><b>Для твоей роли:</b> ${esc(it.apply)}</div>` : ''}
    ${it.url ? `
      <button class="btn btn--ghost btn--sm" data-url="${esc(it.url)}" style="margin-top:12px">
        Открыть ${esc(shortHost(it.url))} →
      </button>` : ''}
  </div>`;

const matrixHTML = (matrix) => `
  <div class="radar-section">
    <h3>🧭 Какая модель под задачу</h3>
    <p class="small muted" style="margin:2px 0 12px">Шпаргалка: что брать под типовую работу</p>
  </div>
  <div class="card" style="padding:6px 16px">
    ${matrix.map((m, i) => `
      <div class="matrix-row ${i ? 'matrix-row--div' : ''}">
        <div class="matrix-row__task">${esc(m.task)}</div>
        <div class="matrix-row__pick">${esc(m.pick)}</div>
        ${m.budget ? `<div class="matrix-row__budget">💸 экономно: ${esc(m.budget)}</div>` : ''}
      </div>`).join('')}
  </div>`;

function freshnessLine(updated) {
  if (!updated?.updatedAt) return '';
  const d = new Date(updated.updatedAt);
  const now = Date.now();
  const diffH = Math.floor((now - d.getTime()) / 3600000);
  let ago;
  if (diffH < 1) ago = 'только что';
  else if (diffH < 24) ago = `${diffH} ч назад`;
  else ago = `${Math.floor(diffH / 24)} дн назад`;
  return `<div class="radar-fresh">🟢 обновлено ${ago}</div>`;
}

function fmtDate(d) {
  if (!d) return '';
  const [y, m] = String(d).split('-');
  const months = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
  return `${months[Number(m) - 1] || ''} ${y}`;
}

function shortHost(url) {
  try { return new URL(url).host.replace(/^www\./, ''); } catch { return 'ссылку'; }
}
