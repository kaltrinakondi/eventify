document.addEventListener('DOMContentLoaded', async () => {
    const form = document.getElementById('create-event-form');
    const alertContainer = document.getElementById('alert-container');
    const categorySelect = document.getElementById('category');

    const user = await checkAuth();
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    CATEGORIES.forEach((cat) => {
        categorySelect.innerHTML += `<option value="${cat.name}">${cat.name}</option>`;
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = {
            title: form.title.value.trim(),
            description: form.description.value.trim(),
            category: form.category.value,
            date: form.date.value,
            time: form.time.value,
            location: form.location.value.trim(),
            image: form.image.value.trim(),
        };

        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Creating...';

        try {
            const data = await apiRequest('create_event.php', {
                method: 'POST',
                body: formData,
            });

            if (data.success) {
                showAlert(alertContainer, 'Event created successfully! Redirecting...', 'success');
                setTimeout(() => {
                    window.location.href = `event-details.html?id=${data.event_id}`;
                }, 1500);
            } else {
                showAlert(alertContainer, data.message);
            }
        } catch {
            showAlert(alertContainer, 'Failed to create event. Please try again.');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Create Event';
        }
    });
});
