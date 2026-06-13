/* «Эффект»: командная копилка времени, топ-роли, лидерборд. Аргумент для СМО. */
import { api } from '../api.js?v=v3';
import { $, esc, skeletonList, plural } from '../ui.js?v=v3';
import { misc, roleColor } from '../icons.js?v=v3';

export async function renderEffect(view) {
  view.innerHTML = `
    <div class="view__head">
      <h2>Эффект команды 🏆</h2>
      <p class="muted">Сколько времени AI уже высвободил для важного</p>
    </div>
    <div id="eff-body">${skeletonList(3, 130)}</div>`;

  let data;
  try {
    data = await api.effect();
  } catch {
    $('#eff-body', view).innerHTML = `<div class="empty"><div class="empty__art" style="color:var(--azure)">${misc.cloud}</div><h3>Не загрузилось</h3><button class="btn btn--ghost btn--sm" data-retry style="margin-top:14px">Повторить</button></div>`;
    $('[data-retry]', view)?.addEventListener('click', () => renderEffect(view));
    return;
  }

  const { effect, leaderboard, myRank, roles } = data;
  const hours = Math.round((effect.savedMin / 60) * 10) / 10;
  const estHours = Math.round((effect.estMin / 60) * 10) / 10;
  const maxRoleSaved = Math.max(1, ...effect.byRole.map((r) => r.saved));

  $('#eff-body', view).innerHTML = `
    <div class="card effect-hero">
      <p class="sub" style="margin-bottom:2px">КОМАНДА ВЫСВОБОДИЛА</p>
      <div class="giant" data-count="${hours}">0<span class="unit">&#8201;ч/нед</span></div>
      <p class="sub">подтверждено людьми · ещё ≈${estHours} ч/нед в работе</p>
      <div class="stat-grid" style="margin:18px 0 0">
        <div class="stat-cell"><div class="num">${effect.tasksAutomated}</div><div class="lbl">${plural(effect.tasksAutomated, 'задача', 'задачи', 'задач')} автоматизировано</div></div>
        <div class="stat-cell"><div class="num">${effect.lessonsDone}</div><div class="lbl">${plural(effect.lessonsDone, 'урок', 'урока', 'уроков')} пройдено</div></div>
        <div class="stat-cell"><div class="num">${effect.activeUsers}</div><div class="lbl">в академии</div></div>
      </div>
    </div>

    ${effect.byRole.length ? `
      <div class="card" style="margin-bottom:16px">
        <h3 style="margin-bottom:14px">Топ-роли по экономии</h3>
        ${effect.byRole.slice(0, 5).map((r) => `
          <div class="role-bar">
            <div class="row">
              <span>${esc(roles[r.role]?.short || r.role)}</span>
              <span style="color:var(--azure)">${Math.round((r.saved / 60) * 10) / 10} ч/нед</span>
            </div>
            <div class="progressbar" style="height:8px">
              <div class="progressbar__fill" style="width:${Math.round((r.saved / maxRoleSaved) * 100)}%;background:linear-gradient(90deg, ${roleColor[r.role] || '#2D8CFF'}, ${roleColor[r.role] || '#2D8CFF'}CC)"></div>
            </div>
          </div>`).join('')}
      </div>` : ''}

    <h3 style="margin:0 2px 12px">Лидерборд ${myRank ? `· ты на ${myRank} месте` : ''}</h3>
    ${leaderboard.length ? leaderboard.map((u) => `
      <div class="lb-row ${u.me ? 'me' : ''} ${u.rank === 1 ? 'top1' : ''}">
        <div class="rank">${u.rank === 1 ? '👑' : u.rank}</div>
        <div style="min-width:0">
          <div class="name">${esc(u.firstName)}${u.me ? ' · ты' : ''}</div>
          <div class="small muted">${esc(roles[u.role]?.short || '')}</div>
        </div>
        <div class="spacer"></div>
        <div class="pts">${u.points}</div>
      </div>`).join('') : `
      <div class="empty">
        <div class="empty__art" style="color:var(--sun-deep)">${misc.sun}</div>
        <h3>Пока тихо</h3>
        <p class="small" style="margin-top:6px">Будь первым — пройди урок или принеси задачу</p>
      </div>`}

    <p class="small muted" style="text-align:center;margin-top:18px">
      Очки: уроки ×10 · задачи ×20 · бейджи ×15 · стрик ×5 · экономия времени
    </p>`;

  // Анимация счётчика часов
  const giant = $('[data-count]', view);
  if (giant) {
    const target = Number(giant.dataset.count);
    const t0 = performance.now();
    const dur = 1100;
    (function tick(t) {
      const k = Math.min(1, (t - t0) / dur);
      const eased = 1 - Math.pow(1 - k, 3);
      giant.innerHTML = `${Math.round(target * eased * 10) / 10}<span class="unit">&#8201;ч/нед</span>`;
      if (k < 1) requestAnimationFrame(tick);
    })(t0);
  }
}
