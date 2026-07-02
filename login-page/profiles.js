// Profiles Management Frontend Script

const APP_PAGES = [
    { path: 'dashboard.html', label: 'Overview' },
    { path: 'employees.html', label: 'Employees' },
    { path: 'absence-marker.html', label: 'Absence Marker' },
    { path: 'absence-report.html', label: 'Absence Report' },
    { path: 'cashier-closing.html', label: 'Cashier Closing' },
    { path: 'closing-reports.html', label: 'Closing Reports' },
    { path: 'users.html', label: 'User Management' },
    { path: 'locations.html', label: 'Locations' },
    { path: 'nationalities.html', label: 'Nationalities' },
    { path: 'shifts.html', label: 'Shifts' },
    { path: 'short-breaks.html', label: 'Short Breaks' },
    { path: 'leave-types.html', label: 'Leave Types' },
    { path: 'sync.html', label: 'Data Sync (Navision)' },
    { path: 'reconciliation.html', label: 'Invoice Reconciliation' },
    { path: 'vendors.html', label: 'Create Vendor' },
    { path: 'bidding-create.html', label: 'Create Bid' },
    { path: 'bidding-list.html', label: 'Bidding List' },
    { path: 'barcode-print.html', label: 'Barcode Printing' },
    { path: 'voucher-history.html', label: 'Voucher History' },
    { path: 'announcements.html', label: 'Announcements' },
    { path: 'settings.html', label: 'Account Settings' },
    { path: 'profiles.html', label: 'Profiles' }
];

document.addEventListener('DOMContentLoaded', () => {
    // Generate Allowed Pages checkboxes UI
    const container = document.getElementById('pages-checkboxes-container');
    if (container) {
        container.innerHTML = APP_PAGES.map(page => `
            <label class="page-checkbox-label">
                <input type="checkbox" name="allowedPages" value="${page.path}">
                <span>${page.label}</span>
            </label>
        `).join('');
    }

    loadProfiles();
});

let activeProfiles = [];

async function loadProfiles() {
    const tableBody = document.querySelector('#profiles-table tbody');
    if (!tableBody) return;

    try {
        const response = await fetch('/api/Profiles');
        if (!response.ok) throw new Error('Failed to fetch profiles');
        
        activeProfiles = await response.json();

        tableBody.innerHTML = activeProfiles.map(p => `
            <tr>
                <td>#${p.id}</td>
                <td><strong>${p.profileName}</strong></td>
                <td><code style="font-size:0.75rem;">${p.dashboardPage}</code></td>
                <td>
                    <span class="status-pill info" style="font-size:0.75rem; padding: 0.15rem 0.5rem;">
                        ${p.allowedPagesCount} Page(s)
                    </span>
                </td>
                <td>
                    <div class="actions-cell">
                        <button class="btn-action-icon btn-edit" onclick="editProfile(${p.id})" title="Edit Profile">
                            <i class="ri-edit-line"></i>
                        </button>
                        <button class="btn-action-icon btn-delete" onclick="deleteProfile(${p.id}, '${p.profileName}')" title="Delete Profile">
                            <i class="ri-delete-bin-line"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        if (activeProfiles.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">No profiles created yet.</td></tr>`;
        }
    } catch (err) {
        console.error('Error loading profiles:', err);
        showToast('Failed to load profiles', 'error');
    }
}

function editProfile(id) {
    const profile = activeProfiles.find(p => p.id === id);
    if (!profile) return;

    // Switch form UI to Edit
    document.getElementById('profile-id').value = profile.id;
    document.getElementById('profile-name').value = profile.profileName;
    document.getElementById('dashboard-page').value = profile.dashboardPage;

    // Reset and select checkboxes
    const checkboxes = document.querySelectorAll('input[name="allowedPages"]');
    checkboxes.forEach(cb => {
        cb.checked = profile.allowedPages.includes(cb.value);
    });

    document.getElementById('form-card-title').innerHTML = `<i class="ri-edit-box-line" style="color: var(--primary);"></i> Edit Profile (#${profile.id})`;
    document.getElementById('btn-submit-profile').innerHTML = `<i class="ri-save-line"></i> Update Profile`;
    document.getElementById('btn-cancel-edit').style.display = 'inline-flex';
}

function cancelEdit() {
    document.getElementById('profile-id').value = '';
    document.getElementById('profile-form').reset();
    
    // Clear checkboxes
    const checkboxes = document.querySelectorAll('input[name="allowedPages"]');
    checkboxes.forEach(cb => cb.checked = false);

    document.getElementById('form-card-title').innerHTML = `<i class="ri-add-box-line" style="color: var(--primary);"></i> Create Profile`;
    document.getElementById('btn-submit-profile').innerHTML = `<i class="ri-save-line"></i> Save Profile`;
    document.getElementById('btn-cancel-edit').style.display = 'none';
}

async function saveProfile(event) {
    event.preventDefault();

    const profileId = document.getElementById('profile-id').value;
    const profileName = document.getElementById('profile-name').value.trim();
    const dashboardPage = document.getElementById('dashboard-page').value;

    const allowedPages = [];
    document.querySelectorAll('input[name="allowedPages"]:checked').forEach(cb => {
        allowedPages.push(cb.value);
    });

    if (allowedPages.length === 0) {
        showToast('At least one permitted page route must be selected.', 'error');
        return;
    }

    const payload = {
        profileName,
        dashboardPage,
        allowedPages
    };

    const isEdit = !!profileId;
    const url = isEdit ? `/api/Profiles/${profileId}` : '/api/Profiles';
    const method = isEdit ? 'PUT' : 'POST';

    try {
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            showToast(isEdit ? 'Profile updated successfully' : 'Profile created successfully', 'success');
            cancelEdit();
            loadProfiles();
        } else {
            const err = await response.json();
            showToast(err.message || 'Failed to save profile', 'error');
        }
    } catch (err) {
        console.error('Error saving profile:', err);
        showToast('Network error, failed to save profile', 'error');
    }
}

async function deleteProfile(id, name) {
    const confirmed = await showConfirm(`Are you sure you want to delete profile "${name}"? Users assigned to this profile will lose custom access rules.`, 'Delete Profile');
    if (!confirmed) return;

    try {
        const response = await fetch(`/api/Profiles/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            showToast('Profile deleted successfully', 'success');
            loadProfiles();
        } else {
            const err = await response.json();
            showToast(err.message || 'Failed to delete profile', 'error');
        }
    } catch (err) {
        console.error('Error deleting profile:', err);
        showToast('Network error, failed to delete profile', 'error');
    }
}
