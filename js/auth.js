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
          window.location.href = params.get('redirect') || 'index.html';
        } else {
          alert.className = 'alert alert-error';
          alert.textContent = data.message === 'Email not confirmed'
            ? 'Please confirm your email before signing in. Check your inbox for the confirmation link.'
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
        const data = await this.register(
          form.name.value.trim(), form.email.value.trim(),
          form.password.value, form.confirm_password.value
        );
        alert.className = `alert ${data.success ? 'alert-success' : 'alert-error'}`;
        alert.textContent = data.message;
        alert.classList.remove('hidden');
        if (data.success && data.user) {
          const params = new URLSearchParams(window.location.search);
          setTimeout(() => { window.location.href = params.get('redirect') || 'index.html'; }, 1500);
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
});
