/* API-клиент. Все пути относительные — приложение живёт в подпапке. */
import { initData } from './tg.js?v=v5';

const baseDir = location.pathname.endsWith('/')
  ? location.pathname
  : location.pathname.replace(/[^/]*$/, '');
const API = `${baseDir}api/`;

async function request(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  const init = initData();
  if (init) headers['X-Tg-Init-Data'] = init;
  else headers['X-Dev-User'] = localStorage.getItem('devUser') || 'dev-1';

  const res = await fetch(API + path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.message || data?.error || `HTTP ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export const api = {
  auth: () => request('POST', 'auth', {}),
  onboarding: (role, level) => request('POST', 'onboarding', { role, level }),
  lessons: () => request('GET', 'lessons'),
  lesson: (id) => request('GET', `lessons/${encodeURIComponent(id)}`),
  completeLesson: (id, quizCorrect) => request('POST', `lessons/${encodeURIComponent(id)}/complete`, { quizCorrect }),
  generateLesson: (wish) => request('POST', 'lessons/generate', { wish }),
  createTask: (description) => request('POST', 'task', { description }),
  tasks: () => request('GET', 'tasks'),
  taskFeedback: (id, savedMin) => request('POST', `tasks/${id}/feedback`, { savedMin }),
  radar: () => request('GET', 'radar'),
  progress: () => request('GET', 'progress'),
  effect: () => request('GET', 'effect'),
  event: (type, payload) => request('POST', 'event', { type, payload }).catch(() => ({})),
};
