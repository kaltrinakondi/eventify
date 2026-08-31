/** Event detail scroll-down cards — overview, guests, RSVP, gift registry only. */
const EventDetailSections = {
  DETAIL_SECTIONS: ['overview', 'guests', 'rsvp', 'gifts'],

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
    const allowed = Array.isArray(sections) && sections.length ? sections : this.DETAIL_SECTIONS;
    return allowed.includes(key);
  },

  render(event, { isHost = false } = {}) {
    const pd = event.planning_data || {};
    const slug = typeof getCategorySlug === 'function' ? getCategorySlug(event.category) : 'custom';
    const sections = typeof getDetailSectionsForCategory === 'function'
      ? getDetailSectionsForCategory(event.category)
      : this.DETAIL_SECTIONS;
    const isFestival = slug === 'festivals';
    const isCharity = slug === 'charity';

    const guests = pd.guests || [];
    const gifts = pd.gifts || [];
    const festival = pd.festival || {};

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

    if (this.wants(sections, 'guests')) {
      html += this.section('Guests',
        guests.length
          ? `<p>${guests.length} guest${guests.length === 1 ? '' : 's'} on the list${isHost ? '' : ' (names private)'}.</p>
             ${isHost ? `<ul class="detail-list">${guests.slice(0, 40).map((g) => `
               <li>${this.esc(g.name || 'Guest')}${g.vip ? ' ★' : ''}${g.status ? ` — ${this.esc(g.status)}` : ''}</li>
             `).join('')}${guests.length > 40 ? `<li class="muted">+${guests.length - 40} more</li>` : ''}</ul>` : ''}`
          : (isHost ? '<p class="muted">No guests yet. Add them in the planner.</p>' : ''),
        { force: true, id: 'section-guests' }
      );
    }

    if (this.wants(sections, 'rsvp')) {
      html += this.section('RSVP', `
        <div id="detail-rsvp-summary" class="muted">Loading RSVPs…</div>
        ${isHost ? '<button type="button" class="btn btn-sm btn-outline" id="detail-open-rsvps" style="margin-top:8px;">Who\'s coming</button>' : ''}
      `, { force: true, id: 'section-rsvp' });
    }

    if (this.wants(sections, 'gifts')) {
      html += this.section(isCharity ? 'Donations / Gift & Auction' : 'Gift Registry',
        gifts.length
          ? `<ul class="detail-list">${gifts.map((g) => `
              <li>${this.esc(g.name || 'Item')}
                ${g.price ? ` — $${this.esc(g.price)}` : ''}
                ${g.url ? ` <a href="${this.esc(g.url)}" target="_blank" rel="noopener">Link</a>` : ''}
                ${g.claimed ? ' <span class="muted">(claimed)</span>' : ''}
              </li>`).join('')}</ul>`
          : (isHost ? '<p class="muted">No items yet. Add gifts/donations in the planner.</p>' : ''),
        { force: true, id: 'section-gifts' }
      );
    }

    html += '</div>';
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
  },
};
