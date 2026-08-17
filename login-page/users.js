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
        
        const payload = {
            name: document.getElementById('reg-name').value,
            email: document.getElementById('reg-email').value,
            location: document.getElementById('reg-location').value,
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

            const payload = {
                name: document.getElementById('edit-user-name').value,
                email: document.getElementById('edit-user-email').value,
                location: document.getElementById('edit-user-location').value,
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
    
    try {
        const response = await fetch('/api/Users');
        allUsers = await response.json();

        userList.innerHTML = allUsers.map(user => {
            const profileOptionsHtml = `
                <option value="" ${!user.profileId ? 'selected' : ''}>Default/Admin</option>
                ${availableProfiles.map(p => `
                    <option value="${p.id}" ${user.profileId === p.id ? 'selected' : ''}>${p.profileName}</option>
                `).join('')}
            `;

            return `
                <div class="user-card animate-in">
                    <div class="user-avatar">${(user.name || 'U').charAt(0).toUpperCase()}</div>
                    <div class="user-details">
                        <h4>${user.name}</h4>
                        <p><i class="ri-mail-line"></i> ${user.email}</p>
                        <p><i class="ri-map-pin-line"></i> ${user.location}</p>
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
                        <button class="btn-delete" onclick="deleteUser(${user.id}, '${user.name}')" title="Delete User">
                            <i class="ri-delete-bin-line"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        if (allUsers.length === 0) {
            userList.innerHTML = '<div class="empty-state"><p>No users registered</p></div>';
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
