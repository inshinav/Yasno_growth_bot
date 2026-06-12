import { Router } from 'express';
import { db, getOrCreateUser, logEvent } from '../db.js';
import { authMiddleware } from '../services/initdata.js';
import { chatJSON } from '../services/llm.js';
import {
  ROLES, LEVELS, lessonsFor, getLesson, lessonOfDay, radar,
} from '../services/content.js';
import {
  BADGES, touchStreak, userStats, checkBadges, leaderboard, teamEffect, todayUTC,
} from '../services/gamification.js';
import {
  taskSystemPrompt, lessonSystemPrompt, fallbackWorkflow, fallbackLessonMessage,
} from '../services/prompts.js';

export const apiRouter = Router();

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

apiRouter.get('/health', (req, res) => res.json({ ok: true, ts: Date.now() }));

// Всё ниже — только с подписью Telegram (или dev-режим)
apiRouter.use(authMiddleware(getOrCreateUser));

function profilePayload(user) {
  const stats = userStats(user.id);
  return {
    user: {
      id: user.id,
      firstName: user.first_name,
      role: user.role,
      level: user.level,
      onboarded: !!user.onboarded,
    },
    stats,
    roles: ROLES,
    levels: LEVELS,
  };
}

/** Бутстрап мини-аппа. */
apiRouter.post('/auth', wrap((req, res) => {
  logEvent(req.user.id, 'app_open');
  res.json({ ok: true, ...profilePayload(req.user) });
}));

/** Онбординг: роль + уровень из мини-теста. */
apiRouter.post('/onboarding', wrap((req, res) => {
  const { role, level } = req.body || {};
  if (!ROLES[role] || !LEVELS[level]) {
    return res.status(400).json({ ok: false, error: 'bad-role-or-level' });
  }
  db.prepare('UPDATE users SET role = ?, level = ?, onboarded = 1 WHERE id = ?')
    .run(role, level, req.user.id);
  touchStreak(req.user.id);
  const newBadges = checkBadges(req.user.id);
  logEvent(req.user.id, 'onboarded', { role, level });
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  res.json({ ok: true, ...profilePayload(user), newBadges });
}));

/** Список уроков трека + урок дня. */
apiRouter.get('/lessons', wrap((req, res) => {
  const { role, level } = req.user;
  if (!role || !level) return res.status(400).json({ ok: false, error: 'not-onboarded' });
  const done = db.prepare('SELECT lesson_id FROM progress WHERE user_id = ?').all(req.user.id).map((r) => r.lesson_id);
  const list = lessonsFor(role, level).map((l) => ({
    id: l.id, title: l.title, minutes: l.minutes, emoji: l.emoji,
    tagline: l.tagline, done: done.includes(l.id),
  }));
  const lod = lessonOfDay(role, level, done, todayUTC());
  res.json({ ok: true, lessons: list, lessonOfDay: lod?.id || null, doneCount: done.length });
}));

apiRouter.get('/lessons/:id', wrap((req, res) => {
  const lesson = getLesson(req.params.id);
  if (!lesson) return res.status(404).json({ ok: false, error: 'not-found' });
  const done = !!db.prepare('SELECT 1 FROM progress WHERE user_id = ? AND lesson_id = ?')
    .get(req.user.id, lesson.id);
  res.json({ ok: true, lesson, done });
}));

apiRouter.post('/lessons/:id/complete', wrap((req, res) => {
  const quizCorrect = req.body?.quizCorrect === true ? 1 : (req.body?.quizCorrect === false ? 0 : null);
  db.prepare('INSERT OR IGNORE INTO progress (user_id, lesson_id, quiz_correct) VALUES (?, ?, ?)')
    .run(req.user.id, req.params.id, quizCorrect);
  const streak = touchStreak(req.user.id);
  const newBadges = checkBadges(req.user.id);
  logEvent(req.user.id, 'lesson_done', { lessonId: req.params.id });
  res.json({ ok: true, streak, newBadges, stats: userStats(req.user.id) });
}));

/** Догенерация урока gpt-5.5 (на лету, под роль и уровень). */
apiRouter.post('/lessons/generate', wrap(async (req, res) => {
  const doneIds = db.prepare('SELECT lesson_id FROM progress WHERE user_id = ?').all(req.user.id).map((r) => r.lesson_id);
  const doneTitles = doneIds.map((id) => getLesson(id)?.title).filter(Boolean);
  const wish = String(req.body?.wish || '').slice(0, 300);
  const gen = await chatJSON({
    system: lessonSystemPrompt(req.user, doneTitles),
    user: wish ? `Пожелание сотрудника: ${wish}` : 'Выбери тему сам — самое полезное для меня сейчас.',
  });
  if (!gen?.title || !Array.isArray(gen.blocks)) {
    return res.status(503).json({ ok: false, error: 'llm-unavailable', message: fallbackLessonMessage });
  }
  const lesson = {
    ...gen,
    id: `gen-${req.user.id}-${Date.now()}`,
    role: req.user.role,
    level: req.user.level,
    generated: true,
  };
  logEvent(req.user.id, 'lesson_generated', { title: lesson.title });
  res.json({ ok: true, lesson });
}));

