#!/usr/bin/env bash
# Обновление бота из GitHub (репозиторий публичный — токен не нужен).
# Применение на сервере: cd /var/www/yasno-growth-bot && bash deploy/pull.sh
# .env, data/ и node_modules не трогаются (они вне git).
set -euo pipefail
cd /var/www/yasno-growth-bot

echo "── Тяну свежий код из GitHub ──"
git fetch origin main
git checkout -f -B main origin/main

echo "── Зависимости ──"
npm ci --omit=dev --no-audit --no-fund || npm install --omit=dev --no-audit --no-fund

echo "── Перезапуск ──"
pm2 restart yasno-growth-bot --update-env
sleep 1
pm2 status

echo "── Проверка ──"
curl -s http://localhost:3000/Yasno-growth-bot/api/health && echo ""
echo "✓ Обновлено из GitHub. Радар: $(grep -c '\"id\"' server/content/radar.json) инструментов."
