/**
 * Rule-based AI Event Planner — suggestions by category (no external API).
 */
const AIPlanner = {
  templates: {
    Weddings: {
      ideas: [
        'Book ceremony venue and reception hall early',
        'Hire photographer and videographer; schedule golden-hour portraits',
        'Order flowers, bridal bouquet, and centerpieces',
        'Confirm DJ/band playlist and first-dance song',
        'Finalize catering menu tasting and dietary options',
        'Create seating plan and place cards',
        'Arrange transport for wedding party',
      ],
      tips: [
        'Send save-the-dates 6–8 months out; formal invites 8–10 weeks before.',
        'Build a day-of timeline from getting ready → ceremony → cocktail → dinner → dance.',
        'Assign a day-of coordinator so you are not managing vendors.',
      ],
      timeline: [
        { offset: '-6 months', activity: 'Book venue, photographer, caterer' },
        { offset: '-3 months', activity: 'Finalize guest list and invitations' },
        { offset: '-1 month', activity: 'Confirm vendors and seating plan' },
        { offset: '-1 week', activity: 'Final headcount to caterer; pick up attire' },
        { offset: 'Day of', activity: 'Ceremony, photos, reception, send-off' },
      ],
      checklist: [
        { title: 'Book venue & deposit', priority: 'high' },
        { title: 'Hire photographer/videographer', priority: 'high' },
        { title: 'Order flowers & décor', priority: 'medium' },
        { title: 'Confirm DJ / entertainment', priority: 'medium' },
        { title: 'Finalize seating chart', priority: 'high' },
        { title: 'Schedule cake tasting', priority: 'low' },
      ],
    },
    'Birthday Parties': {
      ideas: [
        'Choose a theme and color palette for decorations',
        'Order or bake a signature cake',
        'Plan games and party favors for guests',
        'Book entertainment (magician, DJ, photo booth)',
        'Prepare a playlist and activity schedule',
      ],
      tips: [
        'Confirm RSVPs one week before for accurate food and cake count.',
        'Assign one helper for food table and one for activities.',
      ],
      timeline: [
        { offset: '-4 weeks', activity: 'Theme, venue, and invitations' },
        { offset: '-2 weeks', activity: 'Order cake, decorations, entertainment' },
        { offset: '-3 days', activity: 'Buy food, drinks, and party supplies' },
        { offset: 'Day of', activity: 'Decorate, greet guests, cake, games' },
      ],
      checklist: [
        { title: 'Send invitations', priority: 'high' },
        { title: 'Order cake / dessert', priority: 'high' },
        { title: 'Buy decorations', priority: 'medium' },
        { title: 'Plan games/entertainment', priority: 'medium' },
        { title: 'Prepare goodie bags', priority: 'low' },
      ],
    },
    Conferences: {
      ideas: [
        'Build speaker lineup and session tracks',
        'Set up registration desk and badge printing',
        'Publish full agenda with breaks',
        'Plan coffee breaks and lunch catering',
        'Arrange AV tech check and streaming if needed',
      ],
      tips: [
        'Share speaker briefs 2 weeks before.',
        'Staff registration 30 minutes before doors; have backup name badges.',
      ],
      timeline: [
        { offset: '-3 months', activity: 'Call for speakers; reserve venue' },
        { offset: '-6 weeks', activity: 'Open registration; promote agenda' },
        { offset: '-1 week', activity: 'AV run-through; print materials' },
        { offset: 'Day of', activity: 'Registration, keynotes, sessions, networking' },
      ],
      checklist: [
        { title: 'Confirm all speakers', priority: 'high' },
        { title: 'Finalize agenda PDF', priority: 'high' },
        { title: 'Order badges & lanyards', priority: 'medium' },
        { title: 'Arrange lunch catering', priority: 'medium' },
        { title: 'Tech / AV rehearsal', priority: 'high' },
      ],
    },
    'Business Meetings': {
      ideas: [
        'Define clear meeting objectives and agenda',
        'Prepare slide deck and handouts',
        'Book room with screen and whiteboard',
        'Assign note-taker and action-item owner',
      ],
      tips: [
        'Send agenda 48 hours ahead; end with assigned owners and due dates.',
      ],
      timeline: [
        { offset: '-1 week', activity: 'Agenda and invite calendar holds' },
        { offset: '-1 day', activity: 'Share docs and presentation' },
        { offset: 'Meeting', activity: 'Discuss, decide, assign actions' },
        { offset: '+1 day', activity: 'Send minutes and follow-ups' },
      ],
      checklist: [
        { title: 'Write agenda', priority: 'high' },
        { title: 'Book room / Zoom link', priority: 'high' },
        { title: 'Prepare presentation', priority: 'medium' },
        { title: 'Assign note-taker', priority: 'low' },
      ],
    },
    'Music Concerts': {
      ideas: [
        'Stage plot and load-in schedule',
        'Sound system, monitors, and FOH engineer',
        'Lighting design and cues',
        'Security, wristbands, and entry flow',
        'Merch table and artist green room',
      ],
      tips: [
        'Do a soundcheck at least 2 hours before doors.',
        'Coordinate local noise ordinances and curfew.',
      ],
      timeline: [
        { offset: '-2 months', activity: 'Book artists and venue' },
        { offset: '-2 weeks', activity: 'Promote tickets; confirm tech riders' },
        { offset: 'Day of', activity: 'Load-in, soundcheck, doors, show' },
      ],
      checklist: [
        { title: 'Confirm artist riders', priority: 'high' },
        { title: 'Hire sound & lighting', priority: 'high' },
        { title: 'Security briefing', priority: 'high' },
        { title: 'Ticket scanning plan', priority: 'medium' },
      ],
    },
    'Sports Events': {
      ideas: [
        'Field/court booking and equipment check',
        'Referee/officials schedule',
        'Team registration and brackets',
        'First aid station and water stations',
        'Spectator seating and parking',
      ],
      tips: [
        'Have a weather contingency and communication plan for delays.',
      ],
      timeline: [
        { offset: '-1 month', activity: 'Registrations open; book officials' },
        { offset: '-1 week', activity: 'Publish brackets/schedule' },
        { offset: 'Day of', activity: 'Warm-ups, matches, awards' },
      ],
      checklist: [
        { title: 'Confirm venue & insurance', priority: 'high' },
        { title: 'Hire officials', priority: 'high' },
        { title: 'First aid kit / medic', priority: 'high' },
        { title: 'Trophies & medals', priority: 'medium' },
      ],
    },
    'Music Festivals': {
      ideas: [
        'Artist lineup with stage time slots',
        'VIP / Standard / Early Bird ticket tiers',
        'Sound & lighting package for main stage',
        'Volunteer shifts and check-in',
        'Security entry lanes and medical point',
      ],
      tips: [
        'Lock permits and insurance early, then confirm load-in windows with every vendor.',
      ],
      timeline: [
        { offset: '-3 months', activity: 'Permits, insurance, headliner booking' },
        { offset: '-1 month', activity: 'Vendor booths, volunteer roster, ticket caps' },
        { offset: 'Day of', activity: 'Gates, lineup, crowd control, teardown' },
      ],
      checklist: [
        { title: 'Secure permits & insurance', priority: 'high' },
        { title: 'Confirm artist lineup & stages', priority: 'high' },
        { title: 'Ticket tiers + capacity limits', priority: 'high' },
        { title: 'Volunteer & security schedule', priority: 'medium' },
      ],
    },
    Festivals: {
      ideas: [
        'Artist lineup with stage time slots',
        'VIP / Standard / Early Bird ticket tiers',
        'Sound & lighting package for main stage',
        'Volunteer shifts and check-in',
        'Security entry lanes and medical point',
      ],
      tips: [
        'Lock permits and insurance early, then confirm load-in windows with every vendor.',
      ],
      timeline: [
        { offset: '-3 months', activity: 'Permits, insurance, headliner booking' },
        { offset: '-1 month', activity: 'Vendor booths, volunteer roster, ticket caps' },
        { offset: 'Day of', activity: 'Gates, lineup, crowd control, teardown' },
      ],
      checklist: [
        { title: 'Secure permits & insurance', priority: 'high' },
        { title: 'Confirm artist lineup & stages', priority: 'high' },
        { title: 'Ticket tiers + capacity limits', priority: 'high' },
        { title: 'Volunteer & security schedule', priority: 'medium' },
      ],
    },
    Workshops: {
      ideas: [
        'Prepare materials kits per attendee',
        'Instructor run-of-show and demos',
        'Room setup: tables, power, materials stations',
        'Pre-work email to attendees',
      ],
      tips: [
        'Leave buffer time for questions and cleanup.',
      ],
      timeline: [
        { offset: '-3 weeks', activity: 'Curriculum and materials list' },
        { offset: '-1 week', activity: 'Ship/prep kits; send prep email' },
        { offset: 'Day of', activity: 'Setup, workshop, Q&A, feedback' },
      ],
      checklist: [
        { title: 'Order materials', priority: 'high' },
        { title: 'Print worksheets', priority: 'medium' },
        { title: 'Instructor brief', priority: 'high' },
        { title: 'Feedback form', priority: 'low' },
      ],
    },
    Graduation: {
      ideas: [
        'Seating chart for families and graduates',
        'Certificate printing and name pronunciation list',
        'Photography stations and processional order',
        'Reception catering after ceremony',
      ],
      tips: [
        'Rehearse processional the day before if possible.',
      ],
      timeline: [
        { offset: '-1 month', activity: 'Invites and venue confirmation' },
        { offset: '-1 week', activity: 'Print certificates; seating' },
        { offset: 'Day of', activity: 'Ceremony, photos, reception' },
      ],
      checklist: [
        { title: 'Print certificates', priority: 'high' },
        { title: 'Seating arrangement', priority: 'high' },
        { title: 'Photographer booked', priority: 'medium' },
        { title: 'Pronunciation list', priority: 'medium' },
      ],
    },
    'Baby Showers': {
      ideas: [
        'Games and prize table',
        'Decorations and balloon arch',
        'Gift registry station and thank-you tracker',
        'Light catering and dessert table',
      ],
      tips: [
        'Designate someone to track gifts for thank-you notes.',
      ],
      timeline: [
        { offset: '-3 weeks', activity: 'Invites and theme' },
        { offset: '-1 week', activity: 'Games, decorations, food plan' },
        { offset: 'Day of', activity: 'Games, gifts, brunch/tea' },
      ],
      checklist: [
        { title: 'Send invitations', priority: 'high' },
        { title: 'Plan shower games', priority: 'medium' },
        { title: 'Order cake & flowers', priority: 'medium' },
        { title: 'Gift tracking sheet', priority: 'low' },
      ],
    },
    'Charity Events': {
      ideas: [
        'Sponsor packages and recognition wall',
        'Donation stations and QR payment links',
        'Volunteer roles and briefings',
        'Impact story moments during program',
      ],
      tips: [
        'Thank sponsors publicly and follow up within 48 hours with impact summary.',
      ],
      timeline: [
        { offset: '-2 months', activity: 'Sponsor outreach' },
        { offset: '-2 weeks', activity: 'Volunteer training; donate links live' },
        { offset: 'Day of', activity: 'Program, asks, thank-yous' },
      ],
      checklist: [
        { title: 'Confirm sponsors', priority: 'high' },
        { title: 'Donation stations', priority: 'high' },
        { title: 'Volunteer schedule', priority: 'medium' },
        { title: 'Impact slide deck', priority: 'medium' },
      ],
    },
    'Networking Events': {
      ideas: [
        'Registration flow and name badges',
        'Icebreaker activities or speed networking rounds',
        'Sponsor tables and conversation corners',
        'Follow-up email with attendee opt-in list',
      ],
      tips: [
        'Keep formal program short; maximize mingling time.',
      ],
      timeline: [
        { offset: '-3 weeks', activity: 'Promote RSVP; print badges' },
        { offset: 'Day of', activity: 'Check-in, intros, networking rounds' },
        { offset: '+1 day', activity: 'Send follow-up connections email' },
      ],
      checklist: [
        { title: 'Print name badges', priority: 'high' },
        { title: 'Design icebreakers', priority: 'medium' },
        { title: 'Check-in tablets/list', priority: 'high' },
        { title: 'Follow-up email draft', priority: 'low' },
      ],
    },
    'Private Parties': {
      ideas: [
        'Guest list and plus-ones control',
        'Music playlist and host MC moments',
        'Catering timeline and dietary flags',
        'Photo moments and décor zones',
      ],
      tips: [
        'Have a quiet chill-out space if the party is long.',
      ],
      timeline: [
        { offset: '-2 weeks', activity: 'Finalize guest list and catering' },
        { offset: '-2 days', activity: 'Playlist and décor setup plan' },
        { offset: 'Day of', activity: 'Host, food service, music' },
      ],
      checklist: [
        { title: 'Confirm guest count', priority: 'high' },
        { title: 'Catering order', priority: 'high' },
        { title: 'Music / DJ brief', priority: 'medium' },
        { title: 'Decor shopping list', priority: 'medium' },
      ],
    },
    'Food & Drink': {
      ideas: [
        'Full menu planning and course timing',
        'Chef / kitchen coordination and prep list',
        'Beverage pairings and bar inventory',
        'Allergen labeling and server briefings',
      ],
      tips: [
        'Do a tasting with key dishes before the event.',
      ],
      timeline: [
        { offset: '-1 month', activity: 'Menu lock and supplier orders' },
        { offset: '-1 week', activity: 'Staff briefing; inventory check' },
        { offset: 'Day of', activity: 'Prep, service, breakdown' },
      ],
      checklist: [
        { title: 'Finalize menu', priority: 'high' },
        { title: 'Order ingredients / beverages', priority: 'high' },
        { title: 'Allergen list printed', priority: 'high' },
        { title: 'Staffing schedule', priority: 'medium' },
      ],
    },
    'Art & Culture': {
      ideas: [
        'Exhibition layout and wall labels',
        'Performer call times and stage cues',
        'Installation safety and power needs',
        'Opening remarks and guided tours',
      ],
      tips: [
        'Walk the space with artists 24 hours prior for placements.',
      ],
      timeline: [
        { offset: '-1 month', activity: 'Artist lineup; floor plan' },
        { offset: '-3 days', activity: 'Install exhibition / rehearse' },
        { offset: 'Day of', activity: 'Doors, performances, closing' },
      ],
      checklist: [
        { title: 'Floor plan approved', priority: 'high' },
        { title: 'Wall labels printed', priority: 'medium' },
        { title: 'Performer call sheet', priority: 'high' },
        { title: 'Insurance / artwork care', priority: 'high' },
      ],
    },
  },

  normalizeCategory(name) {
    if (!name) return '';
    if (typeof normalizeCategoryName === 'function') return normalizeCategoryName(name);
    return name;
  },

  get(category, context = {}) {
    const key = this.normalizeCategory(category) || 'Custom';
    const base = this.templates[key] || this.templates._fallback || {
      ideas: ['Define goals', 'Confirm venue and budget', 'Build a guest list', 'Create a run-of-show'],
      tips: ['Start with the guest experience, then reverse-plan logistics.'],
      timeline: [
        { offset: '-1 month', activity: 'Book essentials' },
        { offset: '-1 week', activity: 'Confirm details' },
        { offset: 'Day of', activity: 'Execute plan' },
      ],
      checklist: [
        { title: 'Confirm venue', priority: 'high' },
        { title: 'Finalize budget', priority: 'high' },
        { title: 'Invite guests', priority: 'medium' },
      ],
    };
    const extras = this.extras[key] || this.extras._default;
    const plan = {
      category: key,
      ideas: [...(base.ideas || [])],
      tips: [...(base.tips || [])],
      timeline: (base.timeline || []).map(t => ({ ...t })),
      checklist: (base.checklist || []).map(c => ({ ...c })),
      decorations: [...(extras.decorations || this.extras._default.decorations)],
      budgetSuggestions: (extras.budgetSuggestions || this.extras._default.budgetSuggestions).map(b => ({ ...b })),
      vendorRecommendations: [...(extras.vendorRecommendations || this.extras._default.vendorRecommendations)],
      moodPalette: [...(extras.moodPalette || this.extras._default.moodPalette)],
      giftRegistryTips: extras.giftRegistryTips ? [...extras.giftRegistryTips] : [],
      certificateTips: extras.certificateTips ? [...extras.certificateTips] : [],
    };
    return this.personalize(plan, context);
  },

  personalize(plan, ctx = {}) {
    const title = (ctx.title || '').trim();
    const location = (ctx.location || ctx.venue || '').trim();
    const capacity = parseInt(ctx.capacity, 10) || 0;
    const budget = parseFloat(ctx.budget, 10) || 0;
    const date = ctx.date || '';
    const customType = (ctx.customType || '').trim();
    const description = (ctx.description || '').trim().toLowerCase();

    if (title) {
      plan.ideas = [
        `Shape the guest journey around “${title}” from arrival to farewell`,
        ...plan.ideas.filter(i => !i.toLowerCase().includes(title.toLowerCase())),
      ].slice(0, 8);
      plan.checklist.unshift({ title: `Confirm concept & headline for “${title}”`, priority: 'high' });
    }

    if (customType && customType !== 'Custom') {
      plan.tips.unshift(`Treat this as a ${customType}: borrow best practices from similar gatherings, then customize.`);
      plan.ideas.unshift(`List the 3 signature moments guests must remember from your ${customType}`);
    }

    if (location) {
      plan.checklist.push({ title: `Confirm logistics for ${location}`, priority: 'high' });
      plan.tips.push(`Walk the ${location} layout: entrances, restrooms, power, and rain/weather backup.`);
    }

    if (capacity > 0) {
      plan.tips.push(`Plan for ~${capacity} guests: seating, catering portions, and queue times.`);
      plan.checklist.push({ title: `Finalize headcount near ${capacity} capacity`, priority: 'medium' });
      if (capacity >= 100) {
        plan.vendorRecommendations.push('Crowd / queue management');
        plan.ideas.push('Add wayfinding signs and staggered entry to avoid bottlenecks');
      } else if (capacity <= 30) {
        plan.ideas.push('Keep the format intimate: shared tables, personal welcome, host-led toasts');
      }
    }

    if (budget > 0) {
      plan.tips.push(`Work within $${budget.toLocaleString()}: lock venue + catering first, then allocate decor and extras.`);
      plan.budgetSuggestions = plan.budgetSuggestions.map(b => ({
        ...b,
        amount: Math.round(budget * (b.pct / 100) * 100) / 100,
      }));
    }

    if (date) {
      const days = Math.ceil((new Date(`${date}T12:00:00`) - new Date()) / 86400000);
      if (!Number.isNaN(days)) {
        if (days < 14) {
          plan.tips.unshift('Tight timeline: prioritize invites, catering count, and day-of run-of-show only.');
          plan.checklist.unshift({ title: 'Send / confirm invites today', priority: 'high' });
        } else if (days < 45) {
          plan.tips.unshift(`You have about ${days} days — lock vendors this week and send invites soon.`);
        } else {
          plan.tips.unshift(`Event date set (~${days} days out). Use the timeline offsets to backplan from ${date}.`);
        }
      }
    }

    if (description.includes('outdoor') || description.includes('garden') || description.includes('beach')) {
      plan.tips.push('Outdoor plan: tent/umbrella backup, power access, lighting after dusk, insect care.');
      plan.checklist.push({ title: 'Confirm weather backup plan', priority: 'high' });
    }
    if (description.includes('kids') || description.includes('children')) {
      plan.ideas.push('Kid zone: activities table, safe space, allergy-aware snacks');
    }
    if (description.includes('hybrid') || description.includes('virtual') || description.includes('stream')) {
      plan.vendorRecommendations.push('Streaming / AV tech');
      plan.checklist.push({ title: 'Test stream + mic setup', priority: 'high' });
    }

    // de-dupe checklist titles
    const seen = new Set();
    plan.checklist = plan.checklist.filter(c => {
      const k = c.title.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    }).slice(0, 12);

    plan.summary = this.buildSummary(plan, ctx);
    return plan;
  },

  buildSummary(plan, ctx) {
    const parts = [];
    const cat = plan.category || 'your event';
    parts.push(`Plan for ${cat}${ctx.title ? ` — “${ctx.title}”` : ''}.`);
    if (ctx.date) parts.push(`Date: ${ctx.date}.`);
    if (ctx.location) parts.push(`Location: ${ctx.location}.`);
    if (ctx.capacity) parts.push(`Capacity ~${ctx.capacity}.`);
    if (ctx.budget) parts.push(`Budget $${Number(ctx.budget).toLocaleString()}.`);
    parts.push(`Ready: ${plan.checklist.length} tasks, ${plan.timeline.length} timeline steps, ${(plan.vendorRecommendations || []).length} vendors.`);
    return parts.join(' ');
  },

  answer(question, context = {}) {
    const raw = (question || '').trim();
    const q = raw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const plan = this.get(context.category || 'Custom', context);
    if (!q) return "Hi! I'm here to help — in English. Ask about budget, guests, vendors, timeline, decor, invites, or seating.";

    const isGreeting = /^(hi|hey|hello|howdy|yo|sup|good morning|good afternoon|good evening|pershendetje|ckemi|si je|si jeni|hola|ciao)[\s!.,?]*$/i.test(raw)
      || /^(hi|hey|hello|pershendetje|ckemi)\s/i.test(raw);
    if (isGreeting) {
      const title = context.title ? ` “${context.title}”` : '';
      return [
        `Hi! I'm your AI planning assistant (English only).`,
        `I can help you plan${title || ' your event'}.`,
        '',
        'What would you like to work on?',
        '• Budget split',
        '• Guest list & invites',
        '• Vendors',
        '• Timeline / schedule',
        '• Decor & colors',
        '',
        'Example: "How should I split the budget?"',
      ].join('\n');
    }

    if (/^(thanks|thank you|thx|ty|faleminderit|flm)[\s!.]*$/i.test(raw)) {
      return "You're welcome! Ask anytime — I'm here to help with your event plan.";
    }

    if (/^(help|i need help|can you help|ndihmo|me ndihmo)[\s!.?]*$/i.test(raw)) {
      return "Absolutely — I'm here to help in English!\n\nTell me what you need: budget, guests, vendors, timeline, or decor.";
    }

    if (/invite|share link|whatsapp|who.?s coming|private/.test(q)) {
      return [
        'Invite & host tools:',
        '• Share link / WhatsApp / Email — host only (top of planner)',
        '• Guests open the link and vote Coming / Maybe / Not coming',
        '• Who\'s coming — host only list of replies',
        '• Private / Invite Only — set under Basics visibility',
      ].join('\n');
    }

    if (/budget|cost|money|€|\$/.test(q)) {
      const lines = (plan.budgetSuggestions || []).map(b =>
        b.amount != null ? `• ${b.item}: ${b.pct}% (≈ $${b.amount})` : `• ${b.item}: ${b.pct}%`
      );
      return `Budget split ideas:\n${lines.join('\n')}\nTip: ${plan.tips.find(t => /budget|\$|cost/i.test(t)) || 'Lock fixed costs first, then flex decor.'}`;
    }
    if (/guest|rsvp|invitation/.test(q)) {
      return [
        'Guest & invite workflow:',
        '1) Draft guest list with VIP / plus-ones',
        '2) Share your invite link (host tools)',
        '3) Track RSVP under Who\'s coming / Guests tab',
        '4) Final headcount 3–7 days before catering',
        context.capacity ? `Target capacity: ~${context.capacity}.` : '',
      ].filter(Boolean).join('\n');
    }
    if (/vendor|cater|dj|photo|florist/.test(q)) {
      return `Recommended vendors for this event:\n${(plan.vendorRecommendations || []).map(v => `• ${v}`).join('\n')}\nAsk each for contract, deposit, and day-of contact.`;
    }
    if (/timeline|schedule|when|deadline/.test(q)) {
      return `Suggested timeline:\n${plan.timeline.map(t => `• ${t.offset}: ${t.activity}`).join('\n')}`;
    }
    if (/decor|decoration|theme|color|palette|mood/.test(q)) {
      return `Decoration ideas:\n${(plan.decorations || []).map(d => `• ${d}`).join('\n')}\nPalette: ${(plan.moodPalette || []).join(', ')}`;
    }
    if (/seat|table|place card/.test(q)) {
      return 'Seating tips:\n• Use the Seating tab to add tables\n• Put VIPs near the host / stage\n• Keep aisles clear for service\n• Print a simple seating chart for greeters';
    }
    if (/menu|food|cater|drink|allerg/.test(q)) {
      return 'Menu tips:\n• Collect allergies in Guests notes\n• Offer one vegetarian / one kid option if mixed crowd\n• Use the Menu tab for courses\n• Finalize count after RSVP deadline';
    }
    if (/checklist|todo|task|prepar/.test(q)) {
      return `Top checklist items:\n${plan.checklist.slice(0, 8).map(c => `• [${c.priority}] ${c.title}`).join('\n')}`;
    }
    if (/weather|outdoor|rain/.test(q)) {
      return 'Weather plan:\n• Check forecast 7 days and 48 hours out\n• Have tent / indoor backup\n• Protect cables and sound from moisture\n• Communicate dress code for heat/cold';
    }

    return `${plan.summary}\n\nIdeas:\n${plan.ideas.slice(0, 4).map(i => `• ${i}`).join('\n')}\n\nAsk me in English about: budget, guests, vendors, timeline, decor, menu, or seating.`;
  },

  extras: {
    _default: {
      decorations: ['Clean color palette', 'Soft lighting', 'Signage for entrances'],
      budgetSuggestions: [
        { item: 'Venue', pct: 30 },
        { item: 'Food & drink', pct: 25 },
        { item: 'Entertainment', pct: 15 },
        { item: 'Decor', pct: 10 },
        { item: 'Contingency', pct: 10 },
        { item: 'Other', pct: 10 },
      ],
      vendorRecommendations: ['Venue coordinator', 'Caterer', 'AV technician'],
      moodPalette: ['#0f766e', '#f8fafc', '#1e293b', '#b45309'],
    },
    Weddings: {
      decorations: ['Floral arches', 'Candle centerpieces', 'Soft draping', 'Place cards & seating chart'],
      budgetSuggestions: [
        { item: 'Venue', pct: 35 }, { item: 'Food', pct: 25 }, { item: 'Photography', pct: 12 },
        { item: 'Florals', pct: 10 }, { item: 'Music', pct: 8 }, { item: 'Contingency', pct: 10 },
      ],
      vendorRecommendations: ['Photographer', 'Videographer', 'Florist', 'DJ', 'Caterer', 'Cake designer'],
      moodPalette: ['#fdf2f8', '#be123c', '#fef3c7', '#44403c'],
      giftRegistryTips: ['Register 2–3 retailers', 'Include experiences not only goods', 'Share registry on invitations'],
    },
    'Birthday Parties': {
      decorations: ['Balloon garland', 'Themed tableware', 'Photo backdrop', 'Cake table styling'],
      budgetSuggestions: [
        { item: 'Venue / home setup', pct: 20 }, { item: 'Food & cake', pct: 35 },
        { item: 'Decor', pct: 15 }, { item: 'Entertainment', pct: 20 }, { item: 'Favors', pct: 10 },
      ],
      vendorRecommendations: ['Baker', 'Decorator', 'Entertainer / DJ', 'Photographer'],
      moodPalette: ['#fef9c3', '#ea580c', '#67e8f9', '#1e293b'],
    },
    Conferences: {
      decorations: ['Stage branding', 'Wayfinding banners', 'Sponsor wall', 'Lanyard color coding'],
      budgetSuggestions: [
        { item: 'Venue', pct: 30 }, { item: 'AV & streaming', pct: 20 }, { item: 'Catering', pct: 25 },
        { item: 'Marketing', pct: 10 }, { item: 'Staff', pct: 10 }, { item: 'Contingency', pct: 5 },
      ],
      vendorRecommendations: ['AV company', 'Caterer', 'Badge printer', 'Registration platform'],
      moodPalette: ['#0f172a', '#0284c7', '#e2e8f0', '#f97316'],
      certificateTips: ['Include attendee name, session title, date, organizer signature'],
    },
    'Business Meetings': {
      decorations: ['Clean boardroom setup', 'Name tents', 'Branded notepads'],
      budgetSuggestions: [
        { item: 'Room', pct: 40 }, { item: 'Catering', pct: 35 }, { item: 'Materials', pct: 15 }, { item: 'Contingency', pct: 10 },
      ],
      vendorRecommendations: ['Caterer', 'AV support'],
      moodPalette: ['#f8fafc', '#334155', '#0f766e', '#cbd5e1'],
    },
    'Music Concerts': {
      decorations: ['Stage lighting washes', 'Merch backdrop', 'Entrance arch'],
      budgetSuggestions: [
        { item: 'Talent', pct: 35 }, { item: 'Sound & lights', pct: 25 }, { item: 'Venue', pct: 20 },
        { item: 'Security', pct: 10 }, { item: 'Marketing', pct: 10 },
      ],
      vendorRecommendations: ['Sound engineer', 'Lighting designer', 'Security', 'Stage crew'],
      moodPalette: ['#020617', '#7c3aed', '#f43f5e', '#fbbf24'],
    },
    'Sports Events': {
      decorations: ['Team banners', 'Finish-line arch', 'Medal stand backdrop'],
      budgetSuggestions: [
        { item: 'Venue', pct: 25 }, { item: 'Officials', pct: 15 }, { item: 'Equipment', pct: 20 },
        { item: 'Medical', pct: 10 }, { item: 'Awards', pct: 10 }, { item: 'Staff', pct: 20 },
      ],
      vendorRecommendations: ['Equipment rental', 'Medical staff', 'Referees', 'Photographers'],
      moodPalette: ['#14532d', '#22c55e', '#f8fafc', '#0ea5e9'],
    },
    'Music Festivals': {
      decorations: ['Entrance gate', 'Stage banners', 'VIP lounge signs', 'Night string lights'],
      budgetSuggestions: [
        { item: 'Site & permits', pct: 20 }, { item: 'Stages / AV', pct: 25 }, { item: 'Artists', pct: 20 },
        { item: 'Security', pct: 15 }, { item: 'Staff & volunteers', pct: 20 },
      ],
      vendorRecommendations: ['Stage production', 'Sound & lighting', 'Security', 'Food vendors', 'Sanitation'],
      moodPalette: ['#422006', '#f59e0b', '#ec4899', '#14b8a6'],
    },
    Festivals: {
      decorations: ['Entrance gate', 'Stage banners', 'Vendor lane signs', 'Night string lights'],
      budgetSuggestions: [
        { item: 'Site & permits', pct: 25 }, { item: 'Stages / AV', pct: 25 }, { item: 'Security', pct: 15 },
        { item: 'Marketing', pct: 15 }, { item: 'Staff & volunteers', pct: 20 },
      ],
      vendorRecommendations: ['Stage production', 'Security', 'Sanitation', 'Power / generators'],
      moodPalette: ['#422006', '#f59e0b', '#ec4899', '#14b8a6'],
    },
    Workshops: {
      decorations: ['Demo station', 'Materials table signs', 'Welcome board'],
      budgetSuggestions: [
        { item: 'Instructor', pct: 30 }, { item: 'Materials', pct: 30 }, { item: 'Venue', pct: 25 }, { item: 'Contingency', pct: 15 },
      ],
      vendorRecommendations: ['Instructor', 'Materials supplier', 'Photographer'],
      moodPalette: ['#faf5ff', '#7c3aed', '#fef3c7', '#334155'],
      certificateTips: ['Workshop certificates with skills taught and hours completed'],
    },
    Graduation: {
      decorations: ['Stage draping', 'Photo step-and-repeat', 'Class year balloons'],
      budgetSuggestions: [
        { item: 'Venue', pct: 30 }, { item: 'Photography', pct: 15 }, { item: 'Catering', pct: 30 },
        { item: 'Decor', pct: 15 }, { item: 'Certificates', pct: 10 },
      ],
      vendorRecommendations: ['Photographer', 'Caterer', 'Decorator', 'AV'],
      moodPalette: ['#1e3a8a', '#fbbf24', '#f8fafc', '#0f172a'],
    },
    'Baby Showers': {
      decorations: ['Balloon arch', 'Dessert table', 'Gift corner', 'Games station'],
      budgetSuggestions: [
        { item: 'Food', pct: 35 }, { item: 'Decor', pct: 25 }, { item: 'Games/prizes', pct: 15 },
        { item: 'Cake', pct: 15 }, { item: 'Favors', pct: 10 },
      ],
      vendorRecommendations: ['Baker', 'Decorator', 'Caterer', 'Photographer'],
      moodPalette: ['#ecfeff', '#fbcfe8', '#fef9c3', '#64748b'],
      giftRegistryTips: ['Share registry on invite', 'Group gift option', 'Thank-you tracker'],
    },
    'Charity Events': {
      decorations: ['Cause storytelling wall', 'Sponsor logos', 'Donation QR stations'],
      budgetSuggestions: [
        { item: 'Venue', pct: 25 }, { item: 'Catering', pct: 25 }, { item: 'Marketing', pct: 20 },
        { item: 'AV', pct: 15 }, { item: 'Fundraising tools', pct: 15 },
      ],
      vendorRecommendations: ['AV', 'Caterer', 'Donation platform', 'Photographer'],
      moodPalette: ['#7f1d1d', '#fecaca', '#f8fafc', '#0f766e'],
    },
    'Networking Events': {
      decorations: ['Name-badge bar', 'Conversation lounges', 'Sponsor table tops'],
      budgetSuggestions: [
        { item: 'Venue', pct: 35 }, { item: 'Catering', pct: 30 }, { item: 'Badges', pct: 10 },
        { item: 'AV / mic', pct: 10 }, { item: 'Marketing', pct: 15 },
      ],
      vendorRecommendations: ['Caterer', 'Badge printer', 'Photographer'],
      moodPalette: ['#0f172a', '#38bdf8', '#f1f5f9', '#f97316'],
    },
    'Private Parties': {
      decorations: ['Ambient lighting', 'Lounge zones', 'Centerpiece accents'],
      budgetSuggestions: [
        { item: 'Venue', pct: 30 }, { item: 'Catering', pct: 30 }, { item: 'Music', pct: 15 },
        { item: 'Decor', pct: 15 }, { item: 'Staff', pct: 10 },
      ],
      vendorRecommendations: ['Caterer', 'DJ', 'Decorator', 'Security if large'],
      moodPalette: ['#18181b', '#a855f7', '#fce7f3', '#eab308'],
    },
    'Food & Drink': {
      decorations: ['Menu boards', 'Tasting stations', 'Chef demo lighting'],
      budgetSuggestions: [
        { item: 'Ingredients', pct: 40 }, { item: 'Staff', pct: 25 }, { item: 'Venue/kitchen', pct: 20 },
        { item: 'Beverages', pct: 15 },
      ],
      vendorRecommendations: ['Chef', 'Beverage supplier', 'Rentals (plates/glassware)'],
      moodPalette: ['#451a03', '#f97316', '#fef3c7', '#166534'],
    },
    'Art & Culture': {
      decorations: ['Gallery lighting', 'Exhibition labels', 'Feature wall installation'],
      budgetSuggestions: [
        { item: 'Venue', pct: 30 }, { item: 'Artists / performers', pct: 30 }, { item: 'Install', pct: 15 },
        { item: 'Marketing', pct: 15 }, { item: 'Insurance', pct: 10 },
      ],
      vendorRecommendations: ['Lighting tech', 'Install crew', 'Insurance broker', 'Photographer'],
      moodPalette: ['#fafaf9', '#292524', '#dc2626', '#ca8a04'],
    },
  },
};
