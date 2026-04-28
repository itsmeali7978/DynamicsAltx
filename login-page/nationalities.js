/**
 * DynamicsAltx - Nationalities Management Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Selection
    const natListGrid = document.getElementById('nat-list');
    const natModal = document.getElementById('nat-modal');
    const natForm = document.getElementById('nat-form');
    const btnAddNat = document.getElementById('btn-add-nat');
    const closeModal = document.getElementById('close-modal');
    const natNameInput = document.getElementById('nat-name');
    const natIdInput = document.getElementById('nat-id');
    const modalTitle = document.getElementById('modal-title');

    const API_BASE = '/api/Nationalities';

    // 0. Security Guard (Admin Only)
    const userRole = localStorage.getItem('userRole');
    if (userRole && userRole.toLowerCase() !== 'admin') {
        window.showAlert?.('Access Denied: This module is reserved for System Administrators only.', 'Security Alert').then(() => {
            window.location.href = 'dashboard.html';
        });
        return;
    }

    // 2. Fetch & Render
    const fetchNationalities = async () => {
        const userEmail = localStorage.getItem('userEmail');
        try {
            const response = await fetch(`${API_BASE}?userEmail=${encodeURIComponent(userEmail)}`);
            if (!response.ok) throw new Error('Failed to fetch data');
            const data = await response.json();
            renderNationalities(data);
        } catch (error) {
            console.error('Fetch Error:', error);
            natListGrid.innerHTML = `<div class="error-state">Error loading records: ${error.message}</div>`;
        }
    };

    const renderNationalities = (nations) => {
        if (nations.length === 0) {
            natListGrid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--text-muted);">
                    <i class="ri-flag-2-line" style="font-size: 3rem; display: block; margin-bottom: 1rem;"></i>
                    <p>No nationalities found. Click "New Nationality" to add one.</p>
                </div>
            `;
            return;
        }

        natListGrid.innerHTML = nations.map(n => `
            <div class="nat-card">
                <div class="nat-info">
                    <div class="nat-icon">
                        <i class="ri-map-pin-line"></i>
                    </div>
                    <span class="nat-name">${n.nation}</span>
                </div>
                <div class="nat-actions">
                    <button class="action-btn btn-edit" onclick="window.editNat(${n.id}, '${n.nation}')" title="Edit">
                        <i class="ri-edit-line"></i>
                    </button>
                    <button class="action-btn btn-delete" onclick="window.deleteNat(${n.id})" title="Delete">
                        <i class="ri-delete-bin-line"></i>
                    </button>
                </div>
            </div>
        `).join('');
    };

    // 3. Modal Handlers
    const openModal = (id = null, name = '') => {
        natIdInput.value = id || '';
        natNameInput.value = name;
        modalTitle.innerText = id ? 'Edit Nationality' : 'New Nationality';
        natModal.classList.add('active');
        natNameInput.focus();
    };

    const hideModal = () => {
        natModal.classList.remove('active');
        natForm.reset();
    };

    // 4. CRUD Operations
    natForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const id = natIdInput.value;
        const nation = natNameInput.value.trim().toUpperCase(); // Requirement: Uppercase

        const method = id ? 'PUT' : 'POST';
        const userEmail = localStorage.getItem('userEmail');
        const url = id ? `${API_BASE}/${id}?userEmail=${encodeURIComponent(userEmail)}` : `${API_BASE}?userEmail=${encodeURIComponent(userEmail)}`;
        const body = id ? { id: parseInt(id), nation } : { nation };

        try {
            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.message || 'Error saving record');
            }

            window.showToast?.('Record saved successfully', 'success');
            hideModal();
            fetchNationalities();
        } catch (error) {
            window.showToast?.(error.message, 'error');
        }
    });

    window.editNat = (id, name) => {
        openModal(id, name);
    };

    window.deleteNat = async (id) => {
        if (!confirm('Are you sure you want to delete this nationality?')) return;

        const userEmail = localStorage.getItem('userEmail');
        try {
            const response = await fetch(`${API_BASE}/${id}?userEmail=${encodeURIComponent(userEmail)}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Error deleting record');

            window.showToast?.('Deleted successfully', 'success');
            fetchNationalities();
        } catch (error) {
            window.showToast?.(error.message, 'error');
        }
    };

    // 5. Special Requirement: Convert input to Uppercase as typing
    natNameInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.toUpperCase();
    });

    // 6. Listeners
    btnAddNat.addEventListener('click', () => openModal());
    closeModal.addEventListener('click', hideModal);
    
    // Close modal on outside click
    natModal.addEventListener('click', (e) => {
        if (e.target === natModal) hideModal();
    });

    // Initial Load
    fetchNationalities();
});
