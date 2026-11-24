(() => {
  const root = document.documentElement;
  const options = [
    ['gallermo_lang', 'gallermo:lang', ['en','ar'], root.lang],
    ['gallermo_theme', 'gallermo:theme', ['light','dark'], root.dataset.theme]
  ];
  let reload = false;
  for (const [cookie, storage, allowed, current] of options) {
    try {
      if (document.cookie.split('; ').some(pair => allowed.some(value => pair === cookie+'='+value))) continue;
      const value = localStorage.getItem(storage);
      if (!allowed.includes(value)) continue;
      const secure = location.protocol === 'https:' ? '; Secure' : '';
      document.cookie = cookie+'='+value+'; Path=/; Max-Age=31536000; SameSite=Lax'+secure;
      const saved = document.cookie.split('; ').includes(cookie+'='+value);
      if (value !== current && saved) {
        reload = true;
        if (cookie === 'gallermo_theme') root.dataset.theme = value;
      }
    } catch {}
  }
  if (reload) location.reload();
})();
