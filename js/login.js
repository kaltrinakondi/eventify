document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('login-form');
    const alertContainer = document.getElementById('alert-container');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;

        try {
            const data = await apiRequest('login.php', {
                method: 'POST',
                body: {
                    email: form.email.value.trim(),
                    password: form.password.value,
                },
            });

            if (data.success) {
                currentUser = data.user;
                const params = new URLSearchParams(window.location.search);
                const redirect = params.get('redirect') || 'index.html';
                window.location.href = redirect;
            } else {
                showAlert(alertContainer, data.message);
            }
        } catch {
            showAlert(alertContainer, 'Login failed. Please try again.');
        } finally {
            submitBtn.disabled = false;
        }
    });
});
