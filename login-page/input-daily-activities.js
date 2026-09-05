// Input Daily Activities Module Logic

let currentMode = 'add'; // 'add' or 'editview'
let itemLookupTimeout = null;
let editLookupTimeout = null;
let currentItemData = { descEng: '', descAra: '' };
let editItemData = { descEng: '', descAra: '' };

document.addEventListener('DOMContentLoaded', () => {
    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('activityDate');
    if (dateInput) {
        dateInput.value = today;
    }
    
    // Load initial records for today
    loadActivitiesForSelectedDate();
});

// Mode Switching
function switchMode(mode) {
    currentMode = mode;
    const btnAdd = document.getElementById('btnModeAdd');
    const btnEditView = document.getElementById('btnModeEditView');
    const addFormActions = document.getElementById('addFormActions');
    const thActions = document.getElementById('thActions');
    const gridTitle = document.getElementById('gridTitle');

    if (mode === 'add') {
        btnAdd.classList.add('active');
        btnEditView.classList.remove('active');
        addFormActions.style.display = 'flex';
        thActions.style.display = 'none';
        gridTitle.textContent = 'Submitted Daily Activities';
    } else {
        btnEditView.classList.add('active');
        btnAdd.classList.remove('active');
        addFormActions.style.display = 'none';
        thActions.style.display = 'table-cell';
        gridTitle.textContent = 'Daily Activities (Edit & View)';
    }

    loadActivitiesForSelectedDate();
}

// Live Item Lookup for Add Form
function onItemNoInput(val) {
    const previewEl = document.getElementById('itemDescPreview');
    const cleanVal = val.trim();

    if (!cleanVal) {
        previewEl.innerHTML = '<i class="ri-information-line"></i> Item name will display here';
        currentItemData = { descEng: '', descAra: '' };
        return;
    }

    previewEl.innerHTML = '<i class="ri-loader-4-line spin"></i> Searching...';

    if (itemLookupTimeout) clearTimeout(itemLookupTimeout);

    itemLookupTimeout = setTimeout(async () => {
        try {
            const res = await fetch(`/api/DailyActivity/item-lookup/${encodeURIComponent(cleanVal)}`);
            if (res.ok) {
                const data = await res.json();
                if (data.found && (data.descEng || data.descAra)) {
                    currentItemData.descEng = data.descEng || '';
                    currentItemData.descAra = data.descAra || '';
                    previewEl.innerHTML = `<i class="ri-checkbox-circle-fill" style="color: #10b981;"></i> <strong>${data.descEng || data.descAra}</strong>`;
                } else {
                    currentItemData = { descEng: '', descAra: '' };
                    previewEl.innerHTML = `<i class="ri-error-warning-line" style="color: #f59e0b;"></i> Item No not found`;
                }
            } else {
                currentItemData = { descEng: '', descAra: '' };
                previewEl.innerHTML = `<i class="ri-error-warning-line"></i> Error looking up item`;
            }
        } catch (err) {
            console.error(err);
            previewEl.innerHTML = `<i class="ri-error-warning-line"></i> Lookup error`;
        }
    }, 300);
}

// Live Item Lookup for Edit Modal
function onEditItemNoInput(val) {
    const previewEl = document.getElementById('editItemDescPreview');
    const cleanVal = val.trim();

    if (!cleanVal) {
        previewEl.innerHTML = '<i class="ri-information-line"></i> Item name preview';
        editItemData = { descEng: '', descAra: '' };
        return;
    }

    previewEl.innerHTML = '<i class="ri-loader-4-line spin"></i> Searching...';

    if (editLookupTimeout) clearTimeout(editLookupTimeout);

    editLookupTimeout = setTimeout(async () => {
        try {
            const res = await fetch(`/api/DailyActivity/item-lookup/${encodeURIComponent(cleanVal)}`);
            if (res.ok) {
                const data = await res.json();
                if (data.found && (data.descEng || data.descAra)) {
                    editItemData.descEng = data.descEng || '';
                    editItemData.descAra = data.descAra || '';
                    previewEl.innerHTML = `<i class="ri-checkbox-circle-fill" style="color: #10b981;"></i> <strong>${data.descEng || data.descAra}</strong>`;
                } else {
                    editItemData = { descEng: '', descAra: '' };
                    previewEl.innerHTML = `<i class="ri-error-warning-line" style="color: #f59e0b;"></i> Item No not found`;
                }
            }
        } catch (err) {
            console.error(err);
        }
    }, 300);
}

