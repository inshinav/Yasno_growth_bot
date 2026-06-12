/* Визуальный цикл: поднимает сервер на :3210 со свежей БД, прогоняет все экраны
   в мобильном вьюпорте (390×844, как Telegram на iPhone) и складывает PNG в shots/.
   Запуск: npm run screenshots */
import { spawn } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const PORT = 3210;
const BASE = `http://localhost:${PORT}/Yasno-growth-bot/`;
const API = `${BASE}api/`;
const OUT = resolve(ROOT, 'shots');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function apiCall(user, method, path, body) {
  const res = await fetch(API + path, {
    method,
    headers: { 'Content-Type': 'application/json', 'X-Dev-User': user },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return res.json().catch(() => ({}));
}

/* Сидируем данные: главный юзер + соседи для лидерборда */
async function seed() {
  await apiCall('shot-main', 'POST', 'auth', {});
  await apiCall('shot-main', 'POST', 'onboarding', { role: 'smm', level: 'practitioner' });
  const { lessons } = await apiCall('shot-main', 'GET', 'lessons');
  for (const l of (lessons || []).slice(0, 3)) {
    await apiCall('shot-main', 'POST', `lessons/${l.id}/complete`, { quizCorrect: true });
  }
  const t = await apiCall('shot-main', 'POST', 'task', {
    description: 'Каждый понедельник вручную собираю контент-план на неделю: темы, форматы, тексты для трёх каналов',
  });
  if (t?.task?.id) await apiCall('shot-main', 'POST', `tasks/${t.task.id}/feedback`, { savedMin: 90 });

  const mates = [
    ['shot-anna', 'Анна', 'design', 'advanced', 120],
    ['shot-igor', 'Игорь', 'analytics', 'practitioner', 60],
    ['shot-mila', 'Мила', 'crm', 'beginner', 45],
  ];
  for (const [id, , role, level, saved] of mates) {
    await apiCall(id, 'POST', 'auth', {});
    await apiCall(id, 'POST', 'onboarding', { role, level });
    const ls = await apiCall(id, 'GET', 'lessons');
    for (const l of (ls.lessons || []).slice(0, 2)) {
      await apiCall(id, 'POST', `lessons/${l.id}/complete`, { quizCorrect: true });
    }
    const tk = await apiCall(id, 'POST', 'task', { description: 'Рутинная задача для демонстрации лидерборда и копилки времени' });
    if (tk?.task?.id) await apiCall(id, 'POST', `tasks/${tk.task.id}/feedback`, { savedMin: saved });
  }
}

async function shot(page, name, { dark = false, settle = 900 } = {}) {
  if (dark) await page.evaluate(() => document.documentElement.classList.add('dark'));
  else await page.evaluate(() => document.documentElement.classList.remove('dark'));
  await sleep(settle);
  await page.screenshot({ path: resolve(OUT, `${name}.png`) });
  console.log(`  📸 ${name}.png`);
}

async function newPage(browser, user) {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    locale: 'ru-RU',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Telegram-Android',
  });
  await ctx.addInitScript((u) => localStorage.setItem('devUser', u), user);
  return ctx.newPage();
}

const enterApp = async (page) => {
  await page.waitForSelector('#splash-cta', { state: 'visible' });
  await sleep(400);
  await page.click('#splash-cta');
  await sleep(800);
};

async function main() {
  rmSync(resolve(ROOT, 'data/shots.sqlite'), { force: true });
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });

  console.log('▶ сервер на :' + PORT);
  const srv = spawn(process.execPath, ['server/index.js'], {
    cwd: ROOT,
    env: {
      ...process.env, PORT: String(PORT), ALLOW_DEV_NO_AUTH: 'true',
      DB_PATH: './data/shots.sqlite', BASE_PATH: '/Yasno-growth-bot', BOT_TOKEN: '', OPENAI_API_KEY: '',
    },
    stdio: 'ignore',
  });
  try {
    let up = false;
    for (let i = 0; i < 40 && !up; i++) {
      await sleep(250);
      up = await fetch(API + 'health').then((r) => r.ok).catch(() => false);
    }
    if (!up) throw new Error('сервер не поднялся');

    console.log('▶ сидирование данных');
    await seed();

    const browser = await chromium.launch();

    // 1. Splash + онбординг (свежий юзер)
    let page = await newPage(browser, 'shot-fresh');
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await shot(page, '01-splash');
    await shot(page, '01-splash-dark', { dark: true, settle: 400 });
    await page.evaluate(() => document.documentElement.classList.remove('dark'));
    await enterApp(page);
    await shot(page, '02-onboarding-q1', { settle: 500 });
    await page.click('.onb__opt:nth-child(2)');
    await sleep(450);
    await page.click('.onb__opt:nth-child(3)');
    await sleep(450);
    await page.click('.onb__opt:nth-child(2)');
    await sleep(450);
    await shot(page, '03-onboarding-roles', { settle: 300 });
    await page.click('[data-role="smm"]');
    await page.click('[data-next]');
    await shot(page, '04-onboarding-result', { settle: 1100 });
    await page.close();

    // 2. Основные вкладки (насиженный юзер)
    page = await newPage(browser, 'shot-main');
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await enterApp(page);
    await page.waitForSelector('[data-view="learn"]');
    await shot(page, '05-learn');
    await shot(page, '05-learn-dark', { dark: true, settle: 400 });
    await page.evaluate(() => document.documentElement.classList.remove('dark'));

    // Урок (если есть)
    const hasLesson = await page.$('[data-lesson]');
    if (hasLesson) {
      await page.click('[data-lesson]');
      await page.waitForSelector('.reader', { timeout: 5000 }).catch(() => {});
      await shot(page, '06-lesson-reader');
      await page.click('[data-back]').catch(() => {});
      await sleep(600);
    }

    // Задача: пустая и с результатом (фолбэк-воркфлоу без ключа)
    await page.click('[data-tab="task"]');
    await sleep(700);
    await shot(page, '07-task-empty', { settle: 400 });
    await page.fill('#task-input', 'Каждую пятницу вручную собираю дайджест публикаций о нас из 12 телеграм-каналов и шлю команде');
    await page.click('[data-submit]');
    await page.waitForSelector('.workflow', { timeout: 15000 });
    await shot(page, '08-task-workflow');
    await shot(page, '08-task-workflow-dark', { dark: true, settle: 400 });
    await page.evaluate(() => document.documentElement.classList.remove('dark'));

    // Радар
    await page.click('[data-tab="radar"]');
    await sleep(900);
    await shot(page, '09-radar');

    // Прогресс
    await page.click('[data-tab="progress"]');
    await sleep(900);
    await shot(page, '10-progress');
    await shot(page, '10-progress-dark', { dark: true, settle: 400 });
    await page.evaluate(() => document.documentElement.classList.remove('dark'));

    // Эффект
    await page.click('[data-tab="effect"]');
    await sleep(1300);
    await shot(page, '11-effect');
    await shot(page, '11-effect-dark', { dark: true, settle: 400 });

    await browser.close();
    console.log(`✓ скриншоты в ${OUT}`);
  } finally {
    srv.kill();
  }
}

main().catch((e) => { console.error('✗', e); process.exit(1); });
