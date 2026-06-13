/* Ручной запуск обновления радара: node scripts/refresh-radar.mjs [--force]
   Берёт ключи из .env (как и сервер). Пишет radar.json + radar-matrix.json. */
import 'dotenv/config';
import { refreshRadar, radarUpdatedAt } from '../server/services/radarRefresh.js';

const force = process.argv.includes('--force');
console.log(`▶ Обновляю радар (provider=${process.env.RADAR_PROVIDER || 'openai'}, force=${force})…`);
const r = await refreshRadar({ force });
if (r.ok) {
  const stamp = radarUpdatedAt();
  console.log(`✓ Готово: ${r.count} элементов, обновлено ${stamp?.updatedAt}`);
  process.exit(0);
} else {
  console.error(`✗ Не обновилось: ${r.error}`);
  console.error('  Подсказки: нужен OPENAI_API_KEY (или PERPLEXITY_API_KEY при RADAR_PROVIDER=perplexity);');
  console.error('  web_search должен быть доступен модели. Радар остался прежним — это безопасно.');
  process.exit(1);
}