// Date change handler
function onDateChanged() {
    loadActivitiesForSelectedDate();
}

// Load activities from API
async function loadActivitiesForSelectedDate() {
    const dateVal = document.getElementById('activityDate').value;
    const tableBody = document.getElementById('tableBody');
    const recordCount = document.getElementById('recordCount');

    if (!dateVal) {
        tableBody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 2rem;">Please select a date.</td></tr>`;
        recordCount.textContent = '0 Records';
        return;
    }

    tableBody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 2rem;"><i class="ri-loader-4-line spin"></i> Loading entries for ${dateVal}...</td></tr>`;

    try {
        const res = await fetch(`/api/DailyActivity?date=${encodeURIComponent(dateVal)}`);
        if (!res.ok) throw new Error('Failed to fetch daily activities');

        const records = await res.json();
        recordCount.textContent = `${records.length} Record${records.length === 1 ? '' : 's'}`;

        if (records.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--text-muted); padding: 2rem;">No activities recorded for ${dateVal}.</td></tr>`;
            return;
        }

        tableBody.innerHTML = records.map(item => {
            const formattedDate = new Date(item.activityDate).toLocaleDateString('en-GB'); // DD/MM/YYYY
            const actionsCell = currentMode === 'editview' ? `
                <td>
                    <div class="action-btns">
                        <button class="btn-icon edit" onclick="openEditModal(${item.id})" title="Edit Row"><i class="ri-edit-line"></i></button>
                        <button class="btn-icon delete" onclick="deleteActivityRecord(${item.id})" title="Delete Row"><i class="ri-delete-bin-line"></i></button>
                    </div>
                </td>
            ` : '';

            // Order: Date | Item No | Description Arabic | Description English | Produced Qty | Expired Qty | Expiry Reason | Notes
            return `
                <tr>
                    <td><strong>${formattedDate}</strong></td>
                    <td>${item.itemNo}</td>
                    <td>${item.descAra || '-'}</td>
                    <td>${item.descEng || '-'}</td>
                    <td><span style="font-weight: 600; color: #059669;">${item.producedQty}</span></td>
                    <td><span style="font-weight: 600; color: #dc2626;">${item.expiredQty}</span></td>
                    <td>${item.expiryReason || '-'}</td>
                    <td>${item.notes || '-'}</td>
                    ${actionsCell}
                </tr>
            `;
        }).join('');
    } catch (err) {
        console.error(err);
        tableBody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: #ef4444; padding: 2rem;">Failed to load data. ${err.message}</td></tr>`;
    }
}

// Form Submission (Add Mode)
async function handleFormSubmit(e) {
    e.preventDefault();

    const alertMsg = document.getElementById('alertMsg');
    alertMsg.style.display = 'none';

    const activityDate = document.getElementById('activityDate').value;
    const itemNoVal = document.getElementById('itemNo').value.trim();
    const producedQty = parseFloat(document.getElementById('producedQty').value) || 0;
    const expiredQty = parseFloat(document.getElementById('expiredQty').value) || 0;
    const expiryReason = document.getElementById('expiryReason').value.trim();
    const notes = document.getElementById('notes').value.trim();

    if (!activityDate) {
        showAlert('Please select a valid date.', 'error');
        return;
    }

    if (!itemNoVal || isNaN(parseInt(itemNoVal))) {
        showAlert('Please enter a valid numeric Item No.', 'error');
        return;
    }

    const currentUser = localStorage.getItem('username') || 'System';

    const payload = {
        activityDate: activityDate,
        itemNo: parseInt(itemNoVal),
        descEng: currentItemData.descEng,
        descAra: currentItemData.descAra,
        producedQty: producedQty,
        expiredQty: expiredQty,
        expiryReason: expiryReason,
        notes: notes,
        createdBy: currentUser
    };

    try {
        const btnSubmit = document.getElementById('btnSubmit');
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = '<i class="ri-loader-4-line spin"></i> Submitting...';

        const res = await fetch('/api/DailyActivity', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.message || 'Failed to create daily activity.');
        }

        showAlert('Daily activity added successfully!', 'success');

        // Clear item form inputs
        document.getElementById('itemNo').value = '';
        document.getElementById('producedQty').value = '0';
        document.getElementById('expiredQty').value = '0';
        document.getElementById('expiryReason').value = '';
        document.getElementById('notes').value = '';
        document.getElementById('itemDescPreview').innerHTML = '<i class="ri-information-line"></i> Item name will display here';
        currentItemData = { descEng: '', descAra: '' };

        // Refresh Grid
        loadActivitiesForSelectedDate();
    } catch (err) {
        console.error(err);
        showAlert(err.message, 'error');
    } finally {
        const btnSubmit = document.getElementById('btnSubmit');
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = '<i class="ri-save-line"></i> Submit Activity';
    }
}

