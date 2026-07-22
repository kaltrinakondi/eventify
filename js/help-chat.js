/**
 * Floating Help Assistant — English-only support chat for Eventify.
 */
const HelpChat = {
  open: false,
  language: 'en',

  mount() {
    if (document.getElementById('help-chat-root')) return;

    const root = document.createElement('div');
    root.id = 'help-chat-root';
    root.setAttribute('lang', 'en');
    root.innerHTML = `
      <button type="button" class="help-chat-fab" id="help-chat-fab" aria-label="Open help chat">
        <span class="help-chat-fab-icon">💬</span>
        <span class="help-chat-fab-label">Help</span>
      </button>
      <div class="help-chat-panel hidden" id="help-chat-panel" role="dialog" aria-label="Help assistant">
        <div class="help-chat-header">
          <div>
            <strong>Help Assistant</strong>
            <p>English support for Eventify — login, events, invites, planner…</p>
          </div>
          <button type="button" class="help-chat-close" id="help-chat-close" aria-label="Close">×</button>
        </div>
        <div class="help-chat-messages" id="help-chat-messages"></div>
        <div class="help-chat-quick" id="help-chat-quick"></div>
        <form class="help-chat-form" id="help-chat-form">
          <input type="text" id="help-chat-input" placeholder="Type your question in English…" autocomplete="off" lang="en">
          <button type="submit" class="btn btn-sm btn-primary">Send</button>
        </form>
      </div>
    `;
    document.body.appendChild(root);

    document.getElementById('help-chat-fab').addEventListener('click', () => this.toggle(true));
    document.getElementById('help-chat-close').addEventListener('click', () => this.toggle(false));
    document.getElementById('help-chat-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.send();
    });

    const quick = [
      ['Hi', 'Hi'],
      ['Create event', 'How do I create an event?'],
      ['Invite link', 'How do I share my invite link?'],
      ["Who's coming", 'How do I see who is coming?'],
      ['Login', "I can't log in"],
      ['Favorites', 'How do I save favorite events?'],
      ['RSVP', 'How do I RSVP to an event?'],
      ['AI planner', 'How does the AI Assistant work?'],
      ['Private event', 'How do private events work?'],
    ];
    document.getElementById('help-chat-quick').innerHTML = quick.map(([label, q]) =>
      `<button type="button" class="help-chip" data-q="${this.escape(q)}">${this.escape(label)}</button>`
    ).join('');
    document.querySelectorAll('.help-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        document.getElementById('help-chat-input').value = btn.dataset.q;
        this.send();
      });
    });

    this.say(
      'assistant',
      "Hi! I'm your Help Assistant. I only reply in English.\n\nAsk me about login, creating events, invite links, Who's coming, favorites, RSVP, or the AI planner."
    );
  },

  normalize(text) {
    return String(text || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  },

  isGreeting(text) {
    const q = this.normalize(text).replace(/[!?.]+$/g, '');
    return /^(hi|hey|hello|howdy|yo|sup|good morning|good afternoon|good evening|hola|ciao|pershendetje|ckemi|si je|si jeni)$/.test(q)
      || /^(hi|hey|hello|pershendetje|ckemi)\s/.test(q);
  },

  isThanks(text) {
    const q = this.normalize(text);
    return /^(thanks|thank you|thx|ty|appreciate it|cheers|faleminderit|flm)[\s!.]*$/.test(q);
  },

  wantsEnglishNote(text) {
    const q = this.normalize(text);
    return /pershendetje|faleminderit|ndihme|ndihmo|si funksionon|me trego|si bej|si ta|ckemi|si je|si jeni|shqip|albanian/.test(q);
  },

  toggle(force) {
    this.open = typeof force === 'boolean' ? force : !this.open;
    document.getElementById('help-chat-panel')?.classList.toggle('hidden', !this.open);
    document.getElementById('help-chat-fab')?.classList.toggle('open', this.open);
    if (this.open) document.getElementById('help-chat-input')?.focus();
  },

  escape(text) {
    if (typeof Eventify !== 'undefined' && Eventify.escapeHtml) return Eventify.escapeHtml(text);
    const d = document.createElement('div');
    d.textContent = text ?? '';
    return d.innerHTML;
  },

  say(role, text) {
    const box = document.getElementById('help-chat-messages');
    if (!box) return;
    const div = document.createElement('div');
    div.className = `help-bubble ${role}`;
    div.lang = 'en';
    div.innerHTML = String(text).split('\n').map(line => this.escape(line)).join('<br>');
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
  },

  send() {
    const input = document.getElementById('help-chat-input');
    const q = input?.value.trim();
    if (!q) return;
    this.say('user', q);
    input.value = '';
    let answer = this.answer(q);
    if (this.wantsEnglishNote(q) && !this.isGreeting(q) && !this.isThanks(q)) {
      answer = "I'll answer in English:\n\n" + answer;
    }
    setTimeout(() => this.say('assistant', answer), 280);
  },

  answer(raw) {
    const q = this.normalize(raw);

    if (this.isGreeting(raw)) {
      const name = typeof Eventify !== 'undefined' && Eventify.currentUser?.name
        ? ` ${Eventify.currentUser.name.split(' ')[0]}`
        : '';
      return `Hi${name}! I'm here to help — in English.\n\nWhat do you need help with?\n• Login / account\n• Create or edit an event\n• Invite link & WhatsApp / Email share\n• Who's coming\n• Favorites / RSVP\n• AI planner`;
    }

    if (this.isThanks(raw)) {
      return "You're welcome! Message me anytime if you need more help.";
    }

    if (/^(help|i need help|can you help|ndihmo|me ndihmo)[\s!.?]*$/.test(q)) {
      return "Of course — happy to help!\n\nTry asking:\n• \"How do I create an event?\"\n• \"How do I share my invite link?\"\n• \"How do I see who is coming?\"\n• \"I can't log in\"";
    }

    if (/invite link|share link|whatsapp|share invite|copy link|send invite/.test(q)) {
      return [
        'Share your invite link (host only):',
        '1) Open your event in the planner (Create Event / Edit)',
        '2) Save or Update the event first',
        '3) Use Copy link, WhatsApp, or Email at the top',
        '4) Guests open the link — no account needed — and choose Coming / Maybe / Not coming',
        '',
        'Only the host can share the link. Guests cannot see who else replied.',
      ].join('\n');
    }

    if (/who.?s coming|who is coming|guest list|responses|votes|rsvp list/.test(q)) {
      return [
        "Who's coming (host only):",
        '1) Open your event as the host',
        '2) Click "Who\'s coming" in the top bar (or Guests tab)',
        '3) Switch tabs: Coming / Maybe / Not coming / All',
        '4) Or Export CSV from Guests → Link RSVP responses',
        '',
        'Guests cannot see this list — only you can.',
      ].join('\n');
    }

    if (/private|invite only|visibility|hidden event/.test(q)) {
      return [
        'Event visibility:',
        '• Public — anyone can find it',
        '• Private — only you (the host) manage it',
        '• Invite Only — guests need to be on your list (by email) or use your invite link',
        '',
        'Set this at the top of Basics when creating/editing an event.',
      ].join('\n');
    }

    if (/login|log in|sign in|password|forgot|cant log|cannot log|nuk mund/.test(q)) {
      return [
        'Login help:',
        '1) Go to Log In',
        '2) Use your registered email + password',
        '3) Forgot password? Use Forgot Password',
        '4) Still stuck? Hard refresh (Ctrl+F5) and try again',
        '',
        'Page: login.html',
      ].join('\n');
    }

    if (/register|sign up|account|create account/.test(q)) {
      return [
        'Create an account:',
        '1) Open Sign Up / Register',
        '2) Enter name, email, and password',
        '3) Then log in',
        '',
        'You need an account to publish events. Guests can RSVP via invite link without an account.',
      ].join('\n');
    }

    if (/creat|publish|new event|planner|add more|custom event/.test(q)) {
      return [
        'Create an event:',
        '1) Click Create Event (or a category → Start Planning)',
        '2) Choose Public / Private / Invite Only',
        '3) Fill title, description, category, date, location',
        '4) Use tabs: Guests, Budget, Vendors, Schedule, AI…',
        '5) Save Draft or Publish Event',
        '',
        'Page: create-event.html',
      ].join('\n');
    }

    if (/favorit|saved|heart/.test(q)) {
      return [
        'Favorite Events:',
        '1) Click ♡ on an event card',
        '2) Open Favorite Events from the menu',
        '3) Click ♥ again to remove',
        '',
        'Page: favorites.html',
      ].join('\n');
    }

    if (/rsvp|going|maybe|attend|coming/.test(q)) {
      return [
        'Two RSVP ways:',
        'A) Public events — open the event page → Going / Maybe (must be logged in)',
        'B) Invite link — guest opens your share link → name → I\'m coming / Maybe / I\'m not coming (no account)',
        '',
        'Hosts see invite replies under Who\'s coming.',
      ].join('\n');
    }

    if (/ai|assistant|suggestion|checklist|timeline/.test(q)) {
      return [
        'AI Assistant (Create Event → AI Assistant tab):',
        '• Chat in English about budget, guests, vendors, timeline, decor',
        '• Refresh suggestions for your event details',
        '• Select items → Apply selected / Apply everything',
        '• Adds checklist, schedule, vendors, budget lines, and notes',
      ].join('\n');
    }

    if (/budget|cost|money|spend/.test(q)) {
      return [
        'Budget:',
        '1) Create Event → Budget tab',
        '2) Set Total Budget',
        '3) AI Assistant → apply budget ideas',
        '4) Track estimated vs actual amounts',
      ].join('\n');
    }

    if (/categor|wedding|birthday|add more/.test(q)) {
      return [
        'Categories:',
        '• Pick a category → Start Planning',
        '• Add More → custom event with your own name',
        '• Toolkit shows notes, themes, tips, and vendor ideas',
      ].join('\n');
    }

    if (/search|find event|look up/.test(q)) {
      return [
        'Search:',
        '• Use the Home search box (2+ letters)',
        '• Click a suggestion to open the event',
        '• One match → Search opens the event directly',
      ].join('\n');
    }

    if (/dash|account center|profile|settings|menu|hamburger/.test(q)) {
      return [
        'Navigation:',
        '• ☰ Settings → Home, Favorite Events, Account Center',
        '• Avatar menu → My Events, My RSVPs, Log Out',
      ].join('\n');
    }

    if (/edit|update event|delete|remove event/.test(q)) {
      return [
        'Edit / delete:',
        '• My Events → Edit',
        '• Update Event to save changes',
        '• Delete is available on My Events (host only)',
      ].join('\n');
    }

    if (/contact|support|email|bug|error|not working|broken|nuk hap|nuk punon/.test(q)) {
      return [
        'Sorry something is not working. Try this:',
        '1) Hard refresh: Ctrl+F5',
        '2) Make sure you are logged in as the host for share / Who\'s coming',
        '3) For invite links, run the SQL files in Supabase if you see database upgrade messages',
        '4) Contact page: contact.html',
      ].join('\n');
    }

    return [
      "I didn't catch that — I reply in English only.",
      'Try asking about:',
      '• create event',
      '• invite link / WhatsApp / Email',
      '• who\'s coming',
      '• private events',
      '• login / favorites / RSVP',
      '• AI assistant',
      '',
      'Or say "Hi" and I will guide you.',
    ].join('\n');
  },
};

window.HelpChat = HelpChat;
