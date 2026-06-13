import { tg } from './telegram.js';

/**
 * Один раз на старте настраивает «лицо» бота через Bot API (идемпотентно):
 * описание (экран «Что может делать бот»), короткое описание, меню команд,
 * кнопку-меню (web_app). Картинку описания ставит владелец в @BotFather.
 */
export async function setupBotPresence() {
  if (!process.env.BOT_TOKEN) return;
  const url = (process.env.PUBLIC_URL || 'https://inshinlab.com/Yasno-growth-bot/').replace(/\/?$/, '/');

  const shortDescription =
    'AI-наставник growth-команды Ясно: рутина → готовый AI-воркфлоу, уроки под роль, радар новинок.';

  const description =
    '🌤 Личный AI-наставник growth-команды Ясно.\n\n' +
    '⚡ Принеси задачу → готовый AI-воркфлоу с промтом\n' +
    '🎓 Микро-уроки под твою роль и уровень\n' +
    '📡 Радар свежих AI-инструментов с разбором\n' +
    '🏆 Стрики, бейджи и эффект команды\n\n' +
    'Жми «Открыть» 👇';

  try {
    await tg('setMyShortDescription', { short_description: shortDescription });
    await tg('setMyDescription', { description });
    await tg('setMyCommands', {
      commands: [
        { command: 'start', description: '🌤 Запустить академию' },
        { command: 'help', description: 'ℹ️ Как это работает' },
      ],
    });
    await tg('setChatMenuButton', {
      menu_button: { type: 'web_app', text: '🌤 AI-Академия', web_app: { url } },
    });
    console.log('[bot] presence настроен (описание, команды, меню)');
  } catch (e) {
    console.error('[bot] setup:', e?.message);
  }
}
