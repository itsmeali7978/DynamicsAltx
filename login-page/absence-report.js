document.addEventListener('DOMContentLoaded', () => {
    // Check if user is logged in
    const userRole = localStorage.getItem('userRole');
    if (!userRole) {
        window.location.href = 'index.html';
        return;
    }

    // Set default month/year for filter
    const today = new Date();
    const filterMonth = document.getElementById('filterMonth');
    const filterYear = document.getElementById('filterYear');
    if (filterMonth) filterMonth.value = today.getMonth() + 1;
    if (filterYear) filterYear.value = today.getFullYear();

    // Cache leave types and locations for edit modal
    loadLeaveTypesCache();
    loadLocationsCache();

    // Trigger initial search on load
    generateReport();
});

// --- Leave Types and Locations Cache ---
let leaveTypesCache = [];
let locationsCache = [];

async function loadLocationsCache() {
    try {
        const response = await fetch('/api/Locations');
        if (response.ok) {
            locationsCache = await response.json();
            const editSelect = document.getElementById('editLocation');
            const filterSelect = document.getElementById('filterLocation');
            
            const userRole = localStorage.getItem('userRole');
            const userLocation = localStorage.getItem('userLocation');

            if (editSelect) {
                editSelect.innerHTML = '<option value="" disabled selected>Select Location...</option>';
                locationsCache.forEach(loc => {
                    const opt = document.createElement('option');
                    opt.value = loc.locationCode;
                    opt.textContent = loc.locationCode + ' - ' + loc.locationName;
                    opt.dataset.name = loc.locationName;
                    editSelect.appendChild(opt);
                });
                if (userRole !== 'Admin') {
                    editSelect.disabled = true;
                }
            }

            if (filterSelect) {
                filterSelect.innerHTML = '<option value="">All Locations</option>';
                locationsCache.forEach(loc => {
                    const opt = document.createElement('option');
                    opt.value = loc.locationCode;
                    opt.textContent = loc.locationCode + ' - ' + loc.locationName;
                    opt.dataset.name = loc.locationName;
                    filterSelect.appendChild(opt);
                });
                
                if (userRole !== 'Admin') {
                    const searchVal = (userLocation || 'HO').trim().toLowerCase();
                    let matched = false;
                    for (let i = 0; i < filterSelect.options.length; i++) {
                        const opt = filterSelect.options[i];
                        if (opt.value.toLowerCase() === searchVal || (opt.dataset.name && opt.dataset.name.toLowerCase() === searchVal)) {
                            filterSelect.selectedIndex = i;
                            matched = true;
                            break;
                        }
                    }
                    if (!matched) {
                        const fallbackOpt = document.createElement('option');
                        fallbackOpt.value = userLocation;
                        fallbackOpt.textContent = userLocation;
                        filterSelect.appendChild(fallbackOpt);
                        filterSelect.value = userLocation;
                    }
                    filterSelect.disabled = true;
                }
            }
        }
    } catch (error) {
        console.error('Error caching locations:', error);
    }
}

async function loadLeaveTypesCache() {
    try {
        const response = await fetch('/api/AbsenceMarkers/LeaveTypes');
        if (response.ok) {
            leaveTypesCache = await response.json();
            const selectEl = document.getElementById('editLeaveType');
            if (selectEl) {
                selectEl.innerHTML = '<option value="" disabled selected>Select Leave Type...</option>';
                leaveTypesCache.forEach(lt => {
                    const opt = document.createElement('option');
                    opt.value = lt.id;
                    opt.textContent = `${lt.nameEn} - ${lt.nameAr}`;
                    selectEl.appendChild(opt);
                });
            }
        }
    } catch (error) {
        console.error('Error caching leave types:', error);
    }
}

// --- Generate Reports ---
window.generateReport = async function() {
    const month = document.getElementById('filterMonth').value;
    const year = document.getElementById('filterYear').value;
    const empNo = document.getElementById('filterEmpNo').value.trim();
    let location = document.getElementById('filterLocation').value.trim();
    
    const userRole = localStorage.getItem('userRole');
    if (userRole !== 'Admin') {
        location = localStorage.getItem('userLocation');
    }
    
    const tableBody = document.getElementById('reportTableBody');
    if (!tableBody) return;

    tableBody.innerHTML = '<tr><td colspan="9" style="text-align:center;">Loading report data...</td></tr>';

    let url = `/api/AbsenceMarkers/Report?month=${month}&year=${year}`;
    if (empNo) url += `&employeeNo=${encodeURIComponent(empNo)}`;
    if (location) url += `&location=${encodeURIComponent(location)}`;

    try {
        const response = await fetch(url);
        if (response.ok) {
            const data = await response.json();
            renderReportTable(data);
        } else {
            tableBody.innerHTML = '<tr><td colspan="9" style="text-align:center; color:var(--error);">Failed to retrieve report data.</td></tr>';
        }
    } catch (error) {
        console.error('Error loading report:', error);
        tableBody.innerHTML = '<tr><td colspan="9" style="text-align:center; color:var(--error);">An error occurred while loading the report.</td></tr>';
    }
};

