// Runs in <head> before paint. Sync-checks for a Supabase session in localStorage
// so unauthenticated visitors never briefly see protected pages.
(function () {
  var PUBLIC = {
    'index.html': true,
    'login.html': true,
    'register.html': true,
    'forgot-password.html': true,
    'reset-password.html': true,
    'invite.html': true,
    'organizer.html': true,
    'events.html': true,
    'event.html': true,
    'about.html': true,
    'contact.html': true,
    'calendar.html': true,
  };

  function normalizePage(name) {
    name = (name || '').split('?')[0].split('#')[0];
    if (!name || name === '/' || name === '') return 'index.html';
    if (name.indexOf('.') === -1) name += '.html';
    return name;
  }

  function safeRedirectTarget(raw) {
    if (!raw) return 'index.html';
    try { raw = decodeURIComponent(String(raw)); } catch (e) { /* keep raw */ }
    raw = String(raw).replace(/^\/+/, '');
    var onlyPage = normalizePage(raw.split('?')[0].split('#')[0]);
    if (
      onlyPage === 'login.html' ||
      onlyPage === 'register.html' ||
      onlyPage === 'forgot-password.html' ||
      /^https?:/i.test(raw) ||
      raw.indexOf('redirect=') !== -1
    ) {
      return 'index.html';
    }
    return raw;
  }

  var page = normalizePage(location.pathname.split('/').pop());

  function hasSupabaseSession() {
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var key = localStorage.key(i);
        if (!key || key.indexOf('auth-token') === -1) continue;
        var raw = localStorage.getItem(key);
        if (!raw) continue;
        var parsed = JSON.parse(raw);
        if (!parsed) continue;
        if (parsed.access_token || parsed.currentSession || (parsed.user && parsed.user.id)) {
          return true;
        }
      }
    } catch (e) { /* ignore */ }
    return false;
  }

  var loggedIn = hasSupabaseSession();

  if (!loggedIn && !PUBLIC[page]) {
    var target = safeRedirectTarget(page + location.search + location.hash);
    location.replace('login.html?redirect=' + encodeURIComponent(target));
    return;
  }

  if (loggedIn && (page === 'login.html' || page === 'register.html')) {
    var params = new URLSearchParams(location.search);
    location.replace(safeRedirectTarget(params.get('redirect') || 'index.html'));
  }
})();
