/**
 * DynamicsAltx - User Management Logic
 */

let availableProfiles = [];
let allUsers = [];

document.addEventListener('DOMContentLoaded', async () => {
    await loadProfilesDropdown();
    await loadUsers();

    const userModal = document.getElementById('user-modal');
    const btnAddUser = document.getElementById('btn-add-user');
    const btnCloseModal = document.getElementById('close-modal');
    const userForm = document.getElementById('user-form');

    const editUserModal = document.getElementById('edit-user-modal');
    const btnCloseEditModal = document.getElementById('close-edit-modal');
    const editUserForm = document.getElementById('edit-user-form');

    // View switcher (Grid vs Table)
    const viewCardBtn = document.getElementById('view-card-btn');
    const viewTableBtn = document.getElementById('view-table-btn');
    const userGrid = document.getElementById('user-list');
    const userTable = document.getElementById('user-table-container');

    const setView = (mode) => {
        if (mode === 'table') {
            if (userGrid) userGrid.style.display = 'none';
            if (userTable) userTable.style.display = 'block';
            if (viewTableBtn) {
                viewTableBtn.style.background = 'white';
                viewTableBtn.style.color = 'var(--primary)';
                viewTableBtn.style.fontWeight = '600';
                viewTableBtn.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
            }
            if (viewCardBtn) {
                viewCardBtn.style.background = 'transparent';
                viewCardBtn.style.color = 'var(--text-muted)';
                viewCardBtn.style.fontWeight = '500';
                viewCardBtn.style.boxShadow = 'none';
            }
        } else {
            if (userGrid) userGrid.style.display = 'grid';
            if (userTable) userTable.style.display = 'none';
            if (viewCardBtn) {
                viewCardBtn.style.background = 'white';
                viewCardBtn.style.color = 'var(--primary)';
                viewCardBtn.style.fontWeight = '600';
                viewCardBtn.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
            }
            if (viewTableBtn) {
                viewTableBtn.style.background = 'transparent';
                viewTableBtn.style.color = 'var(--text-muted)';
                viewTableBtn.style.fontWeight = '500';
                viewTableBtn.style.boxShadow = 'none';
            }
        }
        localStorage.setItem('users_view_mode', mode);
    };

    if (viewCardBtn && viewTableBtn) {
        viewCardBtn.onclick = () => setView('grid');
        viewTableBtn.onclick = () => setView('table');
        const savedMode = localStorage.getItem('users_view_mode') || 'grid';
        setView(savedMode);
    }

    // Register Modal Controls
    btnAddUser.onclick = () => userModal.classList.add('active');
    btnCloseModal.onclick = () => userModal.classList.remove('active');

    // Edit Modal Controls
    if (btnCloseEditModal) {
        btnCloseEditModal.onclick = () => editUserModal.classList.remove('active');
    }

    // Outside click to close modals
    window.onclick = (e) => {
        if (e.target == userModal) userModal.classList.remove('active');
        if (e.target == editUserModal) editUserModal.classList.remove('active');
    };

    // Registration Form Submission
    userForm.onsubmit = async (e) => {
        e.preventDefault();
        
        const mobileBatchInput = document.getElementById('reg-mobile-batch');
        const payload = {
            name: document.getElementById('reg-name').value,
            email: document.getElementById('reg-email').value,
            location: document.getElementById('reg-location').value,
            mobileBatchName: mobileBatchInput ? (mobileBatchInput.value.trim() || null) : null,
            password: document.getElementById('reg-password').value,
            profileId: parseInt(document.getElementById('reg-profile').value) || null
        };

        try {
            const response = await fetch('/api/Users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                showToast('User registered successfully', 'success');
                userModal.classList.remove('active');
                userForm.reset();
                loadUsers();
            } else {
                const err = await response.json();
                showToast(err.message || 'Registration failed', 'error');
            }
        } catch (error) {
            console.error('Registration error:', error);
            showToast('Connection failed', 'error');
        }
    };

    // Edit Form Submission
    if (editUserForm) {
        editUserForm.onsubmit = async (e) => {
            e.preventDefault();
            const id = document.getElementById('edit-user-id').value;
            const profileVal = document.getElementById('edit-user-profile').value;
            const passwordVal = document.getElementById('edit-user-password').value;
            const editBatchInput = document.getElementById('edit-user-mobile-batch');

            const payload = {
                name: document.getElementById('edit-user-name').value,
                email: document.getElementById('edit-user-email').value,
                location: document.getElementById('edit-user-location').value,
                mobileBatchName: editBatchInput ? (editBatchInput.value.trim() || null) : null,
                profileId: profileVal ? parseInt(profileVal) : null,
                password: passwordVal || null
            };

            try {
                const response = await fetch(`/api/Users/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (response.ok) {
                    showToast('User profile updated successfully', 'success');
                    editUserModal.classList.remove('active');
                    loadUsers();
                } else {
                    const err = await response.json();
                    showToast(err.message || 'Update failed', 'error');
                }
            } catch (error) {
                console.error('Update user error:', error);
                showToast('Failed to update user', 'error');
            }
        };
    }
});

async function loadProfilesDropdown() {
    const regSelect = document.getElementById('reg-profile');
    const editSelect = document.getElementById('edit-user-profile');

    try {
        const response = await fetch('/api/Profiles');
        if (response.ok) {
            availableProfiles = await response.json();

            // Populate Register Dropdown
            if (regSelect) {
                regSelect.innerHTML = '<option value="" disabled selected>Select Profile...</option>';
                availableProfiles.forEach(p => {
                    const opt = document.createElement('option');
                    opt.value = p.id;
                    opt.textContent = p.profileName;
                    regSelect.appendChild(opt);
                });
            }

            // Populate Edit Dropdown
            if (editSelect) {
                editSelect.innerHTML = '<option value="">Default/Admin (No Specific Profile)</option>';
                availableProfiles.forEach(p => {
                    const opt = document.createElement('option');
                    opt.value = p.id;
                    opt.textContent = p.profileName;
                    editSelect.appendChild(opt);
                });
            }
        }
    } catch (e) {
        console.error('Error loading profiles:', e);
    }
}

async function loadUsers() {
    const userList = document.getElementById('user-list');
    const userTableBody = document.getElementById('user-table-body');
    
    try {
        const response = await fetch('/api/Users');
        allUsers = await response.json();

        // Render Cards View
        if (userList) {
            userList.innerHTML = allUsers.map(user => {
                const profileOptionsHtml = `
                    <option value="" ${!user.profileId ? 'selected' : ''}>Default/Admin</option>
                    ${availableProfiles.map(p => `
                        <option value="${p.id}" ${user.profileId === p.id ? 'selected' : ''}>${escapeHtml(p.profileName)}</option>
                    `).join('')}
                `;

                return `
                    <div class="user-card animate-in">
                        <div class="user-avatar">${(user.name || 'U').charAt(0).toUpperCase()}</div>
                        <div class="user-details">
                            <h4>${escapeHtml(user.name)}</h4>
                            <p><i class="ri-mail-line"></i> ${escapeHtml(user.email)}</p>
                            <p><i class="ri-map-pin-line"></i> ${escapeHtml(user.location)}</p>
                            <p><i class="ri-smartphone-line"></i> Mobile Batch: <span style="font-weight: 600; color: ${user.mobileBatchName ? 'var(--primary)' : 'var(--text-muted)'};">${user.mobileBatchName ? escapeHtml(user.mobileBatchName) : 'Not Set'}</span></p>
                            <div style="margin-top: 0.4rem; display: flex; align-items: center; gap: 0.4rem;">
                                <span style="font-size: 0.8rem; color: var(--text-muted); font-weight: 500;"><i class="ri-shield-user-line"></i> Profile:</span>
                                <select class="card-profile-select" onchange="quickChangeProfile(${user.id}, this.value)" title="Change user profile">
                                    ${profileOptionsHtml}
                                </select>
                            </div>
                        </div>
                        <div class="user-actions">
                            <button class="btn-edit" onclick="openEditUserModal(${user.id})" title="Edit User Details & Profile">
                                <i class="ri-edit-line"></i>
                            </button>
                            <button class="btn-delete" onclick="deleteUser(${user.id}, '${escapeHtml(user.name)}')" title="Delete User">
                                <i class="ri-delete-bin-line"></i>
                            </button>
                        </div>
                    </div>
                `;
            }).join('');

            if (allUsers.length === 0) {
                userList.innerHTML = '<div class="empty-state"><p>No users registered</p></div>';
            }
        }

        // Render Table View
        if (userTableBody) {
            userTableBody.innerHTML = allUsers.map(user => {
                const profileOptionsHtml = `
                    <option value="" ${!user.profileId ? 'selected' : ''}>Default/Admin</option>
                    ${availableProfiles.map(p => `
                        <option value="${p.id}" ${user.profileId === p.id ? 'selected' : ''}>${escapeHtml(p.profileName)}</option>
                    `).join('')}
                `;

                return `
                    <tr>
                        <td style="padding: 0.75rem 1rem;">
                            <div style="display: flex; align-items: center; gap: 0.75rem;">
                                <div class="user-avatar" style="width: 36px; height: 36px; font-size: 0.95rem;">${(user.name || 'U').charAt(0).toUpperCase()}</div>
                                <strong style="color: var(--text-main);">${escapeHtml(user.name)}</strong>
                            </div>
                        </td>
                        <td style="padding: 0.75rem 1rem; color: var(--text-muted);">${escapeHtml(user.email)}</td>
                        <td style="padding: 0.75rem 1rem;">${escapeHtml(user.location)}</td>
                        <td style="padding: 0.75rem 1rem;">
                            ${user.mobileBatchName 
                                ? `<span style="background: rgba(99, 102, 241, 0.1); color: var(--primary); padding: 0.25rem 0.65rem; border-radius: 6px; font-weight: 600; font-size: 0.85rem; display: inline-flex; align-items: center; gap: 0.35rem;"><i class="ri-smartphone-line"></i> ${escapeHtml(user.mobileBatchName)}</span>` 
                                : `<span style="color: var(--text-muted); font-size: 0.85rem;">—</span>`}
                        </td>
                        <td style="padding: 0.75rem 1rem;">
                            <select class="card-profile-select" style="margin: 0; max-width: 160px;" onchange="quickChangeProfile(${user.id}, this.value)" title="Change user profile">
                                ${profileOptionsHtml}
                            </select>
                        </td>
                        <td style="padding: 0.75rem 1rem; text-align: right;">
                            <button class="btn-edit" onclick="openEditUserModal(${user.id})" title="Edit User">
                                <i class="ri-edit-line"></i>
                            </button>
                            <button class="btn-delete" onclick="deleteUser(${user.id}, '${escapeHtml(user.name)}')" title="Delete User">
                                <i class="ri-delete-bin-line"></i>
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');

            if (allUsers.length === 0) {
                userTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem; color: var(--text-muted);">No users registered</td></tr>';
            }
        }
    } catch (error) {
        console.error('Failed to load users:', error);
        showToast('Failed to load users', 'error');
    }
}

async function quickChangeProfile(userId, profileIdStr) {
    const profileId = profileIdStr ? parseInt(profileIdStr) : null;

    try {
        const response = await fetch(`/api/Users/${userId}/profile`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(profileId)
        });

        if (response.ok) {
            const selectedProf = availableProfiles.find(p => p.id === profileId);
            const profName = selectedProf ? selectedProf.profileName : 'Default/Admin';
            showToast(`Profile updated to "${profName}"`, 'success');
            loadUsers();
        } else {
            const err = await response.json();
            showToast(err.message || 'Failed to update profile', 'error');
            loadUsers();
        }
    } catch (error) {
        console.error('Quick change profile error:', error);
        showToast('Failed to update profile', 'error');
        loadUsers();
    }
}

function openEditUserModal(userId) {
    const user = allUsers.find(u => u.id === userId);
    if (!user) return;

    document.getElementById('edit-user-id').value = user.id;
    document.getElementById('edit-user-name').value = user.name || '';
    document.getElementById('edit-user-email').value = user.email || '';
    document.getElementById('edit-user-location').value = user.location || '';
    const editBatchInput = document.getElementById('edit-user-mobile-batch');
    if (editBatchInput) {
        editBatchInput.value = user.mobileBatchName || '';
    }
    document.getElementById('edit-user-profile').value = user.profileId || '';
    document.getElementById('edit-user-password').value = '';

    const editModal = document.getElementById('edit-user-modal');
    if (editModal) {
        editModal.classList.add('active');
    }
}

async function deleteUser(id, name) {
    const confirmed = await showConfirm(`Are you sure you want to delete user "${name}"? This action cannot be undone.`, 'Delete User');
    
    if (confirmed) {
        try {
            const response = await fetch(`/api/Users/${id}`, { method: 'DELETE' });
            
            if (response.ok) {
                showToast('User deleted successfully', 'success');
                loadUsers();
            } else {
                const err = await response.json();
                showToast(err.message || 'Deletion failed', 'error');
            }
        } catch (error) {
            console.error('Delete error:', error);
            showToast('Delete request failed', 'error');
        }
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
