let myEventsCache = {};

document.addEventListener('DOMContentLoaded', async () => {
    const list = document.getElementById('my-events-list');
    const modal = document.getElementById('edit-modal');
    const editForm = document.getElementById('edit-event-form');
    const editCategory = document.getElementById('edit-category');

    const user = await checkAuth();
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    CATEGORIES.forEach((cat) => {
        editCategory.innerHTML += `<option value="${cat.name}">${cat.name}</option>`;
    });

    await loadMyEvents();

    document.getElementById('modal-close')?.addEventListener('click', closeModal);
    modal?.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    editForm?.addEventListener('submit', handleEditSubmit);

    async function loadMyEvents() {
        list.innerHTML = '<div class="loading"><div class="spinner"></div><p>Loading your events...</p></div>';

        try {
            const data = await apiRequest('get_my_events.php');

            if (data.success && data.events.length > 0) {
                myEventsCache = {};
                data.events.forEach((e) => { myEventsCache[e.id] = e; });
                list.innerHTML = data.events.map(renderMyEventItem).join('');
                bindMyEventActions();
            } else {
                list.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">📅</div>
                        <h3>No events yet</h3>
                        <p>You haven't created any events. Start by creating your first event!</p>
                        <a href="create-event.html" class="btn btn-primary" style="margin-top: 1rem;">Create Event</a>
                    </div>
                `;
            }
        } catch {
            list.innerHTML = '<div class="empty-state"><h3>Error loading events</h3></div>';
        }
    }

    function renderMyEventItem(event) {
        const image = event.image || getDefaultImage();
        return `
            <div class="my-event-item" data-event-id="${event.id}">
                <div class="my-event-thumb">
                    <img src="${escapeHtml(image)}" alt="${escapeHtml(event.title)}"
                         onerror="this.src='${getDefaultImage()}'">
                </div>
                <div class="my-event-info">
                    <h3>${escapeHtml(event.title)}</h3>
                    <p>📅 ${formatDate(event.date)} · 📍 ${escapeHtml(event.location)} · ${event.rsvp_count} RSVPs</p>
                </div>
                <div class="my-event-actions">
                    <button class="btn btn-outline btn-sm edit-btn" data-id="${event.id}">Edit</button>
                    <button class="btn btn-danger btn-sm delete-btn" data-id="${event.id}">Delete</button>
                    <a href="event-details.html?id=${event.id}" class="btn btn-primary btn-sm">View</a>
                </div>
            </div>
        `;
    }

    function bindMyEventActions() {
        list.querySelectorAll('.edit-btn').forEach((btn) => {
            btn.addEventListener('click', () => {
                const event = myEventsCache[btn.dataset.id];
                if (event) openEditModal(event);
            });
        });

        list.querySelectorAll('.delete-btn').forEach((btn) => {
            btn.addEventListener('click', async () => {
                if (!confirm('Are you sure you want to delete this event?')) return;

                const id = parseInt(btn.dataset.id);
                btn.disabled = true;

                try {
                    const data = await apiRequest('delete_event.php', {
                        method: 'POST',
                        body: { id },
                    });

                    if (data.success) {
                        btn.closest('.my-event-item')?.remove();
                        if (!list.querySelector('.my-event-item')) {
                            await loadMyEvents();
                        }
                    } else {
                        alert(data.message);
                        btn.disabled = false;
                    }
                } catch {
                    alert('Failed to delete event.');
                    btn.disabled = false;
                }
            });
        });
    }

    function openEditModal(event) {
        document.getElementById('edit-id').value = event.id;
        document.getElementById('edit-title').value = event.title;
        document.getElementById('edit-description').value = event.description || '';
        document.getElementById('edit-category').value = event.category;
        document.getElementById('edit-date').value = event.date;
        document.getElementById('edit-time').value = event.time.substring(0, 5);
        document.getElementById('edit-location').value = event.location;
        document.getElementById('edit-image').value = event.image || '';
        modal.classList.add('active');
    }

    function closeModal() {
        modal.classList.remove('active');
    }

    async function handleEditSubmit(e) {
        e.preventDefault();

        const submitBtn = editForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;

        const formData = {
            id: parseInt(document.getElementById('edit-id').value),
            title: document.getElementById('edit-title').value.trim(),
            description: document.getElementById('edit-description').value.trim(),
            category: document.getElementById('edit-category').value,
            date: document.getElementById('edit-date').value,
            time: document.getElementById('edit-time').value,
            location: document.getElementById('edit-location').value.trim(),
            image: document.getElementById('edit-image').value.trim(),
        };

        try {
            const data = await apiRequest('update_event.php', {
                method: 'POST',
                body: formData,
            });

            if (data.success) {
                closeModal();
                await loadMyEvents();
            } else {
                alert(data.message);
            }
        } catch {
            alert('Failed to update event.');
        } finally {
            submitBtn.disabled = false;
        }
    }
});
