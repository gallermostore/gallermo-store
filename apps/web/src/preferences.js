export const preferences = Object.freeze({
  lang: {cookie: 'gallermo_lang', storage: 'gallermo:lang', values: ['en', 'ar']},
  theme: {cookie: 'gallermo_theme', storage: 'gallermo:theme', values: ['light', 'dark']}
});

export function readPreferences(cookie = '') {
  const cookies = new URLSearchParams(cookie.replace(/;\s*/g, '&'));
  const result = {};
  const missing = [];
  for (const [key, {cookie: name, values}] of Object.entries(preferences)) {
    const value = cookies.get(name);
    if (!values.includes(value)) missing.push(key);
    result[key] = values.includes(value) ? value : values[0];
  }
  return {...result, missing};
}

export function savePreference(key, value) {
  const {cookie, storage} = preferences[key];
  document.cookie = `${cookie}=${value}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
  try { localStorage.setItem(storage, value); } catch {}
}
