// Public demo profiles, not secure authentication. Never put real credentials here.
const PROFILES = [
  { login: 'demo-ru', password: 'DPrice-RU-2026', lang: 'ru', market: 'rf' },
  { login: 'demo-ar', password: 'DPrice-AR-2026', lang: 'ar', market: 'uae' },
];
const SESSION_KEY = 'dprice-demo-profile';

export function demoProfile(login, password) {
  const match = PROFILES.find(profile => profile.login === login.trim() && profile.password === password);
  return match ? { login: match.login, lang: match.lang, market: match.market } : null;
}

export function restoreProfile() {
  try {
    const match = PROFILES.find(profile => profile.login === sessionStorage.getItem(SESSION_KEY));
    return match ? { login: match.login, lang: match.lang, market: match.market } : null;
  } catch {
    return null;
  }
}

export function rememberProfile(profile) {
  try {
    if (profile) sessionStorage.setItem(SESSION_KEY, profile.login);
    else sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // The demo also works when browser storage is unavailable.
  }
}
