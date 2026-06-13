/* Показ новых бейджей из любого места: каталог приходит с /api/auth. */
import { state } from './state.js?v=v3';
import { showBadges } from './ui.js?v=v3';

export function notifyBadges(ids) {
  if (!ids?.length) return;
  showBadges(ids, state.profile?.badgesCatalog || []);
}
