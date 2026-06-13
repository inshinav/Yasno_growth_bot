/* «Учусь»: урок дня, трек уроков, генерация урока под себя, ридер с квизом. */
import { api } from '../api.js?v=v4';
import { state, me, levels } from '../state.js?v=v4';
import { $, el, esc, mdLite, toast, sheet, copyText, confetti, skeletonList, plural } from '../ui.js?v=v4';
import { notifyBadges } from '../badges.js?v=v4';
import { misc } from '../icons.js?v=v4';
import { haptic, openLink } from '../tg.js?v=v4';

export async function renderLearn(view) {
  const streak = state.profile?.stats?.streak?.current || 0;
  view.innerHTML = `
    <div class="view__head row">
      <div>
        <h2>Учусь ${misc.sun.replace('<svg', '<svg style="width:22px;height:22px;color:var(--sun-deep)"')}</h2>
        <p class="muted">3–5 минут — и одной непонятной AI-штукой меньше</p>
      </div>
      <div class="spacer"></div>
      <span class="chip chip--sun streak-flame">${misc.fire.replace('<svg', '<svg style="width:16px;height:16px"')} ${streak}</span>
    </div>
    <div id="learn-body">${skeletonList(4, 86)}</div>`;

  let data;
  try {
    data = await api.lessons();
  } catch (e) {
    $('#learn-body', view).innerHTML = emptyState('Не дотянулись до уроков', 'Проверь сеть и попробуй ещё раз', true);
    $('[data-retry]', view)?.addEventListener('click', () => renderLearn(view));
    return;
  }

  const { lessons, lessonOfDay, doneCount } = data;
  const lod = lessons.find((l) => l.id === lessonOfDay);
  const rest = lessons.filter((l) => l.id !== lessonOfDay);
  const total = lessons.length;

  $('#learn-body', view).innerHTML = `
    ${lod ? `
      <div class="hero-card card--press" data-lesson="${esc(lod.id)}">
        <p style="font-size:12px;font-weight:800;letter-spacing:.06em;opacity:.85;margin-bottom:6px">УРОК ДНЯ ${lod.done ? '· ПРОЙДЕН ✓' : ''}</p>
        <h3>${lod.emoji || '🌤'} ${esc(lod.title)}</h3>
        <p>${esc(lod.tagline || '')}</p>
        <div class="row" style="margin-top:12px">
          <span class="chip" style="background:rgba(255,255,255,.2);color:#fff">${lod.minutes} мин</span>
          <span class="spacer"></span>
          <span style="font-weight:800;font-size:14px">${lod.done ? 'Повторить' : 'Начать'} →</span>
        </div>
      </div>` : ''}

    ${total ? `
      <div class="row" style="margin:4px 2px 10px">
        <span class="small muted">Трек: ${doneCount} из ${total}</span>
        <div class="spacer"></div>
        <span class="small" style="font-weight:800;color:var(--azure)">${Math.round((Math.min(doneCount, total) / total) * 100)}%</span>
      </div>
      <div class="progressbar" style="margin-bottom:16px"><div class="progressbar__fill" style="width:${Math.min(100, Math.round((doneCount / total) * 100))}%"></div></div>
    ` : ''}

    <div id="lesson-list">
      ${rest.map(lessonCard).join('') || (lod ? '' : emptyState('Трек наполняется', 'Уроки для твоей роли появятся совсем скоро. А пока — сгенерируй урок под себя 👇'))}
    </div>

    <button class="btn btn--ghost btn--block" data-gen style="margin-top:8px">
      ${misc.sparkle.replace('<svg', '<svg style="width:19px;height:19px"')}
      Сгенерировать урок под меня
    </button>`;

  view.querySelectorAll('[data-lesson]').forEach((c) =>
    c.addEventListener('click', () => openLesson(view, c.dataset.lesson)));
  $('[data-gen]', view).addEventListener('click', () => generateLesson(view));
}

