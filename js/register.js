document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('register-form');
    const alertContainer = document.getElementById('alert-container');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const password = form.password.value;
        if (password.length < 6) {
            showAlert(alertContainer, 'Password must be at least 6 characters.');
            return;
        }

        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;

        try {
            const data = await apiRequest('register.php', {
                method: 'POST',
                body: {
                    name: form.name.value.trim(),
                    email: form.email.value.trim(),
                    password: password,
                },
            });

            if (data.success) {
                currentUser = data.user;
                window.location.href = 'index.html';
            } else {
                showAlert(alertContainer, data.message);
            }
        } catch {
            showAlert(alertContainer, 'Registration failed. Please try again.');
        } finally {
            submitBtn.disabled = false;
        }
    });
});
