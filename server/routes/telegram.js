import { Router } from 'express';
import { db, getOrCreateUser, logEvent } from '../db.js';
import { sendMessage, answerCallback } from '../services/telegram.js';
import { checkBadges } from '../services/gamification.js';

export const telegramRouter = Router();

const APP_URL = () => process.env.PUBLIC_URL || 'https://inshinlab.com/Yasno-growth-bot/';

const WELCOME = (name) =>
  `Привет${name ? ', ' + name : ''}! Это <b>Ясно • AI-Академия</b> 🌤\n\n` +
  `Я помогаю учиться применять AI в работе:\n` +
  `• <b>Принеси задачу</b> — опиши рутину, соберу готовый AI-воркфлоу\n` +
  `• <b>Микро-уроки</b> — 3–5 минут под твою роль и уровень\n` +
  `• <b>Радар</b> — свежие AI-инструменты с разбором «как применить»\n\n` +
  `Жми кнопку — и поехали ✨`;

async function handleMessage(msg) {
  const chatId = msg.chat?.id;
  if (!chatId || msg.chat?.type !== 'private') return;
  const user = getOrCreateUser(msg.from || { id: chatId });
  const text = String(msg.text || '');

  const kb = {
    reply_markup: { inline_keyboard: [[{ text: '🌤 Открыть AI-Академию', web_app: { url: APP_URL() } }]] },
  };

  if (text.startsWith('/start')) {
    logEvent(user.id, 'bot_start');
    await sendMessage(chatId, WELCOME(msg.from?.first_name), kb);
  } else if (text.startsWith('/help')) {
    await sendMessage(chatId,
      'Всё самое интересное — в мини-аппе: уроки, задачи, радар, прогресс и командный эффект. ' +
      'Если что-то сломалось — напиши команде growth 💙', kb);
  } else {
    await sendMessage(chatId,
      'Я лучше всего понимаю задачи внутри мини-аппа — там для них есть целый раздел «Задача» 🛠', kb);
  }
}

/** Ответ на пуш «сэкономило время?» (кнопки из scheduler.js). */
async function handleCallback(cb) {
  const data = String(cb.data || '');
  const m = data.match(/^fb:(\d+):(yes|no)$/);
  if (!m) return answerCallback(cb.id, '');

  const taskId = Number(m[1]);
  const yes = m[2] === 'yes';
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
  if (!task) return answerCallback(cb.id, 'Задача не нашлась 🤔');

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(task.user_id);
  if (String(cb.from?.id) !== user?.tg_id) return answerCallback(cb.id, '');

  const savedMin = yes ? (task.est_saved_min || 30) : 0;
  db.prepare("UPDATE tasks SET time_saved_min = ?, status = 'rated', rated_at = datetime('now') WHERE id = ?")
    .run(savedMin, taskId);
  checkBadges(task.user_id);
  logEvent(task.user_id, 'task_rated', { taskId, savedMin, via: 'push' });

  await answerCallback(cb.id, yes ? `Записал: +${savedMin} мин/нед 🎉` : 'Понял, спасибо за честность 💙');
  const followup = yes
    ? `Отлично! <b>+${savedMin} мин/нед</b> улетели в командную копилку «Эффект» 🏆\nЗагляни — там видно, сколько времени уже высвободила команда.`
    : `Спасибо за честность 💙 Так тоже бывает. Принеси задачу ещё раз и опиши, что не сработало — соберу другой подход.`;
  await sendMessage(cb.message?.chat?.id || user.tg_id, followup, {
    reply_markup: { inline_keyboard: [[{ text: '🌤 Открыть AI-Академию', web_app: { url: APP_URL() } }]] },
  });
}

/** Webhook. Всегда отвечаем 200 — Telegram не должен ретраить из-за наших ошибок. */
telegramRouter.post('/', async (req, res) => {
  res.json({ ok: true });
  try {
    const upd = req.body || {};
    if (upd.message) await handleMessage(upd.message);
    else if (upd.callback_query) await handleCallback(upd.callback_query);
  } catch (e) {
    console.error('[webhook]', e?.message);
  }
});
