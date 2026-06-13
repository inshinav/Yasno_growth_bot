/* Онбординг: 3 вопроса → уровень, выбор роли → результат с маскотом. */
import { api } from '../api.js?v=v5';
import { state, setProfile } from '../state.js?v=v5';
import { $, el, esc, toast, confetti } from '../ui.js?v=v5';
import { notifyBadges } from '../badges.js?v=v5';
import { roleIcons, roleColor } from '../icons.js?v=v5';
import { haptic } from '../tg.js?v=v5';

const QUESTIONS = [
  {
    q: 'Как часто AI участвует в твоей работе?',
    sub: 'Честно — это ни на что плохое не влияет 😉',
    opts: [
      { t: 'Пока никак или пару раз пробовал(а)', icon: '🌱', score: 0 },
      { t: 'Несколько раз в неделю', icon: '⚡', score: 1 },
      { t: 'Каждый день, это часть моих процессов', icon: '🧠', score: 2 },
    ],
  },
  {
    q: 'Промт для тебя — это…',
    sub: 'Нет неправильных ответов',
    opts: [
      { t: 'Что-то из мира программистов', icon: '🤔', score: 0 },
      { t: 'Запрос к нейросети простыми словами', icon: '💬', score: 1 },
      { t: 'Инженерия: роль, контекст, примеры, формат', icon: '🛠', score: 2 },
    ],
  },
  {
    q: 'А с автоматизацией рутины как?',
    sub: 'Последний вопрос про опыт',
    opts: [
      { t: 'Хочу, но не знаю, с чего начать', icon: '🧭', score: 0 },
      { t: 'Автоматизировал(а) пару мелочей', icon: '🔁', score: 1 },
      { t: 'У меня есть связки инструментов и сценарии', icon: '🚀', score: 2 },
    ],
  },
];

const LEVEL_RESULT = {
  beginner: {
    title: 'Росток',
    line: 'Ты в начале пути — и это лучшая точка старта. Уроки будут короткими, тёплыми и без жаргона.',
    img: 'mascot-beginner.png', emoji: '🌱',
  },
  practitioner: {
    title: 'Ракета',
    line: 'База есть — будем разгоняться: связки инструментов, рабочие промты, автоматизации.',
    img: 'mascot-practitioner.png', emoji: '🚀',
  },
  advanced: {
    title: 'Мозг',
    line: 'Ты уже впереди — дадим продвинутые сценарии, агентов и тонкую настройку процессов.',
    img: 'mascot-advanced.png', emoji: '🧠',
  },
};

export function renderOnboarding(view, done) {
  let step = 0;
  let score = 0;
  let role = null;
  const totalSteps = QUESTIONS.length + 1;

  const progress = () => `
    <div class="onb__progress">
      ${Array.from({ length: totalSteps }, (_, i) => `<span class="${i <= step ? 'on' : ''}"></span>`).join('')}
    </div>`;

  function renderQuestion() {
    const q = QUESTIONS[step];
    view.innerHTML = `
      <div class="onb">
        ${progress()}
        <h2>${esc(q.q)}</h2>
        <p class="onb__sub">${esc(q.sub)}</p>
        <div class="onb__options">
          ${q.opts.map((o, i) => `
            <button class="onb__opt" data-i="${i}">
              <span class="onb__opt-icon" style="font-size:21px">${o.icon}</span>
              <span>${esc(o.t)}</span>
            </button>`).join('')}
        </div>
      </div>`;
    view.querySelectorAll('.onb__opt').forEach((btn) => {
      btn.addEventListener('click', () => {
        haptic('light');
        btn.classList.add('picked');
        score += QUESTIONS[step].opts[btn.dataset.i].score;
        step += 1;
        setTimeout(() => (step < QUESTIONS.length ? renderQuestion() : renderRoles()), 220);
      });
    });
  }

  function renderRoles() {
    const roles = state.profile?.roles || {};
    view.innerHTML = `
      <div class="onb">
        ${progress()}
        <h2>Чем ты занимаешься в Ясно?</h2>
        <p class="onb__sub">Под роль соберём уроки, примеры и радар</p>
        <div class="onb__roles">
          ${Object.entries(roles).map(([id, r]) => `
            <button class="onb__role" data-role="${id}">
              <span class="onb__role-icon" style="color:${roleColor[id] || 'var(--azure)'};background:${(roleColor[id] || '#2D8CFF')}1A">${roleIcons[id] || ''}</span>
              <span>${esc(r.short)}</span>
            </button>`).join('')}
        </div>
        <button class="btn btn--primary btn--block onb__cta" disabled data-next>Дальше</button>
      </div>`;

    const next = view.querySelector('[data-next]');
    view.querySelectorAll('.onb__role').forEach((btn) => {
      btn.addEventListener('click', () => {
        haptic('light');
        view.querySelectorAll('.onb__role').forEach((b) => b.classList.remove('picked'));
        btn.classList.add('picked');
        role = btn.dataset.role;
        next.disabled = false;
      });
    });
    next.addEventListener('click', () => renderResult());
  }

  async function renderResult() {
    const level = score <= 2 ? 'beginner' : score <= 4 ? 'practitioner' : 'advanced';
    const r = LEVEL_RESULT[level];
    const roleTitle = state.profile?.roles?.[role]?.title || '';

    view.innerHTML = `
      <div class="onb onb__result">
        <div class="onb__mascot onb__mascot--halo" id="onb-mascot">
          <div style="font-size:96px;line-height:170px">${r.emoji}</div>
        </div>
        <h2>Твой уровень — ${r.title}</h2>
        <p class="onb__sub" style="margin-top:8px">${esc(r.line)}</p>
        <div class="row" style="justify-content:center;margin:4px 0 20px">
          <span class="chip chip--active">${esc(roleTitle)}</span>
          <span class="chip chip--sun">${r.emoji} ${r.title}</span>
        </div>
        <button class="btn btn--primary btn--block" data-go>В академию ✨</button>
        <p class="muted small" style="margin-top:14px">Уровень и роль можно сменить позже во вкладке «Прогресс»</p>
      </div>`;

    const img = new Image();
    img.src = `assets/${r.img}`;
    img.alt = r.title;
    img.onload = () => {
      const m = $('#onb-mascot', view);
      m.innerHTML = '';
      m.appendChild(img);
    };

    confetti(60);
    view.querySelector('[data-go]').addEventListener('click', async (e) => {
      e.target.disabled = true;
      try {
        const res = await api.onboarding(role, level);
        setProfile(res);
        haptic('success');
        done();
        notifyBadges(res.newBadges);
      } catch {
        e.target.disabled = false;
        toast('Не получилось сохранить, попробуй ещё раз', '😿');
      }
    });
  }

  renderQuestion();
}
