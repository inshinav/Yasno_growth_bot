import { createHmac } from 'node:crypto';

const MAX_AGE_SEC = 60 * 60 * 24; // initData старше суток не принимаем

/**
 * Проверка подписи Telegram WebApp initData.
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 * @returns {{ok: boolean, user?: object, reason?: string}}
 */
export function validateInitData(initData, botToken) {
  try {
    if (!initData || typeof initData !== 'string') return { ok: false, reason: 'empty' };
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) return { ok: false, reason: 'no-hash' };
    params.delete('hash');

    const pairs = [...params.entries()]
      .map(([k, v]) => `${k}=${v}`)
      .sort()
      .join('\n');

    const secretKey = createHmac('sha256', 'WebAppData').update(botToken).digest();
    const computed = createHmac('sha256', secretKey).update(pairs).digest('hex');
    if (computed !== hash) return { ok: false, reason: 'bad-signature' };

    const authDate = Number(params.get('auth_date') || 0);
    if (!authDate || Math.abs(Date.now() / 1000 - authDate) > MAX_AGE_SEC) {
      return { ok: false, reason: 'expired' };
    }

    const user = JSON.parse(params.get('user') || 'null');
    if (!user?.id) return { ok: false, reason: 'no-user' };
    return { ok: true, user };
  } catch {
    return { ok: false, reason: 'parse-error' };
  }
}

/** Express-middleware: пускаем только подписанные запросы из Telegram (или dev-режим). */
export function authMiddleware(getOrCreateUser) {
  return (req, res, next) => {
    const raw = req.get('X-Tg-Init-Data') || (req.get('Authorization') || '').replace(/^tma\s+/i, '');
    const botToken = process.env.BOT_TOKEN;

    if (botToken && raw) {
      const v = validateInitData(raw, botToken);
      if (v.ok) {
        req.user = getOrCreateUser(v.user);
        return next();
      }
      return res.status(401).json({ ok: false, error: 'unauthorized', reason: v.reason });
    }

    if (String(process.env.ALLOW_DEV_NO_AUTH) === 'true') {
      // Локальная разработка без Telegram
      const devId = req.get('X-Dev-User') || 'dev-1';
      let devName = '';
      try { devName = decodeURIComponent(req.get('X-Dev-Name') || ''); } catch { /* ignore */ }
      req.user = getOrCreateUser({ id: devId, first_name: devName, username: 'dev' });
      return next();
    }

    return res.status(401).json({ ok: false, error: 'unauthorized', reason: botToken ? 'no-initdata' : 'no-bot-token' });
  };
}
