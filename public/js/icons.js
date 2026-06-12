/* Вся векторная графика — кодом, в бренде. stroke=currentColor, 24×24. */
const S = 'fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"';
const svg = (inner, vb = '0 0 24 24') => `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" ${S}>${inner}</svg>`;

/* ── Иконки табов ── */
export const tabIcons = {
  learn: svg('<path d="M12 4.5 3 9l9 4.5L21 9l-9-4.5Z"/><path d="M6.5 11.2v4.3c0 1.2 2.5 2.6 5.5 2.6s5.5-1.4 5.5-2.6v-4.3"/><path d="M21 9v5"/>'),
  task: svg('<path d="M13 2 4.7 12.3c-.4.5 0 1.2.6 1.2H11l-1 8.5 8.7-10.8c.4-.5 0-1.2-.6-1.2H13l1-8Z" stroke-linejoin="round"/>'),
  radar: svg('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5.2"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/><path d="M12 12 17.5 6"/>'),
  progress: svg('<path d="M4 20V10m5.4 10V4m5.3 16v-7.5M20 20v-12"/>'),
  effect: svg('<path d="M7 4h10v3.5a5 5 0 0 1-10 0V4Z"/><path d="M7 5H4.5v1.5a3 3 0 0 0 3 3M17 5h2.5v1.5a3 3 0 0 1-3 3"/><path d="M12 12.5V16m-3.5 4h7M12 16c-1.2 0-2.5 1.5-2.5 4h5c0-2.5-1.3-4-2.5-4Z"/>'),
};

/* ── Иконки 9 ролей ── */
export const roleIcons = {
  crm: svg('<rect x="3.5" y="5" width="17" height="13" rx="2.5"/><path d="m4.5 7 7.5 5.5L19.5 7"/>'),
  performance: svg('<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.7"/><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none"/><path d="M12 12l4.5-4.5"/>'),
  smm: svg('<path d="M12 3.8c4.6 0 8.2 3 8.2 7s-3.6 7-8.2 7c-.9 0-1.8-.1-2.6-.4L5 19.5l1.2-3.2c-1.5-1.3-2.4-3.1-2.4-5.5 0-4 3.6-7 8.2-7Z"/><path d="M8.5 11h.01M12 11h.01M15.5 11h.01" stroke-width="2.6"/>'),
  pr: svg('<path d="M3.5 10.5v3a1.5 1.5 0 0 0 1.5 1.5h2l7.5 4V5.5L7 9.5H5a1.5 1.5 0 0 0-1.5 1Z"/><path d="M18 9.5a4 4 0 0 1 0 5M20.5 7.5a7.5 7.5 0 0 1 0 9"/>'),
  design: svg('<path d="M12 3.5c-4.7 0-8.5 3.6-8.5 8.2 0 4.5 3.6 8 8.1 8 .9 0 1.6-.7 1.6-1.6 0-.5-.2-.8-.4-1.1-.3-.4-.4-.7-.4-1.1 0-.9.7-1.6 1.6-1.6h1.9c2.6 0 4.6-2 4.6-4.5 0-3.8-3.9-6.3-8.5-6.3Z"/><circle cx="7.8" cy="10" r="1.15" fill="currentColor" stroke="none"/><circle cx="12" cy="7.6" r="1.15" fill="currentColor" stroke="none"/><circle cx="16.2" cy="10" r="1.15" fill="currentColor" stroke="none"/>'),
  product: svg('<rect x="7" y="2.8" width="10" height="18.4" rx="2.6"/><path d="M10.5 5h3M12 18.2h.01" stroke-width="2.4"/>'),
  analytics: svg('<path d="M4 4v15.2c0 .4.4.8.8.8H20"/><path d="m7 14 3.5-4 3 2.5L18 7"/><circle cx="18" cy="7" r="1.3" fill="currentColor" stroke="none"/>'),
  growth: svg('<path d="M4 19c0-7 4-12 12-13.5"/><path d="M12.5 5 16 5.5 15.5 9"/><path d="M7.5 19c0-4 2-7.5 6.5-9"/><circle cx="17.5" cy="16.5" r="3.2"/><path d="M17.5 15.2v2.6m-1.3-1.3h2.6"/>'),
  general: svg('<circle cx="12" cy="12" r="3.4"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>'),
};

