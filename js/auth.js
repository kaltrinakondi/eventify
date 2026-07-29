const Auth = {
  async login(email, password) {
    return EventifyDB.login(email, password);
  },

  async register(name, email, password, confirmPassword) {
    if (password !== confirmPassword) return { success: false, message: 'Passwords do not match.' };
    if (password.length < 6) return { success: false, message: 'Password must be at least 6 characters.' };
    return EventifyDB.register(name, email, password);
  },

  initLoginForm() {
    const form = document.getElementById('login-form');
    if (!form) return;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const alert = document.getElementById('form-alert');
      const btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.textContent = 'Signing in...';
      try {
        const data = await this.login(form.email.value.trim(), form.password.value);
        if (data.success && data.user) {
          const params = new URLSearchParams(window.location.search);
          const target = typeof safeAuthRedirect === 'function'
            ? safeAuthRedirect(params.get('redirect') || 'index.html')
            : (params.get('redirect') || 'index.html');
          window.location.href = target;
        } else {
          alert.className = 'alert alert-error';
          const msg = (data.message || '').toLowerCase();
          alert.textContent = (msg.includes('confirm') || msg.includes('verified') || msg.includes('verification'))
            ? 'Please confirm your email before signing in. Check your inbox for the verification link.'
            : data.message;
          alert.classList.remove('hidden');
        }
      } catch (err) {
        alert.className = 'alert alert-error';
        alert.textContent = err?.message ? `Connection error: ${err.message}` : 'Connection error. Check Supabase config.';
        alert.classList.remove('hidden');
      }
      btn.disabled = false;
      btn.textContent = 'Log In';
    });
  },

  initRegisterForm() {
    const form = document.getElementById('register-form');
    if (!form) return;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const alert = document.getElementById('form-alert');
      const btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.textContent = 'Creating account...';
      try {
        const email = form.email.value.trim();
        const data = await this.register(
          form.name.value.trim(), email,
          form.password.value, form.confirm_password.value
        );
        alert.className = `alert ${data.success ? 'alert-success' : 'alert-error'}`;
        alert.textContent = data.message;
        alert.classList.remove('hidden');

        if (data.success && data.needsEmailConfirm) {
          // Stay on page — show verify instructions + resend
          const box = document.getElementById('verify-email-box');
          if (box) {
            box.classList.remove('hidden');
            const emailEl = document.getElementById('verify-email-address');
            if (emailEl) emailEl.textContent = email;
          }
          form.classList.add('hidden');
          document.getElementById('resend-verify-btn')?.addEventListener('click', async () => {
            const resendBtn = document.getElementById('resend-verify-btn');
            if (resendBtn) resendBtn.disabled = true;
            const res = await EventifyDB.resendSignupEmail(email);
            alert.className = `alert ${res.success ? 'alert-success' : 'alert-error'}`;
            alert.textContent = res.message;
            alert.classList.remove('hidden');
            if (resendBtn) resendBtn.disabled = false;
          }, { once: true });
        } else if (data.success && data.user) {
          const params = new URLSearchParams(window.location.search);
          const target = typeof safeAuthRedirect === 'function'
            ? safeAuthRedirect(params.get('redirect') || 'index.html')
            : (params.get('redirect') || 'index.html');
          setTimeout(() => { window.location.href = target; }, 1200);
        }
      } catch (err) {
        alert.className = 'alert alert-error';
        alert.textContent = err?.message ? `Connection error: ${err.message}` : 'Connection error. Check Supabase config.';
        alert.classList.remove('hidden');
      }
      btn.disabled = false;
      btn.textContent = 'Create Account';
    });
  },

  initForgotForm() {
    const form = document.getElementById('forgot-form');
    if (!form) return;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const alert = document.getElementById('form-alert');
      const btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      const data = await EventifyDB.resetPassword(form.email.value.trim());
      alert.className = `alert ${data.success ? 'alert-success' : 'alert-error'}`;
      alert.textContent = data.message;
      alert.classList.remove('hidden');
      btn.disabled = false;
    });
  },

  initResetForm() {
    const form = document.getElementById('reset-form');
    if (!form) return;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const alert = document.getElementById('form-alert');
      const p1 = form.password.value;
      const p2 = form.confirm_password.value;
      if (p1.length < 6) {
        alert.className = 'alert alert-error';
        alert.textContent = 'Password must be at least 6 characters.';
        alert.classList.remove('hidden');
        return;
      }
      if (p1 !== p2) {
        alert.className = 'alert alert-error';
        alert.textContent = 'Passwords do not match.';
        alert.classList.remove('hidden');
        return;
      }
      const data = await EventifyDB.updatePassword(p1);
      alert.className = `alert ${data.success ? 'alert-success' : 'alert-error'}`;
      alert.textContent = data.message;
      alert.classList.remove('hidden');
      if (data.success) setTimeout(() => { window.location.href = 'login.html'; }, 2000);
    });
  },
};

document.addEventListener('DOMContentLoaded', () => {
  Auth.initLoginForm();
  Auth.initRegisterForm();
  Auth.initForgotForm();
  Auth.initResetForm();

  // After email verification redirect
  const params = new URLSearchParams(window.location.search);
  if (params.get('confirmed') === '1' || params.get('verified') === '1') {
    const alert = document.getElementById('form-alert');
    if (alert) {
      alert.className = 'alert alert-success';
      alert.textContent = 'Email verified! You can log in now.';
      alert.classList.remove('hidden');
    }
  }
});
