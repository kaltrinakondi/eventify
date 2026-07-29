// Named `sb` (not `supabase`) to avoid colliding with the `window.supabase`
// global exposed by the supabase-js UMD bundle — declaring a global
// `const/let supabase` alongside that would throw a SyntaxError and silently
// break this entire file.
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

const EventifyDB = {
  async getProfile(userId) {
    const { data, error } = await sb
      .from('profiles')
      .select('id, name, email, bio, phone, avatar_url, role, created_at')
      .eq('id', userId)
      .single();
    if (error) return null;
    return data;
  },

  async ensureProfile(user) {
    if (!user?.id) return null;
    let profile = await this.getProfile(user.id);
    if (profile) return profile;

    const name = user.user_metadata?.name
      || (user.email ? String(user.email).split('@')[0] : 'User');
    const { data, error } = await sb
      .from('profiles')
      .upsert({
        id: user.id,
        name,
        email: user.email || '',
        role: 'user',
      }, { onConflict: 'id' })
      .select('id, name, email, bio, phone, avatar_url, role, created_at')
      .single();

    if (error) return null;
    return data;
  },

  async getSessionUser() {
    const { data: { session } } = await sb.auth.getSession();
    if (!session?.user) return null;
    const profile = await this.ensureProfile(session.user);
    if (!profile) {
      // Broken session (token present, no profile / no insert policy) — clear to avoid login loops
      await sb.auth.signOut();
      return null;
    }
    return { ...profile, email: session.user.email };
  },

  async login(email, password) {
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) return { success: false, message: error.message };
    const user = await this.getSessionUser();
    return { success: true, message: 'Welcome back!', user };
  },

  async register(name, email, password) {
    const { data, error } = await sb.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    if (error) return { success: false, message: error.message };
    if (!data.session) {
      return { success: true, message: 'Account created! Check your email to confirm, then sign in.', user: null };
    }
    const user = await this.getSessionUser();
    return { success: true, message: 'Account created successfully!', user };
  },

  async logout() {
    await sb.auth.signOut();
    return { success: true };
  },

  async resetPassword(email) {
    const { error } = await sb.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password.html`,
    });
    if (error) return { success: false, message: error.message };
    return { success: true, message: 'Password reset link sent! Check your email.' };
  },

  async updatePassword(newPassword) {
    const { error } = await sb.auth.updateUser({ password: newPassword });
    if (error) return { success: false, message: error.message };
    return { success: true, message: 'Password updated successfully!' };
  },

  async updateProfile(userId, updates) {
    const { error } = await sb.from('profiles').update(updates).eq('id', userId);
    if (error) return { success: false, message: error.message };
    return { success: true, message: 'Profile updated successfully!' };
  },

  mapEvent(row) {
    if (!row) return row;
    return { ...row, organizer_name: row.organizer_name || row.profiles?.name };
  },

  makeShareToken() {
    const bytes = new Uint8Array(12);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  },

  inviteUrl(token) {
    if (!token) return '';
    const path = `invite.html?t=${encodeURIComponent(String(token).trim())}`;
    try {
      return new URL(path, window.location.href).href;
    } catch (_) {
      const parts = (window.location.pathname || '/').split('/');
      parts[parts.length - 1] = path;
      return `${window.location.origin}${parts.join('/')}`;
    }
  },

  openInvitePage(tokenOrUrl) {
    const url = !tokenOrUrl
      ? ''
      : (String(tokenOrUrl).includes('invite.html')
        ? tokenOrUrl
        : this.inviteUrl(tokenOrUrl));
    if (!url) return false;
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    a.remove();
    return true;
  },

  canViewEvent(event, userId, userEmail) {
    const vis = event.visibility || 'public';
    if (vis === 'public') return true;
    // Host + admin can always view (admin for support tooling)
    if (userId && event.organizer_id === userId) return true;
    if (typeof Eventify !== 'undefined' && Eventify.currentUser?.role === 'admin' && userId) return true;
    // Private: host only
    if (vis === 'private') return false;
    // Invite-only: guest list by email
    const guests = event.planning_data?.guests || [];
    const email = (userEmail || '').toLowerCase();
    if (!email) return false;
    return guests.some(g => (g.email || '').toLowerCase() === email);
  },

  async fetchEvents(params = {}) {
    if (params.id) {
      const eid = Number(params.id) || params.id;
      let event = null;
      let error = null;

      // Prefer base `events` table so visibility / planning columns are never missing
      // (events_with_stats may be stale if the view wasn't recreated after upgrades).
      ({ data: event, error } = await sb
        .from('events')
        .select('*')
        .eq('id', eid)
        .maybeSingle());

      if (!event && !error) {
        ({ data: event, error } = await sb
          .from('events_with_stats')
          .select('*')
          .eq('id', eid)
          .maybeSingle());
      } else if (event) {
        // Enrich with stats when available
        const { data: stats } = await sb
          .from('events_with_stats')
          .select('organizer_name, organizer_email, rsvp_count, maybe_count, avg_rating, review_count')
          .eq('id', eid)
          .maybeSingle();
        if (stats) {
          event = {
            ...event,
            organizer_name: stats.organizer_name || event.organizer_name,
            organizer_email: stats.organizer_email || event.organizer_email,
            rsvp_count: stats.rsvp_count,
            maybe_count: stats.maybe_count,
            avg_rating: stats.avg_rating,
            review_count: stats.review_count,
          };
        }
      }

      if (error || !event) {
        return {
          success: false,
          restricted: true,
          message: 'This event is private or was not found. Only the host can view private events.',
        };
      }

      const mapped = this.mapEvent(event);
      // Normalize visibility for older rows
      mapped.visibility = mapped.visibility || 'public';

      // Prefer values just saved (avoids stale replica / cache right after Update)
      try {
        const raw = sessionStorage.getItem('eventify_just_saved');
        if (raw) {
          const stash = JSON.parse(raw);
          if (stash && Number(stash.id) === Number(eid) && (Date.now() - (stash.at || 0)) < 120000) {
            ['title', 'description', 'category', 'date', 'time', 'location', 'visibility', 'price', 'image', 'share_token']
              .forEach((k) => {
                if (stash[k] != null && stash[k] !== '') mapped[k] = stash[k];
              });
            sessionStorage.removeItem('eventify_just_saved');
          }
        }
      } catch (_) { /* ignore */ }

      if (!this.canViewEvent(mapped, params.userId, params.userEmail)) {
        const vis = mapped.visibility || 'public';
        return {
          success: false,
          restricted: true,
          message: vis === 'private'
            ? 'This is a private event. Only the organizer can view it.'
            : 'This event is invite-only. You must be on the guest list to view it.',
        };
      }

      const { data: reviews } = await sb
        .from('reviews')
        .select('id, rating, comment, created_at, profiles(name)')
        .eq('event_id', eid)
        .order('created_at', { ascending: false });

      let userRsvp = null;
      let isFavorite = false;
      if (params.userId) {
        const { data: rsvp } = await sb
          .from('rsvps')
          .select('status')
          .eq('event_id', eid)
          .eq('user_id', params.userId)
          .maybeSingle();
        userRsvp = rsvp?.status || null;

        const { data: fav } = await sb
          .from('favorites')
          .select('id')
          .eq('event_id', eid)
          .eq('user_id', params.userId)
          .maybeSingle();
        isFavorite = !!fav;
      }

      return {
        success: true,
        event: mapped,
        reviews: (reviews || []).map(r => ({ ...r, user_name: r.profiles?.name || 'User' })),
        userRsvp,
        isFavorite,
      };
    }

    let query = sb.from('events_with_stats').select('*');

    if (params.organizer_id) {
      query = query.eq('organizer_id', params.organizer_id);
      // Public profiles only show public events unless explicitly requested by host tooling
      if (!params.include_private) query = query.eq('visibility', 'public');
    } else {
      query = query.eq('visibility', 'public');
    }

    if (params.category && params.category !== 'all') query = query.eq('category', params.category);
    if (params.search) {
      const safe = String(params.search).replace(/[%_,.()]/g, ' ').trim().slice(0, 80);
      if (safe) {
        query = query.or(
          `title.ilike.%${safe}%,description.ilike.%${safe}%,location.ilike.%${safe}%,venue_name.ilike.%${safe}%,category.ilike.%${safe}%`
        );
      }
    }
    if (params.location) {
      const loc = String(params.location).replace(/[%_,.()]/g, ' ').trim().slice(0, 80);
      if (loc) query = query.or(`location.ilike.%${loc}%,venue_name.ilike.%${loc}%`);
    }
    if (params.upcoming) {
      query = query.gte('date', new Date().toISOString().split('T')[0]);
    }
    if (params.date_from) query = query.gte('date', params.date_from);
    if (params.date_to) query = query.lte('date', params.date_to);
    if (params.date) query = query.eq('date', params.date);
    if (params.featured) query = query.gte('date', new Date().toISOString().split('T')[0]);

    const sortMap = {
      date_desc: { column: 'date', ascending: false },
      title_asc: { column: 'title', ascending: true },
      price_asc: { column: 'price', ascending: true },
      price_desc: { column: 'price', ascending: false },
      popular: { column: 'rsvp_count', ascending: false },
      recent: { column: 'created_at', ascending: false },
    };
    const sort = sortMap[params.sort] || { column: 'date', ascending: true };
    query = query.order(sort.column, { ascending: sort.ascending });
    if (sort.column === 'date') query = query.order('time', { ascending: sort.ascending });
    query = query.limit(Math.min(parseInt(params.limit) || 50, 100));

    const { data, error } = await query;
    if (error) return { success: false, message: error.message, events: [] };

    let favoriteIds = new Set();
    if (params.userId && data?.length) {
      const ids = data.map(e => Number(e.id)).filter(Number.isFinite);
      const { data: favs } = await sb
        .from('favorites')
        .select('event_id')
        .eq('user_id', params.userId)
        .in('event_id', ids);
      favoriteIds = new Set((favs || []).map(f => Number(f.event_id)));
    }

    return {
      success: true,
      events: (data || []).map(e => ({
        ...this.mapEvent(e),
        isFavorite: favoriteIds.has(Number(e.id)),
      })),
    };
  },

  async uploadEventImage(organizerId, file) {
    const path = `${organizerId}/${Date.now()}-${file.name.replace(/[^\w.\-]+/g, '_')}`;
    const { error } = await sb.storage.from('event-images').upload(path, file);
    if (error) throw new Error(error.message);
    return sb.storage.from('event-images').getPublicUrl(path).data.publicUrl;
  },

  async uploadEventDocument(organizerId, file) {
    const path = `${organizerId}/${Date.now()}-${file.name.replace(/[^\w.\-]+/g, '_')}`;
    const { error } = await sb.storage.from('event-documents').upload(path, file);
    if (error) throw new Error(error.message);
    const { data: signed, error: signErr } = await sb.storage
      .from('event-documents')
      .createSignedUrl(path, 60 * 60 * 24 * 7);
    if (signErr) throw new Error(signErr.message);
    return { path, name: file.name, type: file.type, size: file.size, url: signed?.signedUrl || '' };
  },

  buildEventRow(payload, image) {
    return {
      title: payload.title,
      description: payload.description,
      category: payload.category,
      date: payload.date,
      time: payload.time,
      end_date: payload.end_date || payload.date || null,
      end_time: payload.end_time || null,
      timezone: payload.timezone || 'UTC',
      location: payload.location,
      venue_name: payload.venue_name || '',
      maps_url: payload.maps_url || '',
      capacity: payload.capacity || 0,
      visibility: payload.visibility || 'public',
      is_free: !!payload.is_free,
      price: payload.is_free ? 0 : (payload.price || 0),
      contact_email: payload.contact_email || '',
      contact_phone: payload.contact_phone || '',
      website: payload.website || '',
      gallery: payload.gallery || [],
      planning_data: payload.planning_data || {},
      ...(payload.share_token ? { share_token: payload.share_token } : {}),
      ...(image ? { image } : {}),
      ...(payload.organizer_id ? { organizer_id: payload.organizer_id } : {}),
    };
  },

  /** Drop empty strings that break DATE/TIME columns; keep 0/false. */
  sanitizeEventUpdate(row) {
    const out = {};
    for (const [key, value] of Object.entries(row || {})) {
      if (value === undefined) continue;
      if (value === '' && ['date', 'time', 'end_date', 'end_time'].includes(key)) continue;
      out[key] = value;
    }
    return out;
  },

  coreEventUpdate(row) {
    const keys = [
      'title', 'description', 'category', 'date', 'time', 'location',
      'price', 'image', 'is_free', 'visibility',
    ];
    const out = {};
    keys.forEach((k) => {
      if (row[k] !== undefined) out[k] = row[k];
    });
    return out;
  },

  async getEventForEdit(id) {
    const eid = Number(id);
    if (!Number.isFinite(eid) || eid <= 0) {
      return { success: false, message: 'Invalid event.' };
    }

    // Prefer last successful save from this browser (avoids stale DB read after Update)
    let stash = null;
    try {
      const raw = sessionStorage.getItem('eventify_last_edit');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Number(parsed.id) === eid && (Date.now() - (parsed.at || 0)) < 60 * 60 * 1000) {
          stash = parsed;
        }
      }
    } catch (_) { /* ignore */ }

    let data = null;
    let error = null;

    // RPC read when available (same path as save)
    try {
      const rpc = await sb.rpc('get_my_event', { p_id: eid });
      if (!rpc.error && rpc.data) {
        data = typeof rpc.data === 'string' ? JSON.parse(rpc.data) : rpc.data;
      }
    } catch (_) { /* ignore */ }

    if (!data) {
      ({ data, error } = await sb.from('events').select('*').eq('id', eid).maybeSingle());
    }

    // If DB looks behind the stash, retry once
    if (stash && data && (data.title !== stash.title || data.visibility !== stash.visibility || data.location !== stash.location)) {
      await new Promise((r) => setTimeout(r, 450));
      const again = await sb.from('events').select('*').eq('id', eid).maybeSingle();
      if (again.data) data = again.data;
    }

    if (error && !data && !stash) return { success: false, message: error.message };
    if (!data && !stash) return { success: false, message: 'Event not found.' };

    let event = this.mapEvent(data || { id: eid });

    if (stash) {
      const keys = [
        'title', 'description', 'category', 'date', 'time', 'end_date', 'end_time',
        'timezone', 'location', 'venue_name', 'maps_url', 'capacity', 'visibility',
        'is_free', 'price', 'contact_email', 'contact_phone', 'website', 'image',
        'gallery', 'planning_data', 'share_token', 'organizer_id',
      ];
      keys.forEach((k) => {
        if (stash[k] !== undefined && stash[k] !== null && stash[k] !== '') {
          event[k] = stash[k];
        }
      });
      // Empty strings / false still matter for some fields
      if (typeof stash.is_free === 'boolean') event.is_free = stash.is_free;
      if (stash.visibility) event.visibility = stash.visibility;
      if (Array.isArray(stash.gallery)) event.gallery = stash.gallery;
      if (stash.planning_data && typeof stash.planning_data === 'object') {
        event.planning_data = stash.planning_data;
      }
    }

    return { success: true, event };
  },

  async createEvent(payload, imageFile, galleryFiles = []) {
    let image = 'images/default-event.jpg';
    try {
      if (imageFile) image = await this.uploadEventImage(payload.organizer_id, imageFile);
      const gallery = [...(payload.gallery || [])];
      for (const file of galleryFiles) {
        gallery.push(await this.uploadEventImage(payload.organizer_id, file));
      }
      payload.gallery = gallery;
    } catch (err) {
      return { success: false, message: err.message };
    }

    if (!payload.share_token) payload.share_token = this.makeShareToken();
    if (payload.time && /^\d{2}:\d{2}$/.test(payload.time)) {
      payload.time = `${payload.time}:00`;
    }
    if (payload.end_time && /^\d{2}:\d{2}$/.test(payload.end_time)) {
      payload.end_time = `${payload.end_time}:00`;
    }
    payload.visibility = ['public', 'private', 'invite_only'].includes(payload.visibility)
      ? payload.visibility
      : 'public';
    const row = this.buildEventRow(payload, image);
    const { data, error } = await sb.from('events').insert(row).select('id, share_token').single();
    if (error) {
      if (/share_token/i.test(error.message || '')) {
        return {
          success: false,
          message: 'Share links need a database upgrade. Run database/share-invite-rsvp.sql in Supabase, then try again.',
        };
      }
      return { success: false, message: error.message };
    }
    return {
      success: true,
      message: 'Event published successfully!',
      event_id: data.id,
      share_token: data.share_token || payload.share_token,
    };
  },

  async updateEvent(id, payload, imageFile, galleryFiles = []) {
    const eid = Number(id);
    if (!Number.isFinite(eid) || eid <= 0) {
      return { success: false, message: 'Invalid event id.' };
    }

    const { data: authData, error: authErr } = await sb.auth.getUser();
    if (authErr || !authData?.user) {
      return { success: false, message: 'Please log in again, then update the event.' };
    }
    const uid = authData.user.id;

    try {
      if (imageFile) {
        payload.image = await this.uploadEventImage(payload.organizer_id || uid, imageFile);
      } else if (payload.clear_image) {
        payload.image = 'images/default-event.jpg';
      }
      const gallery = [...(payload.gallery || [])];
      for (const file of galleryFiles || []) {
        gallery.push(await this.uploadEventImage(payload.organizer_id || uid, file));
      }
      payload.gallery = gallery;
    } catch (err) {
      return { success: false, message: err.message };
    }

    const visibility = ['public', 'private', 'invite_only'].includes(payload.visibility)
      ? payload.visibility
      : 'public';

    let time = payload.time || '';
    if (/^\d{2}:\d{2}$/.test(time)) time = `${time}:00`;
    let endTime = payload.end_time || null;
    if (endTime && /^\d{2}:\d{2}$/.test(endTime)) endTime = `${endTime}:00`;

    const core = {
      title: payload.title,
      description: payload.description,
      category: payload.category,
      date: payload.date,
      time,
      location: payload.location,
      price: payload.is_free ? 0 : (Number(payload.price) || 0),
      is_free: !!payload.is_free,
      visibility,
    };
    if (payload.image) core.image = payload.image;

    let saved = null;
    let error = null;

    // Preferred path: SECURITY DEFINER RPC (reliable even with tricky RLS)
    {
      const rpcPatch = { ...core };
      const { data: rpcData, error: rpcErr } = await sb.rpc('save_my_event', {
        p_id: eid,
        p_patch: rpcPatch,
      });
      if (!rpcErr && rpcData) {
        saved = typeof rpcData === 'string' ? JSON.parse(rpcData) : rpcData;
      } else if (rpcErr && !/function|schema cache|does not exist|Could not find/i.test(rpcErr.message || '')) {
        error = rpcErr;
      }
      // If function missing → fall through to direct table update
    }

    if (!saved && !error) {
      let rows = null;
      ({ data: rows, error } = await sb
        .from('events')
        .update(core)
        .eq('id', eid)
        .eq('organizer_id', uid)
        .select('id, title, visibility, share_token, location, category, date, time, description, price, image, organizer_id'));

      if (error && /is_free|column|schema cache/i.test(error.message || '')) {
        const fallback = { ...core };
        delete fallback.is_free;
        ({ data: rows, error } = await sb
          .from('events')
          .update(fallback)
          .eq('id', eid)
          .eq('organizer_id', uid)
          .select('id, title, visibility, share_token, location, category, date, time, description, price, image, organizer_id'));
      }

      if (!error && (!rows || !rows.length)) {
        ({ data: rows, error } = await sb
          .from('events')
          .update(core)
          .eq('id', eid)
          .select('id, title, visibility, share_token, location, category, date, time, description, price, image, organizer_id'));
      }
      if (rows?.[0]) saved = rows[0];
    }

    if (error) {
      if (/visibility/i.test(error.message || '')) {
        return {
          success: false,
          message: 'Database visibility policy issue. Run database/fix-event-updates.sql in Supabase.',
        };
      }
      if (/invalid input syntax for type (date|time)/i.test(error.message || '')) {
        return { success: false, message: 'Check date and time fields.' };
      }
      return { success: false, message: error.message };
    }

    if (!saved) {
      return {
        success: false,
        message: 'Update blocked by database. Run database/fix-event-updates.sql in Supabase, then try again.',
      };
    }

    if (saved.title !== core.title || saved.visibility !== visibility) {
      return {
        success: false,
        message: 'Database did not keep the new values. Run database/fix-event-updates.sql in Supabase.',
        event_id: saved.id,
        visibility: saved.visibility,
      };
    }

    // Extended planner fields (never overwrite visibility/title)
    const extended = this.sanitizeEventUpdate({
      end_date: payload.end_date || payload.date || null,
      end_time: endTime,
      timezone: payload.timezone || 'UTC',
      venue_name: payload.venue_name || '',
      maps_url: payload.maps_url || '',
      capacity: payload.capacity || 0,
      contact_email: payload.contact_email || '',
      contact_phone: payload.contact_phone || '',
      website: payload.website || '',
      gallery: payload.gallery || [],
      planning_data: payload.planning_data || {},
      ...(payload.share_token ? { share_token: payload.share_token } : {}),
    });
    delete extended.visibility;
    delete extended.title;

    let partial = false;
    let partialMsg = '';
    if (Object.keys(extended).length) {
      const { error: extErr } = await sb.from('events').update(extended).eq('id', eid);
      if (extErr && !/column|schema cache/i.test(extErr.message || '')) {
        partial = true;
        partialMsg = ` Basics saved, but some planner fields failed: ${extErr.message}`;
      }
    }

    const visMsg = {
      private: 'Event updated — Private (only you can see it).',
      invite_only: 'Event updated — Invite Only.',
      public: 'Event updated — Public.',
    };

    // So Edit + detail pages show the new values immediately (no stale read)
    try {
      const snapshot = {
        ...payload,
        ...saved,
        id: saved.id,
        title: saved.title,
        visibility: saved.visibility,
        location: saved.location ?? payload.location,
        category: saved.category ?? payload.category,
        date: saved.date ?? payload.date,
        time: saved.time ?? payload.time,
        description: saved.description ?? payload.description,
        price: saved.price ?? payload.price,
        image: saved.image ?? payload.image,
        share_token: saved.share_token || payload.share_token,
        planning_data: payload.planning_data || {},
        gallery: payload.gallery || [],
        at: Date.now(),
      };
      sessionStorage.setItem('eventify_just_saved', JSON.stringify(snapshot));
      sessionStorage.setItem('eventify_last_edit', JSON.stringify(snapshot));
    } catch (_) { /* ignore */ }

    return {
      success: true,
      partial,
      message: (visMsg[saved.visibility] || 'Event updated successfully!') + partialMsg,
      event_id: saved.id,
      share_token: saved.share_token || payload.share_token,
      visibility: saved.visibility,
      verified: saved,
    };
  },

  async deleteEvent(id) {
    const eid = Number(id);
    if (!Number.isFinite(eid) || eid <= 0) {
      return { success: false, message: 'Invalid event.' };
    }
    const { error } = await sb.from('events').delete().eq('id', eid);
    if (error) return { success: false, message: error.message };
    return { success: true, message: 'Event deleted.' };
  },

  async setRsvp(eventId, userId, status) {
    const eid = Number(eventId);
    if (!Number.isFinite(eid) || eid <= 0) {
      return { success: false, message: 'Invalid event.' };
    }
    const { error } = await sb.from('rsvps').upsert(
      { user_id: userId, event_id: eid, status },
      { onConflict: 'user_id,event_id' }
    );
    if (error) return { success: false, message: error.message };
    const labels = { going: "You're going!", maybe: 'Marked as maybe', not_going: 'RSVP updated' };
    return { success: true, message: labels[status] || 'RSVP saved!', status };
  },

  async toggleFavorite(eventId, userId) {
    const eid = Number(eventId);
    if (!Number.isFinite(eid) || eid <= 0) {
      return { success: false, message: 'Invalid event.' };
    }

    // Prefer live auth uid so RLS (auth.uid() = user_id) always matches.
    const { data: authData, error: authErr } = await sb.auth.getUser();
    if (authErr || !authData?.user) {
      return { success: false, message: 'Please log in to save favorites.' };
    }
    const uid = authData.user.id || userId;

    const { data: existing, error: findErr } = await sb
      .from('favorites')
      .select('id')
      .eq('user_id', uid)
      .eq('event_id', eid)
      .maybeSingle();

    if (findErr) return { success: false, message: findErr.message };

    if (existing) {
      const { error } = await sb.from('favorites').delete().eq('id', existing.id);
      if (error) return { success: false, message: error.message };
      return { success: true, favorited: false, message: 'Removed from favorites' };
    }

    const { error } = await sb.from('favorites').insert({ user_id: uid, event_id: eid });
    if (error) {
      // Race: already favorited
      if (error.code === '23505') {
        return { success: true, favorited: true, message: 'Added to favorites!' };
      }
      return { success: false, message: error.message };
    }
    return { success: true, favorited: true, message: 'Added to favorites!' };
  },

  async getMyEvents(userId) {
    const { data, error } = await sb
      .from('events_with_stats')
      .select('*')
      .eq('organizer_id', userId)
      .order('date', { ascending: false });
    if (error) return { success: false, events: [] };
    return { success: true, events: (data || []).map(e => this.mapEvent(e)) };
  },

  async getMyRsvps(userId) {
    const { data: rows, error } = await sb
      .from('rsvps')
      .select('status, event_id')
      .eq('user_id', userId)
      .neq('status', 'not_going');
    if (error) return { success: false, events: [] };
    if (!rows?.length) return { success: true, events: [] };
    const ids = rows.map(r => Number(r.event_id)).filter(Number.isFinite);
    const statusMap = Object.fromEntries(rows.map(r => [Number(r.event_id), r.status]));
    const { data: events } = await sb.from('events_with_stats').select('*').in('id', ids);

    let favoriteIds = new Set();
    const { data: favs } = await sb
      .from('favorites')
      .select('event_id')
      .eq('user_id', userId)
      .in('event_id', ids);
    favoriteIds = new Set((favs || []).map(f => Number(f.event_id)));

    return {
      success: true,
      events: (events || []).map(e => ({
        ...this.mapEvent(e),
        rsvp_status: statusMap[Number(e.id)],
        isFavorite: favoriteIds.has(Number(e.id)),
      })),
    };
  },

  async getFavorites(userId) {
    const { data: rows, error } = await sb
      .from('favorites')
      .select('event_id')
      .eq('user_id', userId);
    if (error) return { success: false, message: error.message, events: [] };
    if (!rows?.length) return { success: true, events: [] };
    const ids = rows.map(r => Number(r.event_id)).filter(Number.isFinite);
    let { data: events, error: evErr } = await sb
      .from('events_with_stats')
      .select('*')
      .in('id', ids);
    if (evErr || !events) {
      ({ data: events, error: evErr } = await sb.from('events').select('*').in('id', ids));
    }
    if (evErr) return { success: false, message: evErr.message, events: [] };
    return {
      success: true,
      events: (events || []).map(e => ({ ...this.mapEvent(e), isFavorite: true })),
    };
  },

  async getPublicStats() {
    const today = new Date().toISOString().split('T')[0];
    const [events, users, upcoming] = await Promise.all([
      sb.from('events').select('*', { count: 'exact', head: true }),
      sb.from('profiles').select('*', { count: 'exact', head: true }),
      sb.from('events').select('*', { count: 'exact', head: true }).gte('date', today),
    ]);
    return { events: events.count || 0, users: users.count || 0, upcoming: upcoming.count || 0 };
  },

  async getRecommendedEvents(userId, excludeIds = []) {
    const [{ data: rsvps }, { data: favs }] = await Promise.all([
      sb.from('rsvps').select('event_id').eq('user_id', userId),
      sb.from('favorites').select('event_id').eq('user_id', userId),
    ]);
    const seenIds = [...new Set([...(rsvps || []), ...(favs || [])].map(r => r.event_id))];

    let categories = [];
    if (seenIds.length) {
      const { data: seenEvents } = await sb.from('events').select('category').in('id', seenIds);
      categories = [...new Set((seenEvents || []).map(e => e.category))];
    }

    const today = new Date().toISOString().split('T')[0];
    let query = sb.from('events_with_stats').select('*').gte('date', today).neq('organizer_id', userId).eq('visibility', 'public');
    if (excludeIds.length) query = query.not('id', 'in', `(${excludeIds.join(',')})`);
    if (categories.length) query = query.in('category', categories);
    query = query.order('date', { ascending: true }).limit(4);

    const { data, error } = await query;
    if (error || !data?.length) {
      const fallback = await this.fetchEvents({ sort: 'date_asc', limit: 4, userId });
      return fallback.events?.filter(e => !excludeIds.includes(e.id)) || [];
    }
    return data.map(e => this.mapEvent(e));
  },

  async getDashboardStats(userId) {
    const [created, rsvps, favorites] = await Promise.all([
      sb.from('events').select('*', { count: 'exact', head: true }).eq('organizer_id', userId),
      sb.from('rsvps').select('*', { count: 'exact', head: true }).eq('user_id', userId).neq('status', 'not_going'),
      sb.from('favorites').select('*', { count: 'exact', head: true }).eq('user_id', userId),
    ]);
    return {
      created: created.count || 0,
      rsvps: rsvps.count || 0,
      favorites: favorites.count || 0,
    };
  },

  async submitReview(eventId, userId, rating, comment) {
    const eid = Number(eventId);
    if (!Number.isFinite(eid) || eid <= 0) {
      return { success: false, message: 'Invalid event.' };
    }
    const { error } = await sb.from('reviews').insert({
      user_id: userId,
      event_id: eid,
      rating,
      comment,
    });
    if (error) return { success: false, message: error.message };
    return { success: true, message: 'Review submitted! Thank you.' };
  },

  async sendContact(form) {
    const { error } = await sb.from('contact_messages').insert(form);
    if (error) return { success: false, message: error.message };
    return { success: true, message: 'Message sent! We will get back to you soon.' };
  },

  async getAdminStats() {
    const [users, events, rsvps, reviews, upcoming] = await Promise.all([
      sb.from('profiles').select('*', { count: 'exact', head: true }),
      sb.from('events').select('*', { count: 'exact', head: true }),
      sb.from('rsvps').select('*', { count: 'exact', head: true }).eq('status', 'going'),
      sb.from('reviews').select('*', { count: 'exact', head: true }),
      sb.from('events').select('*', { count: 'exact', head: true }).gte('date', new Date().toISOString().split('T')[0]),
    ]);
    return {
      success: true,
      stats: {
        users: users.count || 0,
        events: events.count || 0,
        rsvps: rsvps.count || 0,
        reviews: reviews.count || 0,
        upcoming: upcoming.count || 0,
      },
    };
  },

  async getAdminUsers() {
    const { data, error } = await sb.from('profiles').select('*').order('created_at', { ascending: false });
    if (error) return { success: false, users: [] };
    return { success: true, users: data || [] };
  },

  async getAdminEvents() {
    const { data, error } = await sb.from('events_with_stats').select('*').order('created_at', { ascending: false });
    if (error) return { success: false, events: [] };
    return { success: true, events: data || [] };
  },

  async deleteUserProfile(id) {
    const { error } = await sb.from('profiles').delete().eq('id', id).neq('role', 'admin');
    if (error) return { success: false, message: error.message };
    return { success: true, message: 'User deleted.' };
  },

  async getInviteEvent(token) {
    const { data, error } = await sb.rpc('get_invite_event', { p_token: token });
    if (error) {
      return {
        success: false,
        message: /function|schema cache|could not find/i.test(error.message || '')
          ? 'Invite links need a database upgrade. Ask the organizer to run database/share-invite-rsvp.sql in Supabase.'
          : error.message,
      };
    }
    return data || { success: false, message: 'Invite not found' };
  },

  async submitInviteRsvp(token, { name, email = '', status, voterKey }) {
    const { data, error } = await sb.rpc('submit_invite_rsvp', {
      p_token: token,
      p_name: name,
      p_email: email || '',
      p_status: status,
      p_voter_key: voterKey || null,
    });
    if (error) {
      return {
        success: false,
        message: /function|schema cache|could not find/i.test(error.message || '')
          ? 'Invite RSVP needs a database upgrade. Run database/share-invite-rsvp.sql in Supabase.'
          : error.message,
      };
    }
    return data || { success: false, message: 'Could not save RSVP' };
  },

  async getOrganizerInviteRsvps(eventId) {
    const { data, error } = await sb.rpc('get_organizer_invite_rsvps', { p_event_id: Number(eventId) });
    if (error) {
      return {
        success: false,
        message: error.message,
        votes: [],
        counts: { going: 0, maybe: 0, not_going: 0, total: 0 },
      };
    }
    return {
      success: !!data?.success,
      message: data?.message || '',
      votes: data?.votes || [],
      counts: data?.counts || { going: 0, maybe: 0, not_going: 0, total: 0 },
    };
  },

  async setEventShareToken(eventId, token) {
    const value = token || this.makeShareToken();
    const { data, error } = await sb
      .from('events')
      .update({ share_token: value })
      .eq('id', eventId)
      .select('share_token')
      .single();
    if (error) return { success: false, message: error.message };
    return { success: true, share_token: data?.share_token || value };
  },

  async ensureShareToken(eventId, preferredToken) {
    if (!eventId) return { success: false, message: 'Save the event first' };

    // Read from events table (not the view) so share_token is always visible
    const { data: row, error: readErr } = await sb
      .from('events')
      .select('id, share_token')
      .eq('id', eventId)
      .single();

    if (readErr) {
      return {
        success: false,
        message: /share_token|column/i.test(readErr.message || '')
          ? 'Run database/share-invite-rsvp.sql in Supabase first.'
          : readErr.message,
      };
    }

    if (row?.share_token) {
      return { success: true, share_token: row.share_token };
    }

    const token = preferredToken || this.makeShareToken();
    const { data, error } = await sb
      .from('events')
      .update({ share_token: token })
      .eq('id', eventId)
      .select('share_token')
      .single();

    if (error) {
      return {
        success: false,
        message: /share_token/i.test(error.message || '')
          ? 'Run database/share-invite-rsvp.sql in Supabase to enable share links.'
          : error.message,
      };
    }
    return { success: true, share_token: data?.share_token || token };
  },
};
