const Calendar = {
  currentDate: new Date(),
  selectedDate: null,
  events: [],

  async init() {
    this.grid = document.getElementById('calendar-grid');
    this.monthLabel = document.getElementById('calendar-month');
    this.eventsContainer = document.getElementById('calendar-day-events');
    this.prevBtn = document.getElementById('cal-prev');
    this.nextBtn = document.getElementById('cal-next');

    if (!this.grid) return;

    if (typeof Eventify !== 'undefined' && Eventify.init) {
      await Eventify.init();
    }

    this.prevBtn?.addEventListener('click', () => {
      this.currentDate.setMonth(this.currentDate.getMonth() - 1);
      this.render();
    });

    this.nextBtn?.addEventListener('click', () => {
      this.currentDate.setMonth(this.currentDate.getMonth() + 1);
      this.render();
    });

    await this.loadEvents();

    // Jump to the month of the next upcoming event so marks are visible
    const todayKey = this.formatDateStr(
      new Date().getFullYear(),
      new Date().getMonth(),
      new Date().getDate()
    );
    const upcoming = [...this.events]
      .map((e) => this.eventDateKey(e))
      .filter((d) => d >= todayKey)
      .sort();
    const focusDate = upcoming[0] || this.events.map((e) => this.eventDateKey(e)).sort()[0];
    if (focusDate) {
      const [y, m] = focusDate.split('-').map(Number);
      this.currentDate = new Date(y, m - 1, 1);
    }

    this.render();

    // Auto-open nearest event day (or today if it has events)
    const openDate = (this.getEventsForDate(todayKey).length ? todayKey : null) || focusDate;
    if (openDate && this.getEventsForDate(openDate).length) {
      this.selectedDate = openDate;
      this.render();
      this.showDayEvents(openDate);
    }
  },

  eventDateKey(event) {
    const raw = event?.date ?? '';
    const s = String(raw);
    // Supports "2026-12-23", "2026-12-23T00:00:00", etc.
    const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
    return m ? m[1] : s.slice(0, 10);
  },

  async loadEvents() {
    try {
      const data = await Eventify.fetchEvents({
        sort: 'date_asc',
        limit: 500,
        userId: Eventify.currentUser?.id,
        userEmail: Eventify.currentUser?.email,
      });
      if (data.success) this.events = data.events || [];
      else this.events = [];
    } catch (e) {
      this.events = [];
    }
  },

  getEventsForDate(dateStr) {
    const key = String(dateStr).slice(0, 10);
    return this.events.filter((e) => this.eventDateKey(e) === key);
  },

  formatDateStr(year, month, day) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  },

  render() {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();

    this.monthLabel.textContent = this.currentDate.toLocaleDateString('en-US', {
      month: 'long', year: 'numeric',
    });

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrev = new Date(year, month, 0).getDate();
    const today = new Date();
    const todayStr = this.formatDateStr(today.getFullYear(), today.getMonth(), today.getDate());

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    let html = dayNames.map((d) => `<div class="calendar-day-name">${d}</div>`).join('');

    for (let i = firstDay - 1; i >= 0; i--) {
      const day = daysInPrev - i;
      html += `<div class="calendar-day other-month"><span class="cal-day-num">${day}</span></div>`;
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = this.formatDateStr(year, month, day);
      const dayEvents = this.getEventsForDate(dateStr);
      const count = dayEvents.length;
      const hasEvents = count > 0;
      const isToday = dateStr === todayStr;
      const isSelected = this.selectedDate === dateStr;

      let classes = 'calendar-day';
      if (isToday) classes += ' today';
      if (isSelected) classes += ' selected';
      if (hasEvents) classes += ' has-events';

      const titlePreview = hasEvents
        ? Eventify.escapeHtml(dayEvents[0].title || 'Event')
        : '';
      const more = count > 1 ? `<span class="cal-more">+${count - 1}</span>` : '';
      const badge = hasEvents ? `<span class="cal-event-badge" title="${count} event${count > 1 ? 's' : ''}">${count}</span>` : '';
      const chip = hasEvents
        ? `<span class="cal-event-chip">${titlePreview}${more}</span>`
        : '';

      html += `
        <div class="${classes}" data-date="${dateStr}" role="button" tabindex="0"
             aria-label="${dateStr}${hasEvents ? `, ${count} event${count > 1 ? 's' : ''}` : ''}">
          <span class="cal-day-num">${day}</span>
          ${badge}
          ${chip}
        </div>`;
    }

    const totalCells = firstDay + daysInMonth;
    const remaining = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    for (let i = 1; i <= remaining; i++) {
      html += `<div class="calendar-day other-month"><span class="cal-day-num">${i}</span></div>`;
    }

    this.grid.innerHTML = html;

    this.grid.querySelectorAll('.calendar-day[data-date]').forEach((el) => {
      const open = () => {
        this.selectedDate = el.dataset.date;
        this.render();
        this.showDayEvents(el.dataset.date);
      };
      el.addEventListener('click', open);
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          open();
        }
      });
    });
  },

  showDayEvents(dateStr) {
    if (!this.eventsContainer) return;

    const events = this.getEventsForDate(dateStr);
    const label = Eventify.formatDate(dateStr);

    if (!events.length) {
      this.eventsContainer.innerHTML = `
        <h3>${label}</h3>
        <p class="empty-state">No events on this day.</p>
      `;
      return;
    }

    this.eventsContainer.innerHTML = `
      <h3>${events.length} event${events.length > 1 ? 's' : ''} on ${label}</h3>
      <div class="events-grid">${events.map((e) => Eventify.renderEventCard(e)).join('')}</div>
    `;
    Eventify.bindRsvpButtons(this.eventsContainer);
    Eventify.bindFavoriteButtons(this.eventsContainer);
  },
};

document.addEventListener('DOMContentLoaded', () => Calendar.init());
