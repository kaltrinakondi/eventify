document.addEventListener('DOMContentLoaded', async () => {
    const grid = document.getElementById('events-grid');
    const searchInput = document.getElementById('search-input');
    const categoryFilter = document.getElementById('category-filter');

    const urlParams = new URLSearchParams(window.location.search);
    const initialCategory = urlParams.get('category');
    if (initialCategory) {
        categoryFilter.value = initialCategory;
    }

    populateCategoryFilter(categoryFilter);

    let debounceTimer;
    searchInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(loadEvents, 300);
    });

    categoryFilter.addEventListener('change', loadEvents);

    await loadEvents();

    async function loadEvents() {
        grid.innerHTML = '<div class="loading"><div class="spinner"></div><p>Loading events...</p></div>';

        const search = searchInput.value.trim();
        const category = categoryFilter.value;

        let url = 'get_events.php?';
        if (search) url += `search=${encodeURIComponent(search)}&`;
        if (category && category !== 'all') url += `category=${encodeURIComponent(category)}`;

        try {
            const data = await apiRequest(url);

            if (data.success && data.events.length > 0) {
                grid.innerHTML = data.events
                    .map((event) => createEventCard(event))
                    .join('');
                bindRsvpButtons(grid);
            } else {
                grid.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">🔍</div>
                        <h3>No events found</h3>
                        <p>Try adjusting your search or filter criteria.</p>
                    </div>
                `;
            }
        } catch {
            grid.innerHTML = `
                <div class="empty-state">
                    <h3>Error loading events</h3>
                    <p>Please check your database connection.</p>
                </div>
            `;
        }
    }
});

function populateCategoryFilter(select) {
    select.innerHTML = '<option value="all">All Categories</option>';
    CATEGORIES.forEach((cat) => {
        select.innerHTML += `<option value="${cat.name}">${cat.name}</option>`;
    });
}
