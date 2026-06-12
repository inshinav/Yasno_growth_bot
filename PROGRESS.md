# PROGRESS — Ясно • AI-Академия

> Файл-страховка автопилота. После каждого блока: что готово / что дальше / заметки.
> Статус проекта: **IN PROGRESS**

## Решения (приняты автономно)
- **SQLite**: встроенный `node:sqlite` (Node ≥22.13) вместо better-sqlite3 — ноль нативных зависимостей, одинаково работает на Windows (dev) и Ubuntu (prod). В деплой-скрипте ставим Node 24 LTS.
- **Фронт**: ваниль (ES-модули) без бандлера; nginx отдаёт статику из public/ напрямую, «прод-билд» = lint/check + статика as-is. Все пути относительные — приложение живёт в подпапке /Yasno-growth-bot/.
- **LLM/Telegram**: голый `fetch` (Node 24), без SDK — меньше зависимостей.
- **BASE_PATH** конфигурируется env-ом; Express сам сервит и статику, и /api под этим путём → nginx делает простой proxy_pass без rewrite.
- В промте владельца опечатка «inguinlab.com» — везде используется **inshinlab.com**.
- 5 растровых ассетов (bot-icon, mascot-beginner/practitioner/advanced, splash-hero) ожидаются в `public/assets/`. Файлы из чата на диск не извлечь → фронт обрабатывает отсутствие (код-плейсхолдеры), список в РУЧНЫХ ШАГАХ.

## Этапы
- [x] **0 — Каркас**: структура, package.json, .gitignore, .env.example, schema.sql, db.js, скелет server/index.js, README, git init. ✅
- [ ] **1 — Бэкенд-API**: онбординг, уроки, задача→LLM, радар, прогресс, эффект, initData-валидация, LLM-прокси с фолбэком, webhook, шедулер пушей.
- [ ] **2 — Фронт-каркас + дизайн-система**
- [ ] **3 — Онбординг + «Принеси задачу» end-to-end**
- [ ] **4 — Уроки + Радар + реальный контент (9 ролей × 3 уровня × ≥3 урока)**
- [ ] **5 — Геймификация + Эффект + визуальный цикл (Playwright)**
- [ ] **6 — Деплой-конфиги (nginx /Yasno-growth-bot/, PM2, certbot, setup.sh, webhook curl)**
- [ ] **7 — ФИНАЛ: DONE + РУЧНЫЕ ШАГИ**

## Дальше
Этап 1: server/routes/api.js, server/routes/telegram.js, server/services/{initdata,llm,gamification,scheduler}.js.

## Заметки
- Роли: crm, performance, smm, pr, design, product, analytics, growth, general.
- Уровни: beginner (росток), practitioner (ракета), advanced (мозг).
- API: POST /api/auth, POST /api/onboarding, GET /api/lessons, GET /api/lessons/:id, POST /api/lessons/:id/complete, POST /api/lesson-of-day, POST /api/task, GET /api/tasks, POST /api/tasks/:id/feedback, GET /api/radar, GET /api/progress, GET /api/effect, POST /api/telegram.
- Секреты НЕ писать в файлы; .env только на сервере.