// Show Alert Banner
function showAlert(message, type) {
    const alertMsg = document.getElementById('alertMsg');
    alertMsg.className = `alert-msg ${type}`;
    alertMsg.innerHTML = `<i class="${type === 'success' ? 'ri-checkbox-circle-fill' : 'ri-error-warning-fill'}"></i> ${message}`;
    alertMsg.style.display = 'flex';

    setTimeout(() => {
        alertMsg.style.display = 'none';
    }, 4000);
}

// Edit Modal Functions
async function openEditModal(id) {
    try {
        const dateVal = document.getElementById('activityDate').value;
        const res = await fetch(`/api/DailyActivity?date=${encodeURIComponent(dateVal)}`);
        if (!res.ok) return;

        const list = await res.json();
        const item = list.find(x => x.id === id);
        if (!item) return;

        document.getElementById('editId').value = item.id;
        document.getElementById('editActivityDate').value = item.activityDate.split('T')[0];
        document.getElementById('editItemNo').value = item.itemNo;
        document.getElementById('editProducedQty').value = item.producedQty;
        document.getElementById('editExpiredQty').value = item.expiredQty;
        document.getElementById('editExpiryReason').value = item.expiryReason || '';
        document.getElementById('editNotes').value = item.notes || '';

        editItemData = { descEng: item.descEng || '', descAra: item.descAra || '' };
        document.getElementById('editItemDescPreview').innerHTML = `<i class="ri-checkbox-circle-fill" style="color: #10b981;"></i> <strong>${item.descEng || item.descAra || 'No Description'}</strong>`;

        document.getElementById('editModal').style.display = 'flex';
    } catch (err) {
        console.error(err);
    }
}

function closeEditModal() {
    document.getElementById('editModal').style.display = 'none';
}

async function handleEditSubmit(e) {
    e.preventDefault();

    const id = document.getElementById('editId').value;
    const activityDate = document.getElementById('editActivityDate').value;
    const itemNoVal = document.getElementById('editItemNo').value.trim();
    const producedQty = parseFloat(document.getElementById('editProducedQty').value) || 0;
    const expiredQty = parseFloat(document.getElementById('editExpiredQty').value) || 0;
    const expiryReason = document.getElementById('editExpiryReason').value.trim();
    const notes = document.getElementById('editNotes').value.trim();

    const payload = {
        activityDate: activityDate,
        itemNo: parseInt(itemNoVal),
        descEng: editItemData.descEng,
        descAra: editItemData.descAra,
        producedQty: producedQty,
        expiredQty: expiredQty,
        expiryReason: expiryReason,
        notes: notes
    };

    try {
        const res = await fetch(`/api/DailyActivity/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error('Failed to update activity record.');

        closeEditModal();
        showAlert('Activity record updated successfully!', 'success');
        loadActivitiesForSelectedDate();
    } catch (err) {
        console.error(err);
        alert('Error updating record: ' + err.message);
    }
}

// Delete Record
async function deleteActivityRecord(id) {
    if (!confirm('Are you sure you want to delete this activity record?')) return;

    try {
        const res = await fetch(`/api/DailyActivity/${id}`, {
            method: 'DELETE'
        });

        if (!res.ok) throw new Error('Failed to delete activity record.');

        showAlert('Activity record deleted successfully!', 'success');
        loadActivitiesForSelectedDate();
    } catch (err) {
        console.error(err);
        showAlert(err.message, 'error');
    }
}
