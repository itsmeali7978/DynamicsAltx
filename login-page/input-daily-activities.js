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

    // Setup Enter key field focus navigation
    setupEnterKeyNavigation();
});

// Enter Key Sequential Field Focus Navigation
function setupEnterKeyNavigation() {
    const fields = [
        'activityDate',
        'itemNo',
        'producedQty',
        'expiredQty',
        'expiryReason',
        'notes'
    ];

    fields.forEach((fieldId, index) => {
        const el = document.getElementById(fieldId);
        if (!el) return;

        el.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (index < fields.length - 1) {
                    const nextEl = document.getElementById(fields[index + 1]);
                    if (nextEl) {
                        nextEl.focus();
                        if (typeof nextEl.select === 'function' && (nextEl.type === 'number' || nextEl.type === 'text')) {
                            nextEl.select();
                        }
                    }
                } else {
                    // Final field: submit activity form
                    handleFormSubmit(e);
                }
            }
        });
    });

    const editFields = [
        'editActivityDate',
        'editItemNo',
        'editProducedQty',
        'editExpiredQty',
        'editExpiryReason',
        'editNotes'
    ];

    editFields.forEach((fieldId, index) => {
        const el = document.getElementById(fieldId);
        if (!el) return;

        el.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (index < editFields.length - 1) {
                    const nextEl = document.getElementById(editFields[index + 1]);
                    if (nextEl) {
                        nextEl.focus();
                        if (typeof nextEl.select === 'function' && (nextEl.type === 'number' || nextEl.type === 'text')) {
                            nextEl.select();
                        }
                    }
                } else {
                    handleEditSubmit(e);
                }
            }
        });
    });
}

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
        currentItemData = { descEng: '', descAra: '', found: false };
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
                    currentItemData.found = true;
                    previewEl.innerHTML = `<i class="ri-checkbox-circle-fill" style="color: #10b981;"></i> <strong>${data.descEng || data.descAra}</strong>`;
                } else {
                    currentItemData = { descEng: '', descAra: '', found: false };
                    previewEl.innerHTML = `<i class="ri-close-circle-fill" style="color: #ef4444;"></i> <span style="color: #ef4444; font-weight: 600;">Item No wrong</span>`;
                }
            } else {
                currentItemData = { descEng: '', descAra: '', found: false };
                previewEl.innerHTML = `<i class="ri-close-circle-fill" style="color: #ef4444;"></i> <span style="color: #ef4444; font-weight: 600;">Item No wrong</span>`;
            }
        } catch (err) {
            console.error(err);
            currentItemData = { descEng: '', descAra: '', found: false };
            previewEl.innerHTML = `<i class="ri-close-circle-fill" style="color: #ef4444;"></i> <span style="color: #ef4444; font-weight: 600;">Item No wrong</span>`;
        }
    }, 300);
}

// Live Item Lookup for Edit Modal
function onEditItemNoInput(val) {
    const previewEl = document.getElementById('editItemDescPreview');
    const cleanVal = val.trim();

    if (!cleanVal) {
        previewEl.innerHTML = '<i class="ri-information-line"></i> Item name preview';
        editItemData = { descEng: '', descAra: '', found: false };
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
                    editItemData.found = true;
                    previewEl.innerHTML = `<i class="ri-checkbox-circle-fill" style="color: #10b981;"></i> <strong>${data.descEng || data.descAra}</strong>`;
                } else {
                    editItemData = { descEng: '', descAra: '', found: false };
                    previewEl.innerHTML = `<i class="ri-close-circle-fill" style="color: #ef4444;"></i> <span style="color: #ef4444; font-weight: 600;">Item No wrong</span>`;
                }
            } else {
                editItemData = { descEng: '', descAra: '', found: false };
                previewEl.innerHTML = `<i class="ri-close-circle-fill" style="color: #ef4444;"></i> <span style="color: #ef4444; font-weight: 600;">Item No wrong</span>`;
            }
        } catch (err) {
            console.error(err);
            editItemData = { descEng: '', descAra: '', found: false };
            previewEl.innerHTML = `<i class="ri-close-circle-fill" style="color: #ef4444;"></i> <span style="color: #ef4444; font-weight: 600;">Item No wrong</span>`;
        }
    }, 300);
}

