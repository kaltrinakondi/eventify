const Search = {
  debounceTimer: null,
  fromUrlSearch: false,

  init(options = {}) {
    this.container = document.getElementById(options.containerId || 'events-grid');
    this.searchInput = document.getElementById(options.searchId || 'search-input');
    this.locationInput = document.getElementById(options.locationId || 'location-filter');
    this.categorySelect = document.getElementById(options.categoryId || 'category-filter');
    this.sortSelect = document.getElementById(options.sortId || 'sort-filter');
    this.upcomingCheck = document.getElementById(options.upcomingId || 'upcoming-only');
    this.loadingEl = document.getElementById('loading');
    this.emptyEl = document.getElementById('empty-state');
    this.resultsCount = document.getElementById('search-results-count');
    this.extraParams = options.extraParams || {};
    this.fromUrlSearch = !!options.openDirect && !!this.searchInput?.value.trim();

    this.setupSuggestions();

    if (this.searchInput) {
      this.searchInput.addEventListener('input', () => {
        this.fromUrlSearch = false;
        this.debouncedSearch();
      });
      this.searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.fromUrlSearch = true;
          this.hideSuggestions();
          this.loadEvents({ preferDirect: true });
        }
      });
    }

    if (this.locationInput) {
      this.locationInput.addEventListener('input', () => this.debouncedSearch());
      this.locationInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.loadEvents();
        }
      });
    }

    if (this.categorySelect) {
      this.categorySelect.addEventListener('change', () => this.loadEvents());
    }
    if (this.sortSelect) {
      this.sortSelect.addEventListener('change', () => this.loadEvents());
    }
    if (this.upcomingCheck) {
      this.upcomingCheck.addEventListener('change', () => this.loadEvents());
    }

    document.getElementById('btn-find-events')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.fromUrlSearch = true;
      this.hideSuggestions();
      this.loadEvents({ preferDirect: true });
    });

    document.getElementById('btn-clear-search')?.addEventListener('click', (e) => {
      e.preventDefault();
      if (this.searchInput) this.searchInput.value = '';
      if (this.locationInput) this.locationInput.value = '';
      if (this.categorySelect) this.categorySelect.value = 'all';
      if (this.sortSelect) this.sortSelect.value = 'date_asc';
      if (this.upcomingCheck) this.upcomingCheck.checked = true;
      const from = document.getElementById('date-from');
      const to = document.getElementById('date-to');
      const map = document.getElementById('show-map');
      if (from) from.value = '';
      if (to) to.value = '';
      if (map) map.checked = false;
      this.hideSuggestions();
      this.loadEvents();
    });

    document.getElementById('date-from')?.addEventListener('change', () => this.loadEvents());
    document.getElementById('date-to')?.addEventListener('change', () => this.loadEvents());
    document.getElementById('show-map')?.addEventListener('change', () => this.loadEvents());

    this.loadEvents({ preferDirect: this.fromUrlSearch });
  },

  setupSuggestions() {
    if (!this.searchInput) return;
    let wrap = this.searchInput.closest('.discover-search-field') || this.searchInput.parentElement;
    if (!wrap) return;

    let box = wrap.querySelector('.search-suggestions');
    if (!box) {
      box = document.createElement('div');
      box.className = 'search-suggestions hidden';
      box.id = 'events-search-suggestions';
      wrap.appendChild(box);
    }
    this.suggestionsBox = box;

    let timer = null;
    this.searchInput.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() => this.showSuggestions(), 220);
    });
    this.searchInput.addEventListener('focus', () => {
      if (this.searchInput.value.trim().length >= 2) this.showSuggestions();
    });
    document.addEventListener('click', (e) => {
      if (!wrap.contains(e.target)) this.hideSuggestions();
    });
  },

  hideSuggestions() {
    this.suggestionsBox?.classList.add('hidden');
  },

  async showSuggestions() {
    if (!this.suggestionsBox || !this.searchInput) return;
    const term = this.searchInput.value.trim();
    if (term.length < 2) {
      this.hideSuggestions();
      return;
    }

    const data = await Eventify.fetchEvents({
      ...this.getParams(),
      search: term,
      limit: 6,
      userId: Eventify.currentUser?.id,
    });
    const events = data.events || [];
    if (!events.length) {
      this.suggestionsBox.innerHTML = '<div class="search-suggestion-empty">No public events match</div>';
      this.suggestionsBox.classList.remove('hidden');
      return;
    }

    this.suggestionsBox.innerHTML = events.map(e => `
      <a class="search-suggestion" href="event.html?id=${e.id}">
        <span class="search-suggestion-title">${Eventify.escapeHtml(e.title)}</span>
        <span class="search-suggestion-meta">${Eventify.escapeHtml(e.category || '')} · ${Eventify.escapeHtml(e.location || '')} · ${Eventify.formatDate(e.date)}</span>
      </a>
    `).join('');
    this.suggestionsBox.classList.remove('hidden');
  },

  debouncedSearch() {
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this.loadEvents(), 300);
  },

  getParams() {
    const params = { ...this.extraParams };
    if (this.searchInput?.value.trim()) params.search = this.searchInput.value.trim();
    if (this.locationInput?.value.trim()) params.location = this.locationInput.value.trim();
    if (this.categorySelect?.value && this.categorySelect.value !== 'all') {
      params.category = this.categorySelect.value;
    }
    if (this.sortSelect?.value) params.sort = this.sortSelect.value;
    if (this.upcomingCheck?.checked !== false) params.upcoming = 1;
    const from = document.getElementById('date-from')?.value;
    const to = document.getElementById('date-to')?.value;
    if (from) params.date_from = from;
    if (to) params.date_to = to;
    return params;
  },

  async loadEvents({ preferDirect = false } = {}) {
    if (!this.container) return;

    if (this.loadingEl) this.loadingEl.classList.remove('hidden');
    if (this.emptyEl) this.emptyEl.classList.add('hidden');
    this.container.innerHTML = '';
    if (this.resultsCount) this.resultsCount.textContent = '';

    try {
      const data = await Eventify.fetchEvents({
        ...this.getParams(),
        userId: Eventify.currentUser?.id,
      });

      if (this.loadingEl) this.loadingEl.classList.add('hidden');

      if (!data.success || !data.events?.length) {
        if (this.emptyEl) this.emptyEl.classList.remove('hidden');
        if (this.resultsCount) this.resultsCount.textContent = '0 public events found';
        return;
      }

      if (preferDirect) {
        const term = this.searchInput?.value.trim() || '';
        const direct = typeof Eventify.pickDirectEvent === 'function'
          ? Eventify.pickDirectEvent(data.events, term)
          : (data.events.length === 1 ? data.events[0] : null);
        if (direct) {
          window.location.href = `event.html?id=${direct.id}`;
          return;
        }
      }

      const count = data.events.length;
      if (this.resultsCount) {
        this.resultsCount.textContent = `${count} public event${count === 1 ? '' : 's'} you can explore`;
      }

      this.container.innerHTML = data.events
        .map(e => Eventify.renderEventCard(e, { showRsvp: true }))
        .join('');

      Eventify.bindRsvpButtons(this.container);
      Eventify.bindFavoriteButtons(this.container);
      this.renderMap(data.events);
    } catch (err) {
      if (this.loadingEl) this.loadingEl.classList.add('hidden');
      this.container.innerHTML = '<p class="empty-state">Failed to load events.</p>';
    }
  },

  renderMap(events) {
    const mapBox = document.getElementById('events-map');
    const show = document.getElementById('show-map')?.checked;
    if (!mapBox) return;
    if (!show) {
      mapBox.classList.add('hidden');
      mapBox.innerHTML = '';
      return;
    }
    mapBox.classList.remove('hidden');
    const q = encodeURIComponent((events[0]?.location) || 'Europe');
    mapBox.innerHTML = `
      <iframe title="Events map" src="https://maps.google.com/maps?q=${q}&output=embed" loading="lazy" allowfullscreen></iframe>
      <div class="events-map-list">
        ${events.slice(0, 8).map(e => `
          <a href="event.html?id=${e.id}">${Eventify.escapeHtml(e.title)} · ${Eventify.escapeHtml(e.location || '')}</a>
        `).join('')}
      </div>
    `;
  },
};
