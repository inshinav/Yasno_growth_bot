/* «Принеси задачу» — ядро: рутина → AI-воркфлоу с промтом и оценкой экономии. */
import { api } from '../api.js?v=v5';
import { $, esc, mdLite, toast, sheet, copyText, confetti, fmtMinutes, skeletonList } from '../ui.js?v=v5';
import { notifyBadges } from '../badges.js?v=v5';
import { misc } from '../icons.js?v=v5';
import { haptic, openLink } from '../tg.js?v=v5';

const EXAMPLES = [
  'Каждый понедельник собираю отчёт по метрикам в таблицу',
  'Пишу по 20 похожих ответов на отзывы в сторах',
  'Переупаковываю один лонгрид в посты для 4 каналов',
  'Вручную свожу результаты А/Б-тестов в презентацию',
];

const LOADING_PHRASES = [
  'Разбираю рутину на шаги…',
  'Подбираю инструмент под задачу…',
  'Пишу промт, который заработает с первого раза…',
  'Считаю, сколько времени освободится…',
];

export async function renderTask(view) {
  view.innerHTML = `
    <div class="view__head">
      <h2>Принеси задачу 🛠</h2>
      <p class="muted">Опиши рутину — соберу AI-воркфлоу: шаги, инструмент и готовый промт</p>
    </div>

    <div class="card" style="margin-bottom:14px">
      <textarea class="field" id="task-input" rows="4" maxlength="2000"
        placeholder="Например: каждую пятницу вручную собираю дайджест публикаций о нас из 12 телеграм-каналов и шлю команде…"></textarea>
      <div class="task-examples" id="task-examples">
        ${EXAMPLES.map((e) => `<button class="chip">${esc(e)}</button>`).join('')}
      </div>
      <button class="btn btn--primary btn--block" data-submit style="margin-top:12px">
        ${misc.sparkle.replace('<svg', '<svg style="width:19px;height:19px"')} Собрать воркфлоу
      </button>
      <p class="small muted" style="text-align:center;margin-top:10px">Это не страшно: первый шаг любого воркфлоу занимает 5 минут</p>
    </div>

    <div id="task-result"></div>
    <div id="task-history"></div>`;

  const input = $('#task-input', view);

  $('#task-examples', view).addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (chip) { input.value = chip.textContent; haptic('light'); input.focus(); }
  });

  $('[data-submit]', view).addEventListener('click', async (e) => {
    const description = input.value.trim();
    if (description.length < 10) {
      toast('Расскажи чуть подробнее — хотя бы пару предложений', '✍️');
      return;
    }
    const btn = e.target.closest('button');
    btn.disabled = true;
    const result = $('#task-result', view);
    result.innerHTML = loadingCard();
    result.scrollIntoView({ behavior: 'smooth', block: 'start' });

    let phraseI = 0;
    const phraser = setInterval(() => {
      const p = $('#loading-phrase', view);
      if (p) p.textContent = LOADING_PHRASES[++phraseI % LOADING_PHRASES.length];
    }, 2400);

    try {
      const res = await api.createTask(description);
      clearInterval(phraser);
      btn.disabled = false;
      input.value = '';
      confetti(80);
      haptic('success');
      result.innerHTML = workflowHTML(res.task.workflow, res.task.id);
      bindWorkflow(result, res.task.workflow);
      result.scrollIntoView({ behavior: 'smooth', block: 'start' });
      notifyBadges(res.newBadges);
      loadHistory(view);
    } catch (err) {
      clearInterval(phraser);
      btn.disabled = false;
      result.innerHTML = '';
      toast(err?.status === 400 ? 'Опиши задачу чуть подробнее' : 'Наставник не дотянулся до облака. Попробуй ещё раз', '🌥');
    }
  });

  loadHistory(view);
}

const loadingCard = () => `
  <div class="card" style="text-align:center;padding:34px 20px;margin-bottom:14px">
    <div class="sunny-loader" style="margin-bottom:16px"><span></span><span></span><span></span></div>
    <p id="loading-phrase" style="font-weight:700">${LOADING_PHRASES[0]}</p>
    <p class="small muted" style="margin-top:6px">обычно 10–20 секунд</p>
  </div>`;

