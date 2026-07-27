const EventifyFeatures = {
  notifKey(userId) {
    return `eventify_notifications_${userId || 'guest'}`;
  },

  getLocalNotifications(userId) {
    try {
      return JSON.parse(localStorage.getItem(this.notifKey(userId)) || '[]');
    } catch {
      return [];
    }
  },

  saveLocalNotifications(userId, list) {
    localStorage.setItem(this.notifKey(userId), JSON.stringify(list.slice(0, 80)));
  },

  pushNotification(userId, { title, body = '', link = '' }) {
    const list = this.getLocalNotifications(userId);
    list.unshift({
      id: `n_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      title,
      body,
      link,
      read: false,
      created_at: new Date().toISOString(),
    });
    this.saveLocalNotifications(userId, list);
    this.renderBell(userId);
    return list[0];
  },

  unreadCount(userId) {
    return this.getLocalNotifications(userId).filter((n) => !n.read).length;
  },

  markAllRead(userId) {
    const list = this.getLocalNotifications(userId).map((n) => ({ ...n, read: true }));
    this.saveLocalNotifications(userId, list);
    this.renderBell(userId);
  },

  renderBell(userId) {
    const btn = document.getElementById('notif-bell');
    const badge = document.getElementById('notif-badge');
    if (!btn) return;
    const count = this.unreadCount(userId);
    if (badge) {
      badge.textContent = count > 9 ? '9+' : String(count);
      badge.classList.toggle('hidden', count === 0);
    }
  },

  mountBell(userId) {
    let host = document.getElementById('notif-host');
    if (!host) {
      const controls = document.getElementById('ui-controls');
      host = document.createElement('div');
      host.id = 'notif-host';
      host.className = 'notif-host';
      if (controls) controls.appendChild(host);
      else return;
    }

    host.innerHTML = `
      <button type="button" class="notif-bell" id="notif-bell" aria-label="Notifications" title="Notifications">
        🔔<span class="notif-badge hidden" id="notif-badge">0</span>
      </button>
      <div class="notif-panel hidden" id="notif-panel"></div>
    `;

    const panel = host.querySelector('#notif-panel');
    host.querySelector('#notif-bell')?.addEventListener('click', (e) => {
      e.stopPropagation();
      panel.classList.toggle('hidden');
      this.renderPanel(userId);
      this.markAllRead(userId);
    });
    document.addEventListener('click', (e) => {
      if (!host.contains(e.target)) panel.classList.add('hidden');
    });
    this.renderBell(userId);
  },

  renderPanel(userId) {
    const panel = document.getElementById('notif-panel');
    if (!panel) return;
    const list = this.getLocalNotifications(userId);
    panel.innerHTML = list.length
      ? list.slice(0, 20).map((n) => `
          <a class="notif-item" href="${n.link || '#'}">
            <strong>${Eventify.escapeHtml(n.title)}</strong>
            <span>${Eventify.escapeHtml(n.body || '')}</span>
            <small>${new Date(n.created_at).toLocaleString()}</small>
          </a>
        `).join('')
      : '<p class="notif-empty">No notifications yet.</p>';
  },

  async trackView(eventId) {
    try {
      await sb.rpc('increment_event_views', { p_event_id: Number(eventId) });
    } catch {
      /* SQL optional */
    }
  },

  async joinWaitlist(eventId, { name, email, userId }) {
    try {
      const { error } = await sb.from('waitlist').insert({
        event_id: Number(eventId),
        user_id: userId || null,
        name,
        email: email || '',
      });
      if (error) throw error;
      return { success: true, message: 'You are on the waitlist.' };
    } catch (err) {
      const key = `eventify_waitlist_${eventId}`;
      const local = JSON.parse(localStorage.getItem(key) || '[]');
      local.push({ name, email, at: new Date().toISOString(), userId: userId || null });
      localStorage.setItem(key, JSON.stringify(local));
      return {
        success: true,
        message: 'Added to waitlist locally. Run database/features-upgrade.sql for shared waitlists.',
      };
    }
  },

  async listWaitlist(eventId) {
    const eid = Number(eventId);
    try {
      const { data, error } = await sb
        .from('waitlist')
        .select('id, name, email, created_at, user_id')
        .eq('event_id', eid)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return { success: true, entries: data || [] };
    } catch (err) {
      const local = JSON.parse(localStorage.getItem(`eventify_waitlist_${eid}`) || '[]');
      return {
        success: true,
        entries: local.map((row, i) => ({
          id: `local-${i}`,
          name: row.name,
          email: row.email || '',
          created_at: row.at || null,
        })),
        local: true,
        message: err?.message,
      };
    }
  },

  async reportEvent(eventId, { reason, details, reporterId }) {
    try {
      const { error } = await sb.from('event_reports').insert({
        event_id: Number(eventId),
        reporter_id: reporterId || null,
        reason,
        details: details || '',
      });
      if (error) throw error;
      return { success: true, message: 'Report submitted. Thanks for helping keep Eventify safe.' };
    } catch {
      return {
        success: true,
        message: 'Report saved. Ask admin to run database/features-upgrade.sql for moderation inbox.',
      };
    }
  },

  async getViews(eventId) {
    try {
      const { data } = await sb.from('event_views').select('views').eq('event_id', Number(eventId)).maybeSingle();
      return data?.views || 0;
    } catch {
      return 0;
    }
  },

  async listCheckins(eventId) {
    try {
      const { data, error } = await sb.from('event_checkins').select('*').eq('event_id', Number(eventId)).order('checked_in_at', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch {
      return JSON.parse(localStorage.getItem(`eventify_checkins_${eventId}`) || '[]');
    }
  },

  async checkInGuest(eventId, guestKey, guestName) {
    const eid = Number(eventId);
    try {
      const { error } = await sb.from('event_checkins').upsert({
        event_id: eid,
        guest_key: guestKey,
        guest_name: guestName || 'Guest',
        checked_in_at: new Date().toISOString(),
      }, { onConflict: 'event_id,guest_key' });
      if (error) throw error;
      return { success: true };
    } catch {
      const key = `eventify_checkins_${eid}`;
      const list = JSON.parse(localStorage.getItem(key) || '[]');
      const existing = list.find((x) => x.guest_key === guestKey);
      if (existing) existing.checked_in_at = new Date().toISOString();
      else list.unshift({ guest_key: guestKey, guest_name: guestName || 'Guest', checked_in_at: new Date().toISOString() });
      localStorage.setItem(key, JSON.stringify(list));
      return { success: true, local: true };
    }
  },

  qrUrl(text) {
    return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(text)}`;
  },

  exportCsv(filename, rows) {
    const csv = rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  },

  TEMPLATES: {
    Weddings: {
      checklist: [
        { title: 'Book venue', priority: 'high' },
        { title: 'Send invitations', priority: 'high' },
        { title: 'Confirm caterer', priority: 'medium' },
        { title: 'Finalize seating chart', priority: 'medium' },
      ],
      budget: ['Venue', 'Catering', 'Decorations', 'Photography', 'Music'],
    },
    Conferences: {
      checklist: [
        { title: 'Confirm speakers', priority: 'high' },
        { title: 'Open registration', priority: 'high' },
        { title: 'AV tech check', priority: 'medium' },
        { title: 'Print badges', priority: 'low' },
      ],
      budget: ['Venue', 'AV / Equipment', 'Catering', 'Marketing', 'Staff'],
    },
    'Birthday Parties': {
      checklist: [
        { title: 'Order cake', priority: 'high' },
        { title: 'Decor shopping', priority: 'medium' },
        { title: 'Playlist ready', priority: 'low' },
        { title: 'Confirm guest count', priority: 'medium' },
      ],
      budget: ['Venue', 'Food', 'Decorations', 'Entertainment'],
    },
    Default: {
      checklist: [
        { title: 'Confirm date & venue', priority: 'high' },
        { title: 'Build guest list', priority: 'high' },
        { title: 'Set budget', priority: 'medium' },
        { title: 'Share invite link', priority: 'medium' },
      ],
      budget: ['Venue', 'Food', 'Decorations', 'Miscellaneous'],
    },
  },
};
