# Деплой на VPS (Beget, Ubuntu, root)

Код живёт в `/var/www/yasno-growth-bot`, мини-апп — `https://inshinlab.com/Yasno-growth-bot/`.
Корень домена не занимаем (там позже лендинг).

## Порядок (каждая команда — с пояснением)

```bash
# 1. Код на сервер (вариант без git — загрузить архив через File Manager Beget
#    в /var/www/yasno-growth-bot; вариант с git показан ниже)
mkdir -p /var/www/yasno-growth-bot && cd /var/www/yasno-growth-bot
# git clone <url-репозитория> .   # если репозиторий доступен с сервера

# 2. Установка всего (Node 24, nginx, certbot, PM2, зависимости, конфиги, автозапуск)
bash deploy/setup.sh

# 3. Секреты — ЕДИНСТВЕННЫЙ ручной шаг с ключами
nano /var/www/yasno-growth-bot/.env
#   OPENAI_API_KEY=...   BOT_TOKEN=...   OPENAI_MODEL=gpt-5.5
#   PUBLIC_URL=https://inshinlab.com/Yasno-growth-bot/
pm2 restart yasno-growth-bot --update-env

# 4. HTTPS (домен уже должен указывать A-записью на 155.212.145.146)
certbot --nginx -d inshinlab.com -d www.inshinlab.com --redirect \
  --non-interactive --agree-tos -m admin@inshinlab.com

# 5. Webhook Telegram — см. deploy/webhook.md (готовый curl)

# 6. Проверки
curl -s https://inshinlab.com/Yasno-growth-bot/api/health      # {"ok":true,...}
pm2 status                                                      # online
pm2 logs yasno-growth-bot --lines 30                            # без ошибок
```

## Обновление версии
```bash
cd /var/www/yasno-growth-bot
git pull               # или загрузить файлы через File Manager
npm ci --omit=dev
pm2 restart yasno-growth-bot
```

## Файлы
- `deploy/nginx-site.conf` — сайт inshinlab.com: корень-заглушка + локейшен `/Yasno-growth-bot/` → proxy на :3000
- `deploy/ecosystem.config.cjs` — PM2 (автоперезапуск, логи в `logs/`)
- `deploy/setup.sh` — идемпотентная установка с нуля
- `deploy/webhook.md` — curl для webhook

## Замечания
- SQLite-файл: `data/yasno.sqlite` (создаётся сам; в бэкап — копировать этот файл).
- LLM-таймауты: nginx `proxy_read_timeout 120s`, бэкенд `LLM_TIMEOUT_MS=60000`.
- Без `OPENAI_API_KEY` приложение работает на фолбэках (не падает) — можно деплоить до вписывания ключей.
- Telegram требует HTTPS для webhook и мини-аппа — certbot обязателен до шага 5.
