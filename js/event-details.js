document.addEventListener('DOMContentLoaded', async () => {
    const container = document.getElementById('event-detail');
    const params = new URLSearchParams(window.location.search);
    const eventId = params.get('id');

    if (!eventId) {
        container.innerHTML = '<div class="empty-state"><h3>Event not found</h3></div>';
        return;
    }

    try {
        const data = await apiRequest(`get_event.php?id=${eventId}`);

        if (!data.success || !data.event) {
            container.innerHTML = '<div class="empty-state"><h3>Event not found</h3></div>';
            return;
        }

        const event = data.event;
        const image = event.image || getDefaultImage();

        container.innerHTML = `
            <div class="event-detail-grid">
                <div class="event-detail-image">
                    <img src="${escapeHtml(image)}" alt="${escapeHtml(event.title)}"
                         onerror="this.src='${getDefaultImage()}'">
                </div>
                <div class="event-detail-info">
                    <span class="event-category">${escapeHtml(event.category)}</span>
                    <h1>${escapeHtml(event.title)}</h1>
                    <div class="detail-meta">
                        <div class="detail-meta-item">
                            <div class="detail-meta-icon">📅</div>
                            <div>
                                <strong>${formatDate(event.date)}</strong><br>
                                <span style="color: var(--text-light)">${formatTime(event.time)}</span>
                            </div>
                        </div>
                        <div class="detail-meta-item">
                            <div class="detail-meta-icon">📍</div>
                            <div>${escapeHtml(event.location)}</div>
                        </div>
                        <div class="detail-meta-item">
                            <div class="detail-meta-icon">👤</div>
                            <div>Organized by <strong>${escapeHtml(event.creator_name)}</strong></div>
                        </div>
                    </div>
                    <p class="event-detail-description">${escapeHtml(event.description || 'No description provided.')}</p>
                    <div class="detail-actions">
                        <button class="btn btn-primary btn-rsvp ${event.user_rsvped ? 'rsvped' : ''}"
                                data-event-id="${event.id}">
                            ${event.user_rsvped ? '✓ Going' : 'RSVP to Event'}
                        </button>
                        <span class="rsvp-count">${event.rsvp_count || 0} people attending</span>
                    </div>
                </div>
            </div>
        `;

        bindRsvpButtons(container);
    } catch {
        container.innerHTML = `
            <div class="empty-state">
                <h3>Error loading event</h3>
                <p>Please try again later.</p>
            </div>
        `;
    }
});
