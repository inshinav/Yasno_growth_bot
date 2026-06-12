/* Адаптер Telegram WebApp: тема, safe-зоны, хаптика. Вне Telegram — мягкие фолбэки. */
export const tg = window.Telegram?.WebApp || null;

export const initData = () => tg?.initData || '';

export function applyTheme() {
  const scheme = tg?.colorScheme || 'light';
  document.documentElement.classList.toggle('dark', scheme === 'dark');
  const bg = scheme === 'dark' ? '#0D1320' : '#F4F8FF';
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', bg);
  try {
    tg?.setHeaderColor?.(bg);
    tg?.setBackgroundColor?.(bg);
  } catch { /* старые клиенты */ }
}

export function initTelegram() {
  if (!tg) return;
  try {
    tg.ready();
    tg.expand();
    tg.disableVerticalSwipes?.();
    applyTheme();
    tg.onEvent?.('themeChanged', applyTheme);

    // Safe-зона контента (Bot API 8.0+, fullscreen)
    const setInsets = () => {
      const top = tg.contentSafeAreaInset?.top || 0;
      document.documentElement.style.setProperty('--tg-content-top', `${top}px`);
    };
    setInsets();
    tg.onEvent?.('contentSafeAreaChanged', setInsets);
  } catch (e) {
    console.warn('[tg]', e);
  }
}

export function haptic(kind = 'light') {
  try {
    const h = tg?.HapticFeedback;
    if (!h) return;
    if (kind === 'success' || kind === 'error' || kind === 'warning') h.notificationOccurred(kind);
    else h.impactOccurred(kind); // light | medium | heavy | soft | rigid
  } catch { /* noop */ }
}

export function openLink(url) {
  try {
    if (tg?.openLink) tg.openLink(url);
    else window.open(url, '_blank');
  } catch {
    window.open(url, '_blank');
  }
}
