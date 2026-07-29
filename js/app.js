const PUBLIC_PAGES = [
  'index.html', 'login.html', 'register.html', 'forgot-password.html', 'reset-password.html',
  'invite.html', 'organizer.html', 'events.html', 'event.html', 'about.html', 'contact.html', 'calendar.html',
];

function normalizePageName(name) {
  name = (name || '').split('?')[0].split('#')[0];
  if (!name || name === '/') return 'index.html';
  if (!name.includes('.')) name += '.html';
  return name;
}

function safeAuthRedirect(raw) {
  if (!raw) return 'index.html';
  try { raw = decodeURIComponent(String(raw)); } catch { /* keep */ }
  raw = String(raw).replace(/^\/+/, '');
  const onlyPage = normalizePageName(raw.split('?')[0]);
  if (
    onlyPage === 'login.html' ||
    onlyPage === 'register.html' ||
    onlyPage === 'forgot-password.html' ||
    /^https?:/i.test(raw) ||
    raw.includes('redirect=')
  ) {
    return 'index.html';
  }
  return raw;
}


const Eventify = {
  currentUser: null,
  _booted: false,
  _bootPromise: null,
  _authUnsub: null,

  async init() {
    if (this._bootPromise) {
      await this._bootPromise;
      await this.checkSession();
      if (!this.enforceAuthGate()) return;
      this.setupNavbar();
      this.setupHeroAuth();
      this.setupHeroSearch();
      this.setupMobileMenu();
      this.setupHelpChat();
      this.setupFeatureExtras();
      return;
    }

    this._bootPromise = this._boot();
    await this._bootPromise;
  },

  async _boot() {
    this._booted = true;

    if (typeof Theme !== 'undefined') Theme.init();
    if (typeof I18n !== 'undefined') I18n.init();

    document.documentElement.lang = 'en';
    if (typeof SUPABASE_ANON_KEY !== 'undefined' && SUPABASE_ANON_KEY === 'YOUR_ANON_KEY_HERE') {
      this.showToast('Add your Supabase anon key in js/supabase-config.js', 'error');
    }
    await this.checkSession();
    if (!this.enforceAuthGate()) return;

    this.setupNavbar();
    this.setupHeroAuth();
    this.setupHeroSearch();
    this.setupMobileMenu();
    this.setupHelpChat();
    this.setupPwa();
    this.setupFeatureExtras();

    const { data: { subscription } } = sb.auth.onAuthStateChange(async () => {
      await this.checkSession();
      if (!this.enforceAuthGate()) return;
      this.setupNavbar();
      this.setupHeroAuth();
      this.setupHeroSearch();
      this.setupHelpChat();
      this.setupFeatureExtras();
    });
    this._authUnsub = subscription;

    window.addEventListener('eventify:lang', () => {
      this.setupNavbar();
      if (typeof I18n !== 'undefined') I18n.apply();
    });
  },

  setupPwa() {
    if (!document.querySelector('link[rel="manifest"]')) {
      const link = document.createElement('link');
      link.rel = 'manifest';
      link.href = 'manifest.webmanifest';
      document.head.appendChild(link);
    }
    const iconHref = 'images/app-icon.png';
    if (!document.querySelector('link[rel="icon"]')) {
      const fav = document.createElement('link');
      fav.rel = 'icon';
      fav.type = 'image/png';
      fav.href = iconHref;
      document.head.appendChild(fav);
    }
    if (!document.querySelector('link[rel="apple-touch-icon"]')) {
      const apple = document.createElement('link');
      apple.rel = 'apple-touch-icon';
      apple.href = iconHref;
      document.head.appendChild(apple);
    }
    const themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta) themeMeta.content = '#4b245d';
    else {
      const meta = document.createElement('meta');
      meta.name = 'theme-color';
      meta.content = '#4b245d';
      document.head.appendChild(meta);
    }
    if ('serviceWorker' in navigator) {
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
      });
      navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' })
        .then((reg) => {
          reg.update().catch(() => {});
          if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
          reg.addEventListener('updatefound', () => {
            const sw = reg.installing;
            if (!sw) return;
            sw.addEventListener('statechange', () => {
              if (sw.state === 'installed' && navigator.serviceWorker.controller) {
                sw.postMessage({ type: 'SKIP_WAITING' });
              }
            });
          });
        })
        .catch(() => {});
    }
  },

  setupFeatureExtras() {
    if (typeof EventifyFeatures === 'undefined') return;
    if (this.currentUser) {
      EventifyFeatures.mountBell(this.currentUser.id);
      EventifyFeatures.renderBell(this.currentUser.id);
    }
    if (typeof I18n !== 'undefined') I18n.mountControls();
  },

  setupHelpChat() {
    const boot = () => {
      if (typeof HelpChat !== 'undefined') HelpChat.mount();
    };
    if (typeof HelpChat !== 'undefined') {
      boot();
      return;
    }
    if (document.querySelector('script[data-help-chat]')) {
      document.querySelector('script[data-help-chat]').addEventListener('load', boot);
      return;
    }
    const s = document.createElement('script');
    s.src = 'js/help-chat.js?v=6';
    s.dataset.helpChat = '1';
    s.onload = boot;
    document.body.appendChild(s);
  },

  enforceAuthGate() {
    const page = normalizePageName(window.location.pathname.split('/').pop());

    if (!this.currentUser && !PUBLIC_PAGES.includes(page)) {
      const target = safeAuthRedirect(page + window.location.search);
      window.location.href = `login.html?redirect=${encodeURIComponent(target)}`;
      return false;
    }

    if (this.currentUser && (page === 'login.html' || page === 'register.html')) {
      const params = new URLSearchParams(window.location.search);
      window.location.href = safeAuthRedirect(params.get('redirect') || 'index.html');
      return false;
    }

    return true;
  },

  async checkSession() {
    try {
      this.currentUser = await EventifyDB.getSessionUser();
    } catch {
      this.currentUser = null;
    }
  },

  setupNavbar() {
    const linksContainer = document.getElementById('nav-links');
    const authContainer = document.getElementById('nav-auth');
    const isLoggedIn = !!this.currentUser;
    const page = normalizePageName(window.location.pathname.split('/').pop());

    if (linksContainer) {
      let links;
      const isAuthForm = ['login.html', 'register.html', 'forgot-password.html', 'reset-password.html'].includes(page);
      if (isAuthForm && !isLoggedIn) {
        // Keep auth forms minimal — links live in mobile-auth / buttons
        links = [
          ['index.html', 'Home'],
          ['events.html', 'Events'],
        ];
      } else if (isLoggedIn) {
        const t = (k, fallback) => (typeof I18n !== 'undefined' ? I18n.t(k) : fallback);
        links = [
          ['index.html', t('nav.home', 'Home')],
          ['events.html', t('nav.events', 'Events')],
          ['favorites.html', t('nav.favorites', 'Favorite Events')],
          ['index.html#categories', t('nav.categories', 'Categories')],
          ['calendar.html', t('nav.calendar', 'Calendar')],
          ['create-event.html', t('nav.create', 'Create Event')],
          ['contact.html', t('nav.contact', 'Contact')],
        ];
      } else {
        const t = (k, fallback) => (typeof I18n !== 'undefined' ? I18n.t(k) : fallback);
        links = [
          ['index.html', t('nav.home', 'Home')],
          ['events.html', t('nav.events', 'Events')],
          ['index.html#categories', t('nav.categories', 'Categories')],
          ['about.html', t('nav.about', 'About')],
          ['contact.html', t('nav.contact', 'Contact')],
        ];
      }
      const linksHtml = links.map(([href, label]) => `<a href="${href}">${label}</a>`).join('\n        ');
      linksContainer.innerHTML = `
        ${linksHtml}
        <div class="mobile-auth" id="mobile-auth"></div>
      `;
    }

    if (authContainer) {
      if (isLoggedIn) {
        const initial = (this.currentUser.name || this.currentUser.email || 'U').charAt(0).toUpperCase();
        authContainer.innerHTML = `
          <div class="user-menu" id="user-menu">
            <button class="user-menu-trigger" id="user-menu-trigger" aria-haspopup="true" aria-expanded="false">
              <span class="user-menu-avatar">${initial}</span>
              <span class="user-menu-name">${this.escapeHtml(this.currentUser.name || 'Account')}</span>
              <span class="user-menu-caret">▾</span>
            </button>
            <div class="user-menu-dropdown" id="user-menu-dropdown">
              <a href="index.html">🏠 Home</a>
              <a href="favorites.html">♥ Favorite Events</a>
              <a href="dashboard.html">👤 Account Center</a>
              <div class="user-menu-divider"></div>
              <a href="my-events.html">📅 My Events</a>
              <a href="my-rsvps.html">✅ My RSVPs</a>
              ${this.currentUser.role === 'admin' ? '<a href="admin.html">🛠️ Admin Panel</a>' : ''}
              <div class="user-menu-divider"></div>
              <button id="logout-btn">🚪 Log Out</button>
            </div>
          </div>
        `;
        document.getElementById('logout-btn')?.addEventListener('click', () => this.logout());
      } else {
        authContainer.innerHTML = `
          <a href="login.html" class="btn btn-sm btn-outline">${typeof I18n !== 'undefined' ? I18n.t('nav.login') : 'Log In'}</a>
          <a href="register.html" class="btn btn-sm btn-primary">${typeof I18n !== 'undefined' ? I18n.t('nav.signup') : 'Sign Up'}</a>
        `;
      }
    }

    this.setupFeatureExtras();

    const mobileAuth = document.getElementById('mobile-auth');
    if (mobileAuth) {
      mobileAuth.innerHTML = isLoggedIn
        ? `<a href="index.html" class="btn btn-sm btn-secondary btn-block">Home</a>
           <a href="favorites.html" class="btn btn-sm btn-secondary btn-block">Favorite Events</a>
           <a href="dashboard.html" class="btn btn-sm btn-primary btn-block">Account Center</a>
           <button class="btn btn-sm btn-outline btn-block" id="mobile-logout-btn">Log Out</button>`
        : `<a href="index.html" class="btn btn-sm btn-outline btn-block">Home</a>
           <a href="login.html" class="btn btn-sm btn-outline btn-block">Log In</a>
           <a href="register.html" class="btn btn-sm btn-primary btn-block">Sign Up</a>`;
      document.getElementById('mobile-logout-btn')?.addEventListener('click', () => this.logout());
    }

    this.setupSettingsMenu();
    this.setupUserMenu();
    this.highlightActiveNav();
  },

  setupSettingsMenu() {
    const btn = document.getElementById('hamburger');
    if (!btn) return;

    let wrap = document.getElementById('settings-menu');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.className = 'settings-menu';
      wrap.id = 'settings-menu';
      btn.parentNode.insertBefore(wrap, btn);
      wrap.appendChild(btn);

      const panel = document.createElement('div');
      panel.className = 'settings-dropdown';
      panel.id = 'settings-dropdown';
      wrap.appendChild(panel);
    }

    const panel = document.getElementById('settings-dropdown');
    const loggedIn = !!this.currentUser;
    panel.innerHTML = loggedIn
      ? `<div class="settings-label">Settings</div>
         <a href="index.html">🏠 Home</a>
         <a href="favorites.html">♥ Favorite Events</a>
         <a href="dashboard.html">👤 Account Center</a>
         <div class="settings-divider"></div>
         <a href="my-events.html">My Events</a>
         <a href="create-event.html">Create Event</a>
         <div class="settings-divider"></div>
         <button type="button" id="settings-logout-btn">Log Out</button>`
      : `<div class="settings-label">Settings</div>
         <a href="index.html">🏠 Home</a>
         <a href="login.html">Log In</a>
         <a href="register.html">Sign Up</a>`;

    document.getElementById('settings-logout-btn')?.addEventListener('click', () => this.logout());

    btn.setAttribute('aria-label', 'Settings menu');
    btn.setAttribute('aria-expanded', wrap.classList.contains('open') ? 'true' : 'false');

    if (!btn.dataset.settingsReady) {
      btn.dataset.settingsReady = '1';
      btn.onclick = (e) => {
        e.stopPropagation();
        const menu = document.getElementById('settings-menu');
        if (!menu) return;
        const open = menu.classList.toggle('open');
        btn.setAttribute('aria-expanded', open);
        // Keep page nav drawer closed — settings panel is the phone menu
        if (window.matchMedia('(max-width: 768px)').matches) {
          document.getElementById('nav-links')?.classList.remove('open');
        }
      };
    }

    if (!document.body.dataset.settingsOutsideClick) {
      document.body.dataset.settingsOutsideClick = '1';
      document.addEventListener('click', (e) => {
        const menu = document.getElementById('settings-menu');
        if (menu && !menu.contains(e.target)) {
          menu.classList.remove('open');
          document.getElementById('hamburger')?.setAttribute('aria-expanded', 'false');
          if (window.matchMedia('(max-width: 768px)').matches) {
            document.getElementById('nav-links')?.classList.remove('open');
          }
        }
      });
    }
  },

  setupHeroAuth() {
    const hero = document.getElementById('hero-auth-actions');
    const guestBanner = document.getElementById('guest-banner');
    if (guestBanner) {
      guestBanner.classList.toggle('hidden', !!this.currentUser);
    }
    if (!hero) return;

    hero.innerHTML = `
      <a href="create-event.html" class="btn btn-lg btn-primary" id="hero-create-event">Create Event</a>
    `;
    document.getElementById('hero-create-event')?.addEventListener('click', (e) => {
      if (!this.currentUser) {
        e.preventDefault();
        window.location.href = 'register.html?redirect=create-event.html';
      }
    });
  },

  pickDirectEvent(events, term) {
    const q = (term || '').toLowerCase().trim();
    if (!q || !events?.length) return null;
    const exact = events.find(e => (e.title || '').toLowerCase() === q);
    if (exact) return exact;
    const titleHits = events.filter(e => (e.title || '').toLowerCase().includes(q));
    if (titleHits.length === 1) return titleHits[0];
    if (events.length === 1) return events[0];
    return null;
  },

  setupHeroSearch() {
    const form = document.querySelector('.hero-search');
    if (!form || form.dataset.searchReady) return;
    form.dataset.searchReady = '1';

    let wrap = form.querySelector('.hero-search-field');
    const input = form.querySelector('input[name="search"]');
    const category = form.querySelector('select[name="category"]');
    if (!input) return;

    if (!wrap) {
      wrap = document.createElement('div');
      wrap.className = 'hero-search-field';
      input.parentNode.insertBefore(wrap, input);
      wrap.appendChild(input);
    }

    let box = wrap.querySelector('.search-suggestions');
    if (!box) {
      box = document.createElement('div');
      box.className = 'search-suggestions hidden';
      box.id = 'hero-search-suggestions';
      wrap.appendChild(box);
    }

    let timer = null;
    const hide = () => box.classList.add('hidden');
    const showSuggestions = async () => {
      const term = input.value.trim();
      const cat = category?.value || 'all';
      if (term.length < 2) {
        hide();
        return;
      }
      const data = await Eventify.fetchEvents({
        search: term,
        category: cat !== 'all' ? cat : undefined,
        limit: 8,
        userId: this.currentUser?.id,
      });
      const events = data.events || [];
      if (!events.length) {
        box.innerHTML = '<div class="search-suggestion-empty">No events found</div>';
        box.classList.remove('hidden');
        return;
      }
      box.innerHTML = events.map(e => `
        <a class="search-suggestion" href="event.html?id=${e.id}">
          <span class="search-suggestion-title">${this.escapeHtml(e.title)}</span>
          <span class="search-suggestion-meta">${this.escapeHtml(e.category || '')} · ${this.escapeHtml(e.location || '')}</span>
        </a>
      `).join('');
      box.classList.remove('hidden');
    };

    input.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(showSuggestions, 250);
    });
    input.addEventListener('focus', () => {
      if (input.value.trim().length >= 2) showSuggestions();
    });
    document.addEventListener('click', (e) => {
      if (!wrap.contains(e.target)) hide();
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const term = input.value.trim();
      const cat = category?.value || 'all';
      if (!term) {
        window.location.href = cat !== 'all' ? `events.html?category=${encodeURIComponent(cat)}` : 'events.html';
        return;
      }
      const data = await Eventify.fetchEvents({
        search: term,
        category: cat !== 'all' ? cat : undefined,
        limit: 20,
        userId: this.currentUser?.id,
      });
      const direct = this.pickDirectEvent(data.events || [], term);
      if (direct) {
        window.location.href = `event.html?id=${direct.id}`;
        return;
      }
      const qs = new URLSearchParams({ search: term });
      if (cat !== 'all') qs.set('category', cat);
      window.location.href = `events.html?${qs.toString()}`;
    });
  },

  setupMobileMenu() {
    // Settings hamburger is handled by setupSettingsMenu()
  },

  setupUserMenu() {
    const trigger = document.getElementById('user-menu-trigger');
    const menu = document.getElementById('user-menu');
    if (!trigger || !menu) return;

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = menu.classList.toggle('open');
      trigger.setAttribute('aria-expanded', isOpen);
    });

    document.addEventListener('click', (e) => {
      if (!menu.contains(e.target)) {
        menu.classList.remove('open');
        trigger.setAttribute('aria-expanded', 'false');
      }
    });
  },

  highlightActiveNav() {
    const page = normalizePageName(window.location.pathname.split('/').pop());
    document.querySelectorAll('.nav-links a').forEach(link => {
      const href = link.getAttribute('href').split('#')[0];
      link.classList.toggle('active', href === page);
    });
  },

  async logout() {
    await EventifyDB.logout();
    this.currentUser = null;
    this.showToast('Logged out successfully', 'success');
    setTimeout(() => { window.location.href = 'login.html'; }, 800);
  },

  requireAuth(redirectUrl) {
    if (!this.currentUser) {
      const fallback = normalizePageName(window.location.pathname.split('/').pop()) + (window.location.search || '');
      const target = safeAuthRedirect(redirectUrl || fallback);
      window.location.href = `login.html?redirect=${encodeURIComponent(target)}`;
      return false;
    }
    return true;
  },

  formatDate(dateStr) {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'short', month: 'long', day: 'numeric', year: 'numeric',
    });
  },

  formatTime(timeStr) {
    if (!timeStr) return '';
    const parts = String(timeStr).split(':');
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) || 0;
    if (!Number.isFinite(h)) return String(timeStr);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  },

  formatPrice(price) {
    return parseFloat(price) === 0 ? 'Free' : `$${parseFloat(price).toFixed(2)}`;
  },

  buildInviteShareText({ title, date, time, location, url, hostName }) {
    const when = [this.formatDate(date), this.formatTime(time)].filter(Boolean).join(' · ');
    const lines = [
      `You're invited${title ? `: ${title}` : '!'}`,
      hostName ? `Host: ${hostName}` : '',
      when ? `When: ${when}` : '',
      location ? `Where: ${location}` : '',
      '',
      'RSVP here (Coming / Maybe / Not coming):',
      url || '',
    ].filter((line, i, arr) => line !== '' || (arr[i - 1] !== '' && i !== arr.length - 1));
    return lines.join('\n').trim();
  },

  openWhatsAppInvite(text) {
    const url = `https://wa.me/?text=${encodeURIComponent(text || '')}`;
    // Direct navigation is more reliable on phones than window.open / synthetic <a>.click()
    const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '');
    if (mobile) {
      window.location.href = url;
      return;
    }
    const win = window.open(url, '_blank', 'noopener,noreferrer');
    if (!win) {
      // Popup blocked — fall back to same-tab navigation
      window.location.href = url;
    }
  },

  openEmailInvite({ subject, body }) {
    const href = `mailto:?subject=${encodeURIComponent(subject || "You're invited!")}&body=${encodeURIComponent(body || '')}`;
    window.location.href = href;
  },

  exportInviteRsvpsCsv(votes, eventTitle = 'event') {
    const rows = Array.isArray(votes) ? votes : [];
    if (!rows.length) {
      this.showToast('No RSVP responses to export yet', 'error');
      return false;
    }
    const labels = { going: 'Coming', maybe: 'Maybe', not_going: 'Not coming' };
    const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = [
      ['Name', 'Email', 'Status', 'Updated'].map(escape).join(','),
      ...rows.map(v => [
        v.guest_name || '',
        v.guest_email || '',
        labels[v.status] || v.status || '',
        v.updated_at ? new Date(v.updated_at).toLocaleString() : '',
      ].map(escape).join(',')),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    const safe = String(eventTitle || 'event').replace(/[^\w\-]+/g, '_').slice(0, 40) || 'event';
    a.href = URL.createObjectURL(blob);
    a.download = `${safe}_rsvps.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(a.href);
    this.showToast(`Exported ${rows.length} response(s)`, 'success');
    return true;
  },

  isEventHost(event) {
    if (!event || !this.currentUser) return false;
    return event.organizer_id === this.currentUser.id || this.currentUser.role === 'admin';
  },

  showWhosComingModal({ title = 'Event', votes = [], initialFilter = 'going', hostOnly = true } = {}) {
    if (hostOnly && !this.currentUser) {
      this.showToast('Only the host can see who is coming', 'error');
      return;
    }
    const labels = { going: 'Coming', maybe: 'Maybe', not_going: 'Not coming', all: 'All' };
    const all = Array.isArray(votes) ? votes : [];
    let filter = initialFilter;

    const existing = document.getElementById('whos-coming-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'whos-coming-modal';
    modal.className = 'whos-coming-modal';
    modal.innerHTML = `
      <div class="whos-coming-backdrop" data-close></div>
      <div class="whos-coming-panel" role="dialog" aria-modal="true" aria-labelledby="whos-coming-title">
        <div class="whos-coming-head">
          <div>
            <h2 id="whos-coming-title">Who's coming</h2>
            <p class="card-desc">${this.escapeHtml(title)}</p>
          </div>
          <button type="button" class="icon-btn" data-close aria-label="Close">×</button>
        </div>
        <div class="whos-coming-tabs" id="whos-coming-tabs">
          <button type="button" class="whos-tab" data-filter="going">Coming</button>
          <button type="button" class="whos-tab" data-filter="maybe">Maybe</button>
          <button type="button" class="whos-tab" data-filter="not_going">Not coming</button>
          <button type="button" class="whos-tab" data-filter="all">All</button>
        </div>
        <div class="whos-coming-body" id="whos-coming-body"></div>
      </div>
    `;
    document.body.appendChild(modal);

    const render = () => {
      modal.querySelectorAll('.whos-tab').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === filter);
      });
      const rows = filter === 'all' ? all : all.filter(v => v.status === filter);
      const body = modal.querySelector('#whos-coming-body');
      if (!rows.length) {
        body.innerHTML = `<p class="note-chip-hint">No one marked “${labels[filter] || filter}” yet.</p>`;
        return;
      }
      body.innerHTML = rows.map(v => `
        <div class="invite-rsvp-row status-${this.escapeHtml(v.status)}">
          <div>
            <strong>${this.escapeHtml(v.guest_name || 'Guest')}</strong>
            ${v.guest_email ? `<span class="muted"> · ${this.escapeHtml(v.guest_email)}</span>` : ''}
          </div>
          <span class="invite-rsvp-status">${labels[v.status] || v.status}</span>
        </div>
      `).join('');
    };

    modal.querySelectorAll('[data-close]').forEach(el => {
      el.addEventListener('click', () => modal.remove());
    });
    modal.querySelectorAll('.whos-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        filter = btn.dataset.filter;
        render();
      });
    });
    document.addEventListener('keydown', function onKey(e) {
      if (e.key === 'Escape') {
        modal.remove();
        document.removeEventListener('keydown', onKey);
      }
    });
    render();
  },

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text ?? '';
    return div.innerHTML;
  },

  showToast(message, type = 'success') {
    let toast = document.querySelector('.toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    setTimeout(() => toast.classList.remove('show'), 3500);
  },

  showLoading(container, msg = 'Loading...') {
    if (!container) return;
    container.innerHTML = `<div class="loading"><div class="spinner"></div><p>${msg}</p></div>`;
  },

  renderEventCard(event, options = {}) {
    const { showRsvp = true, showActions = false, showDelete = false, showFavorite = true } = options;
    const img = event.image || 'images/default-event.jpg';
    const icon = typeof getCategoryIcon === 'function' ? getCategoryIcon(event.category) : '📅';
    const catSlug = typeof getCategorySlug === 'function' ? getCategorySlug(event.category) : 'custom';
    const favClass = event.isFavorite ? 'favorited' : '';
    const rsvpBadge = event.rsvp_status
      ? `<span class="rsvp-badge rsvp-${event.rsvp_status}">${event.rsvp_status === 'going' ? 'Going' : 'Maybe'}</span>`
      : '';
    const privacyBadge = event.visibility && event.visibility !== 'public'
      ? `<span class="privacy-badge">${event.visibility === 'private' ? '🔒 Private' : '📋 Invite Only'}</span>`
      : '';

    return `
      <div class="event-card fade-in" data-id="${event.id}">
        <div class="event-card-image">
          <img src="${img}" alt="${this.escapeHtml(event.title)}" loading="lazy" onerror="this.src='images/default-event.jpg'">
          <span class="event-badge cat-${catSlug}">${icon} ${this.escapeHtml(event.category)}</span>
          ${privacyBadge}
          <span class="event-price">${this.formatPrice(event.price)}</span>
          ${rsvpBadge}
        </div>
        <div class="event-card-body">
          <h3><a href="event.html?id=${event.id}">${this.escapeHtml(event.title)}</a></h3>
          <div class="event-meta">
            <div class="event-meta-item">📅 ${this.formatDate(event.date)}</div>
            <div class="event-meta-item">🕐 ${this.formatTime(event.time)}</div>
            <div class="event-meta-item">📍 ${this.escapeHtml(event.location)}</div>
            ${event.rsvp_count != null ? `<div class="event-meta-item">👥 ${event.rsvp_count} going</div>` : ''}
          </div>
          <div class="event-card-actions">
            <a href="event.html?id=${event.id}" class="btn btn-sm btn-secondary">Details</a>
            ${showFavorite ? `<button class="btn btn-sm btn-outline favorite-btn ${favClass}" data-id="${event.id}" title="Favorite">${event.isFavorite ? '♥' : '♡'}</button>` : ''}
            ${showRsvp ? `<button class="btn btn-sm btn-primary rsvp-btn" data-id="${event.id}">RSVP</button>` : ''}
            ${showActions ? `<a href="create-event.html?edit=${event.id}" class="btn btn-sm btn-outline" onclick="try{sessionStorage.setItem('eventify_edit_id','${event.id}')}catch(e){}">Edit</a>` : ''}
            ${showDelete ? `<button class="btn btn-sm btn-danger delete-btn" data-id="${event.id}">Delete</button>` : ''}
          </div>
        </div>
      </div>
    `;
  },

  async fetchEvents(params = {}) {
    if (this.currentUser) {
      params.userId = this.currentUser.id;
      params.userEmail = this.currentUser.email;
    }
    return EventifyDB.fetchEvents(params);
  },

  async rsvpEvent(eventId, status = 'going') {
    if (!this.requireAuth()) return;
    const data = await EventifyDB.setRsvp(eventId, this.currentUser.id, status);
    this.showToast(data.message, data.success ? 'success' : 'error');
    return data;
  },

  async toggleFavorite(eventId, btn) {
    if (!this.requireAuth()) return { success: false, message: 'Please log in first.' };
    if (btn) btn.disabled = true;
    try {
      const data = await EventifyDB.toggleFavorite(eventId, this.currentUser.id);
      this.showToast(data.message, data.success ? 'success' : 'error');
      if (data.success && btn) {
        btn.classList.toggle('favorited', data.favorited);
        if (btn.classList.contains('favorite-detail-btn')) {
          btn.textContent = data.favorited ? '♥ Favorite Events' : '♡ Add to Favorites';
        } else {
          btn.textContent = data.favorited ? '♥' : '♡';
        }
        btn.title = data.favorited ? 'Remove favorite' : 'Favorite';
      }
      return data;
    } catch (err) {
      const message = err?.message || 'Could not update favorite.';
      this.showToast(message, 'error');
      return { success: false, message };
    } finally {
      if (btn) btn.disabled = false;
    }
  },

  bindRsvpButtons(container) {
    container.querySelectorAll('.rsvp-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = `event.html?id=${btn.dataset.id}`;
      });
    });
  },

  bindFavoriteButtons(container) {
    container.querySelectorAll('.favorite-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const data = await this.toggleFavorite(btn.dataset.id, btn);
        // On Favorites page, remove card when unfavorited
        if (data?.success && data.favorited === false) {
          const card = btn.closest('.event-card');
          if (card && /favorites\.html$/i.test(normalizePageName(location.pathname.split('/').pop()))) {
            card.remove();
            const grid = document.getElementById('fav-grid') || document.getElementById('dash-favorites');
            if (grid && !grid.querySelector('.event-card')) {
              document.getElementById('empty')?.classList.remove('hidden');
              document.getElementById('empty-dash-favorites')?.classList.remove('hidden');
            }
          }
        }
      });
    });
  },

  bindDeleteButtons(container, onSuccess) {
    container.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Delete this event permanently?')) return;
        const data = await EventifyDB.deleteEvent(btn.dataset.id);
        this.showToast(data.message, data.success ? 'success' : 'error');
        if (data.success) {
          btn.closest('.event-card')?.remove();
          onSuccess?.();
        }
      });
    });
  },
};

document.addEventListener('DOMContentLoaded', () => Eventify.init());
