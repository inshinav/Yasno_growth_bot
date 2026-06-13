/* «Прогресс»: маскот, статы, трек, бейджи, смена роли/уровня. */
import { api } from '../api.js?v=v5';
import { state, setProfile, me, roles, levels } from '../state.js?v=v5';
import { $, esc, toast, sheet, skeletonList, fmtMinutes, plural } from '../ui.js?v=v5';
import { badgeIcons, roleIcons, roleColor, misc } from '../icons.js?v=v5';
import { haptic } from '../tg.js?v=v5';

export async function renderProgress(view) {
  view.innerHTML = `
    <div class="view__head">
      <h2>Мой прогресс 📈</h2>
      <p class="muted">Личное и приватное — видишь только ты</p>
    </div>
    <div id="prog-body">${skeletonList(3, 110)}</div>`;

  let data;
  try {
    data = await api.progress();
  } catch {
    $('#prog-body', view).innerHTML = `<div class="empty"><div class="empty__art" style="color:var(--azure)">${misc.cloud}</div><h3>Не загрузилось</h3><button class="btn btn--ghost btn--sm" data-retry style="margin-top:14px">Повторить</button></div>`;
    $('[data-retry]', view)?.addEventListener('click', () => renderProgress(view));
    return;
  }

  const u = me();
  const lvl = levels()[u.level] || {};
  const role = roles()[u.role] || {};
  const { stats, badges, rank, totalUsers, trackTotal } = data;
  const donePct = trackTotal ? Math.min(100, Math.round((stats.lessonsDone / trackTotal) * 100)) : 0;

  $('#prog-body', view).innerHTML = `
    <div class="card me-card">
      <div class="me-card__mascot" id="prog-mascot"><div style="font-size:56px;line-height:84px;text-align:center">${lvl.metaphor === 'росток' ? '🌱' : lvl.metaphor === 'ракета' ? '🚀' : '🧠'}</div></div>
      <div style="min-width:0">
        <h3>${esc(u.firstName || 'Коллега')}</h3>
        <div class="row" style="margin-top:7px;flex-wrap:wrap;gap:6px">
          <span class="chip" style="font-size:12px">${esc(role.short || '—')}</span>
          <span class="chip chip--sun" style="font-size:12px">${esc(lvl.title || '—')}</span>
        </div>
        <button class="btn btn--ghost btn--sm" data-change style="margin-top:9px">Сменить роль/уровень</button>
      </div>
    </div>

    <div class="stat-grid">
      <div class="card stat-cell"><div class="num">${stats.lessonsDone}</div><div class="lbl">${plural(stats.lessonsDone, 'урок', 'урока', 'уроков')}</div></div>
      <div class="card stat-cell"><div class="num sun">${stats.streak.current}🔥</div><div class="lbl">стрик (рекорд ${stats.streak.best})</div></div>
      <div class="card stat-cell"><div class="num">${stats.savedMin ? fmtMinutes(stats.savedMin) : '0'}</div><div class="lbl">экономия/нед</div></div>
    </div>

    <div class="card" style="margin-bottom:16px">
      <div class="row" style="margin-bottom:9px">
        <h3>Трек «${esc(role.short || '')} · ${esc(lvl.title || '')}»</h3>
        <div class="spacer"></div>
        <span class="small" style="font-weight:800;color:var(--azure)">${donePct}%</span>
      </div>
      ${trackTotal
        ? `<div class="progressbar"><div class="progressbar__fill" style="width:${donePct}%"></div></div>
           <p class="small muted" style="margin-top:9px">${stats.lessonsDone} из ${trackTotal} ${plural(trackTotal, 'урока', 'уроков', 'уроков')} базового трека · место в команде: ${rank || '—'} из ${totalUsers}</p>`
        : `<p class="small muted">Базовый трек для твоей роли вот-вот наполнится. Пока — генерируй уроки под себя во вкладке «Учусь» ✨</p>`}
    </div>

    <h3 style="margin:0 2px 12px">Бейджи · ${badges.filter((b) => b.earned).length} из ${badges.length}</h3>
    <div class="card badge-grid" style="padding:18px 12px">
      ${badges.map((b) => `
        <div class="badge-cell">
          <div class="badge-coin ${b.earned ? '' : 'badge-coin--locked'}">${badgeIcons[b.id] || misc.sparkle}</div>
          <div class="ttl">${esc(b.title)}</div>
          <div class="dsc">${esc(b.desc)}</div>
        </div>`).join('')}
    </div>`;

  // Маскот: растровый ассет с фолбэком на эмодзи
  if (lvl.mascot) {
    const img = new Image();
    img.src = `assets/${lvl.mascot}`;
    img.alt = lvl.title || '';
    img.onload = () => { const m = $('#prog-mascot', view); m.innerHTML = ''; m.appendChild(img); };
  }

  $('[data-change]', view).addEventListener('click', () => changeRoleLevel(view));
}

/* Смена роли/уровня (переиспользует /api/onboarding) */
function changeRoleLevel(view) {
  const u = me();
  let role = u.role, level = u.level;
  const { panel, close } = sheet(`
    <h3 style="margin-bottom:14px">Роль и уровень</h3>
    <p class="small muted" style="margin-bottom:8px">Роль</p>
    <div class="onb__roles" style="margin-bottom:16px">
      ${Object.entries(roles()).map(([id, r]) => `
        <button class="onb__role ${id === role ? 'picked' : ''}" data-role="${id}">
          <span class="onb__role-icon" style="color:${roleColor[id] || 'var(--azure)'};background:${(roleColor[id] || '#2D8CFF')}1A">${roleIcons[id] || ''}</span>
          <span>${esc(r.short)}</span>
        </button>`).join('')}
    </div>
    <p class="small muted" style="margin-bottom:8px">Уровень</p>
    <div class="row" style="flex-wrap:wrap;margin-bottom:18px">
      ${Object.entries(levels()).map(([id, l]) => `
        <button class="chip ${id === level ? 'chip--active' : ''}" data-level="${id}" style="padding:10px 15px">${l.metaphor === 'росток' ? '🌱' : l.metaphor === 'ракета' ? '🚀' : '🧠'} ${esc(l.title)}</button>`).join('')}
    </div>
    <button class="btn btn--primary btn--block" data-save>Сохранить</button>`);

  panel.querySelectorAll('[data-role]').forEach((b) => b.addEventListener('click', () => {
    panel.querySelectorAll('[data-role]').forEach((x) => x.classList.remove('picked'));
    b.classList.add('picked'); role = b.dataset.role; haptic('light');
  }));
  panel.querySelectorAll('[data-level]').forEach((b) => b.addEventListener('click', () => {
    panel.querySelectorAll('[data-level]').forEach((x) => x.classList.remove('chip--active'));
    b.classList.add('chip--active'); level = b.dataset.level; haptic('light');
  }));
  panel.querySelector('[data-save]').addEventListener('click', async (e) => {
    e.target.disabled = true;
    try {
      const res = await api.onboarding(role, level);
      setProfile(res);
      close();
      toast('Обновили! Трек подстроился под тебя', '✨');
      renderProgress(view);
    } catch {
      e.target.disabled = false;
      toast('Не сохранилось, попробуй ещё раз', '😿');
    }
  });
}
