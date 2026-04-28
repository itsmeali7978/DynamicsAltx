document.addEventListener('DOMContentLoaded', function () {
    const userEmail = localStorage.getItem('userEmail');
    const userRole = localStorage.getItem('userRole');

    // Security Check: Admin Access Only
    if (!userEmail || userRole !== 'Admin') {
        window.location.href = 'dashboard.html';
        return;
    }

    const shiftsList = document.getElementById('shifts-list');
    const shiftModal = document.getElementById('shift-modal');
    const shiftForm = document.getElementById('shift-form');
    const btnAddShift = document.getElementById('btn-add-shift');
    const closeModal = document.getElementById('close-modal');
    const modalTitle = document.getElementById('modal-title');

    const apiBase = `${window.location.origin}/api/Shifts`;

    // Fetch and Load Shifts
    async function loadShifts() {
        try {
            const response = await fetch(`${apiBase}?userEmail=${encodeURIComponent(userEmail)}`);
            if (!response.ok) throw new Error('Failed to fetch shifts');
            
            const shifts = await response.json();
            renderShifts(shifts);
        } catch (error) {
            console.error('Error:', error);
            if (typeof showToast === 'function') {
                showToast('Error loading shift records', 'error');
            } else {
                alert('Error loading shifts');
            }
        }
    }

    function renderShifts(shifts) {
        if (shifts.length === 0) {
            shiftsList.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 4rem; background: #f8fafc; border-radius: 16px; border: 2px dashed #e2e8f0;">
                    <i class="ri-time-line" style="font-size: 3rem; color: #cbd5e1; display: block; margin-bottom: 1rem;"></i>
                    <p style="color: #64748b; font-weight: 500;">No shifts configured yet. Click "New Shift" to get started.</p>
                </div>
            `;
            return;
        }

        shiftsList.innerHTML = shifts.map(shift => `
            <div class="shift-card animate-in">
                <div class="shift-info">
                    <div class="shift-icon">
                        <i class="ri-time-line"></i>
                    </div>
                    <div class="shift-details">
                        <span class="shift-no">${shift.shiftNo}</span>
                        <span class="shift-time">${shift.shiftTime} (${shift.workingHours} hrs)</span>
                    </div>
                </div>
                <div class="shift-actions">
                    <button class="action-btn btn-edit" title="Edit Shift" onclick="editShift('${shift.shiftNo}', '${shift.shiftTime}', ${shift.workingHours})">
                        <i class="ri-edit-line"></i>
                    </button>
                    <button class="action-btn btn-delete" title="Delete Shift" onclick="deleteShift('${shift.shiftNo}')">
                        <i class="ri-delete-bin-line"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    // Modal Control
    btnAddShift.onclick = () => {
        modalTitle.textContent = 'New Shift Configuration';
        shiftForm.reset();
        document.getElementById('is-edit').value = 'false';
        document.getElementById('shift-no').readOnly = false;
        document.getElementById('working-hours').value = '';
        shiftModal.classList.add('active');
    };

    closeModal.onclick = () => shiftModal.classList.remove('active');
    
    // Close modal on escape key
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && shiftModal.classList.contains('active')) {
            shiftModal.classList.remove('active');
        }
    });

    // Handle Form Submit
    shiftForm.onsubmit = async (e) => {
        e.preventDefault();
        const isEdit = document.getElementById('is-edit').value === 'true';
        const shiftNo = document.getElementById('shift-no').value;
        const shiftTime = document.getElementById('shift-time').value;
        const workingHours = parseInt(document.getElementById('working-hours').value);

        const data = { shiftNo, shiftTime, workingHours };
        const url = isEdit ? `${apiBase}/${shiftNo}?userEmail=${encodeURIComponent(userEmail)}` : `${apiBase}?userEmail=${encodeURIComponent(userEmail)}`;
        const method = isEdit ? 'PUT' : 'POST';

        const submitBtn = shiftForm.querySelector('.btn-submit');
        const originalBtnText = submitBtn.innerText;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Processing...';

        try {
            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                if (typeof showToast === 'function') {
                    showToast(isEdit ? 'Shift updated successfully' : 'New shift added successfully', 'success');
                }
                shiftModal.classList.remove('active');
                loadShifts();
            } else {
                const error = await response.json();
                if (typeof showToast === 'function') {
                    showToast(error.message || 'Failed to save shift details', 'error');
                }
            }
        } catch (error) {
            if (typeof showToast === 'function') {
                showToast('Server communication error', 'error');
            }
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerText = originalBtnText;
        }
    };

    // Global actions (defined on window for inline onclick)
    window.editShift = (no, time, hours) => {
        modalTitle.textContent = 'Edit Shift Configuration';
        document.getElementById('shift-no').value = no;
        document.getElementById('shift-no').readOnly = true;
        document.getElementById('shift-time').value = time;
        document.getElementById('working-hours').value = hours;
        document.getElementById('is-edit').value = 'true';
        shiftModal.classList.add('active');
    };

    window.deleteShift = async (no) => {
        const confirmed = typeof showConfirm === 'function' 
            ? await showConfirm(`Are you sure you want to permanently delete shift ${no}?`, 'Delete Shift')
            : confirm(`Delete shift ${no}?`);

        if (!confirmed) return;

        try {
            const response = await fetch(`${apiBase}/${no}?userEmail=${encodeURIComponent(userEmail)}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                if (typeof showToast === 'function') {
                    showToast('Shift deleted successfully', 'success');
                }
                loadShifts();
            } else {
                if (typeof showToast === 'function') {
                    showToast('Failed to delete shift', 'error');
                }
            }
        } catch (error) {
            if (typeof showToast === 'function') {
                showToast('Error connecting to server', 'error');
            }
        }
    };

    loadShifts();
});
