/* Бут: splash → auth → онбординг или приложение. Роутер табов. */
import { initTelegram, haptic } from './tg.js';
import { api } from './api.js';
import { state, setProfile } from './state.js';
import { $, el, toast } from './ui.js';
import { tabIcons, misc } from './icons.js';
import { startBackground } from './bg.js';
import { renderOnboarding } from './views/onboarding.js';
import { renderLearn } from './views/learn.js';
import { renderTask } from './views/task.js';
import { renderRadar } from './views/radar.js';
import { renderProgress } from './views/progress.js';
import { renderEffect } from './views/effect.js';

const TABS = [
  { id: 'learn', label: 'Учусь', render: renderLearn },
  { id: 'task', label: 'Задача', render: renderTask },
  { id: 'radar', label: 'Радар', render: renderRadar },
  { id: 'progress', label: 'Прогресс', render: renderProgress },
  { id: 'effect', label: 'Эффект', render: renderEffect },
];

function setupSplashArt() {
  // Логотип: пробуем растровый ассет, нет — рисуем кодом
  const logo = $('#splash-logo');
  const img = new Image();
  img.src = 'assets/bot-icon.png';
  img.alt = '';
  img.onload = () => { logo.innerHTML = ''; logo.appendChild(img); };
  img.onerror = () => { logo.style.color = '#fff'; logo.innerHTML = misc.logo; };

  // Герой: если файла нет, остаётся брендовый градиент
  const probe = new Image();
  probe.src = 'assets/splash-hero.png';
  probe.onerror = () => { $('#splash-hero').style.display = 'none'; };
}

function buildTabbar() {
  const bar = $('#tabbar');
  bar.classList.add('glass');
  bar.innerHTML = `<div class="tabbar__pill"></div>` + TABS.map((t) => `
    <button class="tabbar__btn" data-tab="${t.id}" aria-label="${t.label}">
      ${tabIcons[t.id]}
      <span>${t.label}</span>
    </button>
  `).join('');
  bar.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-tab]');
    if (btn) switchTab(btn.dataset.tab);
  });
}

export function switchTab(id, force = false) {
  if (state.tab === id && !force && $('#app').childElementCount) return;
  state.tab = id;
  haptic('light');

  const idx = TABS.findIndex((t) => t.id === id);
  const pill = $('.tabbar__pill');
  if (pill) pill.style.transform = `translateX(${idx * 100}%)`;
  document.querySelectorAll('.tabbar__btn').forEach((b) =>
    b.classList.toggle('active', b.dataset.tab === id));

  const app = $('#app');
  app.innerHTML = '';
  const view = el(`<section class="view" data-view="${id}"></section>`);
  app.appendChild(view);
  TABS[idx].render(view);
  api.event('tab_visit', { tab: id });
  scrollTo({ top: 0 });
}

export function showApp() {
  $('#splash').classList.add('splash--out');
  setTimeout(() => $('#splash').remove(), 600);
  $('#app').hidden = false;
  $('#tabbar').hidden = false;
  switchTab('learn', true);
}

export function startOnboarding() {
  $('#splash').classList.add('splash--out');
  setTimeout(() => $('#splash').remove(), 600);
  const app = $('#app');
  app.hidden = false;
  app.innerHTML = '';
  const view = el('<section class="view"></section>');
  app.appendChild(view);
  renderOnboarding(view, () => {
    $('#tabbar').hidden = false;
    switchTab('learn', true);
  });
}

async function boot() {
  initTelegram();
  startBackground();
  setupSplashArt();
  buildTabbar();

  const cta = $('#splash-cta');
  const loader = $('#splash-loader');
  cta.style.visibility = 'hidden';

  let profile = null;
  try {
    profile = await api.auth();
    setProfile(profile);
  } catch (e) {
    loader.innerHTML = `<p class="muted small" style="text-align:center;padding:0 30px">
      ${e?.status === 401 ? 'Открой приложение через Telegram-бота — там безопаснее 💙' : 'Не получилось связаться с сервером. Проверь сеть и попробуй ещё раз.'}
    </p>`;
    cta.style.visibility = 'visible';
    cta.querySelector('span').textContent = 'Повторить';
    cta.onclick = () => location.reload();
    return;
  }

  loader.hidden = true;
  cta.style.visibility = 'visible';
  cta.onclick = () => {
    haptic('medium');
    if (profile.user.onboarded) showApp();
    else startOnboarding();
  };
}

boot();