/* ── Иконки бейджей (внутри золотой монеты) ── */
export const badgeIcons = {
  first_lesson: svg('<circle cx="12" cy="12" r="4"/><path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8"/>'),
  first_task: svg('<path d="M13 2 4.7 12.3c-.4.5 0 1.2.6 1.2H11l-1 8.5 8.7-10.8c.4-.5 0-1.2-.6-1.2H13l1-8Z"/>'),
  streak_3: svg('<path d="M12 3c1 3-3.5 5-3.5 9a5.5 5.5 0 0 0 11 0c0-2-1-3.7-2.5-5- .3 1.5-1 2.3-2 2.5C15.5 7 14.5 4.5 12 3Z"/>'),
  streak_7: svg('<path d="M12 3c1 3-3.5 5-3.5 9a5.5 5.5 0 0 0 11 0c0-2-1-3.7-2.5-5-.3 1.5-1 2.3-2 2.5C15.5 7 14.5 4.5 12 3Z"/><path d="M9 21h6"/>'),
  streak_14: svg('<path d="M12 2.5c1.2 3.4-4 5.6-4 10a6 6 0 0 0 12 0c0-2.3-1.2-4.2-2.8-5.6-.3 1.7-1.1 2.6-2.2 2.8C16 7 14.8 4.2 12 2.5Z"/><circle cx="12" cy="14" r="2"/>'),
  lessons_5: svg('<path d="M5 4.5h11A2.5 2.5 0 0 1 18.5 7v12.5H7A2 2 0 0 1 5 17.5v-13Z"/><path d="M5 16.5h13.5M9 8.5h5"/>'),
  lessons_15: svg('<path d="M4 6.5 12 3l8 3.5-8 3.5-8-3.5Z"/><path d="M4 11.5 12 15l8-3.5M4 16.5 12 20l8-3.5"/>'),
  lessons_30: svg('<path d="M12 3 4 7v5c0 5 3.5 8 8 9 4.5-1 8-4 8-9V7l-8-4Z"/><path d="m9 11.5 2 2 4-4.5"/>'),
  time_saver: svg('<circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9.5 2.5h5"/>'),
  saved_5h: svg('<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3.5 2M12 2v2M22 12h-2M12 22v-2M2 12h2"/>'),
  explorer: svg('<circle cx="12" cy="12" r="9"/><path d="m14.8 9.2-1.4 4.2-4.2 1.4 1.4-4.2 4.2-1.4Z"/>'),
  early_bird: svg('<path d="M5 16c0-5 3-9 8-9 3.5 0 6 2 6 5 0 4-3.5 6-8 6H5l2-2.5"/><circle cx="15.5" cy="10" r="0.9" fill="currentColor" stroke="none"/><path d="M19 7.5 21 9"/>'),
  top_3: svg('<path d="M4 17 3 6l5 3.5L12 4l4 5.5L21 6l-1 11H4Z"/><path d="M4 20h16"/>'),
};

/* ── Прочее ── */
export const misc = {
  copy: svg('<rect x="8.5" y="8.5" width="12" height="12" rx="2.5"/><path d="M5.5 15.5h-1a1 1 0 0 1-1-1v-10a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/>'),
  check: svg('<path d="m4.5 12.5 5 5 10-11"/>'),
  clock: svg('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'),
  fire: svg('<path d="M12 3c1 3-3.5 5-3.5 9a5.5 5.5 0 0 0 11 0c0-2-1-3.7-2.5-5-.3 1.5-1 2.3-2 2.5C15.5 7 14.5 4.5 12 3Z"/>'),
  back: svg('<path d="M14.5 5.5 8 12l6.5 6.5"/>'),
  sparkle: svg('<path d="M12 3.5 13.8 9 19 11l-5.2 2L12 18.5 10.2 13 5 11l5.2-2L12 3.5Z"/><path d="M18.5 3.5l.6 1.9 1.9.6-1.9.6-.6 1.9-.6-1.9-1.9-.6 1.9-.6.6-1.9Z"/>'),
  bulb: svg('<path d="M9.5 18h5m-4.5 3h4M12 3a6.5 6.5 0 0 0-3.7 11.8c.8.6 1.2 1.3 1.2 2.2h5c0-.9.4-1.6 1.2-2.2A6.5 6.5 0 0 0 12 3Z"/>'),
  link: svg('<path d="M10 14a4.5 4.5 0 0 0 6.4.4l3-3a4.5 4.5 0 0 0-6.4-6.4l-1.5 1.5"/><path d="M14 10a4.5 4.5 0 0 0-6.4-.4l-3 3a4.5 4.5 0 0 0 6.4 6.4l1.5-1.5"/>'),
  refresh: svg('<path d="M20 12a8 8 0 1 1-2.3-5.6M20 3.5V7h-3.5"/>'),
  send: svg('<path d="m4 11 16-7-5 16-3.5-6L4 11Z"/><path d="m11.5 14 8.5-10"/>'),
  user: svg('<circle cx="12" cy="8.2" r="4"/><path d="M4.5 20c1-3.8 4-5.7 7.5-5.7s6.5 1.9 7.5 5.7"/>'),
  cloud: svg('<path d="M7 18.5a4.5 4.5 0 0 1-.4-9A5.5 5.5 0 0 1 17.3 11a3.8 3.8 0 0 1-.8 7.5H7Z"/>'),
  sun: svg('<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.5 1.5M16.9 16.9l1.5 1.5M5.6 18.4l1.5-1.5M16.9 7.1l1.5-1.5"/>'),
  logo: svg('<circle cx="12" cy="12" r="3.2" fill="currentColor" stroke="none"/><path d="M12 2.5c.6 4.5 1.5 6.4 4 7-2.5.6-3.4 2.5-4 7-.6-4.5-1.5-6.4-4-7 2.5-.6 3.4-2.5 4-7Z" fill="currentColor" stroke="none" opacity="0.4" transform="rotate(45 12 12)"/>'),
};

export const roleColor = {
  crm: '#2D8CFF', performance: '#7A5CFF', smm: '#FF6FA5', pr: '#F5A623',
  design: '#FF8A3D', product: '#2FB571', analytics: '#19B5C2', growth: '#E5484D', general: '#5C7CFA',
};
