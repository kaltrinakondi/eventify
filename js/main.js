const API_BASE = '/api';

const CATEGORIES = [
    { name: 'Music', icon: '🎵' },
    { name: 'Sports', icon: '⚽' },
    { name: 'Technology', icon: '💻' },
    { name: 'Food', icon: '🍽️' },
    { name: 'Arts', icon: '🎨' },
    { name: 'Business', icon: '💼' },
];

let currentUser = null;

async function apiRequest(endpoint, options = {}) {
    const url = `${API_BASE}/${endpoint}`;
    const config = {
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', ...options.headers },
        ...options,
    };

    if (config.body && typeof config.body === 'object') {
        config.body = JSON.stringify(config.body);
    }

    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok && !data.message) {
        throw new Error('Request failed');
    }

    return data;
}

async function checkAuth() {
    try {
        const data = await apiRequest('session');
        currentUser = data.loggedIn ? data.user : null;
        updateNavbar();
        return currentUser;
    } catch {
        currentUser = null;
        updateNavbar();
        return null;
    }
}

function updateNavbar() {
    const authContainer = document.getElementById('nav-auth');
    if (!authContainer) return;

    if (currentUser) {
        authContainer.innerHTML = `
            <span class="nav-user">Hi, ${escapeHtml(currentUser.name)}</span>
            <a href="my-events.html" class="btn btn-outline btn-sm">My Events</a>
            <button class="btn btn-primary btn-sm" id="logout-btn">Logout</button>
        `;
        document.getElementById('logout-btn')?.addEventListener('click', handleLogout);
    } else {
        authContainer.innerHTML = `
            <a href="login.html" class="btn btn-outline btn-sm">Login</a>
            <a href="register.html" class="btn btn-primary btn-sm">Register</a>
        `;
    }
}

async function handleLogout() {
    await apiRequest('logout', { method: 'POST' });
    currentUser = null;
    window.location.href = 'index.html';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateStr) {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
}

function formatTime(timeStr) {
    const [hours, minutes] = timeStr.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    });
}

function getDefaultImage() {
    return 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800';
}

function showAlert(container, message, type = 'error') {
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    container.prepend(alert);
    setTimeout(() => alert.remove(), 5000);
}

function createEventCard(event, options = {}) {
    const { showRsvp = true, linkDetails = true } = options;
    const image = event.image || getDefaultImage();
    const titleHtml = linkDetails
        ? `<a href="event-details.html?id=${event.id}">${escapeHtml(event.title)}</a>`
        : escapeHtml(event.title);

    const rsvpBtn = showRsvp
        ? `<button class="btn btn-primary btn-sm btn-rsvp ${event.user_rsvped ? 'rsvped' : ''}"
             data-event-id="${event.id}">
             ${event.user_rsvped ? '✓ Going' : 'RSVP'}
           </button>`
        : '';

    return `
        <div class="event-card" data-event-id="${event.id}">
            <div class="event-card-image">
                <img src="${escapeHtml(image)}" alt="${escapeHtml(event.title)}" loading="lazy"
                     onerror="this.src='${getDefaultImage()}'">
            </div>
            <div class="event-card-body">
                <span class="event-category">${escapeHtml(event.category)}</span>
                <h3 class="event-card-title">${titleHtml}</h3>
                <div class="event-meta">
                    <span>📅 ${formatDate(event.date)}</span>
                    <span>📍 ${escapeHtml(event.location)}</span>
                </div>
                <div class="event-card-footer">
                    <span class="rsvp-count">${event.rsvp_count || 0} attending</span>
                    ${rsvpBtn}
                </div>
            </div>
        </div>
    `;
}

async function handleRsvp(eventId, button) {
    if (!currentUser) {
        window.location.href = 'login.html';
        return;
    }

    button.disabled = true;
    try {
        const data = await apiRequest('rsvp', {
            method: 'POST',
            body: { event_id: eventId },
        });

        if (data.success) {
            const card = button.closest('.event-card') || button.closest('.event-detail-info');
            const countEl = card?.querySelector('.rsvp-count');
            const currentCount = parseInt(countEl?.textContent) || 0;

            if (data.rsvped) {
                button.textContent = '✓ Going';
                button.classList.add('rsvped');
                if (countEl) countEl.textContent = `${currentCount + 1} attending`;
            } else {
                button.textContent = 'RSVP';
                button.classList.remove('rsvped');
                if (countEl) countEl.textContent = `${Math.max(0, currentCount - 1)} attending`;
            }
        } else {
            alert(data.message);
        }
    } catch {
        alert('Failed to update RSVP. Please try again.');
    } finally {
        button.disabled = false;
    }
}

function bindRsvpButtons(container) {
    container.querySelectorAll('.btn-rsvp').forEach((btn) => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            handleRsvp(parseInt(btn.dataset.eventId), btn);
        });
    });
}

function initMobileMenu() {
    const toggle = document.getElementById('menu-toggle');
    const navLinks = document.getElementById('nav-links');

    toggle?.addEventListener('click', () => {
        navLinks?.classList.toggle('open');
    });
}

function setActiveNavLink() {
    const page = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-links a').forEach((link) => {
        const href = link.getAttribute('href');
        if (href === page || (page === '' && href === 'index.html')) {
            link.classList.add('active');
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initMobileMenu();
    setActiveNavLink();
    checkAuth();
});