function workflowHTML(w, taskId, compact = false) {
  const steps = (w.steps || []).map((s) => `
    <div class="workflow__step">
      <div class="workflow__num">${s.n}</div>
      <div><h4>${esc(s.title)}</h4><p>${esc(s.detail || '')}</p></div>
    </div>`).join('');

  return `
    <div class="card workflow" data-task-id="${taskId}" style="margin-bottom:14px">
      ${w.fallback ? `<div class="block-tip" style="margin-bottom:14px">${misc.cloud}<div>AI-наставник сейчас offline — это универсальная схема. Вернись позже за персональной ✨</div></div>` : ''}
      <h3 style="margin-bottom:4px">${esc(w.title)}</h3>
      <p class="muted" style="font-size:14px">${esc(w.summary || '')}</p>

      <div class="row" style="margin:14px 0;flex-wrap:wrap">
        ${w.est_saved_min_per_week ? `<span class="savings-pill">${misc.clock.replace('<svg', '<svg style="width:17px;height:17px"')} ≈ ${fmtMinutes(w.est_saved_min_per_week)}/нед</span>` : ''}
        <span class="chip">${w.difficulty === 'easy' ? '🟢 просто' : '🟡 средне'}</span>
      </div>

      ${w.tool?.name ? `
        <div class="block-tool" data-tool-link="${esc(w.tool.url || '')}" style="cursor:pointer;margin-bottom:6px">
          <div class="block-tool__icon">${misc.link}</div>
          <div style="min-width:0">
            <h4 style="font-size:14.5px">${esc(w.tool.name)}</h4>
            <p class="small muted">${esc(w.tool.why || '')}</p>
          </div>
          <div class="spacer"></div>
          <span style="color:var(--azure);font-weight:800">→</span>
        </div>` : ''}

      ${steps}

      ${w.prompt ? `
        <div class="block-prompt" style="margin-top:10px">
          <div class="block-prompt__head">
            <span>Готовый промт</span>
            <button class="btn btn--sm btn--sun" data-copy-prompt>${misc.copy.replace('<svg', '<svg style="width:15px;height:15px"')} Скопировать</button>
          </div>
          <pre>${esc(w.prompt)}</pre>
        </div>` : ''}

      ${w.beginner_tip ? `<div class="block-tip" style="margin-top:12px">${misc.bulb}<div>${esc(w.beginner_tip)}</div></div>` : ''}

      ${compact ? '' : `<p class="small muted" style="margin-top:14px;text-align:center">Через пару дней спрошу, сэкономило ли это время 😉</p>`}
    </div>`;
}

function bindWorkflow(root, w) {
  root.querySelector('[data-copy-prompt]')?.addEventListener('click', () => copyText(w.prompt));
  root.querySelectorAll('[data-tool-link]').forEach((c) =>
    c.addEventListener('click', () => c.dataset.toolLink && openLink(c.dataset.toolLink)));
}

/* ── История задач ── */
async function loadHistory(view) {
  const box = $('#task-history', view);
  try {
    const { tasks } = await api.tasks();
    if (!tasks.length) { box.innerHTML = ''; return; }
    box.innerHTML = `
      <h3 style="margin:18px 2px 12px">Мои воркфлоу</h3>
      ${tasks.map((t) => `
        <div class="card card--press task-history__item" data-id="${t.id}">
          <div class="row">
            <div style="min-width:0">
              <h3 style="font-size:14.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(t.workflow?.title || t.description)}</h3>
              <p class="small muted" style="margin-top:2px">${statusLabel(t)}</p>
            </div>
            <div class="spacer"></div>
            ${t.status === 'rated'
              ? (t.timeSavedMin > 0 ? `<span class="chip chip--sun">+${fmtMinutes(t.timeSavedMin)}/нед</span>` : '<span class="chip">не зашло</span>')
              : `<button class="btn btn--sm btn--ghost" data-rate="${t.id}">Оценить</button>`}
          </div>
        </div>`).join('')}`;

    box.querySelectorAll('[data-rate]').forEach((btn) =>
      btn.addEventListener('click', (e) => { e.stopPropagation(); rateTask(view, Number(btn.dataset.rate)); }));

    box.querySelectorAll('.task-history__item').forEach((c) =>
      c.addEventListener('click', () => {
        const t = tasks.find((x) => x.id === Number(c.dataset.id));
        if (!t?.workflow) return;
        const { panel } = sheet(workflowHTML(t.workflow, t.id, true));
        bindWorkflow(panel, t.workflow);
      }));
  } catch { box.innerHTML = ''; }
}

const statusLabel = (t) => ({
  answered: 'воркфлоу готов · попробуй в деле',
  followup_sent: 'ждём твою оценку',
  rated: t.timeSavedMin > 0 ? 'экономит время ✓' : 'пока не пригодился',
  new: 'в работе',
}[t.status] || t.status);

/* ── Оценка экономии ── */
function rateTask(view, id) {
  const options = [
    { min: 0, label: 'Пока нет' },
    { min: 30, label: '≈ 30 мин' },
    { min: 60, label: '≈ 1 час' },
    { min: 120, label: '≈ 2 часа' },
    { min: 240, label: '4+ часа' },
  ];
  const { panel, close } = sheet(`
    <h3 style="margin-bottom:6px">Сколько времени экономит в неделю?</h3>
    <p class="muted small" style="margin-bottom:16px">Честная оценка — она попадёт в командный «Эффект»</p>
    <div style="display:flex;flex-wrap:wrap;gap:8px">
      ${options.map((o) => `<button class="chip" data-min="${o.min}" style="font-size:14.5px;padding:11px 16px">${o.label}</button>`).join('')}
    </div>`);
  panel.querySelectorAll('[data-min]').forEach((btn) =>
    btn.addEventListener('click', async () => {
      const savedMin = Number(btn.dataset.min);
      try {
        const res = await api.taskFeedback(id, savedMin);
        close();
        haptic('success');
        if (savedMin > 0) { confetti(60); toast(`+${fmtMinutes(savedMin)}/нед — в копилку команды!`, '🏆'); }
        else toast('Принято. Принеси задачу ещё раз — подберём другой подход', '💙');
        notifyBadges(res.newBadges);
        loadHistory(view);
      } catch {
        toast('Не сохранилось, попробуй ещё раз', '😿');
      }
    }));
}
