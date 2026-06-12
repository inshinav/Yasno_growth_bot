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
- [x] **1 — Бэкенд-API** ✅ — все эндпоинты прошли смоук (health/auth/onboarding/lessons/task+fallback/radar/progress/effect/feedback/webhook). Фолбэк LLM работает без ключа, webhook не падает без BOT_TOKEN.
- [x] **2 — Фронт-каркас + дизайн-система** ✅ — токены light/dark, glass/градиенты/пружины, canvas-созвездия, splash с heroй и фолбэками ассетов, таб-бар с pill-индикатором, тосты/sheet/конфетти/скелетоны, SVG-иконки кодом (табы, 9 ролей, 13 бейджей).
- [x] **3 — Онбординг + «Принеси задачу» end-to-end** ✅ — тест 3 вопроса → уровень (росток/ракета/мозг), выбор роли, маскоты; задача → воркфлоу (шаги/инструмент/промт/экономия/копирование), история, оценка экономии; смена роли/уровня из «Прогресса». Проверено в превью: 0 ошибок консоли, все 5 вкладок рендерятся, задача создаётся (фолбэк).
- [ ] **4 — Уроки + Радар + реальный контент (9 ролей × 3 уровня × ≥3 урока)** ← Workflow-фан-аут
- [ ] **5 — Геймификация + Эффект + визуальный цикл (Playwright)**
- [ ] **6 — Деплой-конфиги (nginx /Yasno-growth-bot/, PM2, certbot, setup.sh, webhook curl)**
- [ ] **7 — ФИНАЛ: DONE + РУЧНЫЕ ШАГИ**

## Дальше
Этап 4 в процессе: Workflow wf_38eebf68-614 (10 контент-агентов + 3 ревьюера). Готово и провалидировано: crm, design, growth, performance, pr, product, smm, general, radar. Ждём: analytics + фаза «Ревью» (3 линзы). После: применить правки ревьюеров → закоммитить контент → перегнать скриншоты (цикл №2: проверить SVG-небо splash, ридер урока, радар с контентом) → циклы 3+ → Этап 6 финальная проверка → Этап 7 DONE.
Деплой-конфиги (Этап 6) уже написаны: deploy/{nginx-site.conf, ecosystem.config.cjs, setup.sh, webhook.md, README.md}. Playwright установлен, scripts/screenshots.mjs работает (15 скринов, цикл №1 пройден: SVG-небо splash, имена dev-юзеров, guard трека, типографика).

## Заметки
- Роли: crm, performance, smm, pr, design, product, analytics, growth, general.
- Уровни: beginner (росток), practitioner (ракета), advanced (мозг).
- API: POST /api/auth, POST /api/onboarding, GET /api/lessons, GET /api/lessons/:id, POST /api/lessons/:id/complete, POST /api/lesson-of-day, POST /api/task, GET /api/tasks, POST /api/tasks/:id/feedback, GET /api/radar, GET /api/progress, GET /api/effect, POST /api/telegram.
- Секреты НЕ писать в файлы; .env только на сервере.
