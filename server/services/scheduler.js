import { db, logEvent } from '../db.js';
import { sendMessage } from './telegram.js';

const EVERY_MS = 10 * 60 * 1000;

/** Пуш «сэкономило время?» по задачам, у которых наступил followup_at. */
async function processFollowups() {
  try {
    const due = db.prepare(`
      SELECT t.id, t.description, t.est_saved_min, u.tg_id, u.first_name
      FROM tasks t JOIN users u ON u.id = t.user_id
      WHERE t.status = 'answered' AND t.followup_at IS NOT NULL AND t.followup_at <= datetime('now')
      LIMIT 20
    `).all();

    for (const t of due) {
      const name = t.first_name ? `, ${t.first_name}` : '';
      const text =
        `Привет${name} 🌤 Пару дней назад мы собрали AI-воркфлоу для задачи:\n` +
        `<i>«${String(t.description).slice(0, 120)}»</i>\n\n` +
        `Получилось сэкономить время?`;
      const res = await sendMessage(t.tg_id, text, {
        reply_markup: {
          inline_keyboard: [[
            { text: '⏱ Да, экономит', callback_data: `fb:${t.id}:yes` },
            { text: '🙅 Пока нет', callback_data: `fb:${t.id}:no` },
          ]],
        },
      });
      // Без токена не зацикливаемся: помечаем отправленным в любом случае,
      // оценить можно и из мини-аппа.
      db.prepare("UPDATE tasks SET status = 'followup_sent' WHERE id = ?").run(t.id);
      logEvent(null, 'followup_push', { taskId: t.id, delivered: !!res?.ok });
    }
  } catch (e) {
    console.error('[scheduler]', e?.message);
  }
}

export function startScheduler() {
  setInterval(processFollowups, EVERY_MS);
  setTimeout(processFollowups, 15 * 1000); // первый прогон вскоре после старта
  console.log('[scheduler] follow-up пуши: каждые 10 минут');
}
