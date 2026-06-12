/* Простой стор приложения. */
export const state = {
  profile: null,      // { user, stats, roles, levels }
  tab: 'learn',
  cache: {},          // кэш ответов API по вкладкам
};

export function setProfile(p) {
  state.profile = p;
}

export const roles = () => state.profile?.roles || {};
export const levels = () => state.profile?.levels || {};
export const me = () => state.profile?.user || {};
