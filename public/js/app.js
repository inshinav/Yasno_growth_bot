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

  // Герой: если файла нет — рисуем небо кодом (SVG-облака + солнце)
  const probe = new Image();
  probe.src = 'assets/splash-hero.png';
  probe.onerror = () => {
    const hero = $('#splash-hero');
    hero.classList.add('splash__hero--code');
    hero.innerHTML = `
      <svg viewBox="0 0 390 844" preserveAspectRatio="xMidYMax slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <radialGradient id="sun-g" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#FFD970" stop-opacity=".95"/>
            <stop offset="45%" stop-color="#FFC83D" stop-opacity=".5"/>
            <stop offset="100%" stop-color="#FFC83D" stop-opacity="0"/>
          </radialGradient>
          <filter id="soft" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="16"/></filter>
          <filter id="soft2" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="26"/></filter>
        </defs>
        <linearGradient id="cloud-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#FFFFFF"/>
          <stop offset="100%" stop-color="#DCEBFF"/>
        </linearGradient>
        <circle cx="225" cy="470" r="170" fill="url(#sun-g)"/>
        <circle cx="225" cy="470" r="58" fill="#FFE07A" opacity=".95" filter="url(#soft)"/>
        <g fill="url(#cloud-g)">
          <ellipse cx="70" cy="600" rx="125" ry="48" opacity=".9" filter="url(#soft2)"/>
          <ellipse cx="220" cy="660" rx="158" ry="56" filter="url(#soft2)"/>
          <ellipse cx="355" cy="610" rx="115" ry="44" opacity=".85" filter="url(#soft2)"/>
          <ellipse cx="45" cy="760" rx="160" ry="64" filter="url(#soft2)"/>
          <ellipse cx="310" cy="790" rx="180" ry="70" filter="url(#soft2)"/>
        </g>
        <g fill="#6FB4FF">
          <circle cx="55" cy="360" r="3" opacity=".55"/>
          <circle cx="125" cy="320" r="2" opacity=".4"/>
          <circle cx="320" cy="290" r="2.5" opacity=".5"/>
          <circle cx="355" cy="400" r="2" opacity=".4"/>
          <circle cx="40" cy="470" r="2" opacity=".35"/>
          <circle cx="285" cy="350" r="1.6" opacity=".45"/>
          <circle cx="170" cy="270" r="1.6" opacity=".35"/>
        </g>
        <g fill="#FFC83D">
          <path d="M330 330l4.5 12 12 4.5-12 4.5-4.5 12-4.5-12-12-4.5 12-4.5z" opacity=".85"/>
          <path d="M95 250l2.8 7.6 7.6 2.8-7.6 2.8-2.8 7.6-2.8-7.6-7.6-2.8 7.6-2.8z" opacity=".6"/>
          <path d="M250 250l2.2 6 6 2.2-6 2.2-2.2 6-2.2-6-6-2.2 6-2.2z" opacity=".5"/>
        </g>
      </svg>`;
  };
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
