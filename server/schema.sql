-- Ясно • AI-Академия — схема БД (SQLite)

CREATE TABLE IF NOT EXISTS users (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  tg_id       TEXT NOT NULL UNIQUE,
  first_name  TEXT DEFAULT '',
  username    TEXT DEFAULT '',
  role        TEXT DEFAULT NULL,            -- crm|performance|smm|pr|design|product|analytics|growth|general
  level       TEXT DEFAULT NULL,            -- beginner|practitioner|advanced
  onboarded   INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  last_seen_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS progress (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id      INTEGER NOT NULL REFERENCES users(id),
  lesson_id    TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'done',   -- done
  quiz_correct INTEGER DEFAULT NULL,
  completed_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_id, lesson_id)
);

CREATE TABLE IF NOT EXISTS streaks (
  user_id        INTEGER PRIMARY KEY REFERENCES users(id),
  current        INTEGER NOT NULL DEFAULT 0,
  best           INTEGER NOT NULL DEFAULT 0,
  last_active_day TEXT DEFAULT NULL            -- YYYY-MM-DD (UTC)
);

CREATE TABLE IF NOT EXISTS badges (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id   INTEGER NOT NULL REFERENCES users(id),
  badge_id  TEXT NOT NULL,
  earned_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_id, badge_id)
);

CREATE TABLE IF NOT EXISTS tasks (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id        INTEGER NOT NULL REFERENCES users(id),
  description    TEXT NOT NULL,
  workflow_json  TEXT DEFAULT NULL,            -- ответ LLM (структурированный воркфлоу)
  status         TEXT NOT NULL DEFAULT 'new',  -- new|answered|followup_sent|rated
  est_saved_min  INTEGER DEFAULT NULL,         -- оценка LLM: минут в неделю
  time_saved_min INTEGER DEFAULT NULL,         -- подтверждено пользователем: минут в неделю
  followup_at    TEXT DEFAULT NULL,            -- когда отправить пуш «сэкономило время?»
  rated_at       TEXT DEFAULT NULL,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS events (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER REFERENCES users(id),
  type       TEXT NOT NULL,                    -- app_open|lesson_done|task_created|task_rated|badge_earned|...
  payload    TEXT DEFAULT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_progress_user ON progress(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_followup ON tasks(status, followup_at);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(type, created_at);