function renderReportTable(data) {
    const tableBody = document.getElementById('reportTableBody');
    if (!tableBody) return;

    if (data.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="9" style="text-align:center; color:var(--text-muted);">No absence entries found for selected filters.</td></tr>';
        return;
    }

    const fortyFiveDaysAgo = new Date();
    fortyFiveDaysAgo.setDate(fortyFiveDaysAgo.getDate() - 45);
    fortyFiveDaysAgo.setHours(0,0,0,0);

    tableBody.innerHTML = '';
    data.forEach(row => {
        const entryDate = new Date(row.leaveDate);
        entryDate.setHours(0,0,0,0);
        const isPast45Days = entryDate < fortyFiveDaysAgo;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${escapeHtml(row.employeeNo)}</td>
            <td>${escapeHtml(row.employeeName)}</td>
            <td><span class="badge-leave">${escapeHtml(row.leaveType)}</span></td>
            <td style="font-family: monospace;">${escapeHtml(row.leaveDate)}</td>
            <td>${escapeHtml(row.location)}</td>
            <td>${escapeHtml(row.comments || '-')}</td>
            <td style="font-family: monospace; font-size:0.8rem;">${escapeHtml(row.createdDate)}</td>
            <td>${escapeHtml(row.createdUser)}</td>
            <td>
                <div style="display: flex; gap: 0.5rem; align-items: center;">
                    ${isPast45Days ? 
                        `<button class="icon-btn edit-btn" title="Edit Locked (Older than 45 days)" disabled style="opacity: 0.5; cursor: not-allowed;">
                            <i class="ri-edit-line" style="color: var(--text-muted);"></i>
                        </button>` : 
                        `<button class="icon-btn edit-btn" title="Edit">
                            <i class="ri-edit-line" style="color: var(--primary);"></i>
                        </button>`
                    }
                    ${isPast45Days ? 
                        `<button class="icon-btn delete-btn" title="Delete Locked (Older than 45 days)" disabled style="opacity: 0.5; cursor: not-allowed;">
                            <i class="ri-delete-bin-line" style="color: var(--text-muted);"></i>
                        </button>` : 
                        `<button class="icon-btn delete-btn" title="Delete">
                            <i class="ri-delete-bin-line" style="color: var(--error);"></i>
                        </button>`
                    }
                </div>
            </td>
        `;

        // Attach listeners if not disabled
        if (!isPast45Days) {
            const editBtn = tr.querySelector('.edit-btn');
            const deleteBtn = tr.querySelector('.delete-btn');

            if (editBtn) editBtn.addEventListener('click', () => {
                openEditModal(row.id, row.employeeNo, row.employeeName, row.leaveTypeId, row.leaveDate, row.location, row.comments);
            });

            if (deleteBtn) deleteBtn.addEventListener('click', () => {
                deleteEntry(row.id);
            });
        }

        tableBody.appendChild(tr);
    });
}

// --- Edit Modal Controls ---
window.openEditModal = function(id, employeeNo, employeeName, leaveTypeId, leaveDate, location, comments) {
    document.getElementById('editEntryId').value = id;
    document.getElementById('editEmpId').value = employeeNo;
    document.getElementById('editEmpName').value = employeeName;
    document.getElementById('editLeaveType').value = leaveTypeId;
    
    const editDateInput = document.getElementById('editLeaveDate');
    const todayStr = new Date().toISOString().split('T')[0];
    const fortyFiveDaysAgo = new Date();
    fortyFiveDaysAgo.setDate(fortyFiveDaysAgo.getDate() - 45);
    const minDateStr = fortyFiveDaysAgo.toISOString().split('T')[0];
    
    editDateInput.min = minDateStr;
    editDateInput.max = todayStr;
    editDateInput.value = leaveDate;
    
    const editSelect = document.getElementById('editLocation');
    const searchVal = (location || '').trim().toLowerCase();
    if (editSelect) {
        editSelect.selectedIndex = 0;
        let matched = false;
        for (let i = 0; i < editSelect.options.length; i++) {
            const opt = editSelect.options[i];
            if (opt.value.toLowerCase() === searchVal || (opt.dataset.name && opt.dataset.name.toLowerCase() === searchVal)) {
                editSelect.selectedIndex = i;
                matched = true;
                break;
            }
        }
        if (!matched && location) {
            const fallbackOpt = document.createElement('option');
            fallbackOpt.value = location;
            fallbackOpt.textContent = location;
            editSelect.appendChild(fallbackOpt);
            editSelect.value = location;
        }
    }
    
    document.getElementById('editComments').value = comments || '';
    
    document.getElementById('edit-modal').classList.add('active');
};

window.hideEditModal = function() {
    document.getElementById('edit-modal').classList.remove('active');
};

window.submitEditAbsence = async function() {
    const id = document.getElementById('editEntryId').value;
    const employeeNo = document.getElementById('editEmpId').value;
    const leaveTypeId = document.getElementById('editLeaveType').value;
    const leaveDate = document.getElementById('editLeaveDate').value;
    let location = document.getElementById('editLocation').value;
    const userRole = localStorage.getItem('userRole');
    if (userRole !== 'Admin') {
        location = localStorage.getItem('userLocation') || location;
    }
    const comments = document.getElementById('editComments').value.trim();

    if (!leaveTypeId) {
        showToast('Please select a leave type.', 'warning');
        return;
    }
    if (!leaveDate) {
        showToast('Please select a leave date.', 'warning');
        return;
    }

    const payload = {
        employeeNo: employeeNo,
        leaveTypeId: parseInt(leaveTypeId),
        leaveDate: leaveDate,
        location: location,
        comments: comments
    };

    try {
        const response = await fetch(`/api/AbsenceMarkers/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (response.ok) {
            showToast(result.message || 'Absence record updated successfully!', 'success');
            hideEditModal();
            generateReport();
        } else {
            showToast(result.message || 'Failed to update record.', 'error');
        }
    } catch (error) {
        console.error('Error updating record:', error);
        showToast('An error occurred. Please try again.', 'error');
    }
};

// --- Delete record ---
window.deleteEntry = async function(id) {
    const isConfirmed = await showConfirm('Are you sure you want to delete this absence record?');
    if (!isConfirmed) {
        return;
    }

    try {
        const response = await fetch(`/api/AbsenceMarkers/${id}`, {
            method: 'DELETE'
        });

        const result = await response.json();

        if (response.ok) {
            showToast(result.message || 'Record deleted successfully.', 'success');
            generateReport();
        } else {
            showToast(result.message || 'Failed to delete record.', 'error');
        }
    } catch (error) {
        console.error('Error deleting record:', error);
        showToast('An error occurred. Please try again.', 'error');
    }
};

// Helper to escape HTML and prevent XSS
function escapeHtml(str) {
    if (!str) return '';
    return str.toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// --- Print Report ---
window.printReport = function() {
    const monthSelect = document.getElementById('filterMonth');
    if (!monthSelect) return;

    const monthText = monthSelect.options[monthSelect.selectedIndex].text;
    const yearVal = document.getElementById('filterYear').value;
    const tableEl = document.querySelector('.erp-table');
    if (!tableEl) return;
    
    // Hide actions column from print by cloning table
    const tableClone = tableEl.cloneNode(true);
    // Remove last column of header
    const ths = tableClone.querySelectorAll('thead tr th');
    if (ths.length > 0) ths[ths.length - 1].remove();
    // Remove last column of body rows
    tableClone.querySelectorAll('tbody tr').forEach(tr => {
        const tds = tr.querySelectorAll('td');
        if (tds.length > 1) tds[tds.length - 1].remove();
    });

    const printWindow = window.open('', '', 'height=600,width=800');
    printWindow.document.write('<html><head><title>Absence Report</title>');
    printWindow.document.write('<style>');
    printWindow.document.write('body { font-family: sans-serif; padding: 20px; }');
    printWindow.document.write('h2 { text-align: center; }');
    printWindow.document.write('table { width: 100%; border-collapse: collapse; margin-top: 20px; }');
    printWindow.document.write('th, td { border: 1px solid #ccc; padding: 8px; text-align: left; font-size: 12px; }');
    printWindow.document.write('th { background-color: #f2f2f2; }');
    printWindow.document.write('.badge-leave { font-weight: bold; }');
    printWindow.document.write('</style></head><body>');
    printWindow.document.write(`<h2>Absence Report - ${monthText} ${yearVal}</h2>`);
    printWindow.document.write(tableClone.outerHTML);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
};
