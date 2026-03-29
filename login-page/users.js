/**
 * DynamicsAltx - User Management Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    loadUsers();

    const userModal = document.getElementById('user-modal');
    const btnAddUser = document.getElementById('btn-add-user');
    const btnCloseModal = document.getElementById('close-modal');
    const userForm = document.getElementById('user-form');

    // Modal Controls
    btnAddUser.onclick = () => userModal.classList.add('active');
    btnCloseModal.onclick = () => userModal.classList.remove('active');
    
    // Outside click to close
    window.onclick = (e) => {
        if (e.target == userModal) userModal.classList.remove('active');
    };

    // Form Submission
    userForm.onsubmit = async (e) => {
        e.preventDefault();
        
        const payload = {
            name: document.getElementById('reg-name').value,
            email: document.getElementById('reg-email').value,
            location: document.getElementById('reg-location').value,
            password: document.getElementById('reg-password').value
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
});

async function loadUsers() {
    const userList = document.getElementById('user-list');
    
    try {
        const response = await fetch('/api/Users');
        const users = await response.json();

        userList.innerHTML = users.map(user => `
            <div class="user-card animate-in">
                <div class="user-avatar">${user.name.charAt(0)}</div>
                <div class="user-details">
                    <h4>${user.name}</h4>
                    <p><i class="ri-mail-line"></i> ${user.email}</p>
                    <p><i class="ri-map-pin-line"></i> ${user.location}</p>
                </div>
                <div class="user-actions">
                    <button class="btn-delete" onclick="deleteUser(${user.id}, '${user.name}')" title="Delete User">
                        <i class="ri-delete-bin-line"></i>
                    </button>
                </div>
            </div>
        `).join('');

        if (users.length === 0) {
            userList.innerHTML = '<div class="empty-state"><p>No users registered</p></div>';
        }
    } catch (error) {
        console.error('Failed to load users:', error);
        showToast('Failed to load users', 'error');
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
            console.error('Deletion error:', error);
            showToast('Connection error', 'error');
        }
    }
}