// Date change handler
function onDateChanged() {
    loadActivitiesForSelectedDate();
}

let currentDateRecords = [];

// Load activities from API
async function loadActivitiesForSelectedDate() {
    const dateVal = document.getElementById('activityDate').value;
    const tableBody = document.getElementById('tableBody');
    const recordCount = document.getElementById('recordCount');

    if (!dateVal) {
        tableBody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 2rem;">Please select a date.</td></tr>`;
        recordCount.textContent = '0 Records';
        currentDateRecords = [];
        return;
    }

    tableBody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 2rem;"><i class="ri-loader-4-line spin"></i> Loading entries for ${dateVal}...</td></tr>`;

    try {
        const res = await fetch(`/api/DailyActivity?date=${encodeURIComponent(dateVal)}`);
        if (!res.ok) throw new Error('Failed to fetch daily activities');

        const records = await res.json();
        currentDateRecords = records || [];
        recordCount.textContent = `${records.length} Record${records.length === 1 ? '' : 's'}`;

        if (records.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--text-muted); padding: 2rem;">No activities recorded for ${dateVal}.</td></tr>`;
            return;
        }

        tableBody.innerHTML = records.map(item => {
            const formattedDate = new Date(item.activityDate).toLocaleDateString('en-GB'); // DD/MM/YYYY
            const actionsCell = currentMode === 'editview' ? `
                <td class="col-actions">
                    <div class="action-btns">
                        <button class="btn-icon edit" onclick="openEditModal(${item.id})" title="Edit Row"><i class="ri-edit-line"></i></button>
                        <button class="btn-icon delete" onclick="deleteActivityRecord(${item.id})" title="Delete Row"><i class="ri-delete-bin-line"></i></button>
                    </div>
                </td>
            ` : '';

            // Order: Date | Item No | Description Arabic | Description English | Produced Qty | Expired Qty | Expiry Reason | Notes
            return `
                <tr>
                    <td class="col-date"><strong>${formattedDate}</strong></td>
                    <td class="col-itemno"><code>${item.itemNo}</code></td>
                    <td class="col-desc-ara">${item.descAra || '-'}</td>
                    <td class="col-desc-eng">${item.descEng || '-'}</td>
                    <td class="col-produced"><span style="font-weight: 600; color: #059669;">${item.producedQty}</span></td>
                    <td class="col-expired"><span style="font-weight: 600; color: #dc2626;">${item.expiredQty}</span></td>
                    <td class="col-reason">${item.expiryReason || '-'}</td>
                    <td class="col-notes">${item.notes || '-'}</td>
                    ${actionsCell}
                </tr>
            `;
        }).join('');
    } catch (err) {
        console.error(err);
        tableBody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: #ef4444; padding: 2rem;">Failed to load data. ${err.message}</td></tr>`;
        currentDateRecords = [];
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

    if (currentItemData.found === false) {
        showAlert('Item No wrong. Typed item does not exist in AltxItems.', 'error');
        return;
    }

    const itemNoInt = parseInt(itemNoVal);

    // Check if a line already exists for this date and itemNo
    const existing = currentDateRecords.find(x =>
        x.itemNo === itemNoInt &&
        x.activityDate.split('T')[0] === activityDate
    );

    if (existing) {
        const hasProducedConflict = existing.producedQty > 0 && producedQty > 0;
        const hasExpiredConflict = existing.expiredQty > 0 && expiredQty > 0;

        if (hasProducedConflict) {
            promptConflict(existing, 'produced', producedQty, expiredQty, expiryReason, notes);
            return;
        } else if (hasExpiredConflict) {
            promptConflict(existing, 'expired', producedQty, expiredQty, expiryReason, notes);
            return;
        } else {
            // Auto-merge without prompt
            const finalProduced = producedQty > 0 ? producedQty : existing.producedQty;
            const finalExpired = expiredQty > 0 ? expiredQty : existing.expiredQty;
            const finalReason = expiryReason || existing.expiryReason || '';
            const finalNotes = notes || existing.notes || '';
            await submitRecordUpdate(existing.id, activityDate, itemNoInt, finalProduced, finalExpired, finalReason, finalNotes, null);
            return;
        }
    }

    // No existing line found -> Create new activity record
    await submitNewRecord(activityDate, itemNoInt, producedQty, expiredQty, expiryReason, notes);
}

