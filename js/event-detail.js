/** Event detail sections + photo gallery (keeps event.html lean). */
const EventDetailSections = {
  esc(text) {
    return typeof Eventify !== 'undefined' ? Eventify.escapeHtml(text ?? '') : String(text ?? '');
  },

  section(title, bodyHtml, opts = {}) {
    if (!bodyHtml && !opts.force) return '';
    return `
      <section class="detail-section-card ${opts.className || ''}" id="${opts.id || ''}">
        <div class="detail-section-head">
          <h3>${this.esc(title)}</h3>
          ${opts.actions || ''}
        </div>
        <div class="detail-section-body">${bodyHtml}</div>
      </section>`;
  },

  wants(sections, key) {
    return !sections || sections.includes(key);
  },

  render(event, { isHost = false } = {}) {
    const pd = event.planning_data || {};
    const slug = typeof getCategorySlug === 'function' ? getCategorySlug(event.category) : 'custom';
    const sections = typeof getDetailSectionsForCategory === 'function'
      ? getDetailSectionsForCategory(event.category)
      : null;
    const isFestival = slug === 'festivals';
    const isCharity = slug === 'charity';

    const gallery = Array.isArray(event.gallery) ? event.gallery.filter(Boolean) : [];
    const guestPhotos = (pd.guestGallery?.photos || []).map((p) => p.url).filter(Boolean);
    const allPhotos = [...gallery, ...guestPhotos];

    const schedule = pd.schedule || [];
    const guests = pd.guests || [];
    const gifts = pd.gifts || [];
    const vendors = pd.vendors || [];
    const festivalVendors = pd.festivalVendors || [];
    const tickets = pd.tickets || [];
    const team = pd.team || [];
    const playlist = pd.playlist || [];
    const checklist = pd.checklist || [];
    const docs = pd.documents || [];
    const festival = pd.festival || {};
    const notes = [pd.planningNotes, pd.categoryNotes, pd.importantReminders, festival.artistLineup]
      .filter(Boolean)
      .join('\n\n');

    let html = '<div class="detail-sections" id="detail-sections">';

    if (this.wants(sections, 'overview')) {
      const festivalMeta = isFestival && festival.theme
        ? `<span>🎧 ${this.esc(festival.theme)}</span>`
        : '';
      const attendance = isFestival && festival.expectedAttendance
        ? `<span>👥 ~${Number(festival.expectedAttendance).toLocaleString()} expected</span>`
        : '';
      html += this.section('Overview', `
        <p>${this.esc(event.description || 'No description yet.')}</p>
        <div class="detail-overview-meta">
          <span>📁 ${this.esc(event.category || 'Event')}</span>
          <span>📍 ${this.esc(event.venue_name || event.location || '—')}</span>
          ${event.capacity ? `<span>👥 Capacity ${Number(event.capacity)}</span>` : ''}
          ${festivalMeta}
          ${attendance}
        </div>
        ${isFestival && festival.soundLighting ? `<p class="muted" style="margin-top:8px;"><strong>Sound &amp; lighting:</strong> ${this.esc(festival.soundLighting)}</p>` : ''}
      `, { force: true, id: 'section-overview' });
    }

    if (this.wants(sections, 'schedule')) {
      html += this.section(isFestival ? 'Schedule / Lineup' : 'Schedule',
        schedule.length
          ? `<ul class="detail-list">${schedule.map((s) => `
              <li><strong>${this.esc(s.time || '')}</strong>
              ${isFestival && s.person ? ` — ${this.esc(s.person)}` : ''}
              ${s.activity ? ` — ${this.esc(s.activity)}` : (!isFestival ? ` — ${this.esc(s.title || 'Item')}` : '')}
              ${s.stage ? `<span class="muted"> @ ${this.esc(s.stage)}</span>` : ''}
              ${!isFestival && s.person ? `<span class="muted"> (${this.esc(s.person)})</span>` : ''}
              ${s.notes ? `<div class="muted">${this.esc(s.notes)}</div>` : ''}
              </li>`).join('')}</ul>`
          : (isHost ? '<p class="muted">No schedule yet. Add one in the planner.</p>' : ''),
        { force: isHost || schedule.length > 0, id: 'section-schedule' }
      );
    }

    if (this.wants(sections, 'guests')) {
      html += this.section('Guests',
        guests.length
          ? `<p>${guests.length} guest${guests.length === 1 ? '' : 's'} on the list${isHost ? '' : ' (names private)'}.</p>
             ${isHost ? `<ul class="detail-list">${guests.slice(0, 40).map((g) => `
               <li>${this.esc(g.name || 'Guest')}${g.vip ? ' ★' : ''}${g.status ? ` — ${this.esc(g.status)}` : ''}</li>
             `).join('')}${guests.length > 40 ? `<li class="muted">+${guests.length - 40} more</li>` : ''}</ul>` : ''}`
          : (isHost ? '<p class="muted">No guests yet. Add them in the planner.</p>' : ''),
        { force: isHost || guests.length > 0, id: 'section-guests' }
      );
    }

    if (this.wants(sections, 'rsvp')) {
      html += this.section('RSVP', `
        <div id="detail-rsvp-summary" class="muted">Loading RSVPs…</div>
        ${isHost ? '<button type="button" class="btn btn-sm btn-outline" id="detail-open-rsvps" style="margin-top:8px;">Who\'s coming</button>' : ''}
      `, { force: true, id: 'section-rsvp' });
    }

    if (this.wants(sections, 'tickets')) {
      html += this.section('Tickets',
        tickets.length
          ? `<ul class="detail-list">${tickets.map((t) => `
              <li><strong>${this.esc(t.tier || 'Ticket')}</strong>
                — $${Number(t.price || 0).toLocaleString()}
                ${t.capacity ? ` · cap ${Number(t.capacity)}` : ''}
                ${t.qrCheckIn !== false ? ' · QR check-in' : ''}
              </li>`).join('')}</ul>`
          : (isHost ? '<p class="muted">No ticket tiers yet. Add them in the Tickets tab.</p>' : ''),
        { force: isHost || tickets.length > 0, id: 'section-tickets' }
      );
    }

    if (this.wants(sections, 'gifts') || (isCharity && (gifts.length || isHost))) {
      html += this.section(isCharity ? 'Donations / Gift & Auction' : 'Gift Registry',
        gifts.length
          ? `<ul class="detail-list">${gifts.map((g) => `
              <li>${this.esc(g.name || 'Item')}
                ${g.price ? ` — $${this.esc(g.price)}` : ''}
                ${g.url ? ` <a href="${this.esc(g.url)}" target="_blank" rel="noopener">Link</a>` : ''}
                ${g.claimed ? ' <span class="muted">(claimed)</span>' : ''}
              </li>`).join('')}</ul>`
          : (isHost ? '<p class="muted">No items yet. Add gifts/donations in the planner.</p>' : ''),
        { force: isHost || gifts.length > 0, id: 'section-gifts' }
      );
    }

    if (this.wants(sections, 'vendors') || this.wants(sections, 'sponsors')) {
      const list = isFestival
        ? festivalVendors
        : vendors;
      const title = this.wants(sections, 'sponsors') && !isFestival
        ? (isCharity || slug === 'conferences' ? 'Sponsors' : 'Vendors')
        : (isFestival ? 'Vendors & Booths' : 'Vendors');
      html += this.section(title,
        list.length
          ? `<ul class="detail-list">${list.map((v) => `
              <li><strong>${this.esc(v.name || 'Vendor')}</strong>
              ${v.kind || v.role || v.type ? ` — ${this.esc(v.kind || v.role || v.type)}` : ''}
              ${v.booth ? `<span class="muted"> (${this.esc(v.booth)})</span>` : ''}
              ${v.contact ? `<div class="muted">${this.esc(v.contact)}</div>` : ''}
              </li>`).join('')}</ul>`
          : (isHost ? '<p class="muted">No vendors yet.</p>' : ''),
        { force: isHost || list.length > 0, id: 'section-vendors' }
      );
    }

    if (this.wants(sections, 'team')) {
      html += this.section(isFestival ? 'Team / Volunteers' : 'Team',
        team.length
          ? `<ul class="detail-list">${team.map((m) => `
              <li><strong>${this.esc(m.name || 'Member')}</strong>
              ${m.role ? ` — ${this.esc(m.role)}` : ''}
              ${m.task ? `<div class="muted">${this.esc(m.task)}</div>` : ''}
              </li>`).join('')}</ul>`
          : (isHost ? '<p class="muted">No team members yet.</p>' : ''),
        { force: isHost || team.length > 0, id: 'section-team' }
      );
    }

    if (this.wants(sections, 'playlist')) {
      html += this.section('Playlist',
        playlist.length
          ? `<ul class="detail-list">${playlist.map((t) => `
              <li>${this.esc(t.title || 'Track')}${t.artist ? ` — ${this.esc(t.artist)}` : ''}${t.moment ? ` <span class="muted">(${this.esc(t.moment)})</span>` : ''}</li>
            `).join('')}</ul>`
          : (isHost ? '<p class="muted">No playlist tracks yet.</p>' : ''),
        { force: isHost || playlist.length > 0, id: 'section-playlist' }
      );
    }

    if (this.wants(sections, 'tasks')) {
      const tasks = Array.isArray(checklist) ? checklist : [];
      html += this.section('Tasks',
        tasks.length
          ? `<ul class="detail-list">${tasks.slice(0, 20).map((t) => `
              <li>${t.done || t.status === 'completed' ? '✓ ' : '○ '}${this.esc(t.title || t.text || t.name || 'Task')}</li>
            `).join('')}</ul>`
          : (isHost ? '<p class="muted">No tasks yet.</p>' : ''),
        { force: isHost || tasks.length > 0, id: 'section-tasks' }
      );
    }

    if (this.wants(sections, 'notes')) {
      html += this.section('Notes',
        notes ? `<pre class="detail-notes">${this.esc(notes)}</pre>` : (isHost ? '<p class="muted">No notes yet.</p>' : ''),
        { force: isHost || !!notes, id: 'section-notes' }
      );
    }

    if (this.wants(sections, 'gallery')) {
      const galleryActions = isHost
        ? `<div class="detail-gallery-actions">
             <button type="button" class="btn btn-sm btn-primary" id="btn-add-gallery-pics">Add Pictures</button>
             <input type="file" id="detail-gallery-files" accept="image/*" multiple hidden>
           </div>`
        : '';

      html += this.section('Photo Gallery', `
        ${galleryActions}
        <div class="detail-gallery-grid" id="detail-gallery-grid">
          ${allPhotos.length
            ? allPhotos.map((url, i) => `
                <button type="button" class="detail-gallery-item" data-gallery-index="${i}" data-gallery-url="${this.esc(url)}">
                  <img src="${this.esc(url)}" alt="Event photo ${i + 1}" loading="lazy">
                  ${isHost && gallery.includes(url) ? `<span class="detail-gallery-delete" data-delete-url="${this.esc(url)}" title="Delete">×</span>` : ''}
                </button>`).join('')
            : '<p class="muted">No photos yet.</p>'}
        </div>
      `, { force: true, id: 'section-gallery' });
    }

    if (this.wants(sections, 'files')) {
      html += this.section('Files / Attachments',
        docs.length
          ? `<ul class="detail-list">${docs.map((d) => `
              <li>${d.url ? `<a href="${this.esc(d.url)}" target="_blank" rel="noopener">${this.esc(d.name || 'File')}</a>` : this.esc(d.name || 'File')}</li>
            `).join('')}</ul>`
          : (isHost ? '<p class="muted">No files yet. Upload in the Documents tab.</p>' : ''),
        { force: isHost || docs.length > 0, id: 'section-files' }
      );
    }

    html += `
      <div id="gallery-lightbox" class="gallery-lightbox hidden" role="dialog" aria-modal="true">
        <button type="button" class="gallery-lightbox-close" id="gallery-lightbox-close" aria-label="Close">×</button>
        <img id="gallery-lightbox-img" alt="Preview">
      </div>
    </div>`;

    return html;
  },

  async bind(event, { isHost = false } = {}) {
    const wrap = document.getElementById('detail-sections');
    if (!wrap) return;

    try {
      const votes = await EventifyDB.getOrganizerInviteRsvps?.(event.id);
      const list = votes?.success ? (votes.votes || []) : [];
      const going = votes?.counts?.going ?? list.filter((v) => v.status === 'going').length;
      const maybe = votes?.counts?.maybe ?? list.filter((v) => v.status === 'maybe').length;
      const el = document.getElementById('detail-rsvp-summary');
      if (el) {
        el.textContent = isHost
          ? `${going} going · ${maybe} maybe · ${list.length} total replies`
          : 'RSVP from the sidebar if you have an account.';
      }
      document.getElementById('detail-open-rsvps')?.addEventListener('click', () => {
        Eventify.showWhosComingModal?.({
          title: event.title,
          votes: list,
          initialFilter: 'going',
        });
      });
    } catch (_) {
      const el = document.getElementById('detail-rsvp-summary');
      if (el) el.textContent = 'RSVP info unavailable.';
    }

    if (isHost) {
      document.getElementById('btn-add-gallery-pics')?.addEventListener('click', () => {
        document.getElementById('detail-gallery-files')?.click();
      });
      document.getElementById('detail-gallery-files')?.addEventListener('change', async (e) => {
        const files = [...(e.target.files || [])];
        if (!files.length) return;
        const btn = document.getElementById('btn-add-gallery-pics');
        if (btn) { btn.disabled = true; btn.textContent = 'Uploading…'; }
        const result = await EventifyDB.addEventGalleryImages(event.id, Eventify.currentUser?.id, files);
        if (btn) { btn.disabled = false; btn.textContent = 'Add Pictures'; }
        e.target.value = '';
        Eventify.showToast(result.message, result.success ? 'success' : 'error');
        if (result.success) {
          event.gallery = result.gallery;
          this.refreshGalleryGrid(event, isHost);
        }
      });
    }

    wrap.addEventListener('click', async (e) => {
      const del = e.target.closest('[data-delete-url]');
      if (del && isHost) {
        e.preventDefault();
        e.stopPropagation();
        if (!confirm('Delete this photo?')) return;
        const url = del.dataset.deleteUrl;
        const result = await EventifyDB.removeEventGalleryImage(event.id, url);
        Eventify.showToast(result.message, result.success ? 'success' : 'error');
        if (result.success) {
          event.gallery = result.gallery;
          this.refreshGalleryGrid(event, isHost);
        }
        return;
      }
      const item = e.target.closest('[data-gallery-url]');
      if (item) {
        this.openLightbox(item.dataset.galleryUrl);
      }
    });

    document.getElementById('gallery-lightbox-close')?.addEventListener('click', () => this.closeLightbox());
    document.getElementById('gallery-lightbox')?.addEventListener('click', (e) => {
      if (e.target.id === 'gallery-lightbox') this.closeLightbox();
    });
  },

  refreshGalleryGrid(event, isHost) {
    const grid = document.getElementById('detail-gallery-grid');
    if (!grid) return;
    const pd = event.planning_data || {};
    const gallery = Array.isArray(event.gallery) ? event.gallery.filter(Boolean) : [];
    const guestPhotos = (pd.guestGallery?.photos || []).map((p) => p.url).filter(Boolean);
    const allPhotos = [...gallery, ...guestPhotos];
    grid.innerHTML = allPhotos.length
      ? allPhotos.map((url, i) => `
          <button type="button" class="detail-gallery-item" data-gallery-index="${i}" data-gallery-url="${this.esc(url)}">
            <img src="${this.esc(url)}" alt="Event photo ${i + 1}" loading="lazy">
            ${isHost && gallery.includes(url) ? `<span class="detail-gallery-delete" data-delete-url="${this.esc(url)}" title="Delete">×</span>` : ''}
          </button>`).join('')
      : '<p class="muted">No photos yet.</p>';
  },

  openLightbox(url) {
    const box = document.getElementById('gallery-lightbox');
    const img = document.getElementById('gallery-lightbox-img');
    if (!box || !img) return;
    img.src = url;
    box.classList.remove('hidden');
  },

  closeLightbox() {
    document.getElementById('gallery-lightbox')?.classList.add('hidden');
  },
};
