/** Тонкая обёртка над Telegram Bot API. Без токена — тихо ничего не делает. */
export async function tg(method, payload) {
  const token = process.env.BOT_TOKEN;
  if (!token) {
    console.warn(`[tg] BOT_TOKEN не задан, пропускаю ${method}`);
    return null;
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000),
    });
    const data = await res.json().catch(() => null);
    if (!data?.ok) console.error(`[tg] ${method} →`, JSON.stringify(data)?.slice(0, 200));
    return data;
  } catch (e) {
    console.error(`[tg] ${method}:`, e?.message);
    return null;
  }
}

export const sendMessage = (chat_id, text, extra = {}) =>
  tg('sendMessage', { chat_id, text, parse_mode: 'HTML', ...extra });

export const answerCallback = (callback_query_id, text) =>
  tg('answerCallbackQuery', { callback_query_id, text, show_alert: false });
