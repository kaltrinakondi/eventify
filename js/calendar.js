const Calendar = {
  currentDate: new Date(),
  selectedDate: null,
  events: [],

  init() {
    this.grid = document.getElementById('calendar-grid');
    this.monthLabel = document.getElementById('calendar-month');
    this.eventsContainer = document.getElementById('calendar-day-events');
    this.prevBtn = document.getElementById('cal-prev');
    this.nextBtn = document.getElementById('cal-next');

    if (!this.grid) return;

    this.prevBtn?.addEventListener('click', () => {
      this.currentDate.setMonth(this.currentDate.getMonth() - 1);
      this.render();
    });

    this.nextBtn?.addEventListener('click', () => {
      this.currentDate.setMonth(this.currentDate.getMonth() + 1);
      this.render();
    });

    this.loadEvents().then(() => this.render());
  },

  async loadEvents() {
    try {
      const data = await Eventify.fetchEvents({ sort: 'date_asc' });
      if (data.success) this.events = data.events;
    } catch (e) {
      this.events = [];
    }
  },

  getEventsForDate(dateStr) {
    return this.events.filter(e => e.date === dateStr);
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
    let html = dayNames.map(d => `<div class="calendar-day-name">${d}</div>`).join('');

    for (let i = firstDay - 1; i >= 0; i--) {
      const day = daysInPrev - i;
      html += `<div class="calendar-day other-month">${day}</div>`;
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = this.formatDateStr(year, month, day);
      const hasEvents = this.getEventsForDate(dateStr).length > 0;
      const isToday = dateStr === todayStr;
      const isSelected = this.selectedDate === dateStr;

      let classes = 'calendar-day';
      if (isToday) classes += ' today';
      if (isSelected) classes += ' selected';
      if (hasEvents) classes += ' has-events';

      html += `<div class="${classes}" data-date="${dateStr}">${day}</div>`;
    }

    const totalCells = firstDay + daysInMonth;
    const remaining = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    for (let i = 1; i <= remaining; i++) {
      html += `<div class="calendar-day other-month">${i}</div>`;
    }

    this.grid.innerHTML = html;

    this.grid.querySelectorAll('.calendar-day[data-date]').forEach(el => {
      el.addEventListener('click', () => {
        this.selectedDate = el.dataset.date;
        this.render();
        this.showDayEvents(el.dataset.date);
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
      <h3>Events on ${label}</h3>
      <div class="events-grid">${events.map(e => Eventify.renderEventCard(e)).join('')}</div>
    `;
    Eventify.bindRsvpButtons(this.eventsContainer);
  },
};

document.addEventListener('DOMContentLoaded', () => Calendar.init());
