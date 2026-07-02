/**
 * DynamicsAltx - Leave Types Management Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Selection
    const leaveListGrid = document.getElementById('leave-list');
    const leaveModal = document.getElementById('leave-modal');
    const leaveForm = document.getElementById('leave-form');
    const btnAddLeave = document.getElementById('btn-add-leave');
    const closeModal = document.getElementById('close-modal');
    
    const leaveIdInput = document.getElementById('leave-id');
    const leaveNameEnInput = document.getElementById('leave-name-en');
    const leaveNameArInput = document.getElementById('leave-name-ar');
    const leaveMaxDaysInput = document.getElementById('leave-max-days');
    const leaveIsPaidInput = document.getElementById('leave-is-paid');
    const modalTitle = document.getElementById('modal-title');

    const API_BASE = '/api/LeaveTypes';

    // 0. Security Guard (Admin Only)
    const userRole = localStorage.getItem('userRole');
    if (userRole && userRole.toLowerCase() !== 'admin') {
        window.showAlert?.('Access Denied: This module is reserved for System Administrators only.', 'Security Alert').then(() => {
            window.location.href = 'dashboard.html';
        });
        return;
    }

    // 2. Fetch & Render
    const fetchLeaveTypes = async () => {
        const userEmail = localStorage.getItem('userEmail');
        try {
            const response = await fetch(`${API_BASE}?userEmail=${encodeURIComponent(userEmail)}`);
            if (!response.ok) throw new Error('Failed to fetch data');
            const data = await response.json();
            renderLeaveTypes(data);
        } catch (error) {
            console.error('Fetch Error:', error);
            leaveListGrid.innerHTML = `<div class="error-state">Error loading records: ${error.message}</div>`;
        }
    };

    const renderLeaveTypes = (leaves) => {
        if (leaves.length === 0) {
            const emptyText = (localStorage.getItem('lang') === 'ar') ? 'لم يتم العثور على أنواع إجازات. انقر فوق "نوع إجازة جديد" لإضافة نوع.' : 'No leave types found. Click "New Leave Type" to add one.';
            leaveListGrid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--text-muted);">
                    <i class="ri-calendar-event-line" style="font-size: 3rem; display: block; margin-bottom: 1rem;"></i>
                    <p>${emptyText}</p>
                </div>
            `;
            return;
        }

        const currentLang = localStorage.getItem('lang') || 'en';

        leaveListGrid.innerHTML = leaves.map(l => {
            const badgeClass = l.isPaid ? 'badge-paid' : 'badge-unpaid';
            const badgeText = l.isPaid 
                ? (currentLang === 'ar' ? 'مدفوعة' : 'Paid') 
                : (currentLang === 'ar' ? 'غير مدفوعة' : 'Unpaid');
                
            const limitLabel = currentLang === 'ar' ? 'الحد الأقصى' : 'Limit';
            const daysSuffix = currentLang === 'ar' ? 'يوم' : 'days';
            const limitValue = l.maxDays !== null && l.maxDays !== undefined
                ? `<strong>${l.maxDays} ${daysSuffix}</strong>`
                : `<strong>${currentLang === 'ar' ? 'بدون حد' : 'No Limit'}</strong>`;

            return `
                <div class="leave-card">
                    <div class="leave-info-row">
                        <div class="leave-names">
                            <span class="leave-name-en">${l.nameEn}</span>
                            <span class="leave-name-ar">${l.nameAr}</span>
                        </div>
                        <span class="leave-badge ${badgeClass}">${badgeText}</span>
                    </div>
                    <div class="leave-meta">
                        <span>${limitLabel}: ${limitValue}</span>
                        <div class="leave-actions">
                            <button class="action-btn btn-edit" onclick="window.editLeave(${l.id}, '${l.nameEn.replace(/'/g, "\\'")}', '${l.nameAr.replace(/'/g, "\\'")}', ${l.maxDays}, ${l.isPaid})" title="Edit">
                                <i class="ri-edit-line"></i>
                            </button>
                            <button class="action-btn btn-delete" onclick="window.deleteLeave(${l.id})" title="Delete">
                                <i class="ri-delete-bin-line"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    };

    // 3. Modal Handlers
    const openModal = (id = null, nameEn = '', nameAr = '', maxDays = null, isPaid = true) => {
        leaveIdInput.value = id || '';
        leaveNameEnInput.value = nameEn;
        leaveNameArInput.value = nameAr;
        leaveMaxDaysInput.value = maxDays !== null ? maxDays : '';
        leaveIsPaidInput.checked = isPaid;
        
        const currentLang = localStorage.getItem('lang') || 'en';
        if (id) {
            modalTitle.textContent = currentLang === 'ar' ? 'تعديل نوع الإجازة' : 'Edit Leave Type';
        } else {
            modalTitle.textContent = currentLang === 'ar' ? 'نوع إجازة جديد' : 'New Leave Type';
        }
        
        leaveModal.classList.add('active');
        leaveNameEnInput.focus();
    };

    const hideModal = () => {
        leaveModal.classList.remove('active');
        leaveForm.reset();
    };

    // 4. CRUD Operations
    leaveForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const id = leaveIdInput.value;
        const nameEn = leaveNameEnInput.value.trim();
        const nameAr = leaveNameArInput.value.trim();
        
        const maxDaysVal = leaveMaxDaysInput.value.trim();
        const maxDays = maxDaysVal ? parseInt(maxDaysVal) : null;
        const isPaid = leaveIsPaidInput.checked;

        const method = id ? 'PUT' : 'POST';
        const userEmail = localStorage.getItem('userEmail');
        const url = id ? `${API_BASE}/${id}?userEmail=${encodeURIComponent(userEmail)}` : `${API_BASE}?userEmail=${encodeURIComponent(userEmail)}`;
        
        const body = id 
            ? { id: parseInt(id), nameEn, nameAr, maxDays, isPaid } 
            : { nameEn, nameAr, maxDays, isPaid };

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

            const successText = (localStorage.getItem('lang') === 'ar') ? 'تم حفظ السجل بنجاح' : 'Record saved successfully';
            window.showToast?.(successText, 'success');
            hideModal();
            fetchLeaveTypes();
        } catch (error) {
            window.showToast?.(error.message, 'error');
        }
    });

    window.editLeave = (id, nameEn, nameAr, maxDays, isPaid) => {
        openModal(id, nameEn, nameAr, maxDays, isPaid);
    };

    window.deleteLeave = async (id) => {
        const confirmText = (localStorage.getItem('lang') === 'ar') ? 'هل أنت متأكد من حذف نوع الإجازة هذا؟' : 'Are you sure you want to delete this leave type?';
        if (!confirm(confirmText)) return;

        const userEmail = localStorage.getItem('userEmail');
        try {
            const response = await fetch(`${API_BASE}/${id}?userEmail=${encodeURIComponent(userEmail)}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Error deleting record');

            const deletedText = (localStorage.getItem('lang') === 'ar') ? 'تم الحذف بنجاح' : 'Deleted successfully';
            window.showToast?.(deletedText, 'success');
            fetchLeaveTypes();
        } catch (error) {
            window.showToast?.(error.message, 'error');
        }
    };

    // 6. Listeners
    btnAddLeave.addEventListener('click', () => openModal());
    closeModal.addEventListener('click', hideModal);
    
    // Close modal on outside click
    leaveModal.addEventListener('click', (e) => {
        if (e.target === leaveModal) hideModal();
    });

    // Listen for language changes to redraw list with updated language badges
    document.addEventListener('languageChanged', () => {
        fetchLeaveTypes();
    });

    // Initial Load
    fetchLeaveTypes();
});
