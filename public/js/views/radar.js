/* «Радар новинок»: свежие AI-инструменты + «как применить в твоей роли». */
import { api } from '../api.js';
import { $, esc, toast, skeletonList } from '../ui.js';
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
  const cats = [...new Set(items.map((i) => i.category))].filter((c) => CATEGORY[c]);

  function paint() {
    const filtered = activeFilter === 'all' ? items : items.filter((i) => i.category === activeFilter);
    $('#radar-body', view).innerHTML = `
      <div class="radar-filters">
        <button class="chip ${activeFilter === 'all' ? 'chip--active' : ''}" data-f="all">Всё</button>
        ${cats.map((c) => `
          <button class="chip ${activeFilter === c ? 'chip--active' : ''}" data-f="${c}" style="white-space:nowrap">
            ${CATEGORY[c].emoji} ${CATEGORY[c].label}
          </button>`).join('')}
      </div>
      ${filtered.map(itemHTML).join('')}
      <p class="small muted" style="text-align:center;margin-top:16px">
        Лента курируется growth-командой · скоро — живой мониторинг новинок 🛰
      </p>`;

    view.querySelectorAll('[data-f]').forEach((b) =>
      b.addEventListener('click', () => { activeFilter = b.dataset.f; haptic('light'); paint(); }));
    view.querySelectorAll('[data-url]').forEach((b) =>
      b.addEventListener('click', () => openLink(b.dataset.url)));
  }
  paint();
}

const itemHTML = (it) => `
  <div class="card radar-item">
    ${it.hot ? '<span class="hot-flame">🔥 hot</span>' : ''}
    <div class="radar-item__head">
      <div class="radar-item__logo">${esc((it.name || '?')[0].toUpperCase())}</div>
      <div style="min-width:0;padding-right:${it.hot ? '64px' : '0'}">
        <h3>${esc(it.name)}</h3>
        <p class="vendor">${esc(it.vendor || '')} · ${esc(fmtDate(it.date))} · ${CATEGORY[it.category]?.emoji || ''} ${CATEGORY[it.category]?.label || ''}</p>
      </div>
    </div>
    <p class="radar-item__what">${esc(it.what || '')}</p>
    ${it.apply ? `<div class="radar-item__apply"><b>Для твоей роли:</b> ${esc(it.apply)}</div>` : ''}
    ${it.url ? `
      <button class="btn btn--ghost btn--sm" data-url="${esc(it.url)}" style="margin-top:12px">
        Открыть ${esc(shortHost(it.url))} →
      </button>` : ''}
  </div>`;

function fmtDate(d) {
  if (!d) return '';
  const [y, m] = String(d).split('-');
  const months = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
  return `${months[Number(m) - 1] || ''} ${y}`;
}

function shortHost(url) {
  try { return new URL(url).host.replace(/^www\./, ''); } catch { return 'ссылку'; }
}
