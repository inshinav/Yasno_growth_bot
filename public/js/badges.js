/* Показ новых бейджей из любого места: каталог приходит с /api/auth. */
import { state } from './state.js';
import { showBadges } from './ui.js';

export function notifyBadges(ids) {
  if (!ids?.length) return;
  showBadges(ids, state.profile?.badgesCatalog || []);
}
