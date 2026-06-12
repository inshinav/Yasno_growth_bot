import 'dotenv/config';
import express from 'express';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const PORT = Number(process.env.PORT || 3000);
// Нормализуем базовый путь: '/Yasno-growth-bot' (без хвостового слэша)
const BASE_PATH = (process.env.BASE_PATH || '/Yasno-growth-bot').replace(/\/+$/, '') || '';

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '256kb' }));

const router = express.Router();

// Статика мини-аппа
router.use(express.static(resolve(__dirname, '../public'), {
  index: 'index.html',
  maxAge: process.env.NODE_ENV === 'production' ? '1h' : 0,
}));

// API (подключается в routes/)
const { apiRouter } = await import('./routes/api.js');
const { telegramRouter } = await import('./routes/telegram.js');
router.use('/api', apiRouter);
router.use('/api/telegram', telegramRouter);

app.use(BASE_PATH || '/', router);
// Удобный редирект с корня в dev-режиме
if (BASE_PATH) app.get('/', (req, res) => res.redirect(BASE_PATH + '/'));

// Единый обработчик ошибок — бот не должен падать
app.use((err, req, res, next) => {
  console.error('[error]', err?.message || err);
  if (res.headersSent) return next(err);
  res.status(500).json({ ok: false, error: 'internal' });
});

app.listen(PORT, () => {
  console.log(`Ясно • AI-Академия: http://localhost:${PORT}${BASE_PATH}/`);
});

const { startScheduler } = await import('./services/scheduler.js');
startScheduler();