/** Ядро: «Принеси задачу» → AI-воркфлоу. */
apiRouter.post('/task', wrap(async (req, res) => {
  const description = String(req.body?.description || '').trim().slice(0, 2000);
  if (description.length < 10) {
    return res.status(400).json({ ok: false, error: 'too-short' });
  }
  let workflow = await chatJSON({ system: taskSystemPrompt(req.user), user: description });
  if (!workflow?.title || !Array.isArray(workflow.steps) || !workflow.prompt) {
    workflow = fallbackWorkflow(description);
  }
  const followupDays = Math.min(Math.max(Number(workflow.followup_days) || 3, 1), 14);
  const est = Number(workflow.est_saved_min_per_week) || null;
  const r = db.prepare(`
    INSERT INTO tasks (user_id, description, workflow_json, status, est_saved_min, followup_at)
    VALUES (?, ?, ?, 'answered', ?, datetime('now', '+' || ? || ' days'))
  `).run(req.user.id, description, JSON.stringify(workflow), est, followupDays);
  touchStreak(req.user.id);
  const newBadges = checkBadges(req.user.id);
  logEvent(req.user.id, 'task_created', { taskId: r.lastInsertRowid, fallback: !!workflow.fallback });
  res.json({ ok: true, task: { id: Number(r.lastInsertRowid), description, workflow, status: 'answered' }, newBadges });
}));

apiRouter.get('/tasks', wrap((req, res) => {
  const rows = db.prepare('SELECT * FROM tasks WHERE user_id = ? ORDER BY id DESC LIMIT 50').all(req.user.id);
  res.json({
    ok: true,
    tasks: rows.map((t) => ({
      id: t.id, description: t.description, status: t.status,
      estSavedMin: t.est_saved_min, timeSavedMin: t.time_saved_min,
      createdAt: t.created_at, workflow: t.workflow_json ? JSON.parse(t.workflow_json) : null,
    })),
  });
}));

/** Оценка из мини-аппа: сколько реально экономит (мин/нед). */
apiRouter.post('/tasks/:id/feedback', wrap((req, res) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!task) return res.status(404).json({ ok: false, error: 'not-found' });
  const savedMin = Math.min(Math.max(Number(req.body?.savedMin) || 0, 0), 40 * 60);
  db.prepare("UPDATE tasks SET time_saved_min = ?, status = 'rated', rated_at = datetime('now') WHERE id = ?")
    .run(savedMin, task.id);
  const newBadges = checkBadges(req.user.id);
  logEvent(req.user.id, 'task_rated', { taskId: task.id, savedMin });
  res.json({ ok: true, newBadges, stats: userStats(req.user.id) });
}));

/** Радар новинок: каждому элементу — применение под роль юзера. */
apiRouter.get('/radar', wrap((req, res) => {
  const role = req.user.role || 'general';
  const items = radar().map((it) => ({
    ...it,
    apply: it.forRoles?.[role] || it.forRoles?.default || null,
    forRoles: undefined,
  }));
  res.json({ ok: true, items, role });
}));

/** Личный прогресс. */
apiRouter.get('/progress', wrap((req, res) => {
  const stats = userStats(req.user.id);
  const earned = new Set(stats.badges.map((b) => b.badge_id));
  const lb = leaderboard();
  const rank = lb.findIndex((u) => u.id === req.user.id) + 1;
  res.json({
    ok: true,
    stats,
    rank: rank || null,
    totalUsers: lb.length,
    badges: BADGES.map((b) => ({ ...b, earned: earned.has(b.id) })),
    trackTotal: req.user.role && req.user.level ? lessonsFor(req.user.role, req.user.level).length : 0,
  });
}));

/** Командный эффект + лидерборд. */
apiRouter.get('/effect', wrap((req, res) => {
  const effect = teamEffect();
  const lb = leaderboard().slice(0, 10).map((u, i) => ({
    rank: i + 1,
    firstName: u.first_name || u.username || 'Аноним',
    role: u.role, level: u.level, points: u.points,
    me: u.id === req.user.id,
  }));
  const myRank = leaderboard().findIndex((u) => u.id === req.user.id) + 1;
  res.json({ ok: true, effect, leaderboard: lb, myRank: myRank || null, roles: ROLES });
}));

/** Клиентские события (визиты вкладок и т.п.) — для бейджей и метрик. */
apiRouter.post('/event', wrap((req, res) => {
  const type = String(req.body?.type || '').slice(0, 50);
  if (!type) return res.status(400).json({ ok: false });
  logEvent(req.user.id, type, req.body?.payload || null);
  const newBadges = type === 'tab_visit' ? checkBadges(req.user.id) : [];
  res.json({ ok: true, newBadges });
}));
