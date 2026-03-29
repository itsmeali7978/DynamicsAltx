document.addEventListener('DOMContentLoaded', () => {
    // RBAC Guard
    const userRole = localStorage.getItem('userRole');
    if (!userRole || userRole.toLowerCase() !== 'admin') {
        window.location.href = 'dashboard.html';
        return;
    }

    const locationsTableBody = document.getElementById('locations-table-body');
    const locationForm = document.getElementById('location-form');
    const locationModal = document.getElementById('location-modal');
    const modalTitle = document.getElementById('modal-title');
    
    let isEditing = false;
    let currentEditCode = '';

    // Initial Fetch
    fetchLocations();

    async function fetchLocations() {
        try {
            const response = await fetch('/api/Locations');
            const locations = await response.json();
            renderLocations(locations);
        } catch (error) {
            console.error('Error fetching locations:', error);
            showToast('Failed to load locations', 'error');
        }
    }

    function renderLocations(locations) {
        locationsTableBody.innerHTML = '';
        locations.forEach(loc => {
            const tr = document.createElement('tr');
            const isPassive = loc.status === 'Passive';
            
            // Dynamic styling: Disable for Passive, Enable for Active
            const testBtnStyle = isPassive 
                ? "padding: 0.3rem 0.6rem; border-radius: 6px; background: #f3f4f6; border: 1px solid #d1d5db; display: flex; align-items: center; gap: 0.3rem; font-size: 0.75rem; font-weight: 600; color: #9ca3af; cursor: not-allowed; white-space: nowrap; opacity: 0.7;"
                : "padding: 0.3rem 0.6rem; border-radius: 6px; background: #f0fdf4; border: 1px solid #86efac; display: flex; align-items: center; gap: 0.3rem; font-size: 0.75rem; font-weight: 600; color: #16a34a; cursor: pointer; white-space: nowrap;";

            tr.innerHTML = `
                <td style="font-weight: 600; color: var(--primary);">${loc.locationCode}</td>
                <td>${loc.locationName}</td>
                <td>${loc.ipAddress || '---'}</td>
                <td>${loc.dbName || '---'}</td>
                <td>${loc.username || '---'}</td>
                <td>
                    <span class="status-badge ${loc.status === 'Active' ? 'status-active' : 'status-passive'}">
                        ${loc.status}
                    </span>
                </td>
                <td>
                    <div style="display: flex; gap: 0.5rem; align-items: center;">
                        <button class="icon-btn test-conn-btn" data-code="${loc.locationCode}" 
                            title="${isPassive ? 'Testing only available for active locations' : 'Test Connection'}"
                            ${isPassive ? 'disabled' : ''}
                            style="${testBtnStyle}">
                            <i class="ri-wifi-line"></i> Test
                        </button>
                        <button class="icon-btn edit-btn" data-code="${loc.locationCode}" title="Edit">
                            <i class="ri-edit-line" style="color: var(--primary);"></i>
                        </button>
                        <button class="icon-btn delete-btn" data-code="${loc.locationCode}" title="Delete">
                            <i class="ri-delete-bin-line" style="color: var(--error);"></i>
                        </button>
                    </div>
                </td>
            `;
            
            // Attach Event Listeners
            const editBtn = tr.querySelector('.edit-btn');
            const deleteBtn = tr.querySelector('.delete-btn');
            const testBtn = tr.querySelector('.test-conn-btn');
            
            editBtn.addEventListener('click', () => editLocation(loc.locationCode));
            deleteBtn.addEventListener('click', () => deleteLocation(loc.locationCode));
            testBtn.addEventListener('click', () => testConnection(loc.locationCode, testBtn));

            locationsTableBody.appendChild(tr);
        });
        console.log('[Locations] Rendered', locations.length, 'locations');
    }

    // Modal Helpers
    window.showAddModal = () => {
        isEditing = false;
        currentEditCode = '';
        modalTitle.innerText = 'Add New Location';
        locationForm.reset();
        document.getElementById('loc-code').disabled = false;
        locationModal.classList.add('active');
    };

    window.hideModal = () => {
        locationModal.classList.remove('active');
    };

    window.togglePassVisibility = () => {
        const passInput = document.getElementById('loc-pass');
        passInput.type = passInput.type === 'password' ? 'text' : 'password';
    };

    // Edit Function
    window.editLocation = async (code) => {
        try {
            const response = await fetch(`/api/Locations/${code}`);
            const loc = await response.json();
            
            isEditing = true;
            currentEditCode = code;
            modalTitle.innerText = 'Edit Location';

            document.getElementById('loc-code').value = loc.locationCode;
            document.getElementById('loc-code').disabled = true; // PK not editable
            document.getElementById('loc-name').value = loc.locationName;
            document.getElementById('loc-ip').value = loc.ipAddress || '';
            document.getElementById('loc-db').value = loc.dbName || '';
            document.getElementById('loc-user').value = loc.username || '';
            document.getElementById('loc-pass').value = loc.password || '';
            document.getElementById('loc-status').value = loc.status;

            locationModal.classList.add('active');
        } catch (error) {
            console.error('Error fetching location details:', error);
            showToast('Failed to load location details', 'error');
        }
    };

    // Test Connection Function
    async function testConnection(code, btn) {
        const originalHtml = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="ri-loader-4-line animate-spin"></i> Testing...';
        btn.style.color = '#6b7280';
        btn.style.borderColor = '#d1d5db';
        btn.style.background = '#f9fafb';

        try {
            const response = await fetch(`/api/Locations/${code}/TestConnection`, { method: 'POST' });
            const result = await response.json();

            if (result.success) {
                btn.innerHTML = '<i class="ri-checkbox-circle-line"></i> Success';
                btn.style.color = '#16a34a';
                btn.style.borderColor = '#86efac';
                btn.style.background = '#f0fdf4';
                showToast(result.message, 'success');
            } else {
                btn.innerHTML = '<i class="ri-close-circle-line"></i> Failed';
                btn.style.color = '#dc2626';
                btn.style.borderColor = '#fca5a5';
                btn.style.background = '#fef2f2';
                showToast('Connection failed: ' + result.message, 'error');
            }
        } catch (error) {
            btn.innerHTML = '<i class="ri-close-circle-line"></i> Error';
            btn.style.color = '#dc2626';
            showToast('Unexpected error: ' + error.message, 'error');
        } finally {
            // Reset button after 4 seconds
            setTimeout(() => {
                btn.disabled = false;
                btn.innerHTML = originalHtml;
                btn.style.color = '#16a34a';
                btn.style.borderColor = '#86efac';
                btn.style.background = '#f0fdf4';
            }, 4000);
        }
    }

    // Delete Function
    window.deleteLocation = async (code) => {
        console.log('[Locations] Delete requested for:', code);
        
        const confirmed = await showConfirm(
            `Are you sure you want to delete location ${code}? This action cannot be undone.`,
            'Confirm Deletion'
        );

        if (!confirmed) {
            console.log('[Locations] Deletion cancelled by user');
            return;
        }
        
        console.log('[Locations] Proceeding with deletion for:', code);

        try {
            const response = await fetch(`/api/Locations/${code}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                showToast('Location deleted successfully', 'success');
                fetchLocations();
            } else {
                throw new Error('Delete failed');
            }
        } catch (error) {
            console.error('Error deleting location:', error);
            showToast('Failed to delete location', 'error');
        }
    };

    // Form Submission
    locationForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const locationData = {
            locationCode: document.getElementById('loc-code').value,
            locationName: document.getElementById('loc-name').value,
            ipAddress: document.getElementById('loc-ip').value,
            dbName: document.getElementById('loc-db').value,
            username: document.getElementById('loc-user').value,
            password: document.getElementById('loc-pass').value,
            status: document.getElementById('loc-status').value
        };

        const url = isEditing ? `/api/Locations/${currentEditCode}` : '/api/Locations';
        const method = isEditing ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(locationData)
            });

            if (response.ok) {
                showToast(`Location ${isEditing ? 'updated' : 'added'} successfully`, 'success');
                hideModal();
                fetchLocations();
            } else {
                const errorText = await response.text();
                showToast(errorText || 'Failed to save location', 'error');
            }
        } catch (error) {
            console.error('Error saving location:', error);
            showToast('Server error while saving', 'error');
        }
    });

    // Sidebar Active State
    const currentPath = window.location.pathname.split('/').pop();
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        if (link.getAttribute('href') === currentPath) {
            link.parentElement.classList.add('active');
        }
    });
});
