const CATEGORIES = [
  {
    name: 'Weddings',
    slug: 'weddings',
    icon: '💍',
    tagline: 'Vows, florals & forever moments',
    aliases: ['Wedding', 'Weddings'],
    noteOptions: ['Ceremony style', 'Reception vibe', 'Guest count estimate', 'Color palette', 'Cultural traditions', 'Outdoor / indoor', 'Budget range'],
  },
  {
    name: 'Birthday Parties',
    slug: 'birthday',
    icon: '🎂',
    tagline: 'Candles, cake & pure celebration',
    aliases: ['Birthday Party', 'Birthday Parties'],
    noteOptions: ['Age / theme', 'Surprise party', 'Cake preferences', 'Kids vs adults', 'Games planned', 'Venue type'],
  },
  {
    name: 'Conferences',
    slug: 'conferences',
    icon: '💼',
    tagline: 'Ideas, stages & sharp agendas',
    aliases: ['Conference', 'Conferences'],
    noteOptions: ['Agenda tracks', 'Keynote speakers', 'Hybrid / virtual', 'Sponsor goals', 'Registration capacity', 'AV needs'],
  },
  {
    name: 'Business Meetings',
    slug: 'business',
    icon: '📊',
    tagline: 'Decisions, decks & clear outcomes',
    aliases: ['Business Meeting', 'Business Meetings'],
    noteOptions: ['Meeting objective', 'Decision needed', 'Attendees list', 'Presentation required', 'Confidential'],
  },
  {
    name: 'Music Concerts',
    slug: 'music',
    icon: '🎵',
    tagline: 'Lights, sound & live energy',
    aliases: ['Music Concert', 'Music Concerts', 'Concert'],
    noteOptions: ['Genre / artists', 'Open air', 'Sound & lighting', 'Age restriction', 'Merch table', 'Security level'],
  },
  {
    name: 'Sports Events',
    slug: 'sports',
    icon: '⚽',
    tagline: 'Teams, brackets & game-day buzz',
    aliases: ['Sports Event', 'Sports Events'],
    noteOptions: ['Sport type', 'Teams / brackets', 'Referees needed', 'First aid', 'Spectator capacity', 'Weather backup'],
  },
  {
    name: 'Music Festivals',
    slug: 'festivals',
    icon: '🎉',
    tagline: 'Stages, lineup & festival energy',
    aliases: ['Festival', 'Festivals', 'Music Festival', 'Music Festivals'],
    noteOptions: ['Festival theme', 'Expected attendance', 'Main stage plan', 'Artist lineup', 'Permits & insurance', 'Volunteer needs'],
  },
  {
    name: 'Workshops',
    slug: 'workshops',
    icon: '📚',
    tagline: 'Hands-on skills & make-and-take',
    aliases: ['Workshop', 'Workshops'],
    noteOptions: ['Skill level', 'Materials included', 'Max attendees', 'Instructor notes', 'Certificate offered'],
  },
  {
    name: 'Graduation',
    slug: 'graduation',
    icon: '🎓',
    tagline: 'Caps, cheers & proud families',
    aliases: ['Graduation'],
    noteOptions: ['Class / year', 'Ceremony order', 'Reception after', 'Photo moments', 'Dress code'],
  },
  {
    name: 'Baby Showers',
    slug: 'baby',
    icon: '👶',
    tagline: 'Soft tones, gifts & sweet games',
    aliases: ['Baby Shower', 'Baby Showers'],
    noteOptions: ['Boy / girl / neutral', 'Games list', 'Gift registry', 'Host names', 'Decor theme'],
  },
  {
    name: 'Charity Events',
    slug: 'charity',
    icon: '❤️',
    tagline: 'Cause-driven nights that matter',
    aliases: ['Charity Event', 'Charity Events'],
    noteOptions: ['Cause / nonprofit', 'Fundraising goal', 'Sponsor list', 'Donation method', 'Volunteer needs'],
  },
  {
    name: 'Networking Events',
    slug: 'networking',
    icon: '🤝',
    tagline: 'Connections, mixers & follow-ups',
    aliases: ['Networking Event', 'Networking Events'],
    noteOptions: ['Industry focus', 'Icebreakers', 'Name badges', 'Follow-up plan', 'Sponsor booths'],
  },
  {
    name: 'Private Parties',
    slug: 'private',
    icon: '🥳',
    tagline: 'Invite-only nights, your rules',
    aliases: ['Private Party', 'Private Parties'],
    noteOptions: ['Occasion', 'Guest list size', 'Music vibe', 'Catering style', 'Privacy level'],
  },
  {
    name: 'Food & Drink',
    slug: 'food',
    icon: '🍔',
    tagline: 'Tastings, pairings & chef tables',
    aliases: ['Food & Drinks', 'Food & Drink', 'Food and Drink'],
    noteOptions: ['Cuisine style', 'Tasting / full service', 'Allergies', 'Bar package', 'Chef notes'],
  },
  {
    name: 'Art & Culture',
    slug: 'art',
    icon: '🎭',
    tagline: 'Galleries, stages & creatives',
    aliases: ['Art & Culture', 'Art and Culture'],
    noteOptions: ['Exhibition / performance', 'Artist lineup', 'Install needs', 'Opening night', 'Insurance notes'],
  },
  {
    name: 'Custom',
    slug: 'custom',
    icon: '✨',
    tagline: 'Name it. Shape it. Make it yours',
    aliases: ['Custom', 'Other', 'Add More', 'My Event'],
    noteOptions: [
      'Event purpose',
      'Target audience',
      'Must-have experiences',
      'Guest count estimate',
      'Budget range',
      'Venue type',
      'Dress code / vibe',
      'Special requests',
    ],
  },
];

