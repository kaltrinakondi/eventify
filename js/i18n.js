const I18n = {
  lang: 'en',
  dict: {
    en: {
      'nav.home': 'Home', 'nav.events': 'Events', 'nav.favorites': 'Favorite Events',
      'nav.categories': 'Categories', 'nav.calendar': 'Calendar', 'nav.create': 'Create Event',
      'nav.about': 'About', 'nav.contact': 'Contact', 'nav.admin': 'Admin',
      'nav.login': 'Log In', 'nav.signup': 'Sign Up', 'nav.logout': 'Log Out',
      'nav.account': 'Account', 'nav.notifications': 'Notifications', 'nav.theme': 'Theme',
      'hero.title': 'Discover & Create Amazing Events',
      'hero.subtitle': 'Plan, discover, and book unforgettable events all in one place',
      'hero.guest': 'New here? Create a free account to publish events and RSVP.',
      'hero.create': 'Create Event', 'hero.search': 'Search',
      'hero.searchPlaceholder': 'Find public events by name, place, or vibe…',
      'events.title': 'Find Public Events',
      'events.subtitle': 'Search open events you can join — by name, place, or category',
      'events.find': 'Find events', 'events.clear': 'Clear', 'events.upcomingOnly': 'Upcoming only',
      'events.what': 'What are you looking for?', 'events.where': 'Where?',
      'events.category': 'Category', 'events.sort': 'Sort by',
      'events.from': 'From date', 'events.to': 'To date', 'events.map': 'Map view',
      'common.details': 'Details', 'common.rsvp': 'RSVP', 'common.free': 'Free',
      'common.loading': 'Loading...', 'common.footer': 'All rights reserved.',
      'theme.light': 'Light', 'theme.dark': 'Dark',
    },
  },

  init() {
    localStorage.removeItem('eventify_lang');
    this.lang = 'en';
    this.apply();
    this.mountControls();
  },

  t(key, vars = {}) {
    let text = this.dict.en[key] ?? key;
    Object.entries(vars).forEach(([k, v]) => {
      text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    });
    return text;
  },

  apply(root = document) {
    document.documentElement.lang = 'en';
    root.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      if (key) el.textContent = this.t(key);
    });
    root.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      el.placeholder = this.t(el.getAttribute('data-i18n-placeholder'));
    });
    root.querySelectorAll('[data-i18n-title]').forEach((el) => {
      el.title = this.t(el.getAttribute('data-i18n-title'));
    });
    root.querySelectorAll('[data-i18n-aria]').forEach((el) => {
      el.setAttribute('aria-label', this.t(el.getAttribute('data-i18n-aria')));
    });
  },

  mountControls() {
    let host = document.getElementById('ui-controls');
    if (!host) {
      const auth = document.getElementById('nav-auth');
      const nav = document.querySelector('.navbar .container');
      host = document.createElement('div');
      host.id = 'ui-controls';
      host.className = 'ui-controls';
      if (auth?.parentNode) auth.parentNode.insertBefore(host, auth);
      else if (nav) nav.appendChild(host);
      else return;
    }

    const theme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    host.innerHTML = `
      <button type="button" class="theme-toggle-btn" id="theme-toggle-btn" title="${this.t('nav.theme')}">
        ${theme === 'dark' ? '☀️' : '🌙'}
      </button>
    `;
    host.querySelector('#theme-toggle-btn')?.addEventListener('click', () => {
      if (typeof Theme !== 'undefined') Theme.toggle();
      this.mountControls();
    });
  },
};

document.addEventListener('DOMContentLoaded', () => I18n.init());
