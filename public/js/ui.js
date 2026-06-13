/* UI-хелперы: рендер, тосты, нижние листы, конфетти, копирование, mini-markdown. */
import { haptic } from './tg.js?v=v2';
import { badgeIcons, misc } from './icons.js?v=v2';

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

/* Мини-markdown: **жирный**, переносы, списки через "- ". Всегда сначала экранируем. */
export function mdLite(text) {
  const lines = esc(text).split(/\n/);
  let out = '';
  let inList = false;
  for (const line of lines) {
    const li = line.match(/^\s*-\s+(.*)/);
    if (li) {
      if (!inList) { out += '<ul>'; inList = true; }
      out += `<li>${li[1]}</li>`;
    } else {
      if (inList) { out += '</ul>'; inList = false; }
      if (line.trim()) out += `<p>${line}</p>`;
    }
  }
  if (inList) out += '</ul>';
  return out.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
}

/* ── Тосты ── */
export function toast(msg, emoji = '🌤') {
  const box = $('#toasts');
  const t = el(`<div class="toast"><span>${emoji}</span><span>${esc(msg)}</span></div>`);
  box.appendChild(t);
  setTimeout(() => {
    t.classList.add('toast--out');
    setTimeout(() => t.remove(), 350);
  }, 2600);
}

/* ── Нижний лист ── */
export function sheet(innerHTML, { onClose } = {}) {
  const backdrop = el('<div class="sheet-backdrop"></div>');
  const panel = el(`<div class="sheet"><div class="sheet__grip"></div>${innerHTML}</div>`);
  document.body.append(backdrop, panel);
  const close = () => {
    panel.style.transition = 'transform .28s ease, opacity .28s ease';
    panel.style.transform = 'translateY(60%)';
    panel.style.opacity = '0';
    backdrop.style.transition = 'opacity .25s ease';
    backdrop.style.opacity = '0';
    setTimeout(() => { backdrop.remove(); panel.remove(); onClose?.(); }, 280);
  };
  backdrop.addEventListener('click', close);
  return { panel, close };
}

/* ── Копирование ── */
export async function copyText(text, label = 'Промт скопирован') {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  }
  haptic('success');
  toast(label, '📋');
}

/* ── Конфетти на fx-canvas ── */
export function confetti(count = 90) {
  const canvas = $('#fx-canvas');
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = innerWidth * dpr;
  canvas.height = innerHeight * dpr;
  ctx.scale(dpr, dpr);
  const colors = ['#2D8CFF', '#FFC83D', '#6FB4FF', '#F5A623', '#FFFFFF'];
  const parts = Array.from({ length: count }, () => ({
    x: innerWidth / 2 + (Math.random() - 0.5) * 120,
    y: innerHeight * 0.42,
    vx: (Math.random() - 0.5) * 11,
    vy: -Math.random() * 13 - 4,
    s: Math.random() * 7 + 4,
    r: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.3,
    c: colors[(Math.random() * colors.length) | 0],
    shape: Math.random() > 0.5 ? 'rect' : 'circle',
  }));
  let frames = 0;
  (function tick() {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (const p of parts) {
      p.x += p.vx; p.y += p.vy; p.vy += 0.42; p.r += p.vr;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.r);
      ctx.fillStyle = p.c;
      ctx.globalAlpha = Math.max(0, 1 - frames / 95);
      if (p.shape === 'rect') ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.62);
      else { ctx.beginPath(); ctx.arc(0, 0, p.s / 2, 0, 7); ctx.fill(); }
      ctx.restore();
    }
    if (++frames < 100) requestAnimationFrame(tick);
    else ctx.clearRect(0, 0, innerWidth, innerHeight);
  })();
}

/* ── Показ новых бейджей (очередь) ── */
let badgeQueue = [];
let badgeShowing = false;

export function showBadges(badgeIds, catalog) {
  if (!badgeIds?.length) return;
  badgeQueue.push(...badgeIds);
  if (!badgeShowing) nextBadge(catalog);
}

function nextBadge(catalog) {
  const id = badgeQueue.shift();
  if (!id) { badgeShowing = false; return; }
  badgeShowing = true;
  const meta = (catalog || []).find((b) => b.id === id) || { title: 'Новый бейдж', desc: '' };
  haptic('success');
  confetti();
  const { close } = sheet(`
    <div class="badge-pop">
      <div class="badge-coin">${badgeIcons[id] || misc.sparkle}</div>
      <h2>${esc(meta.title)}</h2>
      <p class="muted" style="margin:6px 0 18px">${esc(meta.desc)}</p>
      <button class="btn btn--sun btn--block" data-ok>Забираю! ✨</button>
    </div>
  `, { onClose: () => setTimeout(() => nextBadge(catalog), 250) });
  $('[data-ok]', document).addEventListener('click', close);
}

/* ── Скелетоны ── */
export const skeletonList = (n = 3, h = 76) =>
  Array.from({ length: n }, () => `<div class="skeleton" style="height:${h}px;margin-bottom:10px"></div>`).join('');

/* Плюрализация */
export function plural(n, one, few, many) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

export function fmtMinutes(min) {
  if (min < 60) return `${min} мин`;
  const h = Math.floor(min / 60), m = min % 60;
  return m ? `${h} ч ${m} м` : `${h} ч`;
}