const lessonCard = (l) => `
  <div class="card card--press lesson-card" data-lesson="${esc(l.id)}">
    <div class="lesson-card__emoji ${l.done ? 'done' : ''}">${l.done ? '✅' : (l.emoji || '📘')}</div>
    <div style="min-width:0">
      <h3>${esc(l.title)}</h3>
      <div class="meta">${l.minutes} мин · ${esc(l.tagline || '')}</div>
    </div>
  </div>`;

const emptyState = (title, sub, retry = false) => `
  <div class="empty">
    <div class="empty__art" style="color:var(--azure)">${misc.cloud}</div>
    <h3>${esc(title)}</h3>
    <p class="small" style="margin-top:6px">${esc(sub)}</p>
    ${retry ? '<button class="btn btn--ghost btn--sm" data-retry style="margin-top:14px">Повторить</button>' : ''}
  </div>`;

/* ── Генерация урока gpt-5.5 ── */
function generateLesson(view) {
  const { panel, close } = sheet(`
    <h3 style="margin-bottom:6px">Урок под тебя ✨</h3>
    <p class="muted small" style="margin-bottom:14px">gpt-5.5 соберёт урок под твою роль и уровень. Можешь подсказать тему — или доверься.</p>
    <textarea class="field" id="gen-wish" rows="2" placeholder="Например: как ускорить написание писем"></textarea>
    <button class="btn btn--primary btn--block" data-start style="margin-top:14px">Собрать урок</button>
  `);
  $('[data-start]', panel).addEventListener('click', async (e) => {
    const wish = $('#gen-wish', panel).value.trim();
    e.target.disabled = true;
    e.target.innerHTML = '<div class="sunny-loader" style="transform:scale(.7)"><span></span><span></span><span></span></div>';
    try {
      const res = await api.generateLesson(wish);
      close();
      openLessonObject(view, res.lesson, false);
    } catch (err) {
      close();
      toast(err?.data?.message || 'Наставник задумался. Попробуй чуть позже', '🌥');
    }
  });
}

/* ── Ридер урока ── */
async function openLesson(view, id) {
  view.innerHTML = `<div class="reader">${skeletonList(1, 30)}${skeletonList(3, 90)}</div>`;
  try {
    const { lesson, done } = await api.lesson(id);
    openLessonObject(view, lesson, done);
  } catch {
    toast('Урок не загрузился, попробуй ещё раз', '😿');
    renderLearn(view);
  }
}

function blockHTML(b, i) {
  switch (b.type) {
    case 'text':
      return `<div class="reader__block">${mdLite(b.md || '')}</div>`;
    case 'tip':
      return `<div class="reader__block block-tip">${misc.bulb}<div>${mdLite(b.md || '')}</div></div>`;
    case 'prompt':
      return `
        <div class="reader__block block-prompt">
          <div class="block-prompt__head">
            <span>${esc(b.title || 'Готовый промт')}</span>
            <button class="btn btn--sm btn--primary" data-copy="${i}">${misc.copy.replace('<svg', '<svg style="width:15px;height:15px"')} Скопировать</button>
          </div>
          <pre>${esc(b.text || '')}</pre>
        </div>`;
    case 'tool':
      return `
        <div class="reader__block block-tool" data-link="${esc(b.url || '')}" style="cursor:pointer">
          <div class="block-tool__icon">${misc.link}</div>
          <div style="min-width:0">
            <h4 style="font-size:14.5px">${esc(b.name || '')}</h4>
            <p class="small muted">${esc(b.note || '')}</p>
          </div>
          <div class="spacer"></div>
          <span style="color:var(--azure);font-weight:800">→</span>
        </div>`;
    case 'checklist':
      return `
        <div class="reader__block block-check card">
          ${(b.items || []).map((it) => `
            <label><input type="checkbox"><span class="box">${misc.check.replace('<svg', '<svg style="width:14px;height:14px"')}</span><span class="txt">${esc(it)}</span></label>
          `).join('')}
        </div>`;
    default:
      return '';
  }
}

