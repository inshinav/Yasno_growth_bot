# Telegram Webhook

Все команды готовы к копированию. Замени `<BOT_TOKEN>` на токен из @BotFather
(тот же, что вписан в `/var/www/yasno-growth-bot/.env`).

## Установить webhook (после HTTPS!)
```bash
curl -s "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook" \
  -d "url=https://inshinlab.com/Yasno-growth-bot/api/telegram" \
  -d "allowed_updates=[\"message\",\"callback_query\"]" \
  -d "drop_pending_updates=true"
```
Ожидаемый ответ: `{"ok":true,"result":true,"description":"Webhook was set"}`

## Проверить состояние
```bash
curl -s "https://api.telegram.org/bot<BOT_TOKEN>/getWebhookInfo"
```
В ответе должно быть `"url":"https://inshinlab.com/Yasno-growth-bot/api/telegram"` и `"pending_update_count":0`
(или маленькое число). Поле `last_error_message` должно отсутствовать.

## Снять webhook (если надо отладить)
```bash
curl -s "https://api.telegram.org/bot<BOT_TOKEN>/deleteWebhook"
```

## Смоук после установки
1. Напиши боту `/start` — придёт приветствие с кнопкой «🌤 Открыть AI-Академию».
2. Кнопка открывает мини-апп; онбординг должен пройти без ошибок (initData валидируется).
3. Логи на сервере: `pm2 logs yasno-growth-bot --lines 50`
