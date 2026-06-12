#!/usr/bin/env bash
# ── Ясно • AI-Академия: установка с нуля на Ubuntu (Beget VPS) ──
# Запуск: bash deploy/setup.sh  (из /var/www/yasno-growth-bot, под root)
# Скрипт идемпотентный — можно запускать повторно.
set -euo pipefail

APP_DIR=/var/www/yasno-growth-bot
DOMAIN=inshinlab.com

echo "── 1/6 Node.js 24 LTS ──"
if ! command -v node >/dev/null || [[ "$(node -v | cut -d. -f1 | tr -d v)" -lt 22 ]]; then
  curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
  apt-get install -y nodejs
fi
node -v

echo "── 2/6 nginx + certbot ──"
apt-get update -qq
apt-get install -y nginx certbot python3-certbot-nginx git

echo "── 3/6 Зависимости приложения ──"
cd "$APP_DIR"
npm ci --omit=dev --no-audit --no-fund
mkdir -p data logs
[[ -f .env ]] || cp .env.example .env && true
chmod 600 .env

echo "── 4/6 nginx-конфиг (подпапка /Yasno-growth-bot/, корень не трогаем) ──"
mkdir -p /var/www/html
[[ -f /var/www/html/index.html ]] || echo '<!doctype html><title>inshinlab.com</title>' > /var/www/html/index.html
cp deploy/nginx-site.conf /etc/nginx/sites-available/$DOMAIN
ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/$DOMAIN
# дефолтный сайт мешает server_name — выключаем, если есть
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

echo "── 5/6 PM2 + автозапуск ──"
npm install -g pm2
pm2 start deploy/ecosystem.config.cjs
pm2 save
pm2 startup systemd -u root --hp /root | tail -1 | bash || true

echo "── 6/6 Готово ──"
echo "Дальше вручную (см. deploy/README.md):"
echo "  1) Впиши секреты:        nano $APP_DIR/.env   (затем: pm2 restart yasno-growth-bot)"
echo "  2) HTTPS:                certbot --nginx -d $DOMAIN -d www.$DOMAIN --redirect"
echo "  3) Webhook Telegram:     см. deploy/webhook.md"
echo "  4) Проверка:             curl -s https://$DOMAIN/Yasno-growth-bot/api/health"
