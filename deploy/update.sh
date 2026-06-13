#!/usr/bin/env bash
# Обновление уже развёрнутого бота новой версией кода.
# Применение: распакуй новый архив ПОВЕРХ /var/www/yasno-growth-bot
#   cd /var/www/yasno-growth-bot && unzip -o yasno-growth-bot.zip && bash deploy/update.sh
set -euo pipefail
cd /var/www/yasno-growth-bot

echo "── Зависимости ──"
npm ci --omit=dev --no-audit --no-fund || npm install --omit=dev --no-audit --no-fund

echo "── Перезапуск ──"
pm2 restart yasno-growth-bot --update-env
sleep 1
pm2 status

echo "── Проверка ──"
curl -s http://localhost:3000/Yasno-growth-bot/api/health && echo ""
echo "✓ Обновлено. .env и data/ не тронуты."
