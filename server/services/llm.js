/**
 * Прокси к OpenAI Chat Completions. Ключ живёт только здесь (бэкенд).
 * Любая ошибка/таймаут → null, вызывающий код обязан иметь фолбэк.
 */
const BASE = () => (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '');
const MODEL = () => process.env.OPENAI_MODEL || 'gpt-5.5';
const TIMEOUT = () => Number(process.env.LLM_TIMEOUT_MS || 60000);

/**
 * Запрос с ожиданием JSON-объекта в ответе.
 * @returns {Promise<object|null>}
 */
export async function chatJSON({ system, user, maxTokens = 2500 }) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    console.warn('[llm] OPENAI_API_KEY не задан — работаем на фолбэках');
    return null;
  }
  try {
    const res = await fetch(`${BASE()}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: MODEL(),
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        response_format: { type: 'json_object' },
        max_completion_tokens: maxTokens,
      }),
      signal: AbortSignal.timeout(TIMEOUT()),
    });
    if (!res.ok) {
      console.error('[llm] HTTP', res.status, (await res.text()).slice(0, 300));
      return null;
    }
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content;
    if (!text) return null;
    return JSON.parse(text);
  } catch (e) {
    console.error('[llm]', e?.name === 'TimeoutError' ? 'timeout' : e?.message);
    return null;
  }
}
