const EventPlanner = {
  editId: null,
  isDraft: false,
  shareToken: null,
  inviteVotes: [],
  organizerId: null,
  removeCoverImage: false,
  DEFAULT_COVER: 'images/default-event.jpg',
  state: {
    galleryUrls: [],
    galleryPending: [],
    documents: [],
    checklist: [],
    guests: [],
    budgetLines: [],
    vendors: [],
    schedule: [],
    board: [],
    reminders: [],
    moodImages: [],
    moodColors: [],
    tables: [],
    team: [],
    chat: [],
    menu: [],
    playlist: [],
    guestPhotos: [],
    gifts: [],
    feedback: [],
    tickets: [],
    stages: [],
    festivalVendors: [],
    certFiles: [],
  },

  uid() {
    return `id_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  },

  escape(text) {
    return Eventify.escapeHtml(text ?? '');
  },

  async init() {
    await Eventify.init();
    // Keep ?edit=id (and other query params) through login redirect
    const returnTo = `create-event.html${window.location.search || ''}`;
    if (!Eventify.requireAuth(returnTo)) return;

    document.getElementById('category').innerHTML =
      '<option value="">Select category</option>' + renderCategoryOptions();

    this.bindTabs();
    this.bindStickyChrome();
    this.bindBasics();
    this.bindPlannerEventName();
    this.bindThemePicker();
    this.bindPlanning();
    this.bindAI();
    this.bindGuests();
    this.bindBudget();
    this.bindVendors();
    this.bindTickets();
    this.bindStages();
    this.bindSecurity();
    this.bindSchedule();
    this.bindDocuments();
    this.bindBoard();
    this.bindReminders();
    this.bindPremium();
    this.bindSync();
    this.bindPublish();
    this.bindShareInvite();

    const params = new URLSearchParams(window.location.search);
    // Some static servers (e.g. `serve` cleanUrls) strip ?edit= on redirect —
    // fall back to sessionStorage stashed by the Edit button.
    let editRaw = params.get('edit') || params.get('id');
    if (!editRaw) {
      try { editRaw = sessionStorage.getItem('eventify_edit_id'); } catch (_) { /* ignore */ }
    }
    if (editRaw) {
      try { sessionStorage.removeItem('eventify_edit_id'); } catch (_) { /* ignore */ }
    }
    const editNum = Number(editRaw);
    this.editId = (Number.isFinite(editNum) && editNum > 0) ? String(editNum) : null;

    if (this.editId) {
      document.getElementById('planner-title').textContent = 'Edit Event';
      document.getElementById('btn-publish').textContent = 'Update Event';
      const loaded = await this.loadEvent(this.editId);
      if (!loaded) {
        // Do NOT fall through to a blank "create" form — that creates a duplicate event
        this.showAlert('Could not load this event for editing. Returning to My Events…', 'error');
        setTimeout(() => { window.location.href = 'my-events.html'; }, 1600);
        return;
      }
    } else {
      this.shareToken = EventifyDB.makeShareToken();
      this.seedDefaultBudget();
      this.refreshAI();
      this.renderAll();
      this.refreshShareLinkUI();
      // Apply category presets only when creating (never when editing)
      this.applyUrlCategoryPreset();
      // If no theme chosen yet, open the theme picker
      if (!document.getElementById('category')?.value) {
        setTimeout(() => this.openThemePicker(), 250);
      }
    }

    this.updatePlannerHeader();
    this.applyCategoryTabFilter();
    this.updateCountdown();
    setInterval(() => this.updateCountdown(), 60000);
  },

  bindStickyChrome() {
    const chrome = document.getElementById('planner-sticky-chrome');
    if (!chrome) return;

    const sync = () => {
      chrome.classList.toggle('is-scrolled', window.scrollY > 24);
    };

    sync();
    window.addEventListener('scroll', sync, { passive: true });
  },

  bindTabs() {
    document.querySelectorAll('.planner-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        if (tab.classList.contains('tab-hidden')) return;
        document.querySelectorAll('.planner-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.planner-panel').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(`tab-${tab.dataset.tab}`)?.classList.add('active');
        if (tab.dataset.tab === 'analytics') this.refreshAnalytics();
        if (tab.dataset.tab === 'ai') this.refreshAI();
        if (tab.dataset.tab === 'guests') this.loadInviteRsvps();
        if (tab.dataset.tab === 'invites') this.refreshShareLinkUI();
      });
    });
  },

  /** Show only planning tabs relevant to the selected event type */
  applyCategoryTabFilter() {
    const category = this.getSelectedCategory() || 'Custom';
    const allowed = typeof getPlannerTabsForCategory === 'function'
      ? getPlannerTabsForCategory(category)
      : PLANNER_CORE_TABS;
    const allowedSet = new Set(allowed);

    let activeHidden = false;
    document.querySelectorAll('.planner-tab').forEach((tab) => {
      const id = tab.dataset.tab;
      const show = allowedSet.has(id);
      tab.classList.toggle('tab-hidden', !show);
      tab.style.display = show ? '' : 'none';
      if (!show && tab.classList.contains('active')) activeHidden = true;
    });

    // Hint under tabs
    let hint = document.getElementById('category-tabs-hint');
    if (!hint) {
      const nav = document.querySelector('.planner-tabs');
      if (nav) {
        hint = document.createElement('p');
        hint.id = 'category-tabs-hint';
        hint.className = 'card-desc category-tabs-hint';
        nav.insertAdjacentElement('afterend', hint);
      }
    }
    if (hint) {
      const label = category || 'your event';
      hint.textContent = `Planning tools for ${label} — only the most useful sections are shown.`;
    }

    this.syncFestivalPlanningUI();

    if (activeHidden) {
      document.querySelector('.planner-tab[data-tab="basics"]:not(.tab-hidden)')?.click();
    }
  },

  isFestivalEvent() {
    const cat = this.getSelectedCategory() || document.getElementById('category')?.value || '';
    if (typeof isMusicFestivalCategory === 'function') return isMusicFestivalCategory(cat);
    return typeof getCategorySlug === 'function' && getCategorySlug(cat) === 'festivals';
  },

  syncFestivalPlanningUI() {
    const box = document.getElementById('festival-planning-fields');
    const show = this.isFestivalEvent();
    box?.classList.toggle('hidden', !show);

    const heading = document.getElementById('schedule-heading');
    const desc = document.getElementById('schedule-desc');
    const addBtn = document.getElementById('add-schedule-row');
    if (show) {
      if (heading) heading.textContent = 'Artist Lineup & Schedule';
      if (desc) desc.textContent = 'Add time slots with artist and stage assignments.';
      if (addBtn) addBtn.textContent = '+ Add Set';
    } else {
      if (heading) heading.textContent = 'Event Schedule';
      if (desc) desc.textContent = 'Build the day-of timeline with owners and notes.';
      if (addBtn) addBtn.textContent = '+ Add Activity';
    }
    this.renderSchedule();
  },

  bindBasics() {
    const cover = document.getElementById('cover-upload');
    cover?.addEventListener('click', () => document.getElementById('image').click());
    document.getElementById('image')?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      this.removeCoverImage = false;
      cover.querySelector('p').textContent = file.name;
      this.showCoverPreview(URL.createObjectURL(file));
    });

    document.getElementById('btn-remove-cover')?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.clearCoverImage();
    });

    const galleryBox = document.getElementById('gallery-upload');
    galleryBox?.addEventListener('click', () => document.getElementById('gallery').click());
    document.getElementById('gallery')?.addEventListener('change', (e) => {
      const files = [...(e.target.files || [])];
      files.forEach(file => {
        this.state.galleryPending.push({
          id: `pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          file,
          url: URL.createObjectURL(file),
        });
      });
      e.target.value = '';
      this.renderGalleryPreviews();
    });

    document.getElementById('gallery-previews')?.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-remove-gallery]');
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      this.removeGalleryItem(btn.dataset.removeGallery, btn.dataset.removeType || 'url');
    });

    // Photo Gallery tab — same gallery uploads
    const photosBox = document.getElementById('planner-photos-upload');
    photosBox?.addEventListener('click', () => document.getElementById('planner-photos-files')?.click());
    document.getElementById('planner-photos-files')?.addEventListener('change', (e) => {
      const files = [...(e.target.files || [])];
      files.forEach((file) => {
        this.state.galleryPending.push({
          id: `pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          file,
          url: URL.createObjectURL(file),
        });
      });
      e.target.value = '';
      this.renderGalleryPreviews();
    });
    document.getElementById('planner-gallery-preview')?.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-remove-gallery]');
      if (!btn) return;
      e.preventDefault();
      this.removeGalleryItem(btn.dataset.removeGallery, btn.dataset.removeType || 'url');
    });

    document.querySelectorAll('.visibility-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.setVisibility(btn.dataset.visibility);
      });
    });
    document.getElementById('visibility')?.addEventListener('change', () => {
      this.setVisibility(document.getElementById('visibility').value);
    });

    document.getElementById('use_guest_list')?.addEventListener('change', () => this.syncOptionalGuestPanel());
    document.getElementById('btn-parse-guest-names')?.addEventListener('click', () => this.parseGuestNamesBulk());
    document.getElementById('btn-clear-guest-names')?.addEventListener('click', () => {
      if (!confirm('Remove all guests from the list?')) return;
      this.state.guests = [];
      this.renderGuests();
      this.renderBasicsGuestPreview();
    });
    this.setVisibility(document.getElementById('visibility_basic')?.value || 'public');
    this.syncOptionalGuestPanel();

    document.getElementById('is_free')?.addEventListener('change', (e) => {
      const price = document.getElementById('price');
      if (e.target.checked) {
        price.value = 0;
        price.disabled = true;
      } else {
        price.disabled = false;
      }
    });
    document.getElementById('price').disabled = true;

    document.getElementById('title')?.addEventListener('input', () => this.updatePlannerHeader());
    document.getElementById('custom_category_name')?.addEventListener('input', () => {
      this.refreshCategoryToolkit();
      this.updatePlannerHeader();
    });
    document.getElementById('category')?.addEventListener('change', () => {
      this.syncCustomCategoryUI();
      this.refreshCategoryToolkit({ scroll: true });
      this.refreshAI();
      this.updatePlannerHeader();
      this.applyCategoryTabFilter();
      this.syncFestivalPlanningUI();
    });
    document.getElementById('btn-apply-category-pack')?.addEventListener('click', () => this.applyAI());
    document.getElementById('btn-open-ai-tab')?.addEventListener('click', () => {
      document.querySelector('.planner-tab[data-tab="ai"]')?.click();
    });

    // Category URL presets are applied in init() only for create mode
    this.syncCustomCategoryUI();
    this.refreshCategoryToolkit({ scroll: false });
    this.updatePlannerHeader();
    this.applyCategoryTabFilter();
  },

  applyUrlCategoryPreset() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('edit') || params.get('id')) return;
    const presetCat = params.get('category');
    const isCustom = params.get('custom') === '1' || presetCat === 'Custom' || presetCat === 'Add More';
    if (isCustom && document.getElementById('category')) {
      document.getElementById('category').value = 'Custom';
    } else if (presetCat && document.getElementById('category')) {
      document.getElementById('category').value = normalizeCategoryName(presetCat) || presetCat;
    }
    this.syncCustomCategoryUI();
    this.refreshCategoryToolkit({ scroll: isCustom || !!presetCat });
    this.updatePlannerHeader();
    this.applyCategoryTabFilter();
  },

  isDefaultCover(url) {
    if (!url) return true;
    const u = String(url).trim();
    return !u || u === this.DEFAULT_COVER || u.endsWith('/images/default-event.jpg') || u.endsWith('images/default-event.jpg');
  },

  showCoverPreview(src) {
    const wrap = document.getElementById('cover-preview-wrap');
    const preview = document.getElementById('cover-preview');
    if (!wrap || !preview || !src || this.isDefaultCover(src)) {
      wrap?.classList.add('hidden');
      return;
    }
    preview.src = src;
    wrap.classList.remove('hidden');
  },

  clearCoverImage() {
    this.removeCoverImage = true;
    const input = document.getElementById('image');
    if (input) input.value = '';
    const cover = document.getElementById('cover-upload');
    if (cover?.querySelector('p')) cover.querySelector('p').textContent = 'Click to upload cover image';
    const wrap = document.getElementById('cover-preview-wrap');
    const preview = document.getElementById('cover-preview');
    if (preview) {
      preview.removeAttribute('src');
      preview.src = '';
    }
    wrap?.classList.add('hidden');
    this.showAlert('Cover image removed. Save or Update to apply.', 'success');
  },

  renderGalleryPreviews() {
    const container = document.getElementById('gallery-previews');
    const plannerPreview = document.getElementById('planner-gallery-preview');
    const galleryBox = document.getElementById('gallery-upload');

    const saved = (this.state.galleryUrls || []).map((url, index) => `
      <div class="gallery-thumb" data-gallery-key="url-${index}">
        <img src="${this.escape(url)}" alt="Gallery photo">
        <button type="button" class="gallery-thumb-remove" data-remove-gallery="${index}" data-remove-type="url" title="Remove photo" aria-label="Remove photo">×</button>
      </div>
    `).join('');

    const pending = (this.state.galleryPending || []).map(item => `
      <div class="gallery-thumb gallery-thumb-pending" data-gallery-key="${this.escape(item.id)}">
        <img src="${this.escape(item.url)}" alt="${this.escape(item.file?.name || 'New photo')}">
        <button type="button" class="gallery-thumb-remove" data-remove-gallery="${this.escape(item.id)}" data-remove-type="pending" title="Remove photo" aria-label="Remove photo">×</button>
      </div>
    `).join('');

    const html = saved + pending || '';
    if (container) container.innerHTML = html;
    if (plannerPreview) plannerPreview.innerHTML = html;

    const total = (this.state.galleryUrls?.length || 0) + (this.state.galleryPending?.length || 0);
    if (galleryBox?.querySelector('p')) {
      galleryBox.querySelector('p').textContent = total
        ? `${total} photo${total === 1 ? '' : 's'} — click to add more`
        : 'Click to upload gallery photos';
    }
  },

  removeGalleryItem(key, type) {
    if (type === 'pending') {
      const item = (this.state.galleryPending || []).find(p => p.id === key);
      if (item?.url?.startsWith('blob:')) URL.revokeObjectURL(item.url);
      this.state.galleryPending = (this.state.galleryPending || []).filter(p => p.id !== key);
    } else {
      const index = parseInt(key, 10);
      if (!Number.isNaN(index)) {
        this.state.galleryUrls = (this.state.galleryUrls || []).filter((_, i) => i !== index);
      }
    }
    this.renderGalleryPreviews();
  },

  getPlanningLabel() {
    const title = (document.getElementById('title')?.value || '').trim();
    if (title) return title;

    const category = document.getElementById('category')?.value || '';
    if (category === 'Custom') {
      const custom = (document.getElementById('custom_category_name')?.value || '').trim();
      return custom || 'Custom Event';
    }
    return category || '';
  },

  updatePlannerHeader() {
    const titleEl = document.getElementById('planner-title');
    const subtitleEl = document.getElementById('planner-subtitle');
    const eyebrowEl = document.getElementById('planner-eyebrow');
    const nameEl = document.getElementById('planner-event-name');
    const nameInput = document.getElementById('planner-event-title-input');
    const nameLabel = document.getElementById('planner-event-label');
    if (!titleEl || !nameEl) return;

    const editing = !!this.editId;
    const titleValue = (document.getElementById('title')?.value || '').trim();
    const label = this.getPlanningLabel();
    const shell = document.querySelector('.planner-shell');
    const catValue = document.getElementById('category')?.value || '';
    const slug = typeof getCategorySlug === 'function'
      ? getCategorySlug(catValue === 'Custom' ? 'Custom' : this.getSelectedCategory() || catValue)
      : 'custom';
    if (shell) {
      if (catValue) shell.setAttribute('data-cat', slug);
      else shell.removeAttribute('data-cat');
    }

    if (editing) {
      titleEl.textContent = 'Edit Event';
      if (eyebrowEl) eyebrowEl.textContent = 'Editing';
      if (subtitleEl) subtitleEl.textContent = 'Update details, guests, budget, and more';
    } else {
      titleEl.textContent = 'Create Event';
      if (eyebrowEl) {
        const meta = typeof getCategoryMeta === 'function' ? getCategoryMeta(catValue || label) : null;
        eyebrowEl.textContent = meta && catValue
          ? `${meta.icon} ${meta.name === 'Custom' ? 'Custom event' : meta.name}`
          : 'Event planner';
      }
      if (subtitleEl) {
        const tag = typeof getCategoryTagline === 'function' && catValue
          ? getCategoryTagline(catValue)
          : 'Professional event planning workspace';
        subtitleEl.textContent = tag;
      }
    }

    if (nameLabel) nameLabel.textContent = editing ? 'Event:' : 'Planning:';

    if (editing || label || catValue) {
      nameEl.classList.remove('hidden');
      if (nameInput && document.activeElement !== nameInput) {
        nameInput.value = titleValue || '';
        nameInput.placeholder = (!titleValue && label) ? label : 'Type event name…';
      }
      document.title = `${titleValue || label || 'Event'} — Eventify Planner`;
    } else {
      nameEl.classList.add('hidden');
      document.title = editing ? 'Edit Event - Eventify Planner' : 'Create Event - Eventify Planner';
    }
  },

  bindPlannerEventName() {
    const nameInput = document.getElementById('planner-event-title-input');
    const titleInput = document.getElementById('title');
    if (!nameInput || nameInput.dataset.bound === '1') return;
    nameInput.dataset.bound = '1';

    const syncToBasics = () => {
      if (titleInput) titleInput.value = nameInput.value;
      this.updatePlannerHeader();
    };

    nameInput.addEventListener('input', syncToBasics);
    nameInput.addEventListener('change', syncToBasics);
  },

  bindThemePicker() {
    const open = () => this.openThemePicker();
    document.getElementById('btn-choose-theme')?.addEventListener('click', open);
    document.getElementById('btn-choose-theme-basics')?.addEventListener('click', open);

    const modal = document.getElementById('theme-picker-modal');
    modal?.querySelectorAll('[data-close-theme-picker]').forEach((el) => {
      el.addEventListener('click', () => this.closeThemePicker());
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal && !modal.classList.contains('hidden')) {
        this.closeThemePicker();
      }
    });
  },

  openThemePicker() {
    const modal = document.getElementById('theme-picker-modal');
    const grid = document.getElementById('theme-picker-grid');
    if (!modal || !grid) return;

    const selected = document.getElementById('category')?.value || '';
    const cats = (typeof CATEGORIES !== 'undefined' ? CATEGORIES : []).slice();
    grid.innerHTML = cats.map((c) => {
      const isCustom = c.name === 'Custom' || c.slug === 'custom';
      const active = selected === c.name;
      return `
        <button type="button" class="theme-pick-card ${active ? 'active' : ''} theme-pick-card--${this.escape(c.slug)}" data-theme-name="${this.escape(c.name)}" data-theme-custom="${isCustom ? '1' : '0'}">
          <span class="theme-pick-icon" aria-hidden="true">${c.icon || '✨'}</span>
          <span class="theme-pick-name">${this.escape(isCustom ? 'Custom / Add More' : c.name)}</span>
          <span class="theme-pick-tagline">${this.escape(c.tagline || '')}</span>
        </button>`;
    }).join('');

    grid.querySelectorAll('[data-theme-name]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.applyThemeChoice(btn.dataset.themeName, btn.dataset.themeCustom === '1');
      });
    });

    modal.classList.remove('hidden');
    document.body.classList.add('theme-picker-open');
  },

  closeThemePicker() {
    document.getElementById('theme-picker-modal')?.classList.add('hidden');
    document.body.classList.remove('theme-picker-open');
  },

  applyThemeChoice(name, isCustom = false) {
    const catEl = document.getElementById('category');
    if (!catEl) return;

    if (isCustom) {
      catEl.value = 'Custom';
    } else {
      catEl.value = normalizeCategoryName(name) || name;
    }

    this.syncCustomCategoryUI();
    this.refreshCategoryToolkit({ scroll: true });
    this.refreshAI();
    this.updatePlannerHeader();
    this.applyCategoryTabFilter();
    this.syncFestivalPlanningUI?.();
    catEl.dispatchEvent(new Event('change', { bubbles: true }));
    this.closeThemePicker();

    const label = isCustom ? 'Custom' : (normalizeCategoryName(name) || name);
    Eventify.showToast(`Theme set: ${label}`, 'success');

    // Focus title so they can name the event next
    setTimeout(() => document.getElementById('title')?.focus(), 150);
  },

  setVisibility(vis) {
    const value = ['public', 'private', 'invite_only'].includes(vis) ? vis : 'public';
    const basic = document.getElementById('visibility_basic');
    const settings = document.getElementById('visibility');
    if (basic) basic.value = value;
    if (settings) settings.value = value;

    document.querySelectorAll('.visibility-btn').forEach(btn => {
      const on = btn.dataset.visibility === value;
      btn.classList.toggle('active', on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    });

    this.syncVisibilityHint();
    this.refreshShareLinkUI();
  },

  syncVisibilityHint() {
    const vis = document.getElementById('visibility_basic')?.value || 'public';
    const hint = document.getElementById('visibility-hint');
    if (!hint) return;
    const hints = {
      public: 'Public events appear in search and the events page.',
      private: 'Private events are only visible to you (the host). They do not appear in search, and invite links will not work for others.',
      invite_only: 'Invite-only events stay hidden from browse. Guests need your invite link or to be on your guest list (by email).',
    };
    hint.textContent = hints[vis] || hints.public;
    if (vis === 'invite_only') {
      const useList = document.getElementById('use_guest_list');
      if (useList && !useList.checked) {
        useList.checked = true;
        this.syncOptionalGuestPanel();
      }
    }
  },

  syncOptionalGuestPanel() {
    const on = document.getElementById('use_guest_list')?.checked;
    document.getElementById('optional-guest-panel')?.classList.toggle('hidden', !on);
    if (on) this.renderBasicsGuestPreview();
  },

  parseGuestNamesBulk() {
    const text = document.getElementById('guest_names_bulk')?.value || '';
    const names = text.split('\n').map(n => n.trim()).filter(Boolean);
    if (!names.length) {
      Eventify.showToast('Enter at least one guest name (one per line)', 'error');
      return;
    }
    let added = 0;
    names.forEach(name => {
      if (this.state.guests.some(g => g.name.toLowerCase() === name.toLowerCase())) return;
      this.state.guests.push({
        id: this.uid(),
        name,
        email: '',
        status: 'pending',
        vip: false,
        plusOne: false,
        ticketCode: `EVT-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      });
      added += 1;
    });
    document.getElementById('guest_names_bulk').value = '';
    document.getElementById('use_guest_list').checked = true;
    this.syncOptionalGuestPanel();
    this.renderGuests();
    this.renderBasicsGuestPreview();
    Eventify.showToast(added ? `Added ${added} guest name(s)` : 'Those names are already on the list', added ? 'success' : 'error');
  },

  renderBasicsGuestPreview() {
    const box = document.getElementById('basics-guest-preview');
    if (!box) return;
    if (!this.state.guests.length) {
      box.innerHTML = '<p class="note-chip-hint">No guests added yet.</p>';
      return;
    }
    box.innerHTML = `
      <p class="card-desc" style="margin-bottom:8px;"><strong>${this.state.guests.length}</strong> guest(s) on list:</p>
      <div class="category-note-chips">
        ${this.state.guests.map(g => `<span class="note-chip active">${this.escape(g.name)}</span>`).join('')}
      </div>
    `;
  },

  syncCustomCategoryUI() {
    const box = document.getElementById('custom-category-box');
    const customInput = document.getElementById('custom_category_name');
    const cat = document.getElementById('category')?.value || '';
    const isCustom = cat === 'Custom';
    box?.classList.toggle('hidden', !isCustom);
    if (customInput) {
      customInput.required = isCustom;
      if (!isCustom) customInput.value = '';
    }
  },

  getSelectedCategory() {
    const cat = document.getElementById('category')?.value || '';
    if (cat === 'Custom') {
      const custom = document.getElementById('custom_category_name')?.value.trim();
      return custom || 'Custom';
    }
    return cat;
  },

  getToolkitCategory() {
    const cat = document.getElementById('category')?.value || '';
    return cat === 'Custom' ? 'Custom' : cat;
  },

  toggleCategoryNote(note, btn) {
    const notesEl = document.getElementById('category_notes');
    if (!notesEl || !note) return;
    const lines = notesEl.value.split('\n').map(l => l.trim()).filter(Boolean);
    const exists = lines.some(l => l.replace(/^•\s*/, '') === note);
    if (exists) {
      notesEl.value = lines.filter(l => l.replace(/^•\s*/, '') !== note).join('\n');
      btn?.classList.remove('active');
    } else {
      notesEl.value = [...lines, `• ${note}`].join('\n');
      btn?.classList.add('active');
    }
  },

  refreshCategoryToolkit({ scroll = false } = {}) {
    const toolkit = document.getElementById('category-toolkit');
    const empty = document.getElementById('category-toolkit-empty');
    const chips = document.getElementById('category-note-chips');
    const notesEl = document.getElementById('category_notes');
    if (!chips || !notesEl) return;

    const cat = this.getToolkitCategory();
    const options = typeof getCategoryNoteOptions === 'function' ? getCategoryNoteOptions(cat) : [];
    const plan = typeof AIPlanner !== 'undefined' ? AIPlanner.get(cat, this.getAIContext?.() || {}) : null;

    if (!cat) {
      toolkit?.classList.add('hidden');
      empty?.classList.remove('hidden');
      return;
    }

    toolkit?.classList.remove('hidden');
    empty?.classList.add('hidden');
    toolkit?.classList.remove('toolkit-reveal');
    void toolkit?.offsetWidth;
    toolkit?.classList.add('toolkit-reveal');

    const current = notesEl.value;
    const noteList = options.length ? options : ['Theme', 'Guest estimate', 'Budget range', 'Venue type', 'Must-haves'];
    chips.innerHTML = noteList.map(opt => {
      const active = current.split('\n').some(line => line.replace(/^•\s*/, '').trim() === opt);
      return `<button type="button" class="note-chip ${active ? 'active' : ''}" data-note="${this.escape(opt)}">${this.escape(opt)}</button>`;
    }).join('');

    chips.querySelectorAll('.note-chip').forEach(btn => {
      btn.addEventListener('click', () => this.toggleCategoryNote(btn.dataset.note, btn));
    });

    const themes = typeof getCategoryThemes === 'function' ? getCategoryThemes(cat) : [];
    const themeChips = document.getElementById('category-theme-chips');
    if (themeChips) {
      themeChips.innerHTML = themes.map(t =>
        `<button type="button" class="note-chip theme-chip" data-theme="${this.escape(t)}">${this.escape(t)}</button>`
      ).join('');
      themeChips.querySelectorAll('.theme-chip').forEach(btn => {
        btn.addEventListener('click', () => {
          const theme = btn.dataset.theme;
          const desc = document.getElementById('description');
          const line = `Theme: ${theme}`;
          if (desc && !desc.value.includes(line)) {
            desc.value = desc.value ? `${desc.value.trim()}\n${line}` : line;
          }
          this.toggleCategoryNote(`Theme — ${theme}`, btn);
          Eventify.showToast(`Theme “${theme}” added`, 'success');
        });
      });
    }

    const tips = plan?.tips || [];
    const decor = plan?.decorations || [];
    const budget = plan?.budgetSuggestions || [];
    const vendors = plan?.vendorRecommendations || [];
    const ideas = plan?.ideas || [];

    const setList = (id, html) => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = html;
    };

    setList('category-tips-list',
      (tips.length ? tips : ideas.slice(0, 3)).map(t =>
        `<li><button type="button" class="toolkit-pick" data-note="${this.escape(t)}">${this.escape(t)}</button></li>`
      ).join('') || '<li>No tips yet.</li>');
    setList('category-decor-list',
      decor.map(t =>
        `<li><button type="button" class="toolkit-pick" data-note="Decor — ${this.escape(t)}">${this.escape(t)}</button></li>`
      ).join('') || '<li>No decoration ideas yet.</li>');
    setList('category-budget-list',
      budget.map(b => `<li><strong>${this.escape(b.item)}</strong> — ${b.pct}%</li>`).join('')
      || '<li>Set a total budget, then Apply Starter Pack.</li>');
    setList('category-vendor-list',
      vendors.map(v =>
        `<li><button type="button" class="toolkit-pick" data-note="Vendor — ${this.escape(v)}">${this.escape(v)}</button></li>`
      ).join('') || '<li>No vendor suggestions yet.</li>');

    document.querySelectorAll('#category-toolkit .toolkit-pick').forEach(btn => {
      btn.addEventListener('click', () => {
        this.toggleCategoryNote(btn.dataset.note, null);
        btn.classList.add('picked');
        Eventify.showToast('Added to notes', 'success');
      });
    });

    if (scroll) {
      document.getElementById('category-notes-wrap')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  },

  refreshCategoryNoteChips() {
    this.refreshCategoryToolkit();
  },

  bindPlanning() {
    document.getElementById('add-checklist-item')?.addEventListener('click', () => {
      this.state.checklist.push({
        id: this.uid(),
        title: '',
        priority: 'medium',
        due: '',
        done: false,
        boardStatus: 'todo',
      });
      this.renderChecklist();
      this.renderBoard();
    });
  },

  bindAI() {
    document.getElementById('btn-refresh-ai')?.addEventListener('click', () => {
      this.refreshAI();
      Eventify.showToast('Suggestions refreshed for your event details', 'success');
    });
    document.getElementById('btn-apply-ai')?.addEventListener('click', () => this.applyAI({ all: true }));
    document.getElementById('btn-apply-selected-ai')?.addEventListener('click', () => this.applyAI({ selectedOnly: true }));

    document.getElementById('btn-ai-ask')?.addEventListener('click', () => this.askAI());
    document.getElementById('ai-question')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.askAI();
      }
    });
    document.querySelectorAll('.ai-quick').forEach(btn => {
      btn.addEventListener('click', () => {
        document.getElementById('ai-question').value = btn.dataset.q || '';
        this.askAI();
      });
    });

    document.querySelectorAll('.ai-apply-section').forEach(btn => {
      btn.addEventListener('click', () => this.applyAISection(btn.dataset.section));
    });

    ['title', 'description', 'date', 'location', 'venue_name', 'capacity', 'total_budget', 'custom_category_name'].forEach(id => {
      document.getElementById(id)?.addEventListener('change', () => {
        if (document.getElementById('tab-ai')?.classList.contains('active')) this.refreshAI();
      });
    });
  },

  getAIContext() {
    return {
      title: document.getElementById('title')?.value || '',
      description: document.getElementById('description')?.value || '',
      category: this.getToolkitCategory(),
      customType: document.getElementById('custom_category_name')?.value || this.getSelectedCategory(),
      date: document.getElementById('date')?.value || '',
      location: document.getElementById('location')?.value || '',
      venue: document.getElementById('venue_name')?.value || '',
      capacity: document.getElementById('capacity')?.value || 0,
      budget: document.getElementById('total_budget')?.value || 0,
    };
  },

  getAIPlan() {
    return AIPlanner.get(this.getToolkitCategory(), this.getAIContext());
  },

  refreshAI() {
    const ctx = this.getAIContext();
    const plan = this.getAIPlan();
    this._aiPlan = plan;

    const bar = document.getElementById('ai-context-bar');
    if (bar) bar.textContent = plan.summary || 'Add Basics details to personalize suggestions.';

    const item = (text, meta = {}) => {
      const payload = encodeURIComponent(JSON.stringify({ text, ...meta }));
      return `<li class="ai-item">
        <label>
          <input type="checkbox" class="ai-check" checked data-payload="${payload}">
          <span>${text}</span>
        </label>
      </li>`;
    };

    document.getElementById('ai-ideas').innerHTML = plan.ideas.map(i => item(this.escape(i), { kind: 'idea' })).join('');
    document.getElementById('ai-tips').innerHTML = plan.tips.map(i => item(this.escape(i), { kind: 'tip' })).join('');
    document.getElementById('ai-decorations').innerHTML = (plan.decorations || []).map(i => item(this.escape(i), { kind: 'decor' })).join('');
    document.getElementById('ai-budget').innerHTML = (plan.budgetSuggestions || []).map(b => {
      const amount = b.amount != null ? ` · ≈ $${b.amount}` : '';
      return item(`<strong>${this.escape(b.item)}</strong> — ${b.pct}%${amount}`, {
        kind: 'budget', item: b.item, pct: b.pct, amount: b.amount,
      });
    }).join('');
    document.getElementById('ai-vendors').innerHTML = (plan.vendorRecommendations || [])
      .map(i => item(this.escape(i), { kind: 'vendor', name: i })).join('');
    document.getElementById('ai-timeline').innerHTML = plan.timeline
      .map(t => item(`<strong>${this.escape(t.offset)}</strong> — ${this.escape(t.activity)}`, {
        kind: 'timeline', offset: t.offset, activity: t.activity,
      })).join('');
    document.getElementById('ai-checklist').innerHTML = plan.checklist
      .map(c => item(`<span class="priority-${c.priority}">${c.priority}</span> ${this.escape(c.title)}`, {
        kind: 'checklist', title: c.title, priority: c.priority,
      })).join('');

    const palette = plan.moodPalette || [];
    document.getElementById('ai-palette').innerHTML = palette
      .map(c => `<button type="button" class="swatch" style="background:${c}" title="${c}" data-color="${c}"></button>`)
      .join('');

    if (!document.getElementById('ai-chat-log')?.dataset.seeded) {
      this.appendAIChat('assistant', "Hi! I'm your AI planning assistant. I reply in English only. Ask about budget, guests, vendors, timeline, or decor — or tap a quick button above.");
      const log = document.getElementById('ai-chat-log');
      if (log) log.dataset.seeded = '1';
    }
  },

  appendAIChat(role, text) {
    const log = document.getElementById('ai-chat-log');
    if (!log) return;
    const div = document.createElement('div');
    div.className = `ai-chat-bubble ${role}`;
    div.innerHTML = text.split('\n').map(line => this.escape(line)).join('<br>');
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
  },

  askAI() {
    const input = document.getElementById('ai-question');
    const q = input?.value.trim();
    if (!q) return;
    this.appendAIChat('user', q);
    input.value = '';
    const answer = AIPlanner.answer(q, this.getAIContext());
    setTimeout(() => this.appendAIChat('assistant', answer), 400);
  },

  readAIChecks(section) {
    const root = section
      ? document.querySelector(`[data-ai-section="${section}"]`)
      : document.getElementById('tab-ai');
    if (!root) return [];
    return [...root.querySelectorAll('.ai-check:checked')].map(el => {
      try { return JSON.parse(decodeURIComponent(el.dataset.payload || '{}')); }
      catch { return null; }
    }).filter(Boolean);
  },

  appendNotes(lines, targetId = 'planning_notes') {
    const el = document.getElementById(targetId);
    if (!el || !lines.length) return;
    const block = lines.map(l => (l.startsWith('•') ? l : `• ${l}`)).join('\n');
    el.value = el.value.trim() ? `${el.value.trim()}\n${block}` : block;
  },

  applyAISection(section) {
    const plan = this._aiPlan || this.getAIPlan();
    const selected = this.readAIChecks(section);

    if (section === 'ideas' || section === 'tips' || section === 'decorations') {
      const lines = selected.length
        ? selected.map(s => s.text.replace(/<[^>]+>/g, ''))
        : (section === 'ideas' ? plan.ideas : section === 'tips' ? plan.tips : plan.decorations);
      this.appendNotes(lines.map(l => String(l).replace(/<[^>]+>/g, '')));
      Eventify.showToast('Added to planning notes', 'success');
      return;
    }

    if (section === 'budget') {
      this.applyAIBudget(selected.length ? selected : plan.budgetSuggestions);
      document.querySelector('.planner-tab[data-tab="budget"]')?.click();
      return;
    }
    if (section === 'vendors') {
      this.applyAIVendors(selected.length ? selected.map(s => s.name || s.text) : plan.vendorRecommendations);
      document.querySelector('.planner-tab[data-tab="vendors"]')?.click();
      return;
    }
    if (section === 'timeline') {
      this.applyAITimeline(selected.length
        ? selected.map(s => ({ offset: s.offset, activity: s.activity }))
        : plan.timeline);
      document.querySelector('.planner-tab[data-tab="schedule"]')?.click();
      return;
    }
    if (section === 'checklist') {
      this.applyAIChecklist(selected.length
        ? selected.map(s => ({ title: s.title || s.text.replace(/<[^>]+>/g, ''), priority: s.priority || 'medium' }))
        : plan.checklist);
      document.querySelector('.planner-tab[data-tab="planning"]')?.click();
      return;
    }
    if (section === 'palette') {
      this.applyAIPalette(plan.moodPalette);
      document.querySelector('.planner-tab[data-tab="mood"]')?.click();
    }
  },

  applyAIChecklist(items, { silent = false } = {}) {
    (items || []).forEach(c => {
      const title = (c.title || '').replace(/<[^>]+>/g, '').trim();
      if (!title) return;
      if (this.state.checklist.some(x => x.title === title)) return;
      this.state.checklist.push({
        id: this.uid(),
        title,
        priority: c.priority || 'medium',
        due: '',
        done: false,
        boardStatus: 'todo',
      });
    });
    this.renderChecklist();
    this.renderBoard();
    if (!silent) Eventify.showToast('Checklist updated', 'success');
  },

  applyAITimeline(items, { silent = false } = {}) {
    (items || []).forEach(t => {
      const activity = `${t.offset || ''}: ${t.activity || t.text || ''}`.replace(/^:\s*/, '').trim();
      if (!activity) return;
      if (this.state.schedule.some(s => s.activity === activity)) return;
      this.state.schedule.push({
        id: this.uid(),
        time: '',
        activity,
        person: '',
        notes: 'From AI timeline',
      });
    });
    this.renderSchedule();
    if (!silent) Eventify.showToast('Schedule updated', 'success');
  },

  applyAIVendors(names, { silent = false } = {}) {
    (names || []).forEach(type => {
      const name = String(type).replace(/<[^>]+>/g, '').trim();
      if (!name) return;
      if (this.state.vendors.some(v => v.name === name)) return;
      this.state.vendors.push({
        id: this.uid(),
        type: name.includes(' ') ? 'Other' : name,
        name,
        contact: '',
        notes: 'Suggested by AI planner',
      });
    });
    this.renderVendors();
    if (!silent) Eventify.showToast('Vendors added', 'success');
  },

  applyAIBudget(items, { silent = false } = {}) {
    const total = parseFloat(document.getElementById('total_budget')?.value) || 0;
    if (!total) {
      if (!silent) Eventify.showToast('Set Total Budget first (Budget tab)', 'error');
      return;
    }
    const rows = (items || []).map(b => {
      const pct = Number(b.pct) || 0;
      const item = b.item || String(b.text || '').replace(/<[^>]+>/g, '').split('—')[0].trim();
      return {
        id: this.uid(),
        category: ['Venue', 'Food', 'Decorations', 'Music', 'Staff', 'Marketing', 'Equipment', 'Photography', 'Miscellaneous']
          .find(c => (item || '').toLowerCase().includes(c.toLowerCase().slice(0, 4))) || 'Miscellaneous',
        estimated: b.amount != null ? b.amount : Math.round(total * (pct / 100) * 100) / 100,
        actual: 0,
        notes: pct ? `${pct}% AI suggestion` : 'AI suggestion',
      };
    });
    if (rows.length) {
      this.state.budgetLines = rows;
      this.renderBudget();
      if (!silent) Eventify.showToast('Budget lines applied', 'success');
    }
  },

  applyAIPalette(colors, { silent = false } = {}) {
    const list = colors || this._aiPlan?.moodPalette || [];
    if (!list.length) return;
    this.state.moodColors = [...new Set([...(this.state.moodColors || []), ...list])];
    this.renderMood();
    if (!silent) Eventify.showToast('Palette added to Mood Board', 'success');
  },

  applyAI({ all = false, selectedOnly = false } = {}) {
    const plan = this._aiPlan || this.getAIPlan();
    const pick = (section) => {
      const sel = this.readAIChecks(section);
      return sel.length ? sel : [];
    };

    if (selectedOnly) {
      const any = this.readAIChecks().length;
      if (!any) {
        Eventify.showToast('Select at least one suggestion first', 'error');
        return;
      }
      const ideas = pick('ideas').map(s => s.text);
      const tips = pick('tips').map(s => s.text);
      const decor = pick('decorations').map(s => s.text);
      const checklistSel = pick('checklist').map(s => ({
        title: s.title || s.text, priority: s.priority || 'medium',
      }));
      const timelineSel = pick('timeline').map(s => ({ offset: s.offset, activity: s.activity }));
      const vendorSel = pick('vendors').map(s => s.name || s.text);
      const budgetSel = pick('budget');

      if (checklistSel.length) this.applyAIChecklist(checklistSel, { silent: true });
      if (timelineSel.length) this.applyAITimeline(timelineSel, { silent: true });
      if (vendorSel.length) this.applyAIVendors(vendorSel, { silent: true });
      if (budgetSel.length) this.applyAIBudget(budgetSel, { silent: true });
      const noteLines = [...ideas, ...tips, ...decor].map(t => String(t).replace(/<[^>]+>/g, '')).filter(Boolean);
      if (noteLines.length) this.appendNotes(noteLines);
      Eventify.showToast('Selected AI suggestions applied', 'success');
      return;
    }

    this.applyAIChecklist(plan.checklist, { silent: true });
    this.applyAITimeline(plan.timeline, { silent: true });
    this.applyAIVendors(plan.vendorRecommendations, { silent: true });
    if (parseFloat(document.getElementById('total_budget')?.value) > 0) {
      this.applyAIBudget(plan.budgetSuggestions, { silent: true });
    }
    this.applyAIPalette(plan.moodPalette, { silent: true });

    this.appendNotes([
      ...plan.tips,
      '',
      'Decorations:',
      ...(plan.decorations || []).map(d => d),
      '',
      'Ideas:',
      ...plan.ideas.slice(0, 5),
    ]);

    const catNotes = document.getElementById('category_notes');
    if (catNotes && !catNotes.value.trim()) {
      const noteOpts = typeof getCategoryNoteOptions === 'function' ? getCategoryNoteOptions(this.getToolkitCategory()) : [];
      catNotes.value = [
        ...noteOpts.slice(0, 4).map(n => `• ${n}`),
        ...(plan.tips || []).slice(0, 2).map(t => `• ${t}`),
      ].join('\n');
    }

    this.refreshCategoryToolkit();
    this.renderMood();
    Eventify.showToast('Full AI plan applied across checklist, schedule, vendors, budget & notes', 'success');
  },

  bindGuests() {
    document.getElementById('add-guest')?.addEventListener('click', () => {
      this.state.guests.push({
        id: this.uid(),
        name: '',
        email: '',
        status: 'pending',
        vip: false,
        plusOne: false,
        ticketCode: `EVT-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      });
      document.getElementById('use_guest_list').checked = true;
      this.syncOptionalGuestPanel();
      this.renderGuests();
    });
  },

  bindBudget() {
    document.getElementById('add-budget-row')?.addEventListener('click', () => {
      this.state.budgetLines.push({
        id: this.uid(),
        category: 'Miscellaneous',
        estimated: 0,
        actual: 0,
        notes: '',
      });
      this.renderBudget();
    });
    document.getElementById('total_budget')?.addEventListener('input', () => this.updateBudgetTotals());
  },

  seedDefaultBudget() {
    const cats = ['Venue', 'Food', 'Decorations', 'Music', 'Staff', 'Marketing', 'Equipment', 'Photography', 'Miscellaneous'];
    this.state.budgetLines = cats.map(category => ({
      id: this.uid(),
      category,
      estimated: 0,
      actual: 0,
      notes: '',
    }));
  },

  bindVendors() {
    document.getElementById('add-vendor')?.addEventListener('click', () => {
      this.state.vendors.push({
        id: this.uid(),
        type: 'Caterer',
        name: '',
        contact: '',
        notes: '',
      });
      this.renderVendors();
    });
  },

  bindTickets() {
    document.getElementById('add-ticket-tier')?.addEventListener('click', () => {
      this.state.tickets.push({
        id: this.uid(),
        tier: 'Standard',
        price: 0,
        capacity: 0,
        qrCheckIn: true,
      });
      this.renderTickets();
    });
  },

  bindStages() {
    document.getElementById('add-stage')?.addEventListener('click', () => {
      const n = this.state.stages.length;
      this.state.stages.push({
        id: this.uid(),
        name: n === 0 ? 'Main Stage' : `Stage ${n + 1}`,
        kind: n === 0 ? 'main' : 'secondary',
        notes: '',
      });
      this.renderStages();
      this.renderSchedule();
    });
    document.getElementById('add-festival-vendor')?.addEventListener('click', () => {
      this.state.festivalVendors.push({
        id: this.uid(),
        name: '',
        kind: 'food',
        booth: '',
        notes: '',
      });
      this.renderFestivalVendors();
    });
  },

  bindSecurity() {
    // Values collected from form fields on save — no list bindings needed
  },

  bindSchedule() {
    document.getElementById('add-schedule-row')?.addEventListener('click', () => {
      const festival = this.isFestivalEvent();
      this.state.schedule.push({
        id: this.uid(),
        time: '',
        activity: festival ? '' : '',
        person: '',
        stage: this.state.stages[0]?.name || '',
        notes: '',
      });
      this.renderSchedule();
    });
  },

  bindDocuments() {
    const box = document.getElementById('docs-upload');
    box?.addEventListener('click', () => document.getElementById('documents').click());
    document.getElementById('documents')?.addEventListener('change', async (e) => {
      const files = [...(e.target.files || [])];
      if (!files.length) return;
      box.querySelector('p').textContent = 'Uploading…';
      for (const file of files) {
        try {
          const meta = await EventifyDB.uploadEventDocument(Eventify.currentUser.id, file);
          this.state.documents.push({ id: this.uid(), ...meta });
        } catch (err) {
          // keep locally for draft if storage bucket not ready yet
          this.state.documents.push({
            id: this.uid(),
            name: file.name,
            type: file.type,
            size: file.size,
            path: '',
            url: '',
            pendingFile: true,
            error: err.message,
          });
          Eventify.showToast(`Document "${file.name}": ${err.message}`, 'error');
        }
      }
      box.querySelector('p').textContent = 'Upload contracts, PDFs, images, Excel or Word files';
      e.target.value = '';
      this.renderDocuments();
    });
  },

  bindBoard() {
    const addCard = (title, status = 'todo', notes = '') => {
      const raw = String(title || '').trim();
      if (!raw) return false;
      const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
      const text = lines[0] || raw;
      const extraNotes = [notes, ...lines.slice(1)].filter(Boolean).join('\n').trim();
      const statusValue = ['todo', 'in_progress', 'done'].includes(status) ? status : 'todo';
      this.state.checklist.push({
        id: this.uid(),
        title: text,
        notes: extraNotes,
        priority: 'medium',
        due: '',
        done: statusValue === 'done',
        boardStatus: statusValue,
      });
      this.renderChecklist();
      this.renderBoard();
      return true;
    };

    document.getElementById('add-board-card')?.addEventListener('click', () => {
      const input = document.getElementById('board-new-title');
      if (addCard(input?.value, 'todo')) input.value = '';
    });

    document.getElementById('board-new-title')?.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      const input = e.target;
      if (addCard(input.value, 'todo')) input.value = '';
    });

    document.querySelectorAll('.kanban-compose-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const status = btn.dataset.status;
        const area = document.querySelector(`.kanban-compose-input[data-status="${status}"]`);
        if (!area) return;
        if (addCard(area.value, status)) area.value = '';
      });
    });

    document.querySelectorAll('.kanban-compose-input').forEach(area => {
      area.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          const status = area.dataset.status;
          if (addCard(area.value, status)) area.value = '';
        }
      });
    });

    document.querySelectorAll('.kanban-col').forEach(col => {
      col.addEventListener('dragover', (e) => {
        e.preventDefault();
        col.classList.add('drag-over');
      });
      col.addEventListener('dragleave', () => col.classList.remove('drag-over'));
      col.addEventListener('drop', (e) => {
        e.preventDefault();
        col.classList.remove('drag-over');
        const id = e.dataTransfer.getData('text/plain');
        const item = this.state.checklist.find(c => c.id === id);
        if (!item) return;
        item.boardStatus = col.dataset.status;
        item.done = col.dataset.status === 'done';
        this.renderChecklist();
        this.renderBoard();
      });
    });
  },

  bindReminders() {
    document.getElementById('add-reminder')?.addEventListener('click', () => {
      this.state.reminders.push({
        id: this.uid(),
        type: 'task',
        title: '',
        due: '',
      });
      this.renderReminders();
    });
  },

  bindSync() {
    ['date', 'time', 'capacity', 'price', 'is_free', 'total_budget'].forEach(id => {
      document.getElementById(id)?.addEventListener('input', () => {
        this.updateCountdown();
        this.refreshAnalytics();
        this.updateBudgetTotals();
      });
    });
  },

  bindPublish() {
    document.getElementById('btn-publish')?.addEventListener('click', () => this.save(false));
    document.getElementById('btn-save-draft')?.addEventListener('click', () => this.save(true));
  },

  bindShareInvite() {
    const copyInviteLink = async () => {
      if (!this.assertHost('share the invite link')) return;
      if (!this.editId) {
        Eventify.showToast('Save or publish first so guests can open the invite link', 'error');
        return;
      }
      const synced = await EventifyDB.ensureShareToken(this.editId, this.shareToken);
      if (!synced.success) {
        Eventify.showToast(synced.message || 'Could not prepare invite link', 'error');
        return;
      }
      this.shareToken = synced.share_token;
      const url = EventifyDB.inviteUrl(this.shareToken);
      this.refreshShareLinkUI();
      try {
        await navigator.clipboard.writeText(url);
        Eventify.showToast('Invite link copied!', 'success');
      } catch {
        const input = document.getElementById('share_invite_url');
        if (input) {
          input.value = url;
          input.focus();
          input.select();
        }
        Eventify.showToast('Select and copy the link from the Invitations tab', 'success');
        document.querySelector('.planner-tab[data-tab="invites"]')?.click();
      }
    };

    const shareInviteMessage = async () => {
      if (!this.assertHost('share the invite link')) return null;
      const vis = document.getElementById('visibility')?.value
        || document.getElementById('visibility_basic')?.value
        || 'public';
      if (vis === 'private') {
        Eventify.showToast('Private events cannot be shared. Switch to Invite Only or Public.', 'error');
        return null;
      }
      if (!this.editId) {
        Eventify.showToast('Save or publish first so guests can open the invite link', 'error');
        return null;
      }
      const synced = await EventifyDB.ensureShareToken(this.editId, this.shareToken);
      if (!synced.success) {
        Eventify.showToast(synced.message || 'Could not prepare invite link', 'error');
        return null;
      }
      this.shareToken = synced.share_token;
      this.refreshShareLinkUI();
      const url = EventifyDB.inviteUrl(this.shareToken);
      const title = document.getElementById('title')?.value?.trim() || 'my event';
      const date = document.getElementById('date')?.value || '';
      const time = document.getElementById('time')?.value || '';
      const location = document.getElementById('venue_name')?.value?.trim()
        || document.getElementById('location')?.value?.trim()
        || '';
      const hostName = Eventify.currentUser?.name || '';
      // Always use English invite copy for share (ignore custom Albanian subject/body)
      const text = Eventify.buildInviteShareText({ title, date, time, location, url, hostName });
      if (/localhost|127\.0\.0\.1/i.test(url)) {
        Eventify.showToast('Note: localhost links only work on this computer', 'success');
      }
      return {
        title,
        url,
        text,
        subject: `You are invited: ${title}`,
      };
    };

    document.getElementById('btn-top-copy-invite')?.addEventListener('click', copyInviteLink);
    document.getElementById('btn-copy-invite-link')?.addEventListener('click', copyInviteLink);

    const shareWhatsApp = async () => {
      // Preserve user-gesture for desktop popups (async token fetch would otherwise block them)
      const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '');
      const pending = mobile ? null : window.open('about:blank', '_blank');
      try {
        const msg = await shareInviteMessage();
        if (!msg) {
          pending?.close();
          return;
        }
        const url = `https://wa.me/?text=${encodeURIComponent(msg.text)}`;
        if (pending) pending.location.href = url;
        else window.location.href = url;
      } catch (err) {
        pending?.close();
        Eventify.showToast(err?.message || 'Could not open WhatsApp', 'error');
      }
    };
    const shareEmail = async () => {
      // Preserve click gesture so the email tab is not blocked after await
      const pending = window.open('about:blank', '_blank');
      try {
        const msg = await shareInviteMessage();
        if (!msg) {
          pending?.close();
          return;
        }
        Eventify.openEmailInvite({
          subject: msg.subject,
          body: msg.text,
          pendingWindow: pending,
        });
      } catch (err) {
        pending?.close();
        Eventify.showToast(err?.message || 'Could not open email', 'error');
      }
    };
    document.getElementById('btn-top-whatsapp-invite')?.addEventListener('click', shareWhatsApp);
    document.getElementById('btn-whatsapp-invite')?.addEventListener('click', shareWhatsApp);
    document.getElementById('btn-top-email-invite')?.addEventListener('click', shareEmail);
    document.getElementById('btn-email-invite')?.addEventListener('click', shareEmail);

    document.getElementById('btn-regen-invite-link')?.addEventListener('click', async () => {
      if (!this.assertHost('manage the invite link')) return;
      if (!this.editId) {
        Eventify.showToast('Save or publish the event first', 'error');
        return;
      }
      if (!confirm('Create a new invite link? The old link will stop working.')) return;
      const result = await EventifyDB.setEventShareToken(this.editId, EventifyDB.makeShareToken());
      if (!result.success) {
        Eventify.showToast(result.message || 'Could not create new link', 'error');
        return;
      }
      this.shareToken = result.share_token;
      this.refreshShareLinkUI();
      Eventify.showToast('New invite link is ready', 'success');
    });

    document.getElementById('btn-refresh-invite-rsvps')?.addEventListener('click', () => this.loadInviteRsvps());
    document.getElementById('btn-export-invite-rsvps')?.addEventListener('click', () => this.exportInviteRsvps());
    document.getElementById('btn-whos-coming')?.addEventListener('click', () => this.showWhosComing());
    document.getElementById('btn-top-whos-coming')?.addEventListener('click', () => this.showWhosComing());
  },

  isHost() {
    if (!Eventify.currentUser) return false;
    if (!this.editId) return true; // creating a new event = you are the host
    if (Eventify.currentUser.role === 'admin') return true;
    return this.organizerId === Eventify.currentUser.id;
  },

  assertHost(action = 'do that') {
    if (this.isHost()) return true;
    Eventify.showToast(`Only the host can ${action}`, 'error');
    return false;
  },

  async showWhosComing() {
    if (!this.assertHost('see who is coming')) return;
    if (!this.editId) {
      Eventify.showToast('Save or publish the event first', 'error');
      return;
    }
    await this.loadInviteRsvps();
    Eventify.showWhosComingModal({
      title: document.getElementById('title')?.value?.trim() || 'Event',
      votes: this.inviteVotes || [],
      initialFilter: 'going',
    });
  },

  syncHostOnlyUI() {
    const host = this.isHost();
    const hostEls = document.querySelectorAll('[data-host-only]');
    hostEls.forEach(el => el.classList.toggle('hidden', !host));
    if (!host) {
      const hint = document.getElementById('share-link-hint');
      if (hint) hint.textContent = 'Only the event host can share the invite link and see who is coming.';
    }
  },

  refreshShareLinkUI() {
    this.syncHostOnlyUI();
    if (!this.isHost()) return;
    const input = document.getElementById('share_invite_url');
    const hint = document.getElementById('share-link-hint');
    const vis = document.getElementById('visibility')?.value
      || document.getElementById('visibility_basic')?.value
      || 'public';
    const privateEvent = vis === 'private';
    const inviteDisabled = privateEvent;

    if (privateEvent) {
      if (input) input.value = '';
      if (hint) {
        hint.textContent = 'Private events are host-only — guests cannot open an invite link. Switch to Invite Only or Public to share.';
      }
    } else if (this.shareToken) {
      const url = EventifyDB.inviteUrl(this.shareToken);
      if (input) input.value = url;
      if (hint) {
        hint.textContent = this.editId
          ? 'Only you (the host) can share this link. Guests cannot see who else replied.'
          : 'Link preview ready. Save or publish so guests can open it.';
      }
    } else {
      if (input) input.value = '';
      if (hint) hint.textContent = 'Save/publish the event first to create the share link.';
    }
    [
      'btn-top-copy-invite',
      'btn-top-whatsapp-invite',
      'btn-top-email-invite',
      'btn-top-whos-coming',
      'btn-copy-invite-link',
      'btn-whatsapp-invite',
      'btn-email-invite',
      'btn-whos-coming',
      'btn-open-invite-page',
      'btn-regenerate-invite',
      'btn-regen-invite-link',
    ].forEach(id => {
      const btn = document.getElementById(id);
      if (!btn) return;
      const keep = id.includes('whos-coming');
      btn.disabled = inviteDisabled && !keep;
      btn.title = (inviteDisabled && !keep)
        ? 'Switch visibility to Invite Only or Public to share'
        : (btn.getAttribute('aria-label') || btn.title || '');
    });
  },

  exportInviteRsvps() {
    const title = document.getElementById('title')?.value?.trim() || 'event';
    if (!this.inviteVotes?.length) {
      Eventify.showToast('No RSVP responses to export yet', 'error');
      return;
    }
    Eventify.exportInviteRsvpsCsv(this.inviteVotes, title);
  },

  async loadInviteRsvps() {
    const list = document.getElementById('invite-rsvp-list');
    if (!list) return;
    if (!this.editId) {
      this.inviteVotes = [];
      list.innerHTML = '<p class="note-chip-hint">Publish the event and share the invite link to collect votes.</p>';
      ['ir-going', 'ir-maybe', 'ir-not', 'ir-total'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = '0';
      });
      return;
    }

    const data = await EventifyDB.getOrganizerInviteRsvps(this.editId);
    this.inviteVotes = data.votes || [];
    const counts = data.counts || {};
    document.getElementById('ir-going').textContent = counts.going || 0;
    document.getElementById('ir-maybe').textContent = counts.maybe || 0;
    document.getElementById('ir-not').textContent = counts.not_going || 0;
    document.getElementById('ir-total').textContent = counts.total || 0;

    if (!data.success) {
      list.innerHTML = `<p class="note-chip-hint">${this.escape(data.message || 'Could not load responses. Run database/share-invite-rsvp.sql in Supabase.')}</p>`;
      return;
    }

    const votes = this.inviteVotes;
    if (!votes.length) {
      list.innerHTML = '<p class="note-chip-hint">No votes yet. Share your invite link from the Invitations tab.</p>';
      return;
    }

    const labels = { going: "Coming", maybe: 'Maybe', not_going: 'Not coming' };
    list.innerHTML = votes.map(v => `
      <div class="invite-rsvp-row status-${this.escape(v.status)}">
        <div>
          <strong>${this.escape(v.guest_name || 'Guest')}</strong>
          ${v.guest_email ? `<span class="muted"> · ${this.escape(v.guest_email)}</span>` : ''}
        </div>
        <span class="invite-rsvp-status">${labels[v.status] || v.status}</span>
      </div>
    `).join('');
  },

  renderAll() {
    this.renderChecklist();
    this.renderGuests();
    this.renderBudget();
    this.renderVendors();
    this.renderTickets();
    this.renderStages();
    this.renderFestivalVendors();
    this.renderSchedule();
    this.renderDocuments();
    this.renderBoard();
    this.renderReminders();
    this.renderMood();
    this.renderSeating();
    this.renderTeam();
    this.renderChat();
    this.renderMenu();
    this.renderPlaylist();
    this.renderGuestPhotos();
    this.renderGifts();
    this.renderFeedback();
    this.refreshAnalytics();
    this.syncFestivalPlanningUI();
  },

  renderChecklist() {
    const list = document.getElementById('checklist-list');
    if (!list) return;
    list.innerHTML = this.state.checklist.map(item => `
      <div class="dynamic-row task-row" data-id="${item.id}">
        <input type="text" data-field="title" value="${this.escape(item.title)}" placeholder="Task">
        <select data-field="priority">
          <option value="low" ${item.priority === 'low' ? 'selected' : ''}>Low</option>
          <option value="medium" ${item.priority === 'medium' ? 'selected' : ''}>Medium</option>
          <option value="high" ${item.priority === 'high' ? 'selected' : ''}>High</option>
        </select>
        <input type="date" data-field="due" value="${this.escape(item.due || '')}">
        <label title="Done"><input type="checkbox" data-field="done" ${item.done ? 'checked' : ''}></label>
        <button type="button" class="icon-btn" data-remove>×</button>
      </div>
    `).join('') || '<p class="empty-state">No checklist items yet.</p>';

    list.querySelectorAll('.task-row').forEach(row => {
      const id = row.dataset.id;
      const item = this.state.checklist.find(c => c.id === id);
      row.querySelectorAll('[data-field]').forEach(el => {
        el.addEventListener('change', () => {
          const field = el.dataset.field;
          item[field] = el.type === 'checkbox' ? el.checked : el.value;
          if (field === 'done') item.boardStatus = item.done ? 'done' : (item.boardStatus === 'done' ? 'todo' : item.boardStatus);
          this.updateChecklistProgress();
          this.renderBoard();
        });
        if (el.tagName === 'INPUT' && el.type === 'text') {
          el.addEventListener('input', () => {
            item.title = el.value;
            this.renderBoard();
          });
        }
      });
      row.querySelector('[data-remove]')?.addEventListener('click', () => {
        this.state.checklist = this.state.checklist.filter(c => c.id !== id);
        this.renderChecklist();
        this.renderBoard();
      });
    });
    this.updateChecklistProgress();
  },

  updateChecklistProgress() {
    const total = this.state.checklist.length;
    const done = this.state.checklist.filter(c => c.done || c.boardStatus === 'done').length;
    const pct = total ? Math.round((done / total) * 100) : 0;
    const bar = document.getElementById('checklist-progress-bar');
    const label = document.getElementById('checklist-progress-label');
    if (bar) bar.style.width = `${pct}%`;
    if (label) label.textContent = `${done}/${total} · ${pct}%`;
  },

  renderGuests() {
    const list = document.getElementById('guest-list');
    list.innerHTML = this.state.guests.map(g => `
      <div class="dynamic-row guest-row" data-id="${g.id}">
        <input type="text" data-field="name" value="${this.escape(g.name)}" placeholder="Name">
        <input type="email" data-field="email" value="${this.escape(g.email)}" placeholder="Email">
        <select data-field="status">
          <option value="pending" ${g.status === 'pending' ? 'selected' : ''}>Pending</option>
          <option value="confirmed" ${g.status === 'confirmed' ? 'selected' : ''}>Confirmed</option>
          <option value="declined" ${g.status === 'declined' ? 'selected' : ''}>Declined</option>
        </select>
        <label>VIP <input type="checkbox" data-field="vip" ${g.vip ? 'checked' : ''}></label>
        <label>+1 <input type="checkbox" data-field="plusOne" ${g.plusOne ? 'checked' : ''}></label>
        <span class="qr-code" title="Ticket / QR code">${this.escape(g.ticketCode)}</span>
        <button type="button" class="icon-btn" data-remove>×</button>
      </div>
    `).join('') || '<p class="empty-state">No guests yet. Add people to track RSVPs.</p>';

    list.querySelectorAll('.guest-row').forEach(row => {
      const id = row.dataset.id;
      const g = this.state.guests.find(x => x.id === id);
      row.querySelectorAll('[data-field]').forEach(el => {
        el.addEventListener('change', () => {
          g[el.dataset.field] = el.type === 'checkbox' ? el.checked : el.value;
          this.updateGuestStats();
          this.refreshAnalytics();
        });
        if (el.type === 'text' || el.type === 'email') {
          el.addEventListener('input', () => { g[el.dataset.field] = el.value; });
        }
      });
      row.querySelector('[data-remove]')?.addEventListener('click', () => {
        this.state.guests = this.state.guests.filter(x => x.id !== id);
        this.renderGuests();
        this.renderBasicsGuestPreview();
      });
    });
    this.updateGuestStats();
    this.renderBasicsGuestPreview();
  },

  updateGuestStats() {
    const t = this.state.guests.length;
    const c = this.state.guests.filter(g => g.status === 'confirmed').length;
    const p = this.state.guests.filter(g => g.status === 'pending').length;
    const d = this.state.guests.filter(g => g.status === 'declined').length;
    document.getElementById('gs-total').textContent = t;
    document.getElementById('gs-confirmed').textContent = c;
    document.getElementById('gs-pending').textContent = p;
    document.getElementById('gs-declined').textContent = d;
  },

  renderBudget() {
    const list = document.getElementById('budget-list');
    const categories = ['Venue', 'Food', 'Decorations', 'Music', 'Staff', 'Marketing', 'Equipment', 'Photography', 'Miscellaneous'];
    list.innerHTML = this.state.budgetLines.map(line => `
      <div class="dynamic-row budget-row" data-id="${line.id}">
        <select data-field="category">
          ${categories.map(c => `<option value="${c}" ${line.category === c ? 'selected' : ''}>${c}</option>`).join('')}
        </select>
        <input type="number" data-field="estimated" min="0" step="0.01" value="${line.estimated}" placeholder="Estimated">
        <input type="number" data-field="actual" min="0" step="0.01" value="${line.actual}" placeholder="Actual">
        <input type="text" data-field="notes" value="${this.escape(line.notes)}" placeholder="Notes">
        <button type="button" class="icon-btn" data-remove>×</button>
      </div>
    `).join('');

    list.querySelectorAll('.budget-row').forEach(row => {
      const id = row.dataset.id;
      const line = this.state.budgetLines.find(x => x.id === id);
      row.querySelectorAll('[data-field]').forEach(el => {
        el.addEventListener('input', () => {
          const f = el.dataset.field;
          line[f] = (f === 'estimated' || f === 'actual') ? (parseFloat(el.value) || 0) : el.value;
          this.updateBudgetTotals();
        });
        el.addEventListener('change', () => {
          const f = el.dataset.field;
          line[f] = (f === 'estimated' || f === 'actual') ? (parseFloat(el.value) || 0) : el.value;
          this.updateBudgetTotals();
        });
      });
      row.querySelector('[data-remove]')?.addEventListener('click', () => {
        this.state.budgetLines = this.state.budgetLines.filter(x => x.id !== id);
        this.renderBudget();
      });
    });
    this.updateBudgetTotals();
  },

  updateBudgetTotals() {
    const total = parseFloat(document.getElementById('total_budget')?.value) || 0;
    const spent = this.state.budgetLines.reduce((s, l) => s + (parseFloat(l.actual) || 0), 0);
    const remaining = total - spent;
    const pct = total > 0 ? Math.min(100, Math.round((spent / total) * 100)) : 0;
    document.getElementById('budget-spent').textContent = `$${spent.toFixed(2)}`;
    document.getElementById('budget-remaining').textContent = `$${remaining.toFixed(2)}`;
    document.getElementById('budget-pct').textContent = `${pct}%`;
    document.getElementById('budget-bar').style.width = `${pct}%`;
    this.refreshAnalytics();
  },

  renderVendors() {
    const types = ['Caterer', 'DJ', 'Band', 'Photographer', 'Videographer', 'Florist', 'Decorator', 'Security', 'Cleaning Staff', 'Equipment Rental', 'Other'];
    const list = document.getElementById('vendor-list');
    list.innerHTML = this.state.vendors.map(v => `
      <div class="dynamic-row vendor-row" data-id="${v.id}">
        <select data-field="type">${types.map(t => `<option value="${t}" ${v.type === t ? 'selected' : ''}>${t}</option>`).join('')}</select>
        <input type="text" data-field="name" value="${this.escape(v.name)}" placeholder="Business name">
        <input type="text" data-field="contact" value="${this.escape(v.contact)}" placeholder="Phone / email">
        <input type="text" data-field="notes" value="${this.escape(v.notes)}" placeholder="Notes">
        <button type="button" class="icon-btn" data-remove>×</button>
      </div>
    `).join('') || '<p class="empty-state">No vendors saved yet.</p>';

    list.querySelectorAll('.vendor-row').forEach(row => {
      const id = row.dataset.id;
      const v = this.state.vendors.find(x => x.id === id);
      row.querySelectorAll('[data-field]').forEach(el => {
        el.addEventListener('input', () => { v[el.dataset.field] = el.value; });
        el.addEventListener('change', () => { v[el.dataset.field] = el.value; });
      });
      row.querySelector('[data-remove]')?.addEventListener('click', () => {
        this.state.vendors = this.state.vendors.filter(x => x.id !== id);
        this.renderVendors();
      });
    });
  },

  renderSchedule() {
    const list = document.getElementById('schedule-list');
    if (!list) return;
    const festival = this.isFestivalEvent();
    const stageOpts = this.state.stages.length
      ? this.state.stages.map((st) => st.name).filter(Boolean)
      : ['Main Stage', 'Secondary Stage'];

    if (festival) {
      list.innerHTML = this.state.schedule.map((s) => `
        <div class="dynamic-row schedule-row schedule-row--festival" data-id="${s.id}">
          <input type="time" data-field="time" value="${this.escape(s.time || '')}" title="Start time">
          <input type="text" data-field="person" value="${this.escape(s.person || '')}" placeholder="Artist">
          <input type="text" data-field="activity" value="${this.escape(s.activity || '')}" placeholder="Set / slot name">
          <select data-field="stage" aria-label="Stage">
            <option value="">Stage</option>
            ${stageOpts.map((name) => `<option value="${this.escape(name)}" ${s.stage === name ? 'selected' : ''}>${this.escape(name)}</option>`).join('')}
          </select>
          <input type="text" data-field="notes" value="${this.escape(s.notes || '')}" placeholder="Notes">
          <button type="button" class="icon-btn" data-remove>×</button>
        </div>
      `).join('') || '<p class="empty-state">No lineup slots yet. Add a set with time, artist, and stage.</p>';
    } else {
      list.innerHTML = this.state.schedule.map((s) => `
        <div class="dynamic-row schedule-row" data-id="${s.id}">
          <input type="time" data-field="time" value="${this.escape(s.time || '')}">
          <input type="text" data-field="activity" value="${this.escape(s.activity || '')}" placeholder="Activity">
          <input type="text" data-field="person" value="${this.escape(s.person || '')}" placeholder="Responsible">
          <input type="text" data-field="notes" value="${this.escape(s.notes || '')}" placeholder="Notes">
          <button type="button" class="icon-btn" data-remove>×</button>
        </div>
      `).join('') || '<p class="empty-state">No schedule items yet.</p>';
    }

    list.querySelectorAll('.schedule-row').forEach((row) => {
      const id = row.dataset.id;
      const s = this.state.schedule.find((x) => x.id === id);
      row.querySelectorAll('[data-field]').forEach((el) => {
        el.addEventListener('input', () => { s[el.dataset.field] = el.value; });
        el.addEventListener('change', () => { s[el.dataset.field] = el.value; });
      });
      row.querySelector('[data-remove]')?.addEventListener('click', () => {
        this.state.schedule = this.state.schedule.filter((x) => x.id !== id);
        this.renderSchedule();
      });
    });
  },

  renderTickets() {
    const list = document.getElementById('ticket-list');
    if (!list) return;
    list.innerHTML = this.state.tickets.map((t) => `
      <div class="dynamic-row ticket-row" data-id="${t.id}">
        <select data-field="tier">
          <option value="VIP" ${t.tier === 'VIP' ? 'selected' : ''}>VIP</option>
          <option value="Standard" ${t.tier === 'Standard' || !t.tier ? 'selected' : ''}>Standard</option>
          <option value="Early Bird" ${t.tier === 'Early Bird' ? 'selected' : ''}>Early Bird</option>
        </select>
        <input type="number" data-field="price" min="0" step="0.01" value="${Number(t.price) || 0}" placeholder="Price">
        <input type="number" data-field="capacity" min="0" value="${Number(t.capacity) || 0}" placeholder="Capacity">
        <label class="ticket-qr-label" title="QR check-in">
          <input type="checkbox" data-field="qrCheckIn" ${t.qrCheckIn !== false ? 'checked' : ''}> QR check-in
        </label>
        <button type="button" class="icon-btn" data-remove>×</button>
      </div>
    `).join('') || '<p class="empty-state">No ticket tiers yet. Add VIP, Standard, or Early Bird.</p>';

    list.querySelectorAll('.ticket-row').forEach((row) => {
      const id = row.dataset.id;
      const t = this.state.tickets.find((x) => x.id === id);
      row.querySelectorAll('[data-field]').forEach((el) => {
        const sync = () => {
          if (el.type === 'checkbox') t[el.dataset.field] = el.checked;
          else if (el.type === 'number') t[el.dataset.field] = parseFloat(el.value) || 0;
          else t[el.dataset.field] = el.value;
        };
        el.addEventListener('input', sync);
        el.addEventListener('change', sync);
      });
      row.querySelector('[data-remove]')?.addEventListener('click', () => {
        this.state.tickets = this.state.tickets.filter((x) => x.id !== id);
        this.renderTickets();
      });
    });
  },

  renderStages() {
    const list = document.getElementById('stage-list');
    if (!list) return;
    list.innerHTML = this.state.stages.map((st) => `
      <div class="dynamic-row stage-row" data-id="${st.id}">
        <input type="text" data-field="name" value="${this.escape(st.name || '')}" placeholder="Stage name">
        <select data-field="kind">
          <option value="main" ${st.kind === 'main' ? 'selected' : ''}>Main stage</option>
          <option value="secondary" ${st.kind !== 'main' ? 'selected' : ''}>Secondary</option>
        </select>
        <input type="text" data-field="notes" value="${this.escape(st.notes || '')}" placeholder="Notes">
        <button type="button" class="icon-btn" data-remove>×</button>
      </div>
    `).join('') || '<p class="empty-state">No stages yet. Add a main stage to start.</p>';

    list.querySelectorAll('.stage-row').forEach((row) => {
      const id = row.dataset.id;
      const st = this.state.stages.find((x) => x.id === id);
      row.querySelectorAll('[data-field]').forEach((el) => {
        el.addEventListener('input', () => {
          st[el.dataset.field] = el.value;
          if (el.dataset.field === 'name') this.renderSchedule();
        });
        el.addEventListener('change', () => {
          st[el.dataset.field] = el.value;
          if (el.dataset.field === 'name') this.renderSchedule();
        });
      });
      row.querySelector('[data-remove]')?.addEventListener('click', () => {
        this.state.stages = this.state.stages.filter((x) => x.id !== id);
        this.renderStages();
        this.renderSchedule();
      });
    });
  },

  renderFestivalVendors() {
    const list = document.getElementById('festival-vendor-list');
    if (!list) return;
    list.innerHTML = this.state.festivalVendors.map((v) => `
      <div class="dynamic-row festival-vendor-row" data-id="${v.id}">
        <input type="text" data-field="name" value="${this.escape(v.name || '')}" placeholder="Name">
        <select data-field="kind">
          <option value="food" ${v.kind === 'food' ? 'selected' : ''}>Food</option>
          <option value="drink" ${v.kind === 'drink' ? 'selected' : ''}>Drink</option>
          <option value="sponsor" ${v.kind === 'sponsor' ? 'selected' : ''}>Sponsor booth</option>
        </select>
        <input type="text" data-field="booth" value="${this.escape(v.booth || '')}" placeholder="Booth / zone">
        <input type="text" data-field="notes" value="${this.escape(v.notes || '')}" placeholder="Notes">
        <button type="button" class="icon-btn" data-remove>×</button>
      </div>
    `).join('') || '<p class="empty-state">No food, drink, or sponsor booths yet.</p>';

    list.querySelectorAll('.festival-vendor-row').forEach((row) => {
      const id = row.dataset.id;
      const v = this.state.festivalVendors.find((x) => x.id === id);
      row.querySelectorAll('[data-field]').forEach((el) => {
        el.addEventListener('input', () => { v[el.dataset.field] = el.value; });
        el.addEventListener('change', () => { v[el.dataset.field] = el.value; });
      });
      row.querySelector('[data-remove]')?.addEventListener('click', () => {
        this.state.festivalVendors = this.state.festivalVendors.filter((x) => x.id !== id);
        this.renderFestivalVendors();
      });
    });
  },

  collectFestivalPlanning() {
    return {
      theme: document.getElementById('festival_theme')?.value || '',
      expectedAttendance: parseInt(document.getElementById('festival_attendance')?.value, 10) || 0,
      venueLayout: {
        mainStage: !!document.getElementById('layout_main_stage')?.checked,
        foodZone: !!document.getElementById('layout_food_zone')?.checked,
        toilets: !!document.getElementById('layout_toilets')?.checked,
        parking: !!document.getElementById('layout_parking')?.checked,
      },
      artistLineup: document.getElementById('festival_lineup')?.value || '',
      soundLighting: document.getElementById('festival_sound_lighting')?.value || '',
      permitsInsurance: document.getElementById('festival_permits')?.value || '',
      volunteerCoordination: document.getElementById('festival_volunteers')?.value || '',
    };
  },

  collectSecurity() {
    return {
      entryExitPoints: document.getElementById('security_entry_exit')?.value || '',
      staff: document.getElementById('security_staff')?.value || '',
      emergencyContacts: document.getElementById('security_emergency')?.value || '',
      medicalPoint: document.getElementById('security_medical')?.value || '',
      crowdControlNotes: document.getElementById('security_crowd')?.value || '',
    };
  },

  hydrateFestivalPlanning(pd) {
    const f = pd.festival || {};
    const layout = f.venueLayout || {};
    if (document.getElementById('festival_theme')) document.getElementById('festival_theme').value = f.theme || '';
    if (document.getElementById('festival_attendance')) document.getElementById('festival_attendance').value = f.expectedAttendance || '';
    if (document.getElementById('layout_main_stage')) document.getElementById('layout_main_stage').checked = !!layout.mainStage;
    if (document.getElementById('layout_food_zone')) document.getElementById('layout_food_zone').checked = !!layout.foodZone;
    if (document.getElementById('layout_toilets')) document.getElementById('layout_toilets').checked = !!layout.toilets;
    if (document.getElementById('layout_parking')) document.getElementById('layout_parking').checked = !!layout.parking;
    if (document.getElementById('festival_lineup')) document.getElementById('festival_lineup').value = f.artistLineup || '';
    if (document.getElementById('festival_sound_lighting')) document.getElementById('festival_sound_lighting').value = f.soundLighting || '';
    if (document.getElementById('festival_permits')) document.getElementById('festival_permits').value = f.permitsInsurance || '';
    if (document.getElementById('festival_volunteers')) document.getElementById('festival_volunteers').value = f.volunteerCoordination || '';

    const sec = pd.security || {};
    if (document.getElementById('security_entry_exit')) document.getElementById('security_entry_exit').value = sec.entryExitPoints || '';
    if (document.getElementById('security_staff')) document.getElementById('security_staff').value = sec.staff || '';
    if (document.getElementById('security_emergency')) document.getElementById('security_emergency').value = sec.emergencyContacts || '';
    if (document.getElementById('security_medical')) document.getElementById('security_medical').value = sec.medicalPoint || '';
    if (document.getElementById('security_crowd')) document.getElementById('security_crowd').value = sec.crowdControlNotes || '';
  },

  renderDocuments() {
    const list = document.getElementById('document-list');
    list.innerHTML = this.state.documents.map(d => `
      <div class="dynamic-row doc-row" data-id="${d.id}">
        <div>
          <strong>${this.escape(d.name)}</strong>
          <div style="font-size:0.8rem;color:var(--text-light)">${this.escape(d.type || 'file')} · ${d.size ? Math.round(d.size / 1024) + ' KB' : ''}${d.error ? ' · ' + this.escape(d.error) : ''}</div>
        </div>
        ${d.url ? `<a class="btn btn-sm btn-outline" href="${d.url}" target="_blank" rel="noopener">Open</a>` : '<span></span>'}
        <button type="button" class="icon-btn" data-remove>×</button>
      </div>
    `).join('') || '<p class="empty-state">No documents uploaded.</p>';

    list.querySelectorAll('.doc-row').forEach(row => {
      const id = row.dataset.id;
      row.querySelector('[data-remove]')?.addEventListener('click', () => {
        this.state.documents = this.state.documents.filter(d => d.id !== id);
        this.renderDocuments();
      });
    });
  },

  renderBoard() {
    ['todo', 'in_progress', 'done'].forEach(status => {
      const col = document.getElementById(`col-${status}`);
      if (!col) return;
      const items = this.state.checklist.filter(c => (c.boardStatus || (c.done ? 'done' : 'todo')) === status);
      const countEl = document.getElementById(`count-${status}`);
      if (countEl) countEl.textContent = items.length;

      col.innerHTML = items.map(item => `
        <div class="kanban-card" data-id="${item.id}">
          <div class="kanban-card-top">
            <button type="button" class="kanban-drag" draggable="true" title="Drag to move" aria-label="Drag card">⋮⋮</button>
            <button type="button" class="icon-btn kanban-remove" data-remove title="Remove">×</button>
          </div>
          <input type="text" class="kanban-title" data-field="title" value="${this.escape(item.title || '')}" placeholder="Task title">
          <textarea class="kanban-notes" data-field="notes" rows="2" placeholder="Write notes…">${this.escape(item.notes || '')}</textarea>
          <div class="kanban-card-meta">
            <select data-field="priority" aria-label="Priority">
              <option value="low" ${item.priority === 'low' ? 'selected' : ''}>Low</option>
              <option value="medium" ${item.priority === 'medium' || !item.priority ? 'selected' : ''}>Medium</option>
              <option value="high" ${item.priority === 'high' ? 'selected' : ''}>High</option>
            </select>
            <input type="date" data-field="due" value="${this.escape(item.due || '')}" aria-label="Due date">
          </div>
        </div>
      `).join('') || `<p class="kanban-empty">Write a task below</p>`;

      col.querySelectorAll('.kanban-card').forEach(card => {
        const id = card.dataset.id;
        const item = this.state.checklist.find(c => c.id === id);
        if (!item) return;

        const handle = card.querySelector('.kanban-drag');
        handle?.addEventListener('dragstart', (e) => {
          card.classList.add('dragging');
          e.dataTransfer.setData('text/plain', id);
        });
        handle?.addEventListener('dragend', () => card.classList.remove('dragging'));

        card.querySelectorAll('[data-field]').forEach(el => {
          const sync = () => {
            const field = el.dataset.field;
            item[field] = el.value;
            if (field === 'title') this.renderChecklist();
          };
          el.addEventListener('input', sync);
          el.addEventListener('change', sync);
          // Keep typing smooth — don't re-render board on every keystroke
          el.addEventListener('mousedown', (e) => e.stopPropagation());
          el.addEventListener('pointerdown', (e) => e.stopPropagation());
        });

        card.querySelector('[data-remove]')?.addEventListener('click', () => {
          this.state.checklist = this.state.checklist.filter(c => c.id !== id);
          this.renderChecklist();
          this.renderBoard();
        });
      });
    });
  },

  renderReminders() {
    const types = [
      ['task', 'Upcoming task'],
      ['vendor', 'Vendor deadline'],
      ['rsvp', 'Guest RSVP deadline'],
      ['payment', 'Payment deadline'],
      ['countdown', 'Event countdown'],
    ];
    const list = document.getElementById('reminder-list');
    list.innerHTML = this.state.reminders.map(r => `
      <div class="dynamic-row reminder-row" data-id="${r.id}">
        <select data-field="type">${types.map(([v, l]) => `<option value="${v}" ${r.type === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
        <input type="text" data-field="title" value="${this.escape(r.title)}" placeholder="Reminder">
        <input type="date" data-field="due" value="${this.escape(r.due || '')}">
        <button type="button" class="icon-btn" data-remove>×</button>
      </div>
    `).join('') || '<p class="empty-state">No reminders yet.</p>';

    list.querySelectorAll('.reminder-row').forEach(row => {
      const id = row.dataset.id;
      const r = this.state.reminders.find(x => x.id === id);
      row.querySelectorAll('[data-field]').forEach(el => {
        el.addEventListener('input', () => { r[el.dataset.field] = el.value; });
        el.addEventListener('change', () => { r[el.dataset.field] = el.value; });
      });
      row.querySelector('[data-remove]')?.addEventListener('click', () => {
        this.state.reminders = this.state.reminders.filter(x => x.id !== id);
        this.renderReminders();
      });
    });
  },

  updateCountdown() {
    const date = document.getElementById('date')?.value;
    const time = document.getElementById('time')?.value || '00:00';
    const el = document.getElementById('event-countdown');
    if (!date) { el.textContent = 'Set a start date'; return; }
    const start = new Date(`${date}T${time}`);
    const diff = start - new Date();
    if (Number.isNaN(start.getTime())) { el.textContent = '—'; return; }
    if (diff <= 0) { el.textContent = 'Event started or passed'; return; }
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    el.textContent = `${days}d ${hours}h remaining`;
  },

  refreshAnalytics() {
    const confirmed = this.state.guests.filter(g => g.status === 'confirmed');
    const pending = this.state.guests.filter(g => g.status === 'pending');
    const capacity = parseInt(document.getElementById('capacity')?.value, 10) || 0;
    const price = document.getElementById('is_free')?.checked ? 0 : (parseFloat(document.getElementById('price')?.value) || 0);
    const tickets = confirmed.length;
    const heads = confirmed.reduce((n, g) => n + 1 + (g.plusOne ? 1 : 0), 0);
    const remaining = capacity > 0 ? Math.max(0, capacity - heads) : '∞';
    const revenue = tickets * price;
    const total = parseFloat(document.getElementById('total_budget')?.value) || 0;
    const spent = this.state.budgetLines.reduce((s, l) => s + (parseFloat(l.actual) || 0), 0);
    const pct = total > 0 ? Math.round((spent / total) * 100) : 0;
    const vips = this.state.guests.filter(g => g.vip).length;
    const plusOnes = this.state.guests.filter(g => g.plusOne).length;

    document.getElementById('an-tickets').textContent = tickets;
    document.getElementById('an-capacity').textContent = remaining;
    document.getElementById('an-revenue').textContent = `$${revenue.toFixed(2)}`;
    document.getElementById('an-rsvp-yes').textContent = confirmed.length;
    document.getElementById('an-rsvp-pending').textContent = pending.length;
    document.getElementById('an-budget').textContent = `${pct}%`;
    document.getElementById('an-demo').textContent = this.state.guests.length
      ? `${this.state.guests.length} guests · ${vips} VIP · ${plusOnes} plus-ones · ${heads} estimated headcount`
      : 'Add guests to see VIP / plus-one breakdown.';
    this.refreshHostAnalytics();
  },

  async refreshHostAnalytics() {
    const guestsEl = document.getElementById('analytics-guests');
    const tasksEl = document.getElementById('analytics-tasks');
    const viewsEl = document.getElementById('analytics-views');
    const checkin = document.getElementById('btn-open-checkin');
    if (guestsEl) guestsEl.textContent = String(this.state.guests.length);
    if (tasksEl) {
      const done = this.state.checklist.filter(c => c.done || c.boardStatus === 'done').length;
      tasksEl.textContent = `${done}/${this.state.checklist.length}`;
    }
    if (checkin) {
      checkin.href = this.editId ? `checkin.html?id=${this.editId}` : '#';
      checkin.onclick = (e) => {
        if (!this.editId) {
          e.preventDefault();
          this.showAlert('Save the event first to open check-in.', 'error');
        }
      };
    }
    if (viewsEl && this.editId && typeof EventifyFeatures !== 'undefined') {
      viewsEl.textContent = String(await EventifyFeatures.getViews(this.editId));
    }
  },

  applyEventTemplate() {
    const key = document.getElementById('event-template')?.value;
    if (!key || typeof EventifyFeatures === 'undefined') return;
    const tpl = EventifyFeatures.TEMPLATES[key] || EventifyFeatures.TEMPLATES.Default;
    (tpl.checklist || []).forEach(item => {
      this.state.checklist.push({
        id: this.uid(),
        title: item.title,
        notes: '',
        priority: item.priority || 'medium',
        due: '',
        done: false,
        boardStatus: 'todo',
      });
    });
    if (tpl.budget?.length && !this.state.budgetLines.length) {
      this.state.budgetLines = tpl.budget.map(category => ({
        id: this.uid(),
        category,
        planned: 0,
        actual: 0,
        notes: 'From template',
      }));
    }
    this.renderChecklist();
    this.renderBoard();
    this.renderBudget();
    this.showAlert(`Applied “${key}” starter template.`, 'success');
  },

  exportGuestsCsv() {
    if (typeof EventifyFeatures === 'undefined') return;
    const rows = [['Name', 'Email', 'Status', 'VIP', 'Plus one', 'Notes']];
    this.state.guests.forEach(g => {
      rows.push([g.name || '', g.email || '', g.status || '', g.vip ? 'yes' : 'no', g.plusOne ? 'yes' : 'no', g.notes || '']);
    });
    EventifyFeatures.exportCsv(`guests-${Date.now()}.csv`, rows);
  },

  exportTasksCsv() {
    if (typeof EventifyFeatures === 'undefined') return;
    const rows = [['Title', 'Notes', 'Priority', 'Due', 'Status']];
    this.state.checklist.forEach(c => {
      rows.push([c.title || '', c.notes || '', c.priority || '', c.due || '', c.boardStatus || (c.done ? 'done' : 'todo')]);
    });
    EventifyFeatures.exportCsv(`tasks-${Date.now()}.csv`, rows);
  },

  collectPlanningData(isDraft) {
    return {
      isDraft: !!isDraft,
      planningNotes: document.getElementById('planning_notes').value,
      categoryNotes: document.getElementById('category_notes')?.value || '',
      supplierNotes: document.getElementById('supplier_notes').value,
      importantReminders: document.getElementById('important_reminders').value,
      estimatedExpenses: parseFloat(document.getElementById('est_expenses').value) || 0,
      actualExpenses: parseFloat(document.getElementById('actual_expenses').value) || 0,
      checklist: this.state.checklist,
      guests: this.state.guests,
      budget: {
        total: parseFloat(document.getElementById('total_budget').value) || 0,
        lines: this.state.budgetLines,
      },
      vendors: this.state.vendors,
      schedule: this.state.schedule,
      documents: this.state.documents.map(({ pendingFile, error, ...rest }) => rest),
      reminders: this.state.reminders,
      mood: { images: this.state.moodImages, colors: this.state.moodColors },
      seating: this.state.tables,
      team: this.state.team,
      chat: this.state.chat,
      menu: this.state.menu,
      playlist: this.state.playlist,
      invitations: {
        subject: document.getElementById('invite_subject')?.value || '',
        body: document.getElementById('invite_body')?.value || '',
      },
      guestGallery: {
        allowUploads: document.getElementById('guest_uploads_enabled')?.checked !== false,
        photos: this.state.guestPhotos,
      },
      certificates: {
        title: document.getElementById('cert_title')?.value || '',
        body: document.getElementById('cert_body')?.value || '',
        recipientName: document.getElementById('cert_recipient_name')?.value || '',
        bgColor: document.getElementById('cert_bg_color')?.value || '#ffffff',
        textColor: document.getElementById('cert_text_color')?.value || '#0f172a',
        bodyColor: document.getElementById('cert_body_color')?.value || '#334155',
        nameSize: document.getElementById('cert_name_size')?.value || '28',
        bodySize: document.getElementById('cert_body_size')?.value || '18',
        fontFamily: document.getElementById('cert_font')?.value || 'Georgia, serif',
        files: this.state.certFiles || [],
      },
      weather: {
        isOutdoor: document.getElementById('is_outdoor')?.checked || false,
      },
      gifts: this.state.gifts,
      feedback: {
        enabled: document.getElementById('feedback_enabled')?.checked !== false,
        prompt: document.getElementById('feedback_prompt')?.value || '',
        reviews: this.state.feedback,
      },
      tickets: this.state.tickets,
      stages: this.state.stages,
      festivalVendors: this.state.festivalVendors,
      festival: this.collectFestivalPlanning(),
      security: this.collectSecurity(),
      settings: {
        allowComments: document.getElementById('allow_comments').checked,
        allowSharing: document.getElementById('allow_sharing').checked,
        useGuestList: document.getElementById('use_guest_list')?.checked || false,
        showGiftRegistryOnInvite: document.getElementById('show_gift_registry_on_invite')?.checked !== false,
        guestsCanSeeWhosComing: document.getElementById('guests_can_see_whos_coming')?.checked === true,
        registrationDeadline: document.getElementById('registration_deadline').value,
        cancellationPolicy: document.getElementById('cancellation_policy').value,
        ageRestriction: document.getElementById('age_restriction').value,
        dressCode: document.getElementById('dress_code').value,
        parkingInfo: document.getElementById('parking_info').value,
        accessibilityInfo: document.getElementById('accessibility_info').value,
        collaborators: (document.getElementById('collaborators')?.value || '')
          .split('\n')
          .map(s => s.trim())
          .filter(Boolean),
      },
    };
  },

  getVisibility() {
    const active = document.querySelector('.visibility-btn.active')?.dataset?.visibility;
    if (['public', 'private', 'invite_only'].includes(active)) return active;
    const basic = document.getElementById('visibility_basic')?.value;
    if (['public', 'private', 'invite_only'].includes(basic)) return basic;
    const settings = document.getElementById('visibility')?.value;
    if (['public', 'private', 'invite_only'].includes(settings)) return settings;
    return 'public';
  },

  collectPayload(isDraft) {
    const isFree = document.getElementById('is_free').checked;
    const category = this.getSelectedCategory();
    let time = document.getElementById('time').value || '';
    if (/^\d{2}:\d{2}$/.test(time)) time = `${time}:00`;
    let endTime = document.getElementById('end_time').value || null;
    if (endTime && /^\d{2}:\d{2}$/.test(endTime)) endTime = `${endTime}:00`;
    return {
      title: document.getElementById('title').value.trim(),
      description: document.getElementById('description').value.trim(),
      category,
      date: document.getElementById('date').value,
      time,
      end_date: document.getElementById('end_date').value || document.getElementById('date').value,
      end_time: endTime,
      timezone: document.getElementById('timezone').value,
      location: document.getElementById('location').value.trim(),
      venue_name: document.getElementById('venue_name').value.trim(),
      maps_url: document.getElementById('maps_url').value.trim(),
      capacity: parseInt(document.getElementById('capacity').value, 10) || 0,
      visibility: this.getVisibility(),
      is_free: isFree,
      price: isFree ? 0 : (parseFloat(document.getElementById('price').value) || 0),
      contact_email: document.getElementById('contact_email').value.trim(),
      contact_phone: document.getElementById('contact_phone').value.trim(),
      website: document.getElementById('website').value.trim(),
      gallery: [...this.state.galleryUrls],
      planning_data: this.collectPlanningData(isDraft),
      organizer_id: Eventify.currentUser.id,
      share_token: this.shareToken || EventifyDB.makeShareToken(),
    };
  },

  validate(payload, isDraft) {
    if (isDraft) {
      if (!payload.title) return 'Add at least a title to save a draft.';
      // DATE/TIME columns are NOT NULL — keep existing values or require them
      if (!payload.date || !payload.time) {
        return 'Drafts still need a start date and time (required by the database).';
      }
      return null;
    }
    if (!payload.title || !payload.description || !payload.category || !payload.date || !payload.time || !payload.location) {
      return 'Please complete all required fields in Basics (title, description, category, start date/time, location).';
    }
    if (document.getElementById('category')?.value === 'Custom' && !document.getElementById('custom_category_name')?.value.trim()) {
      return 'Enter your own category name for Add More (Custom), or name your event type.';
    }
    return null;
  },

  showAlert(message, type) {
    const alert = document.getElementById('form-alert');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    alert.classList.remove('hidden');
    alert.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  },

  async save(isDraft) {
    const btn = isDraft ? document.getElementById('btn-save-draft') : document.getElementById('btn-publish');
    if (!btn) return;

    // Re-read edit id from URL / session in case state was lost (cached page, redirect)
    if (!this.editId) {
      const q = new URLSearchParams(window.location.search);
      let raw = q.get('edit') || q.get('id');
      if (!raw) {
        try { raw = sessionStorage.getItem('eventify_edit_id'); } catch (_) { /* ignore */ }
      }
      const n = Number(raw);
      if (Number.isFinite(n) && n > 0) this.editId = String(n);
    }
    // Keep edit id sticky for this session so Update never creates a new event
    if (this.editId) {
      try { sessionStorage.setItem('eventify_edit_id', String(this.editId)); } catch (_) { /* ignore */ }
    }

    const payload = this.collectPayload(isDraft);
    // Always re-read active Public / Private / Invite Only button right before save
    payload.visibility = this.getVisibility();
    const err = this.validate(payload, isDraft);
    if (err) {
      this.showAlert(err, 'error');
      document.querySelector('.planner-tab[data-tab="basics"]')?.click();
      return;
    }

    btn.disabled = true;
    const original = btn.textContent;
    btn.textContent = isDraft ? 'Saving…' : (this.editId ? 'Updating…' : 'Publishing…');

    const imageFile = document.getElementById('image').files[0] || null;
    const galleryFiles = (this.state.galleryPending || []).map(item => item.file).filter(Boolean);
    if (this.removeCoverImage && !imageFile) {
      payload.image = this.DEFAULT_COVER;
      payload.clear_image = true;
    }

    try {
      const data = this.editId
        ? await EventifyDB.updateEvent(this.editId, payload, imageFile, galleryFiles)
        : await EventifyDB.createEvent(payload, imageFile, galleryFiles);

      if (data.success) {
        this.removeCoverImage = false;
        this.state.galleryPending.forEach(item => {
          if (item?.url?.startsWith('blob:')) URL.revokeObjectURL(item.url);
        });
        this.state.galleryPending = [];
        if (Array.isArray(payload.gallery)) {
          this.state.galleryUrls = [...payload.gallery];
        }
        this.renderGalleryPreviews();
        const galleryInput = document.getElementById('gallery');
        if (galleryInput) galleryInput.value = '';

        // Lock UI to what the database actually saved
        if (data.visibility) this.setVisibility(data.visibility);
        if (data.verified?.title) document.getElementById('title').value = data.verified.title;
        if (data.verified?.location) document.getElementById('location').value = data.verified.location;
        this.showAlert(isDraft ? 'Draft saved.' : data.message, 'success');
        Eventify.showToast(data.message, 'success');

        if (data.share_token) this.shareToken = data.share_token;
        else if (!this.shareToken) this.shareToken = payload.share_token;
        this.refreshShareLinkUI();
        const id = data.event_id || this.editId;
        if (this.editId) {
          history.replaceState(null, '', `create-event.html?edit=${this.editId}`);
          this.updatePlannerHeader();
        }
        // Stay on planner for drafts/partial; otherwise open detail after a short pause
        if (!isDraft && id && !data.partial) {
          setTimeout(() => {
            // Hard navigation so the detail page always shows what was just saved
            window.location.replace(`event.html?id=${id}&saved=1&_=${Date.now()}`);
          }, 500);
        } else if (data.event_id && !this.editId) {
          this.editId = String(data.event_id);
          history.replaceState(null, '', `create-event.html?edit=${data.event_id}`);
          this.updatePlannerHeader();
          this.refreshShareLinkUI();
          this.loadInviteRsvps();
        } else if (this.editId) {
          this.loadInviteRsvps();
        }
      } else {
        this.showAlert(data.message || 'Save failed.', 'error');
        Eventify.showToast(data.message || 'Save failed', 'error');
      }
    } catch (e) {
      this.showAlert(e.message || 'Failed to save event.', 'error');
    }

    btn.disabled = false;
    btn.textContent = original;
  },

  hydrateFromEvent(e) {
    document.getElementById('title').value = e.title || '';
    document.getElementById('description').value = e.description || '';
    this.organizerId = e.organizer_id || null;
    this.shareToken = e.share_token || this.shareToken || EventifyDB.makeShareToken();
    this.refreshShareLinkUI();
    this.syncHostOnlyUI();
    const known = CATEGORIES.some(c => c.name === e.category && c.name !== 'Custom');
    if (!known && e.category) {
      document.getElementById('category').value = 'Custom';
      document.getElementById('custom_category_name').value = e.category === 'Custom' ? '' : e.category;
    } else {
      document.getElementById('category').value = normalizeCategoryName(e.category) || e.category || '';
    }
    this.syncCustomCategoryUI();
    document.getElementById('date').value = e.date || '';
    document.getElementById('time').value = (e.time || '').toString().substring(0, 5);
    document.getElementById('end_date').value = e.end_date || '';
    document.getElementById('end_time').value = (e.end_time || '').toString().substring(0, 5);
    document.getElementById('timezone').value = e.timezone || 'UTC';
    document.getElementById('location').value = e.location || '';
    document.getElementById('venue_name').value = e.venue_name || '';
    document.getElementById('maps_url').value = e.maps_url || '';
    document.getElementById('capacity').value = e.capacity || 0;
    this.setVisibility(e.visibility || 'public');
    // Ensure both Basics buttons and Settings select match DB value
    if (document.getElementById('visibility_basic')) {
      document.getElementById('visibility_basic').value = e.visibility || 'public';
    }
    if (document.getElementById('visibility')) {
      document.getElementById('visibility').value = e.visibility || 'public';
    }
    document.getElementById('is_free').checked = e.is_free !== false && !(parseFloat(e.price) > 0);
    document.getElementById('price').value = e.price || 0;
    document.getElementById('price').disabled = document.getElementById('is_free').checked;
    document.getElementById('contact_email').value = e.contact_email || '';
    document.getElementById('contact_phone').value = e.contact_phone || '';
    document.getElementById('website').value = e.website || '';

    this.state.galleryUrls = Array.isArray(e.gallery) ? e.gallery : [];
    this.state.galleryPending = [];
    this.renderGalleryPreviews();
    if (e.image && !this.isDefaultCover(e.image)) {
      this.removeCoverImage = false;
      this.showCoverPreview(e.image);
    } else {
      this.removeCoverImage = false;
      document.getElementById('cover-preview-wrap')?.classList.add('hidden');
    }

    const pd = e.planning_data || {};
    document.getElementById('planning_notes').value = pd.planningNotes || '';
    if (document.getElementById('category_notes')) {
      document.getElementById('category_notes').value = pd.categoryNotes || '';
    }
    document.getElementById('supplier_notes').value = pd.supplierNotes || '';
    document.getElementById('important_reminders').value = pd.importantReminders || '';
    document.getElementById('est_expenses').value = pd.estimatedExpenses || 0;
    document.getElementById('actual_expenses').value = pd.actualExpenses || 0;
    this.state.checklist = pd.checklist || [];
    this.state.guests = pd.guests || [];
    this.state.budgetLines = pd.budget?.lines?.length ? pd.budget.lines : this.state.budgetLines;
    if (!this.state.budgetLines.length) this.seedDefaultBudget();
    document.getElementById('total_budget').value = pd.budget?.total || 0;
    this.state.vendors = pd.vendors || [];
    this.state.schedule = pd.schedule || [];
    this.state.documents = pd.documents || [];
    this.state.reminders = pd.reminders || [];
    this.state.moodImages = pd.mood?.images || [];
    this.state.moodColors = pd.mood?.colors || [];
    this.state.tables = pd.seating || [];
    this.state.team = pd.team || [];
    this.state.chat = pd.chat || [];
    this.state.menu = pd.menu || [];
    this.state.playlist = pd.playlist || [];
    this.state.guestPhotos = pd.guestGallery?.photos || [];
    this.state.gifts = pd.gifts || [];
    this.state.feedback = pd.feedback?.reviews || [];
    this.state.tickets = pd.tickets || [];
    this.state.stages = pd.stages || [];
    this.state.festivalVendors = pd.festivalVendors || [];
    this.hydrateFestivalPlanning(pd);

    if (document.getElementById('invite_subject')) {
      document.getElementById('invite_subject').value = pd.invitations?.subject || '';
      document.getElementById('invite_body').value = pd.invitations?.body || '';
    }
    if (document.getElementById('guest_uploads_enabled')) {
      document.getElementById('guest_uploads_enabled').checked = pd.guestGallery?.allowUploads !== false;
    }
    if (document.getElementById('cert_title')) {
      document.getElementById('cert_title').value = pd.certificates?.title || '';
      document.getElementById('cert_body').value = pd.certificates?.body || '';
    }
    if (document.getElementById('cert_recipient_name')) {
      document.getElementById('cert_recipient_name').value = pd.certificates?.recipientName || '';
    }
    if (document.getElementById('cert_bg_color')) {
      document.getElementById('cert_bg_color').value = pd.certificates?.bgColor || '#ffffff';
    }
    if (document.getElementById('cert_text_color')) {
      document.getElementById('cert_text_color').value = pd.certificates?.textColor || '#0f172a';
    }
    if (document.getElementById('cert_body_color')) {
      document.getElementById('cert_body_color').value = pd.certificates?.bodyColor || '#334155';
    }
    if (document.getElementById('cert_name_size')) {
      document.getElementById('cert_name_size').value = pd.certificates?.nameSize || '28';
    }
    if (document.getElementById('cert_body_size')) {
      document.getElementById('cert_body_size').value = pd.certificates?.bodySize || '18';
    }
    if (document.getElementById('cert_font')) {
      document.getElementById('cert_font').value = pd.certificates?.fontFamily || 'Georgia, serif';
    }
    this.state.certFiles = Array.isArray(pd.certificates?.files) ? pd.certificates.files : [];
    this.renderCertFiles();
    if (document.getElementById('is_outdoor')) {
      document.getElementById('is_outdoor').checked = !!pd.weather?.isOutdoor;
    }
    if (document.getElementById('feedback_enabled')) {
      document.getElementById('feedback_enabled').checked = pd.feedback?.enabled !== false;
      document.getElementById('feedback_prompt').value = pd.feedback?.prompt || '';
    }

    const s = pd.settings || {};
    if (document.getElementById('use_guest_list')) {
      document.getElementById('use_guest_list').checked = s.useGuestList || (pd.guests || []).length > 0;
      this.syncOptionalGuestPanel();
    }
    document.getElementById('allow_comments').checked = s.allowComments !== false;
    document.getElementById('allow_sharing').checked = s.allowSharing !== false;
    if (document.getElementById('show_gift_registry_on_invite')) {
      document.getElementById('show_gift_registry_on_invite').checked = s.showGiftRegistryOnInvite !== false;
    }
    if (document.getElementById('guests_can_see_whos_coming')) {
      document.getElementById('guests_can_see_whos_coming').checked = s.guestsCanSeeWhosComing === true;
    }
    document.getElementById('registration_deadline').value = s.registrationDeadline || '';
    document.getElementById('cancellation_policy').value = s.cancellationPolicy || '';
    document.getElementById('age_restriction').value = s.ageRestriction || '';
    document.getElementById('dress_code').value = s.dressCode || '';
    document.getElementById('parking_info').value = s.parkingInfo || '';
    document.getElementById('accessibility_info').value = s.accessibilityInfo || '';
    if (document.getElementById('collaborators')) {
      document.getElementById('collaborators').value = (s.collaborators || []).join('\n');
    }

    this.renderAll();
    this.refreshAI();
    this.refreshCategoryNoteChips();
    this.updateCountdown();
    this.updatePlannerHeader();
    this.applyCategoryTabFilter();
    this.refreshShareLinkUI();
    this.loadInviteRsvps();
  },

  async loadEvent(id) {
    // Load from `events` (not the view) so planning_data / gallery always come back for edit
    const data = await EventifyDB.getEventForEdit(id);
    if (!data.success) {
      this.showAlert(data.message || 'Could not load event for editing.', 'error');
      this.editId = null;
      return false;
    }
    const hostId = String(data.event.organizer_id || '');
    const me = String(Eventify.currentUser?.id || '');
    if (hostId !== me && Eventify.currentUser?.role !== 'admin') {
      this.showAlert('Not authorized to edit this event.', 'error');
      this.editId = null;
      setTimeout(() => { window.location.href = 'my-events.html'; }, 1500);
      return false;
    }
    this.editId = String(data.event.id);
    this.hydrateFromEvent(data.event);
    // Keep URL canonical so refresh stays in edit mode
    history.replaceState(null, '', `create-event.html?edit=${this.editId}`);
    const synced = await EventifyDB.ensureShareToken(this.editId, data.event.share_token || this.shareToken);
    if (synced.success) {
      this.shareToken = synced.share_token;
      this.refreshShareLinkUI();
    }
    return true;
  },

  bindPremium() {
    document.getElementById('add-mood-image')?.addEventListener('click', () => {
      const url = document.getElementById('mood-url').value.trim();
      if (!url) return;
      this.state.moodImages.push({ id: this.uid(), url });
      document.getElementById('mood-url').value = '';
      this.renderMood();
    });
    document.getElementById('add-mood-color')?.addEventListener('click', () => {
      const c = document.getElementById('mood-color').value;
      if (!this.state.moodColors.includes(c)) this.state.moodColors.push(c);
      this.renderMood();
    });
    document.getElementById('apply-ai-palette')?.addEventListener('click', () => {
      this.applyAIPalette(this.getAIPlan().moodPalette);
    });

    document.getElementById('add-table')?.addEventListener('click', () => {
      const seats = parseInt(document.getElementById('seats-per-table').value, 10) || 8;
      this.state.tables.push({
        id: this.uid(),
        name: `Table ${this.state.tables.length + 1}`,
        seats,
        x: 40 + (this.state.tables.length % 4) * 90,
        y: 40 + Math.floor(this.state.tables.length / 4) * 90,
        assignments: Array(seats).fill(''),
      });
      this.renderSeating();
    });

    document.getElementById('add-team-member')?.addEventListener('click', () => {
      this.addTeamMemberFromForm();
    });
    ['team-new-name', 'team-new-task', 'team-new-contact'].forEach(id => {
      document.getElementById(id)?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.addTeamMemberFromForm();
        }
      });
    });

    document.getElementById('btn-apply-template')?.addEventListener('click', () => this.applyEventTemplate());
    document.getElementById('btn-export-guests')?.addEventListener('click', () => this.exportGuestsCsv());
    document.getElementById('btn-export-tasks')?.addEventListener('click', () => this.exportTasksCsv());
    this.refreshHostAnalytics();

    document.getElementById('chat-send')?.addEventListener('click', () => this.sendChat());
    document.getElementById('chat-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); this.sendChat(); }
    });

    document.getElementById('add-menu-item')?.addEventListener('click', () => {
      this.state.menu.push({ id: this.uid(), name: '', course: 'Main', dietary: 'None', notes: '' });
      this.renderMenu();
    });

    document.getElementById('add-track')?.addEventListener('click', () => {
      this.state.playlist.push({ id: this.uid(), title: '', artist: '', moment: 'General', url: '' });
      this.renderPlaylist();
    });

    document.getElementById('gen-invite-qrs')?.addEventListener('click', () => this.renderInvitePreview());

    document.getElementById('add-guest-photo')?.addEventListener('click', () => {
      const url = document.getElementById('guest-photo-url').value.trim();
      if (!url) return;
      this.state.guestPhotos.push({
        id: this.uid(),
        url,
        by: document.getElementById('guest-photo-by').value.trim() || 'Guest',
      });
      document.getElementById('guest-photo-url').value = '';
      this.renderGuestPhotos();
    });

    document.getElementById('preview-certs')?.addEventListener('click', () => this.renderCertificates());
    ['cert_recipient_name', 'cert_title', 'cert_body', 'cert_bg_color', 'cert_text_color', 'cert_body_color', 'cert_name_size', 'cert_body_size', 'cert_font'].forEach((id) => {
      document.getElementById(id)?.addEventListener('input', () => this.renderCertificates());
      document.getElementById(id)?.addEventListener('change', () => this.renderCertificates());
    });

    const certUpload = document.getElementById('cert-file-upload');
    certUpload?.addEventListener('click', () => document.getElementById('cert_files')?.click());
    document.getElementById('cert_files')?.addEventListener('change', async (e) => {
      const files = [...(e.target.files || [])];
      if (!files.length) return;
      const box = document.getElementById('cert-file-upload');
      if (box) box.querySelector('p').textContent = 'Uploading…';
      for (const file of files) {
        try {
          const meta = await EventifyDB.uploadEventDocument(Eventify.currentUser.id, file);
          this.state.certFiles.push({
            id: this.uid(),
            name: meta.name || file.name,
            type: meta.type || file.type,
            size: meta.size || file.size,
            url: meta.url || '',
            path: meta.path || '',
          });
        } catch (err) {
          this.state.certFiles.push({
            id: this.uid(),
            name: file.name,
            type: file.type,
            size: file.size,
            url: '',
            error: err.message,
          });
          Eventify.showToast(`Certificate "${file.name}": ${err.message}`, 'error');
        }
      }
      if (box) box.querySelector('p').textContent = 'Click to upload certificate PDF or image';
      e.target.value = '';
      this.renderCertFiles();
      Eventify.showToast('Certificate file added', 'success');
    });
    this.renderCertFiles();

    document.getElementById('fetch-weather')?.addEventListener('click', () => this.updateWeatherAdvice());

    document.getElementById('add-gift')?.addEventListener('click', () => {
      this.state.gifts.push({ id: this.uid(), name: '', url: '', price: 0, claimed: false });
      this.renderGifts();
    });
    document.getElementById('apply-gift-tips')?.addEventListener('click', () => {
      const plan = this.getAIPlan();
      const tips = plan.giftRegistryTips || ['Add registry links', 'Include a range of price points', 'Track claimed gifts'];
      const box = document.getElementById('gift-tips-box');
      box.classList.remove('hidden');
      document.getElementById('gift-tips').innerHTML = tips.map(t => `<li>${this.escape(t)}</li>`).join('');
    });

    document.getElementById('add-feedback')?.addEventListener('click', () => {
      this.state.feedback.push({
        id: this.uid(),
        name: 'Guest',
        rating: 5,
        comment: '',
      });
      this.renderFeedback();
    });
  },

  sendChat() {
    const input = document.getElementById('chat-input');
    const text = input?.value.trim();
    if (!text) return;
    this.state.chat.push({
      id: this.uid(),
      author: Eventify.currentUser?.name || 'You',
      text,
      at: new Date().toISOString(),
    });
    input.value = '';
    this.renderChat();
  },

  renderMood() {
    document.getElementById('mood-palette').innerHTML = this.state.moodColors.map((c, i) => `
      <button type="button" class="swatch" style="background:${c}" title="${c}" data-i="${i}"></button>
    `).join('');
    document.getElementById('mood-palette').querySelectorAll('.swatch').forEach(btn => {
      btn.addEventListener('dblclick', () => {
        this.state.moodColors.splice(+btn.dataset.i, 1);
        this.renderMood();
      });
    });
    document.getElementById('mood-images').innerHTML = this.state.moodImages.map(img => `
      <div class="mood-tile" data-id="${img.id}">
        <img src="${this.escape(img.url)}" alt="Mood" onerror="this.style.display='none'">
        <button type="button" class="icon-btn mood-remove" data-id="${img.id}">×</button>
      </div>
    `).join('') || '<p class="empty-state">Add inspiration image URLs.</p>';
    document.getElementById('mood-images').querySelectorAll('.mood-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        this.state.moodImages = this.state.moodImages.filter(m => m.id !== btn.dataset.id);
        this.renderMood();
      });
    });
  },

  renderSeating() {
    const floor = document.getElementById('seating-floor');
    if (!floor) return;
    floor.innerHTML = this.state.tables.map(t => `
      <div class="seat-table" draggable="true" data-id="${t.id}" style="left:${t.x}px;top:${t.y}px;">
        <strong>${this.escape(t.name)}</strong>
        <span>${t.seats} seats</span>
      </div>
    `).join('');

    floor.querySelectorAll('.seat-table').forEach(el => {
      el.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', el.dataset.id);
        el.classList.add('dragging');
      });
      el.addEventListener('dragend', () => el.classList.remove('dragging'));
    });
    floor.ondragover = (e) => e.preventDefault();
    floor.ondrop = (e) => {
      e.preventDefault();
      const id = e.dataTransfer.getData('text/plain');
      const t = this.state.tables.find(x => x.id === id);
      if (!t) return;
      const rect = floor.getBoundingClientRect();
      t.x = Math.max(0, e.clientX - rect.left - 40);
      t.y = Math.max(0, e.clientY - rect.top - 20);
      this.renderSeating();
    };

    const list = document.getElementById('table-list');
    list.innerHTML = this.state.tables.map(t => `
      <div class="dynamic-row" data-id="${t.id}" style="grid-template-columns:1fr 80px 1fr 40px;">
        <input type="text" data-field="name" value="${this.escape(t.name)}" placeholder="Table name">
        <input type="number" data-field="seats" min="2" max="20" value="${t.seats}">
        <input type="text" data-field="guestHint" value="${this.escape((t.assignments || []).filter(Boolean).join(', '))}" placeholder="Assigned guests (comma-separated)">
        <button type="button" class="icon-btn" data-remove>×</button>
      </div>
    `).join('') || '<p class="empty-state">Add tables to start the seating plan.</p>';

    list.querySelectorAll('[data-id]').forEach(row => {
      const t = this.state.tables.find(x => x.id === row.dataset.id);
      row.querySelectorAll('[data-field]').forEach(el => {
        el.addEventListener('change', () => {
          if (el.dataset.field === 'seats') {
            t.seats = parseInt(el.value, 10) || 8;
            t.assignments = Array(t.seats).fill('');
          } else if (el.dataset.field === 'guestHint') {
            t.assignments = el.value.split(',').map(s => s.trim());
          } else {
            t.name = el.value;
          }
          this.renderSeating();
        });
      });
      row.querySelector('[data-remove]')?.addEventListener('click', () => {
        this.state.tables = this.state.tables.filter(x => x.id !== t.id);
        this.renderSeating();
      });
    });
  },

  addTeamMemberFromForm() {
    const nameEl = document.getElementById('team-new-name');
    const roleEl = document.getElementById('team-new-role');
    const taskEl = document.getElementById('team-new-task');
    const contactEl = document.getElementById('team-new-contact');
    const name = (nameEl?.value || '').trim();
    if (!name) {
      this.showAlert('Enter a member name before adding to the list.', 'error');
      nameEl?.focus();
      return;
    }

    this.state.team.push({
      id: this.uid(),
      name,
      role: roleEl?.value || 'volunteer',
      task: (taskEl?.value || '').trim(),
      contact: (contactEl?.value || '').trim(),
    });

    if (nameEl) nameEl.value = '';
    if (taskEl) taskEl.value = '';
    if (contactEl) contactEl.value = '';
    if (roleEl) roleEl.value = 'volunteer';
    this.renderTeam();
    nameEl?.focus();
  },

  renderTeam() {
    const roles = ['organizer', 'staff', 'volunteer', 'coordinator'];
    const list = document.getElementById('team-list');
    if (!list) return;
    list.innerHTML = this.state.team.map(m => `
      <div class="dynamic-row team-row" data-id="${m.id}">
        <input type="text" data-field="name" value="${this.escape(m.name)}" placeholder="Name">
        <select data-field="role">${roles.map(r => `<option value="${r}" ${m.role === r ? 'selected' : ''}>${r}</option>`).join('')}</select>
        <input type="text" data-field="task" value="${this.escape(m.task)}" placeholder="Assigned task">
        <input type="text" data-field="contact" value="${this.escape(m.contact)}" placeholder="Contact">
        <button type="button" class="icon-btn" data-remove title="Remove member">×</button>
      </div>
    `).join('') || '<p class="empty-state">No team members yet. Use “Add Member to List” above.</p>';
    this.bindSimpleList(list, this.state.team, 'team', () => this.renderTeam());
  },

  renderChat() {
    const log = document.getElementById('chat-log');
    if (!log) return;
    log.innerHTML = this.state.chat.map(m => `
      <div class="chat-msg">
        <strong>${this.escape(m.author)}</strong>
        <span class="chat-time">${new Date(m.at).toLocaleString()}</span>
        <p>${this.escape(m.text)}</p>
      </div>
    `).join('') || '<p class="empty-state">No messages yet. Start coordinating with your team.</p>';
    log.scrollTop = log.scrollHeight;
  },

  renderMenu() {
    const courses = ['Appetizer', 'Main', 'Dessert', 'Beverage', 'Other'];
    const diets = ['None', 'Vegetarian', 'Vegan', 'Gluten-free', 'Halal', 'Kosher', 'Nut-free'];
    const list = document.getElementById('menu-list');
    if (!list) return;
    list.innerHTML = this.state.menu.map(m => `
      <div class="dynamic-row" data-id="${m.id}" style="grid-template-columns:1.2fr 110px 120px 1fr 40px;">
        <input type="text" data-field="name" value="${this.escape(m.name)}" placeholder="Dish">
        <select data-field="course">${courses.map(c => `<option value="${c}" ${m.course === c ? 'selected' : ''}>${c}</option>`).join('')}</select>
        <select data-field="dietary">${diets.map(d => `<option value="${d}" ${m.dietary === d ? 'selected' : ''}>${d}</option>`).join('')}</select>
        <input type="text" data-field="notes" value="${this.escape(m.notes)}" placeholder="Notes">
        <button type="button" class="icon-btn" data-remove>×</button>
      </div>
    `).join('') || '<p class="empty-state">No menu items yet.</p>';
    this.bindSimpleList(list, this.state.menu, 'menu', () => this.renderMenu());
  },

  renderPlaylist() {
    const moments = ['General', 'Entrance', 'Ceremony', 'First dance', 'Dinner', 'Party', 'Exit'];
    const list = document.getElementById('playlist-list');
    if (!list) return;
    list.innerHTML = this.state.playlist.map(t => `
      <div class="dynamic-row" data-id="${t.id}" style="grid-template-columns:1fr 1fr 120px 1fr 40px;">
        <input type="text" data-field="title" value="${this.escape(t.title)}" placeholder="Track">
        <input type="text" data-field="artist" value="${this.escape(t.artist)}" placeholder="Artist">
        <select data-field="moment">${moments.map(m => `<option value="${m}" ${t.moment === m ? 'selected' : ''}>${m}</option>`).join('')}</select>
        <input type="url" data-field="url" value="${this.escape(t.url)}" placeholder="Link (optional)">
        <button type="button" class="icon-btn" data-remove>×</button>
      </div>
    `).join('') || '<p class="empty-state">No tracks yet.</p>';
    this.bindSimpleList(list, this.state.playlist, 'playlist', () => this.renderPlaylist());
  },

  renderInvitePreview() {
    const subject = document.getElementById('invite_subject').value || 'You are invited';
    const body = document.getElementById('invite_body').value || '';
    const title = document.getElementById('title').value || 'Event';
    const confirmed = this.state.guests.length ? this.state.guests : [{ name: 'Sample Guest', ticketCode: 'EVT-SAMPLE', email: '' }];
    document.getElementById('invite-preview').innerHTML = confirmed.map(g => `
      <div class="invite-card">
        <h4>${this.escape(subject)}</h4>
        <p><strong>${this.escape(title)}</strong></p>
        <p>${this.escape(body).replace(/\n/g, '<br>')}</p>
        <p>Guest: ${this.escape(g.name || 'Guest')}</p>
        <div class="qr-block">
          <div class="qr-fake">${this.escape(g.ticketCode || 'EVT-CODE')}</div>
          <small>QR / ticket code</small>
        </div>
      </div>
    `).join('');
  },

  renderGuestPhotos() {
    const grid = document.getElementById('guest-photo-grid');
    if (!grid) return;
    grid.innerHTML = this.state.guestPhotos.map(p => `
      <div class="mood-tile" data-id="${p.id}">
        <img src="${this.escape(p.url)}" alt="Guest photo">
        <span class="mood-caption">${this.escape(p.by)}</span>
        <button type="button" class="icon-btn mood-remove" data-id="${p.id}">×</button>
      </div>
    `).join('') || '<p class="empty-state">No guest photos yet.</p>';
    grid.querySelectorAll('.mood-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        this.state.guestPhotos = this.state.guestPhotos.filter(p => p.id !== btn.dataset.id);
        this.renderGuestPhotos();
      });
    });
  },

  renderCertificates() {
    const wrap = document.getElementById('cert-previews');
    if (!wrap) return;

    const title = document.getElementById('cert_title')?.value || 'Certificate of Completion';
    const body = document.getElementById('cert_body')?.value || 'This certifies that [Name] successfully completed the program.';
    const eventTitle = document.getElementById('title')?.value || 'Event';
    const recipient = (document.getElementById('cert_recipient_name')?.value || '').trim();
    const bg = document.getElementById('cert_bg_color')?.value || '#ffffff';
    const textColor = document.getElementById('cert_text_color')?.value || '#0f172a';
    const bodyColor = document.getElementById('cert_body_color')?.value || '#334155';
    const nameSize = document.getElementById('cert_name_size')?.value || '28';
    const bodySize = document.getElementById('cert_body_size')?.value || '18';
    const font = document.getElementById('cert_font')?.value || 'Georgia, serif';
    const dateVal = document.getElementById('date')?.value || '';

    const confirmed = this.state.guests.filter((g) => g.status === 'confirmed' || g.status === 'going');
    let list = [];
    if (recipient) list.push({ name: recipient });
    confirmed.forEach((g) => {
      if (!list.some((x) => (x.name || '').toLowerCase() === (g.name || '').toLowerCase())) {
        list.push({ name: g.name || 'Attendee' });
      }
    });
    if (!list.length) list = [{ name: 'Attendee Name' }];

    wrap.innerHTML = list.map((g) => {
      const person = g.name || 'Attendee';
      const bodyText = body.replace(/\[Name\]/gi, person);
      return `
        <div class="cert-card">
          <div class="cert-inner" style="background:${this.escape(bg)};color:${this.escape(textColor)};font-family:${this.escape(font)};border-color:${this.escape(textColor)};">
            <p class="cert-eyebrow" style="color:${this.escape(bodyColor)};opacity:0.75;">Eventify</p>
            <h3 style="color:${this.escape(bodyColor)};font-family:${this.escape(font)};font-size:${Number(bodySize) + 4}px;">${this.escape(title)}</h3>
            <p class="cert-name" style="color:${this.escape(textColor)};font-family:${this.escape(font)};font-size:${Number(nameSize)}px;">${this.escape(person)}</p>
            <p class="cert-body-text" style="color:${this.escape(bodyColor)};font-family:${this.escape(font)};font-size:${Number(bodySize)}px;">${this.escape(bodyText)}</p>
            <p class="cert-meta" style="color:${this.escape(bodyColor)};opacity:0.7;">${this.escape(eventTitle)} · ${this.escape(dateVal)}</p>
          </div>
        </div>`;
    }).join('');
  },

  renderCertFiles() {
    const list = document.getElementById('cert-file-list');
    if (!list) return;
    list.innerHTML = (this.state.certFiles || []).map((f) => `
      <div class="dynamic-row doc-row" data-id="${f.id}">
        <div>
          <strong>${this.escape(f.name || 'Certificate file')}</strong>
          <div style="font-size:0.8rem;color:var(--text-light)">
            ${this.escape(f.type || 'file')}${f.size ? ` · ${Math.round(f.size / 1024)} KB` : ''}${f.error ? ` · ${this.escape(f.error)}` : ''}
          </div>
        </div>
        ${f.url ? `<a class="btn btn-sm btn-outline" href="${this.escape(f.url)}" target="_blank" rel="noopener">Open</a>` : '<span></span>'}
        <button type="button" class="icon-btn" data-remove>×</button>
      </div>
    `).join('') || '<p class="empty-state">No uploaded certificate files yet.</p>';

    list.querySelectorAll('.doc-row').forEach((row) => {
      row.querySelector('[data-remove]')?.addEventListener('click', () => {
        this.state.certFiles = this.state.certFiles.filter((f) => f.id !== row.dataset.id);
        this.renderCertFiles();
      });
    });
  },

  updateWeatherAdvice() {
    const outdoor = document.getElementById('is_outdoor')?.checked;
    const loc = document.getElementById('location')?.value || 'your location';
    const date = document.getElementById('date')?.value;
    const month = date ? new Date(date + 'T12:00:00').getMonth() : new Date().getMonth();
    const seasonTips = month >= 4 && month <= 8
      ? 'Warmer season — plan shade, hydration, and sunscreen for guests.'
      : 'Cooler season — plan heaters, covered areas, and warm drink stations.';
    document.getElementById('weather-summary').textContent = outdoor
      ? `Outdoor plan for ${loc}${date ? ' on ' + date : ''}`
      : `Indoor / mixed plan for ${loc}`;
    document.getElementById('weather-tips').textContent = outdoor
      ? `${seasonTips} Keep a rain backup venue or tent rental on hold. Check a local forecast 48h before.`
      : 'Primarily indoor — still note travel weather for guests and outdoor photo moments.';
  },

  renderGifts() {
    const list = document.getElementById('gift-list');
    if (!list) return;
    list.innerHTML = this.state.gifts.map(g => `
      <div class="dynamic-row" data-id="${g.id}" style="grid-template-columns:1.2fr 1.2fr 100px 80px 40px;">
        <input type="text" data-field="name" value="${this.escape(g.name)}" placeholder="Gift item">
        <input type="url" data-field="url" value="${this.escape(g.url)}" placeholder="Registry / product URL">
        <input type="number" data-field="price" min="0" step="0.01" value="${g.price || 0}">
        <label>Claimed <input type="checkbox" data-field="claimed" ${g.claimed ? 'checked' : ''}></label>
        <button type="button" class="icon-btn" data-remove>×</button>
      </div>
    `).join('') || '<p class="empty-state">No gift registry items yet.</p>';
    list.querySelectorAll('[data-id]').forEach(row => {
      const item = this.state.gifts.find(x => x.id === row.dataset.id);
      row.querySelectorAll('[data-field]').forEach(el => {
        el.addEventListener('change', () => {
          const f = el.dataset.field;
          item[f] = el.type === 'checkbox' ? el.checked : (f === 'price' ? parseFloat(el.value) || 0 : el.value);
        });
        if (el.type === 'text' || el.type === 'url' || el.type === 'number') {
          el.addEventListener('input', () => {
            const f = el.dataset.field;
            item[f] = f === 'price' ? parseFloat(el.value) || 0 : el.value;
          });
        }
      });
      row.querySelector('[data-remove]')?.addEventListener('click', () => {
        this.state.gifts = this.state.gifts.filter(x => x.id !== item.id);
        this.renderGifts();
      });
    });
  },

  renderFeedback() {
    const list = document.getElementById('feedback-list');
    if (!list) return;
    list.innerHTML = this.state.feedback.map(f => `
      <div class="dynamic-row" data-id="${f.id}" style="grid-template-columns:1fr 80px 1.5fr 40px;">
        <input type="text" data-field="name" value="${this.escape(f.name)}" placeholder="Guest name">
        <input type="number" data-field="rating" min="1" max="5" value="${f.rating || 5}">
        <input type="text" data-field="comment" value="${this.escape(f.comment)}" placeholder="Comment">
        <button type="button" class="icon-btn" data-remove>×</button>
      </div>
    `).join('') || '<p class="empty-state">No feedback logged yet.</p>';
    this.bindSimpleList(list, this.state.feedback, 'feedback', () => this.renderFeedback(), { rating: 'number' });
  },

  bindSimpleList(listEl, arr, _key, rerender, numberFields = {}) {
    listEl.querySelectorAll('[data-id]').forEach(row => {
      const item = arr.find(x => x.id === row.dataset.id);
      if (!item) return;
      row.querySelectorAll('[data-field]').forEach(el => {
        const apply = () => {
          const f = el.dataset.field;
          if (el.type === 'checkbox') item[f] = el.checked;
          else if (numberFields[f] === 'number' || el.type === 'number') item[f] = parseFloat(el.value) || 0;
          else item[f] = el.value;
        };
        el.addEventListener('change', apply);
        el.addEventListener('input', apply);
      });
      row.querySelector('[data-remove]')?.addEventListener('click', () => {
        const idx = arr.findIndex(x => x.id === item.id);
        if (idx >= 0) arr.splice(idx, 1);
        rerender();
      });
    });
  },
};

document.addEventListener('DOMContentLoaded', () => EventPlanner.init());