// Submit New Activity Record
async function submitNewRecord(activityDate, itemNoInt, producedQty, expiredQty, expiryReason, notes) {
    const currentUser = localStorage.getItem('username') || 'System';

    const payload = {
        activityDate: activityDate,
        itemNo: itemNoInt,
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

        resetFormInputs();
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

// Submit Record Update (for Existing Line)
async function submitRecordUpdate(id, activityDate, itemNo, finalProduced, finalExpired, finalReason, finalNotes, updateMode) {
    const currentUser = localStorage.getItem('username') || 'System';

    const payload = {
        activityDate: activityDate,
        itemNo: itemNo,
        descEng: currentItemData.descEng,
        descAra: currentItemData.descAra,
        producedQty: finalProduced,
        expiredQty: finalExpired,
        expiryReason: finalReason,
        notes: finalNotes,
        createdBy: currentUser,
        updateMode: updateMode
    };

    try {
        const btnSubmit = document.getElementById('btnSubmit');
        if (btnSubmit) {
            btnSubmit.disabled = true;
            btnSubmit.innerHTML = '<i class="ri-loader-4-line spin"></i> Updating...';
        }

        const res = await fetch(`/api/DailyActivity/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error('Failed to update existing daily activity record.');

        const modeMsg = updateMode === 'add' ? ' (Added to existing)' : (updateMode === 'replace' ? ' (Replaced existing)' : '');
        showAlert(`Existing line for Item ${itemNo} updated successfully${modeMsg}!`, 'success');

        resetFormInputs();
        loadActivitiesForSelectedDate();
    } catch (err) {
        console.error(err);
        showAlert(err.message, 'error');
    } finally {
        const btnSubmit = document.getElementById('btnSubmit');
        if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = '<i class="ri-save-line"></i> Submit Activity';
        }
    }
}

// Prompt Conflict Resolution Modal
function promptConflict(existing, type, newProduced, newExpired, expiryReason, notes) {
    const modal = document.getElementById('conflictModal');
    const titleEl = document.getElementById('conflictModalTitle');
    const bodyEl = document.getElementById('conflictModalBody');
    const btnAdd = document.getElementById('btnConflictAdd');
    const btnReplace = document.getElementById('btnConflictReplace');

    const itemName = currentItemData.descEng || currentItemData.descAra || existing.descEng || existing.descAra || `Item #${existing.itemNo}`;
    const formattedDate = new Date(existing.activityDate).toLocaleDateString('en-GB');

    if (type === 'produced') {
        titleEl.textContent = 'Existing Production Entry Found';
        bodyEl.innerHTML = `Item <strong>${existing.itemNo} (${itemName})</strong> already has <strong>${existing.producedQty}</strong> Produced Qty on <strong>${formattedDate}</strong>.<br><br>Do you want to <strong>ADD</strong> the new <strong>${newProduced}</strong> Qty to the old <strong>${existing.producedQty}</strong> (Total: <strong>${existing.producedQty + newProduced}</strong>) or <strong>REPLACE</strong> <strong>${existing.producedQty}</strong> with <strong>${newProduced}</strong>?`;

        btnAdd.innerHTML = `<i class="ri-add-line"></i> Add ${newProduced} to ${existing.producedQty} (Total: ${existing.producedQty + newProduced})`;
        btnReplace.innerHTML = `<i class="ri-refresh-line"></i> Replace ${existing.producedQty} with ${newProduced}`;
    } else {
        titleEl.textContent = 'Existing Expired Entry Found';
        bodyEl.innerHTML = `Item <strong>${existing.itemNo} (${itemName})</strong> already has <strong>${existing.expiredQty}</strong> Expired Qty on <strong>${formattedDate}</strong>.<br><br>Do you want to <strong>ADD</strong> the new <strong>${newExpired}</strong> Qty to the old <strong>${existing.expiredQty}</strong> (Total: <strong>${existing.expiredQty + newExpired}</strong>) or <strong>REPLACE</strong> <strong>${existing.expiredQty}</strong> with <strong>${newExpired}</strong>?`;

        btnAdd.innerHTML = `<i class="ri-add-line"></i> Add ${newExpired} to ${existing.expiredQty} (Total: ${existing.expiredQty + newExpired})`;
        btnReplace.innerHTML = `<i class="ri-refresh-line"></i> Replace ${existing.expiredQty} with ${newExpired}`;
    }

    // Set click handlers
    btnAdd.onclick = async () => {
        closeConflictModal();
        let finalProduced = existing.producedQty;
        let finalExpired = existing.expiredQty;

        if (type === 'produced') {
            finalProduced = existing.producedQty + newProduced;
            if (newExpired > 0) finalExpired = existing.expiredQty > 0 ? existing.expiredQty + newExpired : newExpired;
        } else {
            finalExpired = existing.expiredQty + newExpired;
            if (newProduced > 0) finalProduced = existing.producedQty > 0 ? existing.producedQty + newProduced : newProduced;
        }

        const finalReason = expiryReason || existing.expiryReason || '';
        const finalNotes = notes || existing.notes || '';

        await submitRecordUpdate(existing.id, existing.activityDate.split('T')[0], existing.itemNo, finalProduced, finalExpired, finalReason, finalNotes, 'add');
    };

    btnReplace.onclick = async () => {
        closeConflictModal();
        let finalProduced = existing.producedQty;
        let finalExpired = existing.expiredQty;

        if (type === 'produced') {
            finalProduced = newProduced;
            if (newExpired > 0) finalExpired = newExpired;
        } else {
            finalExpired = newExpired;
            if (newProduced > 0) finalProduced = newProduced;
        }

        const finalReason = expiryReason || existing.expiryReason || '';
        const finalNotes = notes || existing.notes || '';

        await submitRecordUpdate(existing.id, existing.activityDate.split('T')[0], existing.itemNo, finalProduced, finalExpired, finalReason, finalNotes, 'replace');
    };

    modal.style.display = 'flex';
}

function closeConflictModal() {
    const modal = document.getElementById('conflictModal');
    if (modal) modal.style.display = 'none';
}

// Reset form inputs & focus back to Item No
function resetFormInputs() {
    document.getElementById('itemNo').value = '';
    document.getElementById('producedQty').value = '0';
    document.getElementById('expiredQty').value = '0';
    document.getElementById('expiryReason').value = '';
    document.getElementById('notes').value = '';
    document.getElementById('itemDescPreview').innerHTML = '<i class="ri-information-line"></i> Item name will display here';
    currentItemData = { descEng: '', descAra: '' };

    const itemNoInput = document.getElementById('itemNo');
    if (itemNoInput) {
        itemNoInput.focus();
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

        editItemData = { descEng: item.descEng || '', descAra: item.descAra || '', found: true };
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

    if (editItemData.found === false) {
        alert('Item No wrong. Typed item does not exist in AltxItems.');
        return;
    }

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