const CUSTOM_CATEGORY = 'Custom';

/** Core planner tabs always available */
const PLANNER_CORE_TABS = ['basics', 'planning', 'ai', 'settings', 'invites', 'gifts'];

/**
 * Relevant planner tabs per category (slug). Keep lists short — only the most useful tools.
 * Core tabs are always shown in addition to these.
 */
const CATEGORY_PLANNER_TABS = {
  weddings: ['guests', 'seating', 'gifts', 'menu', 'vendors', 'schedule', 'playlist', 'photos', 'budget'],
  birthday: ['guests', 'gifts', 'playlist', 'photos', 'schedule', 'menu', 'budget'],
  conferences: ['schedule', 'guests', 'vendors', 'documents', 'certs', 'budget', 'team'],
  business: ['schedule', 'guests', 'documents', 'reminders', 'board', 'budget'],
  music: ['schedule', 'guests', 'playlist', 'photos', 'team', 'budget', 'vendors'],
  sports: ['schedule', 'team', 'guests', 'budget', 'documents'],
  festivals: ['tickets', 'stages', 'security', 'schedule', 'guests', 'budget', 'team', 'playlist', 'photos'],
  workshops: ['guests', 'schedule', 'documents', 'certs', 'budget', 'team'],
  graduation: ['guests', 'seating', 'certs', 'photos', 'schedule', 'gifts'],
  baby: ['guests', 'gifts', 'photos', 'menu', 'schedule', 'playlist'],
  charity: ['guests', 'gifts', 'vendors', 'team', 'budget', 'photos', 'schedule'],
  networking: ['guests', 'schedule', 'team', 'documents', 'reminders'],
  private: ['guests', 'playlist', 'photos', 'schedule', 'budget'],
  food: ['menu', 'vendors', 'guests', 'photos', 'schedule', 'budget'],
  art: ['schedule', 'vendors', 'guests', 'photos', 'budget', 'documents'],
  custom: ['guests', 'budget', 'schedule', 'photos', 'documents', 'vendors'],
};

/** Detail-page sections shown when viewing an event (scroll-down cards). */
const CATEGORY_DETAIL_SECTIONS = {
  weddings: ['overview', 'guests', 'rsvp', 'gifts'],
  birthday: ['overview', 'guests', 'rsvp', 'gifts'],
  conferences: ['overview', 'guests', 'rsvp', 'gifts'],
  business: ['overview', 'guests', 'rsvp', 'gifts'],
  music: ['overview', 'guests', 'rsvp', 'gifts'],
  sports: ['overview', 'guests', 'rsvp', 'gifts'],
  festivals: ['overview', 'guests', 'rsvp', 'gifts'],
  workshops: ['overview', 'guests', 'rsvp', 'gifts'],
  graduation: ['overview', 'guests', 'rsvp', 'gifts'],
  baby: ['overview', 'guests', 'rsvp', 'gifts'],
  charity: ['overview', 'guests', 'rsvp', 'gifts'],
  networking: ['overview', 'guests', 'rsvp', 'gifts'],
  private: ['overview', 'guests', 'rsvp', 'gifts'],
  food: ['overview', 'guests', 'rsvp', 'gifts'],
  art: ['overview', 'guests', 'rsvp', 'gifts'],
  custom: ['overview', 'guests', 'rsvp', 'gifts'],
};

function getDetailSectionsForCategory(categoryName) {
  const slug = typeof getCategorySlug === 'function' ? getCategorySlug(categoryName) : 'custom';
  return CATEGORY_DETAIL_SECTIONS[slug] || CATEGORY_DETAIL_SECTIONS.custom;
}

function isMusicFestivalCategory(categoryName) {
  return getCategorySlug(categoryName) === 'festivals';
}

function getPlannerTabsForCategory(categoryName) {
  const slug = typeof getCategorySlug === 'function'
    ? getCategorySlug(categoryName)
    : 'custom';
  const extra = CATEGORY_PLANNER_TABS[slug] || CATEGORY_PLANNER_TABS.custom;
  return [...new Set([...PLANNER_CORE_TABS, ...extra])];
}

function normalizeCategoryName(name) {
  if (!name) return '';
  const found = CATEGORIES.find(c =>
    c.name === name || (c.aliases || []).includes(name)
  );
  return found ? found.name : name;
}

function getCategoryMeta(name) {
  const key = normalizeCategoryName(name);
  return CATEGORIES.find(c => c.name === key) || CATEGORIES.find(c => c.name === CUSTOM_CATEGORY);
}

function getCategorySlug(name) {
  return getCategoryMeta(name)?.slug || 'custom';
}

