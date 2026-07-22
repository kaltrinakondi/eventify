const Theme = {
  STORAGE_KEY: 'eventify_theme',

  init() {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    const prefersDark = window.matchMedia?.(('(prefers-color-scheme: dark)'))?.matches;
    this.set(saved === 'dark' || saved === 'light' ? saved : (prefersDark ? 'dark' : 'light'), false);
  },

  current() {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  },

  set(mode, persist = true) {
    const theme = mode === 'dark' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    if (persist) localStorage.setItem(this.STORAGE_KEY, theme);
    window.dispatchEvent(new CustomEvent('eventify:theme', { detail: { theme } }));
  },

  toggle() {
    this.set(this.current() === 'dark' ? 'light' : 'dark');
  },
};

Theme.init();
