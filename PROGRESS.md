# PROGRESS — Ясно • AI-Академия

> Статус проекта: **DONE** ✅
> Код, контент, дизайн и деплой-конфиги готовы. Осталось два ручных шага владельца (секреты + Menu Button в BotFather) — см. блок РУЧНЫЕ ШАГИ ниже.

## Что это
Telegram Mini App — внутренний AI-наставник growth-команды Ясно. Три кита: «Принеси задачу» (рутина → AI-воркфлоу), микро-уроки под роль+уровень, радар новинок. Плюс геймификация и командный «Эффект».

## Решения (приняты автономно)
- **SQLite**: встроенный `node:sqlite` (Node ≥22.13) — ноль нативных зависимостей, одинаково на Windows (dev) и Ubuntu (prod). Деплой ставит Node 24.
- **Фронт**: ваниль (ES-модули) без бандлера. «Прод-билд» = lint/валидация + статика as-is; express отдаёт и статику, и /api под BASE_PATH → nginx делает простой proxy_pass без rewrite.
- **LLM/Telegram**: голый `fetch` (Node 24), без SDK.
- В промте владельца опечатка «inguinlab.com» — везде используется **inshinlab.com**.
- **GPT-5.5**: модель из ТЗ (`OPENAI_MODEL=gpt-5.5`). Радар и уроки синхронизированы на GPT-5.5 как текущий флагман.
- 5 растровых ассетов ожидаются в `public/assets/` (см. `public/assets/README.md`). Без них — код-плейсхолдеры (SVG-небо, компас-логотип, эмодзи-маскоты), приложение не падает.

## Этапы — все закрыты
- [x] **0 — Каркас**: структура, package.json, schema.sql (users/progress/streaks/badges/tasks/events), .env.example, .gitignore, README.
- [x] **1 — Бэкенд-API**: auth/onboarding/lessons/task→LLM/radar/progress/effect/feedback/event, валидация initData (HMAC), LLM-прокси с фолбэком, webhook (+ secret_token), шедулер follow-up пушей. Смоук пройден.
- [x] **2 — Фронт-каркас + дизайн-система**: токены light/dark, glass/градиенты/пружины, canvas-созвездия, splash (SVG-небо-фолбэк), таб-бар с pill, тосты/sheet/конфетти/скелетоны, SVG-иконки кодом (табы, 9 ролей, 13 бейджей).
- [x] **3 — Онбординг + «Принеси задачу» end-to-end**: тест 3 вопроса → уровень (росток/ракета/мозг), выбор роли, маскоты; задача → воркфлоу (шаги/инструмент/промт/копирование/оценка экономии), история, follow-up. Проверено в превью.
- [x] **4 — Контент**: 9 ролей × 12 уроков = **108 уроков** + **16 инструментов радара**. Сгенерировано Workflow-агентами, провалидировано строгим `scripts/check.mjs` (реальные инструменты/URL, рабочие промты, схема, ≥3 урока/уровень, без заглушек). Прошло ревью-панель из 3 линз (инструменты/полезность/тон): 0 critical, 4 major + minor исправлены.
- [x] **5 — Геймификация + Эффект + лидерборд** + **визуальный цикл** (Playwright, 390×844, Telegram-обёртка, 16 экранов light/dark): 3 прохода критики, топ-фиксы применены (SVG-небо, имена лидерборда, guard трека, типографика, обогащён splash).
- [x] **6 — Деплой-конфиги**: nginx (только `/Yasno-growth-bot/`, корень не тронут), PM2 ecosystem, идемпотентный setup.sh, webhook curl с secret_token, deploy/README. Прод-смоук: статика отдаётся, auth без initData → 401.
- [x] **7 — ФИНАЛ**: DONE + блок РУЧНЫХ ШАГОВ (ниже).

## Качество
- `npm run lint` (29 js + 13 json) — чисто. `npm run check` (контент) — валиден. `npm run screenshots` — 16 экранов.
- Ошибки LLM/Telegram не роняют бот (фолбэки). Секретов в git нет (.env и *.sqlite в .gitignore). Тон бережный (проверено линзой этики).

## Пострелизное (добавлено после деплоя)
- **Живой радар** ✅ — `server/services/radarRefresh.js`: ежедневное автообновление ленты через OpenAI Responses API (web_search) на том же ключе; фолбэк Perplexity; шедулер раз в час проверяет свежесть (`RADAR_REFRESH_HOURS`). Падение → лента остаётся. Ручной запуск: `npm run refresh-radar`. Сид от 2026-06: 22 элемента (18 released + 4 upcoming) реально свежие модели (Fable 5, Opus 4.8, GPT-5.5, Gemini 3.5 Flash, Ideogram 4.0, Midjourney V8.1…).
- **Раздел «🔜 На подходе»** + поле **«✦ Лучше всего для»** + **матрица «🧭 какая модель под задачу»** (12 пар, основной выбор + дешёвая альтернатива) + индикатор **«🟢 обновлено N назад»**.
- `deploy/update.sh` — обновление развёрнутого бота новой версией (unzip -o → update.sh).

## Дальше (опционально, для развития)
- Уроки: расширять базу; gpt-5.5 уже догенерирует на лету (`/api/lessons/generate`).

---

## РУЧНЫЕ ШАГИ ДЛЯ ВЛАДЕЛЬЦА
См. финальное сообщение ассистента (блок «РУЧНЫЕ ШАГИ»). Кратко:
1. Залить код в `/var/www/yasno-growth-bot`, запустить `bash deploy/setup.sh`.
2. Вписать секреты в `.env` (OPENAI_API_KEY, BOT_TOKEN, OPENAI_MODEL=gpt-5.5) → `pm2 restart yasno-growth-bot --update-env`.
3. HTTPS: `certbot --nginx -d inshinlab.com -d www.inshinlab.com --redirect`.
4. Webhook: curl из `deploy/webhook.md`.
5. BotFather: Menu Button → `https://inshinlab.com/Yasno-growth-bot/`.
6. (Опц.) положить 5 PNG в `public/assets/` (см. `public/assets/README.md`).