function getCategoryIcon(name) {
  return getCategoryMeta(name)?.icon || '✨';
}

function getCategoryTagline(name) {
  return getCategoryMeta(name)?.tagline || 'Plan your way';
}

function getCategoryNoteOptions(name) {
  const known = getCategoryMeta(name);
  if (known?.noteOptions?.length) return known.noteOptions;
  return CATEGORIES.find(c => c.name === CUSTOM_CATEGORY)?.noteOptions || [];
}

function renderCategoryOptions(selected = '') {
  const sel = normalizeCategoryName(selected);
  const known = CATEGORIES.some(c => c.name === sel);
  let html = CATEGORIES.map(c =>
    `<option value="${c.name}" ${c.name === sel || (!known && sel && c.name === CUSTOM_CATEGORY) ? 'selected' : ''}>${c.icon} ${c.name === CUSTOM_CATEGORY ? 'Add More (Custom)' : c.name}</option>`
  ).join('');
  return html;
}

function renderCategoryFilterOptions(selected = 'all') {
  const sel = selected === 'all' ? 'all' : normalizeCategoryName(selected);
  let html = `<option value="all" ${sel === 'all' ? 'selected' : ''}>All Categories</option>`;
  html += CATEGORIES.filter(c => c.name !== CUSTOM_CATEGORY).map(c =>
    `<option value="${c.name}" ${c.name === sel ? 'selected' : ''}>${c.icon} ${c.name}</option>`
  ).join('');
  return html;
}

function getCategoryThemes(name) {
  const themes = {
    Weddings: ['Romantic garden', 'Classic elegant', 'Modern minimal', 'Rustic chic', 'Beach / destination'],
    'Birthday Parties': ['Surprise party', 'Kids carnival', 'Glow night', 'Retro disco', 'Brunch celebration'],
    Conferences: ['Industry summit', 'Tech innovation', 'Leadership forum', 'Hybrid remote-first'],
    'Business Meetings': ['Strategy offsite', 'Board review', 'Kickoff workshop', 'Client presentation'],
    'Music Concerts': ['Intimate acoustic', 'Festival stage', 'Club night', 'Outdoor amphitheater'],
    'Sports Events': ['Tournament day', 'Charity match', 'Fans meetup', 'Awards ceremony'],
    'Music Festivals': ['EDM weekend', 'Hip-Hop takeover', 'Rock open-air', 'Pop showcase', 'Mixed genre fest'],
    Festivals: ['EDM weekend', 'Hip-Hop takeover', 'Rock open-air', 'Pop showcase', 'Mixed genre fest'],
    Workshops: ['Hands-on beginner', 'Masterclass', 'Team building lab', 'Creative studio'],
    Graduation: ['Formal ceremony', 'Garden reception', 'Family brunch', 'Alumni night'],
    'Baby Showers': ['Soft pastel', 'Neutral boho', 'Storybook theme', 'Brunch shower'],
    'Charity Events': ['Gala dinner', 'Fun run', 'Benefit auction', 'Community day'],
    'Networking Events': ['Speed networking', 'Mixer after hours', 'Industry breakfast', 'Mentorship circle'],
    'Private Parties': ['House party', 'Rooftop soiree', 'Dinner club', 'Celebration night'],
    'Food & Drink': ['Chef tasting', 'Wine pairing', 'Street food popup', 'Brunch market'],
    'Art & Culture': ['Gallery opening', 'Live performance', 'Cinema night', 'Maker showcase'],
    Custom: ['Fully custom concept', 'Personal celebration', 'Brand / community moment', 'One-of-a-kind experience'],
  };
  const key = normalizeCategoryName(name);
  return themes[key] || themes.Custom;
}

function renderCategoryGrid() {
  const cards = CATEGORIES.filter(c => c.name !== CUSTOM_CATEGORY).map(c => `
    <article class="category-card category-card-interactive category-card--${c.slug}" data-category="${c.name}">
      <a href="create-event.html?category=${encodeURIComponent(c.name)}" class="category-card-main">
        <span class="category-card-sheen" aria-hidden="true"></span>
        <div class="category-icon" aria-hidden="true">${c.icon}</div>
        <h4>${c.name}</h4>
        <p class="category-tagline">${c.tagline}</p>
      </a>
      <div class="category-card-actions">
        <a href="create-event.html?category=${encodeURIComponent(c.name)}" class="btn btn-sm category-card-cta">Start Planning</a>
      </div>
    </article>
  `).join('');

  const addMore = `
    <article class="category-card category-card-interactive category-card-add-more category-card--custom" data-category="Custom">
      <a href="create-event.html?custom=1" class="category-card-main">
        <span class="category-card-sheen" aria-hidden="true"></span>
        <div class="category-icon" aria-hidden="true">✨</div>
        <h4>Add More</h4>
        <p class="category-tagline">Create any event your way — name it &amp; plan everything</p>
      </a>
      <div class="category-card-actions">
        <a href="create-event.html?custom=1" class="btn btn-sm category-card-cta">Create Custom Event</a>
      </div>
    </article>
  `;

  return cards + addMore;
}
