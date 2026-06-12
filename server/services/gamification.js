import { db, logEvent } from '../db.js';

/** Каталог бейджей (иконки рисуются на фронте кодом, по badge_id). */
export const BADGES = [
  { id: 'first_lesson', title: 'Первый луч', desc: 'Пройден первый урок' },
  { id: 'first_task', title: 'Первая автоматизация', desc: 'Принёс задачу — получил AI-воркфлоу' },
  { id: 'streak_3', title: 'Три дня ясности', desc: 'Стрик 3 дня подряд' },
  { id: 'streak_7', title: 'Неделя без облаков', desc: 'Стрик 7 дней подряд' },
  { id: 'streak_14', title: 'Высокое давление', desc: 'Стрик 14 дней — антициклон знаний' },
  { id: 'lessons_5', title: 'Пять из пяти', desc: '5 уроков пройдено' },
  { id: 'lessons_15', title: 'Набор высоты', desc: '15 уроков пройдено' },
  { id: 'lessons_30', title: 'Стратосфера', desc: '30 уроков пройдено' },
  { id: 'time_saver', title: 'Властелин времени', desc: 'Подтверждена первая экономия времени' },
  { id: 'saved_5h', title: 'Пять часов неба', desc: '≥5 часов в неделю высвобождено' },
  { id: 'explorer', title: 'Картограф', desc: 'Заглянул во все 5 разделов' },
  { id: 'early_bird', title: 'Ранняя птица', desc: 'Среди первых 10 в команде' },
  { id: 'top_3', title: 'На вершине', desc: 'Топ-3 лидерборда команды' },
];

const TABS = ['learn', 'task', 'radar', 'progress', 'effect'];

export function todayUTC() {
  return new Date().toISOString().slice(0, 10);
}

/** Обновить стрик при значимом действии. */
export function touchStreak(userId) {
  const today = todayUTC();
  let s = db.prepare('SELECT * FROM streaks WHERE user_id = ?').get(userId);
  if (!s) {
    db.prepare('INSERT INTO streaks (user_id) VALUES (?)').run(userId);
    s = { user_id: userId, current: 0, best: 0, last_active_day: null };
  }
  if (s.last_active_day === today) return { current: s.current, best: s.best, extended: false };

  const yesterday = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
  const current = s.last_active_day === yesterday ? s.current + 1 : 1;
  const best = Math.max(current, s.best);
  db.prepare('UPDATE streaks SET current = ?, best = ?, last_active_day = ? WHERE user_id = ?')
    .run(current, best, today, userId);
  return { current, best, extended: true };
}

export function userStats(userId) {
  const lessonsDone = db.prepare('SELECT COUNT(*) c FROM progress WHERE user_id = ?').get(userId).c;
  const tasksCount = db.prepare('SELECT COUNT(*) c FROM tasks WHERE user_id = ?').get(userId).c;
  const savedMin = db.prepare('SELECT COALESCE(SUM(time_saved_min),0) s FROM tasks WHERE user_id = ? AND time_saved_min IS NOT NULL').get(userId).s;
  const streak = db.prepare('SELECT current, best FROM streaks WHERE user_id = ?').get(userId) || { current: 0, best: 0 };
  const badges = db.prepare('SELECT badge_id, earned_at FROM badges WHERE user_id = ?').all(userId);
  const points = lessonsDone * 10 + tasksCount * 20 + badges.length * 15 + streak.current * 5 + Math.round(savedMin / 6);
  return { lessonsDone, tasksCount, savedMin, streak, badges, points };
}

function award(userId, badgeId, earned) {
  const r = db.prepare('INSERT OR IGNORE INTO badges (user_id, badge_id) VALUES (?, ?)').run(userId, badgeId);
  if (r.changes > 0) {
    earned.push(badgeId);
    logEvent(userId, 'badge_earned', { badgeId });
  }
}

/** Проверить и выдать все заслуженные бейджи. Возвращает список новых. */
export function checkBadges(userId) {
  const earned = [];
  const st = userStats(userId);

  if (st.lessonsDone >= 1) award(userId, 'first_lesson', earned);
  if (st.lessonsDone >= 5) award(userId, 'lessons_5', earned);
  if (st.lessonsDone >= 15) award(userId, 'lessons_15', earned);
  if (st.lessonsDone >= 30) award(userId, 'lessons_30', earned);
  if (st.tasksCount >= 1) award(userId, 'first_task', earned);
  if (st.streak.current >= 3) award(userId, 'streak_3', earned);
  if (st.streak.current >= 7) award(userId, 'streak_7', earned);
  if (st.streak.current >= 14) award(userId, 'streak_14', earned);
  if (st.savedMin > 0) award(userId, 'time_saver', earned);
  if (st.savedMin >= 300) award(userId, 'saved_5h', earned);

  if (userId <= 10) award(userId, 'early_bird', earned);

  const visited = db.prepare(
    "SELECT COUNT(DISTINCT json_extract(payload, '$.tab')) c FROM events WHERE user_id = ? AND type = 'tab_visit'"
  ).get(userId).c;
  if (visited >= TABS.length) award(userId, 'explorer', earned);

  const top3 = leaderboard().slice(0, 3).map((u) => u.id);
  if (top3.includes(userId)) award(userId, 'top_3', earned);

  return earned;
}

export function leaderboard() {
  const users = db.prepare('SELECT id, first_name, username, role, level FROM users WHERE onboarded = 1').all();
  return users
    .map((u) => ({ ...u, ...userStats(u.id) }))
    .sort((a, b) => b.points - a.points);
}

/** Командный «Эффект» — аргумент для СМО. */
export function teamEffect() {
  const savedMin = db.prepare('SELECT COALESCE(SUM(time_saved_min),0) s FROM tasks WHERE time_saved_min IS NOT NULL').get().s;
  const estMin = db.prepare("SELECT COALESCE(SUM(est_saved_min),0) s FROM tasks WHERE status IN ('answered','followup_sent')").get().s;
  const tasksAutomated = db.prepare('SELECT COUNT(*) c FROM tasks WHERE time_saved_min > 0').get().c;
  const tasksTotal = db.prepare('SELECT COUNT(*) c FROM tasks').get().c;
  const lessonsDone = db.prepare('SELECT COUNT(*) c FROM progress').get().c;
  const activeUsers = db.prepare("SELECT COUNT(*) c FROM users WHERE onboarded = 1").get().c;
  const byRole = db.prepare(`
    SELECT u.role, COALESCE(SUM(t.time_saved_min),0) saved, COUNT(t.id) tasks
    FROM users u LEFT JOIN tasks t ON t.user_id = u.id AND t.time_saved_min > 0
    WHERE u.onboarded = 1 AND u.role IS NOT NULL
    GROUP BY u.role ORDER BY saved DESC
  `).all();
  return { savedMin, estMin, tasksAutomated, tasksTotal, lessonsDone, activeUsers, byRole };
}
