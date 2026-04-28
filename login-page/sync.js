document.addEventListener('DOMContentLoaded', () => {
    const role = localStorage.getItem('userRole');
    const email = localStorage.getItem('userEmail');
    
    if (!role || role !== 'Admin') {
        window.location.href = 'index.html';
        return;
    }

    const user = { email, role };

    const syncListBody = document.getElementById('sync-list-body');
    const apiBase = '/api/sync';

    // Map categories to icons
    const icons = {
        'Employees': 'ri-team-line'
    };

    const fetchSyncList = async () => {
        try {
            const response = await fetch(`${apiBase}/list?userEmail=${user.email}`);
            if (!response.ok) throw new Error('Failed to fetch sync categories');
            
            const data = await response.json();
            renderSyncList(data);
        } catch (error) {
            console.error('Error fetching sync list:', error);
            showToast('Error loading synchronization data.', 'error');
        }
    };

    const renderSyncList = (list) => {
        syncListBody.innerHTML = '';
        
        list.forEach(item => {
            const tr = document.createElement('tr');
            const icon = icons[item.category] || 'ri-database-2-line';
            
            tr.innerHTML = `
                <td>
                    <div class="category-info">
                        <div class="category-icon">
                            <i class="${icon}"></i>
                        </div>
                        <div class="category-details">
                            <h4>${item.category}</h4>
                            <p>${item.description}</p>
                        </div>
                    </div>
                </td>
                <td>
                    <div class="sync-status">
                        <span class="status-dot ${item.lastSync !== 'Unknown' ? 'synced' : ''}"></span>
                        <span>${item.lastSync}</span>
                    </div>
                </td>
                <td style="text-align: right;">
                    <div style="display: flex; justify-content: flex-end;">
                        <button class="btn-sync" data-category="${item.category.toLowerCase()}">
                            <i class="ri-refresh-line"></i>
                            <span>Sync</span>
                        </button>
                    </div>
                </td>
            `;
            syncListBody.appendChild(tr);
        });

        // Add event listeners to sync buttons
        document.querySelectorAll('.btn-sync').forEach(btn => {
            btn.addEventListener('click', () => triggerSync(btn));
        });
    };

    const triggerSync = async (btn) => {
        const category = btn.getAttribute('data-category');
        const originalText = btn.innerHTML;
        
        // Disable button and show loading
        btn.disabled = true;
        btn.classList.add('loading');
        btn.innerHTML = `<i class="ri-loader-4-line"></i><span>Syncing...</span>`;

        try {
            const response = await fetch(`${apiBase}/${category}?userEmail=${user.email}`, {
                method: 'POST'
            });

            const result = await response.json();

            if (response.ok) {
                showToast(result.message || `${category} synchronized successfully!`, 'success');
                // Refresh list to update "Last Sync"
                fetchSyncList();
            } else {
                throw new Error(result.message || 'Sync failed');
            }
        } catch (error) {
            console.error(`Error syncing ${category}:`, error);
            showToast(`Sync failed: ${error.message}`, 'error');
        } finally {
            // Restore button state
            btn.disabled = false;
            btn.classList.remove('loading');
            btn.innerHTML = originalText;
        }
    };

    // Initial load
    fetchSyncList();
});
