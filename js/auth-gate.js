// Runs in <head> before paint. Sync-checks for a Supabase session in localStorage
// so unauthenticated visitors never briefly see protected pages.
(function () {
  var PUBLIC = {
    'login.html': true,
    'register.html': true,
    'forgot-password.html': true,
    'reset-password.html': true,
    'invite.html': true,
    'organizer.html': true,
  };

  var page = (location.pathname.split('/').pop() || 'index.html').split('?')[0];
  if (!page || page === '') page = 'index.html';

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
    var target = page + location.search + location.hash;
    location.replace('login.html?redirect=' + encodeURIComponent(target));
    return;
  }

  if (loggedIn && (page === 'login.html' || page === 'register.html')) {
    var params = new URLSearchParams(location.search);
    location.replace(params.get('redirect') || 'index.html');
  }
})();