function openLessonObject(view, lesson, alreadyDone) {
  const blocks = lesson.blocks || [];
  view.innerHTML = `
    <div class="reader">
      <button class="reader__back" data-back>${misc.back.replace('<svg', '<svg style="width:17px;height:17px"')} К урокам</button>
      <h2>${lesson.emoji || '📘'} ${esc(lesson.title)}</h2>
      <p class="reader__meta">${lesson.minutes || 4} мин · ${esc(levels()[lesson.level]?.title || '')}${lesson.generated ? ' · собран gpt-5.5 ✨' : ''}</p>
      ${blocks.map(blockHTML).join('')}

      ${lesson.quiz ? `
        <div class="reader__block quiz card">
          <h3 style="margin-bottom:12px">⚡ Проверь себя</h3>
          <p style="font-size:15px;margin-bottom:12px">${esc(lesson.quiz.q)}</p>
          <div id="quiz-opts">
            ${lesson.quiz.options.map((o, i) => `<button class="quiz__opt" data-q="${i}">${esc(o)}</button>`).join('')}
          </div>
          <div id="quiz-explain"></div>
        </div>` : ''}

      ${lesson.action ? `
        <div class="reader__block block-tip" style="background:var(--azure-ghost);border-color:var(--line)">
          ${misc.task ? '' : ''}<svg viewBox="0 0 24 24" fill="none" stroke="var(--azure)" stroke-width="1.9" stroke-linecap="round" style="width:22px;height:22px;flex:none"><path d="M13 2 4.7 12.3c-.4.5 0 1.2.6 1.2H11l-1 8.5 8.7-10.8c.4-.5 0-1.2-.6-1.2H13l1-8Z"/></svg>
          <div><b>Мини-задание:</b> ${esc(lesson.action)}</div>
        </div>` : ''}

      <button class="btn btn--primary btn--block" data-done style="margin-top:10px">
        ${alreadyDone ? 'Пройдено ещё раз ✓' : 'Готово, урок пройден ✓'}
      </button>
    </div>`;

  let quizCorrect = null;
  $('[data-back]', view).addEventListener('click', () => renderLearn(view));

  view.querySelectorAll('[data-copy]').forEach((btn) =>
    btn.addEventListener('click', () => copyText(blocks[btn.dataset.copy]?.text || '')));

  view.querySelectorAll('[data-link]').forEach((c) =>
    c.addEventListener('click', () => c.dataset.link && openLink(c.dataset.link)));

  if (lesson.quiz) {
    view.querySelectorAll('.quiz__opt').forEach((btn) =>
      btn.addEventListener('click', () => {
        if (quizCorrect !== null) return;
        const i = Number(btn.dataset.q);
        quizCorrect = i === lesson.quiz.correct;
        btn.classList.add(quizCorrect ? 'right' : 'wrong');
        if (!quizCorrect) {
          view.querySelectorAll('.quiz__opt')[lesson.quiz.correct].classList.add('right');
          haptic('error');
        } else {
          haptic('success');
        }
        $('#quiz-explain', view).innerHTML =
          `<div class="quiz__explain">${quizCorrect ? '✅' : '💙'} ${esc(lesson.quiz.explain || '')}</div>`;
      }));
  }

  $('[data-done]', view).addEventListener('click', async (e) => {
    e.target.disabled = true;
    try {
      const res = await api.completeLesson(lesson.id, quizCorrect);
      state.profile.stats = res.stats;
      confetti(70);
      haptic('success');
      if (res.streak?.extended) {
        toast(`Стрик ${res.streak.current} ${plural(res.streak.current, 'день', 'дня', 'дней')}! Так держать`, '🔥');
      } else {
        toast('Урок в копилке. Завтра будет новый', '🌤');
      }
      setTimeout(() => {
        renderLearn(view);
        notifyBadges(res.newBadges);
      }, 700);
    } catch {
      e.target.disabled = false;
      toast('Не сохранилось, попробуй ещё раз', '😿');
    }
  });
}
