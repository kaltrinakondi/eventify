document.addEventListener('DOMContentLoaded', async () => {
    const featuredContainer = document.getElementById('featured-events');
    const categoriesContainer = document.getElementById('categories-grid');

    renderCategories(categoriesContainer);

    try {
        const data = await apiRequest('get_events.php');
        if (data.success && data.events.length > 0) {
            const featured = data.events.slice(0, 3);
            featuredContainer.innerHTML = featured
                .map((event) => createEventCard(event))
                .join('');
            bindRsvpButtons(featuredContainer);
        } else {
            featuredContainer.innerHTML = `
                <div class="empty-state">
                    <p>No events yet. Be the first to create one!</p>
                </div>
            `;
        }
    } catch {
        featuredContainer.innerHTML = `
            <div class="empty-state">
                <p>Unable to load events. Please check your database connection.</p>
            </div>
        `;
    }
});

function renderCategories(container) {
    if (!container) return;

    container.innerHTML = CATEGORIES.map(
        (cat) => `
        <a href="events.html?category=${encodeURIComponent(cat.name)}" class="category-card">
            <div class="category-icon">${cat.icon}</div>
            <div class="category-name">${cat.name}</div>
        </a>
    `
    ).join('');
}
