/**
 * Employee Documents Management Script
 * DynamicsAltx ERP
 */

document.addEventListener('DOMContentLoaded', () => {
    // API Configuration
    const API_BASE_URL = `${window.location.protocol}//${window.location.hostname}:8000/api`;

    // DOM Elements
    const tableBody = document.getElementById('table-body');
    const searchInput = document.getElementById('search-emp-id');
    const filterDocTypeSelect = document.getElementById('filter-doc-type');
    const filterStatusSelect = document.getElementById('filter-status');
    const btnResetFilters = document.getElementById('btn-reset-filters');

    // Stat Counters & Cards
    const cardTotal = document.getElementById('card-total');
    const cardExpired = document.getElementById('card-expired');
    const cardExpiring = document.getElementById('card-expiring');
    const cardValid = document.getElementById('card-valid');
    const statTotalCount = document.getElementById('stat-total-count');
    const statExpiredCount = document.getElementById('stat-expired-count');
    const statExpiringCount = document.getElementById('stat-expiring-count');
    const statValidCount = document.getElementById('stat-valid-count');

    // Modal Elements
    const docModal = document.getElementById('doc-modal');
    const btnAddDoc = document.getElementById('btn-add-doc');
    const modalCloseBtn = document.getElementById('modal-close-btn');
    const modalCancelBtn = document.getElementById('modal-cancel-btn');
    const docForm = document.getElementById('doc-form');
    const modalTitle = document.getElementById('modal-title');
    
    // Employee Lookup & Selection Elements
    const formEmpSearch = document.getElementById('form-emp-search');
    const formEmpIdDirect = document.getElementById('form-emp-id-direct');
    const formEmpId = document.getElementById('form-emp-id');
    const selectedEmpPreview = document.getElementById('selected-emp-preview');

    // State Variables
    let allDocuments = [];
    let allEmployees = [];
    let currentStatusFilter = 'all';

    // Initialize
    init();

    async function init() {
        setupEventListeners();
        await loadEmployeesLookup();
        await fetchEmployeeDocuments();
    }

    function setupEventListeners() {
        // Search & Filter Events
        searchInput.addEventListener('input', applyFilters);
        filterDocTypeSelect.addEventListener('change', applyFilters);
        filterStatusSelect.addEventListener('change', (e) => {
            currentStatusFilter = e.target.value;
            updateStatCardsActiveState();
            applyFilters();
        });

        btnResetFilters.addEventListener('click', () => {
            searchInput.value = '';
            filterDocTypeSelect.value = 'all';
            filterStatusSelect.value = 'all';
            currentStatusFilter = 'all';
            updateStatCardsActiveState();
            applyFilters();
        });

        // Stat Card Clicks
        [cardTotal, cardExpired, cardExpiring, cardValid].forEach(card => {
            card.addEventListener('click', () => {
                const statusFilter = card.dataset.statusFilter;
                currentStatusFilter = statusFilter;
                filterStatusSelect.value = statusFilter;
                updateStatCardsActiveState();
                applyFilters();
            });
        });

        // Modal Open / Close
        btnAddDoc.addEventListener('click', () => openModal());
        modalCloseBtn.addEventListener('click', closeModal);
        modalCancelBtn.addEventListener('click', closeModal);
        docModal.addEventListener('click', (e) => {
            if (e.target === docModal) closeModal();
        });

        // Form Submit
        docForm.addEventListener('submit', handleFormSubmit);

        // Enter Key Navigation inside Modal Form
        if (docForm) {
            const formFocusOrder = [
                'form-emp-search',
                'form-emp-id-direct',
                'form-emp-id',
                'form-iqama-no',
                'form-iqama-exp-grego',
                'form-iqama-exp-hijri',
                'form-health-status',
                'form-health-med-date',
                'form-health-madrasa-date',
                'form-passport-no',
                'form-passport-issue',
                'form-passport-exp',
                'form-contract-exp',
                'form-blood-group',
                'modal-save-btn'
            ];

            docForm.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    const currentEl = document.activeElement;

                    // If currently focused on the Save button, allow normal form submission
                    if (currentEl && currentEl.id === 'modal-save-btn') {
                        return;
                    }

                    // Prevent premature form submit on Enter
                    e.preventDefault();

                    const currentId = currentEl ? currentEl.id : null;

                    // Employee Search / Selection Navigation
                    if (currentId === 'form-emp-search') {
                        const directInput = document.getElementById('form-emp-id-direct');
                        if (directInput && directInput.value) {
                            const nextEl = document.getElementById('form-iqama-no');
                            if (nextEl) { nextEl.focus(); nextEl.select?.(); return; }
                        } else {
                            const nextEl = document.getElementById('form-emp-id-direct');
                            if (nextEl) { nextEl.focus(); nextEl.select?.(); return; }
                        }
                    }

                    if (currentId === 'form-emp-id-direct' || currentId === 'form-emp-id') {
                        const nextEl = document.getElementById('form-iqama-no');
                        if (nextEl) { nextEl.focus(); nextEl.select?.(); return; }
                    }

                    // Sequential next cell focus
                    let currentIndex = formFocusOrder.indexOf(currentId);
                    if (currentIndex !== -1 && currentIndex < formFocusOrder.length - 1) {
                        const nextId = formFocusOrder[currentIndex + 1];
                        const nextEl = document.getElementById(nextId);
                        if (nextEl) {
                            nextEl.focus();
                            if (typeof nextEl.select === 'function' && nextEl.type !== 'date') {
                                nextEl.select();
                            }
                        }
                    }
                }
            });
        }

        // Employee Selection & Real-Time Filtering Events
        if (formEmpSearch) {
            formEmpSearch.addEventListener('input', (e) => {
                filterEmpDropdown(e.target.value.trim().toLowerCase());
            });
        }

        if (formEmpIdDirect) {
            formEmpIdDirect.addEventListener('input', (e) => {
                syncEmpSelectionFromDirectInput(e.target.value.trim());
            });
        }

        if (formEmpId) {
            formEmpId.addEventListener('change', (e) => {
                syncDirectInputFromSelect(e.target.value);
            });
            formEmpId.addEventListener('click', (e) => {
                if (e.target.tagName === 'OPTION' && e.target.value) {
                    syncDirectInputFromSelect(e.target.value);
                }
            });
        }
    }

    function updateStatCardsActiveState() {
        [cardTotal, cardExpired, cardExpiring, cardValid].forEach(card => {
            if (card.dataset.statusFilter === currentStatusFilter) {
                card.classList.add('active-filter');
            } else {
                card.classList.remove('active-filter');
            }
        });
    }

    // Load Employees for Dropdown & Lookup Selection
    async function loadEmployeesLookup() {
        try {
            const res = await fetch(`${API_BASE_URL}/Employees`);
            if (res.ok) {
                allEmployees = await res.json();
                populateEmpDropdown();
            } else {
                console.warn(`Employees API returned status ${res.status}`);
                populateEmpDropdown();
            }
        } catch (err) {
            console.error('Error fetching employees list:', err);
            populateEmpDropdown();
        }
    }

    function populateEmpDropdown(matchingList = null) {
        const baseList = matchingList !== null ? matchingList : allEmployees;
        // Filter out employees whose PermanentStatus is Inactive
        const listToRender = baseList.filter(emp => !(emp.permanentStatus && emp.permanentStatus.toString().toLowerCase() === 'inactive'));
        formEmpId.innerHTML = '';

        if (!listToRender || listToRender.length === 0) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = allEmployees.length === 0 ? '-- No employees found in system (Type ID manually) --' : '-- No active employees found --';
            option.disabled = true;
            formEmpId.appendChild(option);
            return;
        }

        listToRender.forEach(emp => {
            const option = document.createElement('option');
            option.value = emp.empId;
            const arName = emp.arabicName ? ` (${emp.arabicName})` : '';
            option.textContent = `${emp.empId} - ${emp.englishName}${arName}`;
            if (formEmpIdDirect.value && emp.empId.toString() === formEmpIdDirect.value.toString()) {
                option.selected = true;
            }
            formEmpId.appendChild(option);
        });
    }

    function filterEmpDropdown(searchTerm = '') {
        if (!searchTerm) {
            populateEmpDropdown(allEmployees);
            return;
        }

        const filtered = allEmployees.filter(emp => {
            const empIdStr = (emp.empId || '').toString().toLowerCase();
            const enName = (emp.englishName || '').toLowerCase();
            const arName = (emp.arabicName || '').toLowerCase();
            return empIdStr.includes(searchTerm) || enName.includes(searchTerm) || arName.includes(searchTerm);
        });

        populateEmpDropdown(filtered);
    }

    function syncDirectInputFromSelect(val) {
        if (!val) return;
        formEmpIdDirect.value = val;
        const emp = allEmployees.find(e => e.empId.toString() === val.toString());
        if (emp) {
            if (emp.permanentStatus && emp.permanentStatus.toString().toLowerCase() === 'inactive') {
                selectedEmpPreview.innerHTML = `<span style="color: var(--error); font-weight: 600;"><i class="ri-error-warning-line"></i> Employee ${emp.empId} is Inactive (Restricted)</span>`;
            } else {
                const arName = emp.arabicName ? ` (${emp.arabicName})` : '';
                selectedEmpPreview.textContent = `Selected: Emp ID ${emp.empId} - ${emp.englishName}${arName}`;
            }
        } else {
            selectedEmpPreview.textContent = `Selected: Emp ID ${val}`;
        }
    }

    function syncEmpSelectionFromDirectInput(val) {
        if (!val) {
            formEmpId.value = '';
            selectedEmpPreview.textContent = '';
            return;
        }
        formEmpId.value = val;
        const emp = allEmployees.find(e => e.empId.toString() === val.toString());
        if (emp) {
            if (emp.permanentStatus && emp.permanentStatus.toString().toLowerCase() === 'inactive') {
                selectedEmpPreview.innerHTML = `<span style="color: var(--error); font-weight: 600;"><i class="ri-error-warning-line"></i> Employee ${emp.empId} is Inactive - Record creation/edit restricted</span>`;
            } else {
                const arName = emp.arabicName ? ` (${emp.arabicName})` : '';
                selectedEmpPreview.textContent = `Matched: Emp ID ${emp.empId} - ${emp.englishName}${arName}`;
            }
        } else {
            selectedEmpPreview.textContent = `Emp ID ${val} (Manual / Direct Entry)`;
        }
    }

    // Fetch Employee Documents
    async function fetchEmployeeDocuments() {
        showLoadingState();
        try {
            const res = await fetch(`${API_BASE_URL}/EmployeeDocuments`);
            if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
            
            allDocuments = await res.json();
            updateStatsCounters();
            applyFilters();
        } catch (err) {
            console.error('Failed to load employee documents:', err);
            tableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="empty-state">
                        <i class="ri-error-warning-line" style="color: var(--error);"></i>
                        <h3>Error Loading Employee Documents</h3>
                        <p style="color: var(--text-muted); font-size: 0.85rem;">Could not connect to backend server. Please make sure server is running.</p>
                        <button class="btn-primary" style="margin-top: 1rem;" onclick="location.reload()">Retry</button>
                    </td>
                </tr>
            `;
        }
    }

    function showLoadingState() {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="empty-state">
                    <i class="ri-loader-4-line ri-spin" style="font-size: 2.5rem; color: var(--primary);"></i>
                    <h3 style="margin-top: 0.75rem;">Loading Employee Documents...</h3>
                </td>
            </tr>
        `;
    }

    // Evaluate Document Expiry Status (Expired, Expiring Soon within 30 days, Valid, N/A)
    function evaluateDocStatus(dateString) {
        if (!dateString) return { status: 'na', label: 'N/A', days: null, badgeClass: 'badge-na' };
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const targetDate = new Date(dateString);
        targetDate.setHours(0, 0, 0, 0);

        const diffTime = targetDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
            return {
                status: 'expired',
                label: `Expired (${Math.abs(diffDays)}d ago)`,
                days: diffDays,
                badgeClass: 'badge-expired'
            };
        } else if (diffDays <= 30) {
            return {
                status: 'expiring',
                label: `Expires in ${diffDays}d`,
                days: diffDays,
                badgeClass: 'badge-expiring'
            };
        } else {
            return {
                status: 'valid',
                label: `Valid (${diffDays}d left)`,
                days: diffDays,
                badgeClass: 'badge-valid'
            };
        }
    }

    // Get Overall Row Status based on document types
    function getOverallStatus(doc, docTypeFilter) {
        const statuses = [];

        if (docTypeFilter === 'all' || docTypeFilter === 'iqama') {
            statuses.push(evaluateDocStatus(doc.iqamaExpiryGrego).status);
        }
        if (docTypeFilter === 'all' || docTypeFilter === 'health') {
            statuses.push(evaluateDocStatus(doc.healthMedicalDate || doc.healthMadrasaDate).status);
        }
        if (docTypeFilter === 'all' || docTypeFilter === 'passport') {
            statuses.push(evaluateDocStatus(doc.passportExpiry).status);
        }
        if (docTypeFilter === 'all' || docTypeFilter === 'contract') {
            statuses.push(evaluateDocStatus(doc.contractExpiry).status);
        }

        if (statuses.includes('expired')) return 'expired';
        if (statuses.includes('expiring')) return 'expiring';
        if (statuses.includes('valid')) return 'valid';
        return 'na';
    }

    // Update Statistics Counters
    function updateStatsCounters() {
        let total = allDocuments.length;
        let expiredCount = 0;
        let expiringCount = 0;
        let validCount = 0;

        allDocuments.forEach(doc => {
            const overall = getOverallStatus(doc, 'all');
            if (overall === 'expired') expiredCount++;
            else if (overall === 'expiring') expiringCount++;
            else if (overall === 'valid') validCount++;
        });

        statTotalCount.textContent = total;
        statExpiredCount.textContent = expiredCount;
        statExpiringCount.textContent = expiringCount;
        statValidCount.textContent = validCount;
    }

    // Apply Search and Filters
    function applyFilters() {
        const searchTerm = searchInput.value.trim().toLowerCase();
        const selectedDocType = filterDocTypeSelect.value;
        const selectedStatus = currentStatusFilter;

        const filtered = allDocuments.filter(doc => {
            // Search filter (Employee ID, English Name, Arabic Name)
            const empIdStr = doc.empId ? doc.empId.toString() : '';
            const enName = (doc.englishName || '').toLowerCase();
            const arName = doc.arabicName || '';

            const matchesSearch = !searchTerm || 
                empIdStr.includes(searchTerm) || 
                enName.includes(searchTerm) || 
                arName.includes(searchTerm);

            if (!matchesSearch) return false;

            // Status filter based on selected Document Type
            const status = getOverallStatus(doc, selectedDocType);
            
            if (selectedStatus === 'all') return true;
            return status === selectedStatus;
        });

        renderTable(filtered);
    }

    // Format Date string helper
    function formatDate(dateStr) {
        if (!dateStr) return 'N/A';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return 'N/A';
        return d.toISOString().split('T')[0];
    }

    // Render Data Table
    function renderTable(documents) {
        if (!documents || documents.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="empty-state">
                        <i class="ri-search-line"></i>
                        <h3>No Employee Documents Found</h3>
                        <p>No document records match your current search or filter criteria.</p>
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = documents.map(doc => {
            const iqamaEval = evaluateDocStatus(doc.iqamaExpiryGrego);
            const healthEval = evaluateDocStatus(doc.healthMedicalDate || doc.healthMadrasaDate);
            const passportEval = evaluateDocStatus(doc.passportExpiry);
            const contractEval = evaluateDocStatus(doc.contractExpiry);

            const overallStatus = getOverallStatus(doc, filterDocTypeSelect.value);
            let overallBadgeHtml = '';

            if (overallStatus === 'expired') {
                overallBadgeHtml = `<span class="status-badge badge-expired"><i class="ri-error-warning-fill"></i> Expired</span>`;
            } else if (overallStatus === 'expiring') {
                overallBadgeHtml = `<span class="status-badge badge-expiring"><i class="ri-time-fill"></i> Expiring Soon</span>`;
            } else if (overallStatus === 'valid') {
                overallBadgeHtml = `<span class="status-badge badge-valid"><i class="ri-checkbox-circle-fill"></i> Active</span>`;
            } else {
                overallBadgeHtml = `<span class="status-badge badge-na">N/A</span>`;
            }

            return `
                <tr ondblclick="editDocRecord(${doc.id})" style="cursor: pointer;" title="Double-click to edit document record">
                    <td>
                        <span class="emp-id-badge">${doc.empId}</span>
                    </td>
                    <td>
                        <div class="emp-names">
                            <span class="name-en">${escapeHtml(doc.englishName || 'N/A')}</span>
                            ${doc.arabicName ? `<span class="name-ar">${escapeHtml(doc.arabicName)}</span>` : ''}
                        </div>
                    </td>
                    <td>
                        <div class="doc-detail-cell">
                            <span class="doc-num">${doc.iqamaNo ? `Iqama: ${escapeHtml(doc.iqamaNo)}` : 'No Iqama #'}</span>
                            <span class="doc-date">Greg: ${formatDate(doc.iqamaExpiryGrego)}</span>
                            ${doc.iqamaExpiryHijiri ? `<span class="doc-date" style="color: #4f46e5; font-weight: 500;"><i class="ri-calendar-2-line"></i> Hijri: ${formatDate(doc.iqamaExpiryHijiri)}</span>` : ''}
                            <div><span class="status-badge ${iqamaEval.badgeClass}">${iqamaEval.label}</span></div>
                        </div>
                    </td>
                    <td>
                        <div class="doc-detail-cell">
                            <span class="doc-num">${doc.healthStatus ? escapeHtml(doc.healthStatus) : 'Health Card'}</span>
                            <span class="doc-date">Med Exp: ${formatDate(doc.healthMedicalDate)}</span>
                            <div><span class="status-badge ${healthEval.badgeClass}">${healthEval.label}</span></div>
                        </div>
                    </td>
                    <td>
                        <div class="doc-detail-cell">
                            <span class="doc-num">${doc.passportNo ? `Pass: ${escapeHtml(doc.passportNo)}` : 'No Passport #'}</span>
                            <span class="doc-date">Exp: ${formatDate(doc.passportExpiry)}</span>
                            <div><span class="status-badge ${passportEval.badgeClass}">${passportEval.label}</span></div>
                        </div>
                    </td>
                    <td>
                        <div class="doc-detail-cell">
                            <span class="doc-num">${doc.bloodGroup ? `Blood: ${escapeHtml(doc.bloodGroup)}` : 'Contract'}</span>
                            <span class="doc-date">Exp: ${formatDate(doc.contractExpiry)}</span>
                            <div><span class="status-badge ${contractEval.badgeClass}">${contractEval.label}</span></div>
                        </div>
                    </td>
                    <td>
                        ${overallBadgeHtml}
                    </td>
                    <td class="actions-cell" style="text-align: center;">
                        <button class="btn-icon-action edit" onclick="editDocRecord(${doc.id})" title="Edit Document">
                            <i class="ri-edit-line"></i>
                        </button>
                        <button class="btn-icon-action delete" onclick="deleteDocRecord(${doc.id}, ${doc.empId})" title="Delete Document">
                            <i class="ri-delete-bin-line"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // Modal Operations
    function openModal(doc = null) {
        docForm.reset();
        if (formEmpSearch) formEmpSearch.value = '';
        if (selectedEmpPreview) selectedEmpPreview.textContent = '';
        populateEmpDropdown();
        
        if (doc) {
            modalTitle.innerHTML = `<i class="ri-edit-line"></i> Edit Employee Document (Emp ID: ${doc.empId})`;
            document.getElementById('doc-id').value = doc.id;
            formEmpIdDirect.value = doc.empId.toString();
            syncEmpSelectionFromDirectInput(doc.empId.toString());
            
            document.getElementById('form-iqama-no').value = doc.iqamaNo || '';
            document.getElementById('form-iqama-exp-grego').value = formatDateForInput(doc.iqamaExpiryGrego);
            document.getElementById('form-iqama-exp-hijri').value = formatDateForInput(doc.iqamaExpiryHijiri);

            document.getElementById('form-health-status').value = doc.healthStatus || 'Active';
            document.getElementById('form-health-med-date').value = formatDateForInput(doc.healthMedicalDate);
            document.getElementById('form-health-madrasa-date').value = formatDateForInput(doc.healthMadrasaDate);

            document.getElementById('form-passport-no').value = doc.passportNo || '';
            document.getElementById('form-passport-issue').value = formatDateForInput(doc.passportIssue);
            document.getElementById('form-passport-exp').value = formatDateForInput(doc.passportExpiry);

            document.getElementById('form-contract-exp').value = formatDateForInput(doc.contractExpiry);
            document.getElementById('form-blood-group').value = doc.bloodGroup || '';
        } else {
            modalTitle.innerHTML = `<i class="ri-file-add-line"></i> Add Employee Document`;
            document.getElementById('doc-id').value = 0;
            formEmpIdDirect.value = '';
            formEmpId.value = '';
            document.getElementById('form-iqama-exp-hijri').value = '';
            document.getElementById('form-health-status').value = 'Active';
        }

        docModal.classList.add('active');
        setTimeout(() => {
            if (formEmpSearch) formEmpSearch.focus();
        }, 100);
    }

    function closeModal() {
        docModal.classList.remove('active');
    }

    function formatDateForInput(dateStr) {
        if (!dateStr) return '';
        if (typeof dateStr === 'string') {
            const cleanStr = dateStr.split('T')[0];
            return cleanStr;
        }
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return String(dateStr);
        return d.toISOString().split('T')[0];
    }

    // Edit Button Click Handler
    window.editDocRecord = function(id) {
        const doc = allDocuments.find(d => d.id === id);
        if (doc) {
            openModal(doc);
        }
    };

    // Delete Record Handler
    window.deleteDocRecord = async function(id, empId) {
        if (!confirm(`Are you sure you want to delete document record for Employee ID ${empId}?`)) {
            return;
        }

        try {
            const res = await fetch(`${API_BASE_URL}/EmployeeDocuments/${id}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                showToast('Document record deleted successfully.', 'success');
                await fetchEmployeeDocuments();
            } else {
                throw new Error(`Delete failed with status ${res.status}`);
            }
        } catch (err) {
            console.error('Error deleting record:', err);
            showToast('Failed to delete document record.', 'error');
        }
    };

    // Form Submit Handler (Add / Edit)
    async function handleFormSubmit(e) {
        e.preventDefault();

        const id = parseInt(document.getElementById('doc-id').value) || 0;
        const selectedEmpId = parseInt(formEmpIdDirect.value) || parseInt(formEmpId.value);

        if (!selectedEmpId) {
            alert('Please select or type an Employee ID.');
            return;
        }

        const iqamaNoVal = document.getElementById('form-iqama-no').value.trim();
        if (!iqamaNoVal) {
            showToast('Iqama Number is mandatory. Please enter a valid Iqama Number.', 'error');
            alert('Error: Iqama Number is mandatory. Please enter the Iqama Number.');
            document.getElementById('form-iqama-no').focus();
            return;
        }

        // PermanentStatus Inactive validation check
        const matchedEmp = allEmployees.find(e => e.empId.toString() === selectedEmpId.toString());
        if (matchedEmp && matchedEmp.permanentStatus && matchedEmp.permanentStatus.toString().toLowerCase() === 'inactive') {
            showToast(`Employee ID ${selectedEmpId} is Inactive. Adding or editing document records for inactive employees is restricted.`, 'error');
            alert(`Error: Employee ID ${selectedEmpId} is marked as Inactive in Employee Records. Cannot add or edit documents for inactive employees.`);
            return;
        }

        // Duplicate Employee ID validation check
        const isDuplicate = allDocuments.some(d => d.empId.toString() === selectedEmpId.toString() && d.id !== id);
        if (isDuplicate) {
            showToast(`Document record already exists for Employee ID ${selectedEmpId}. Duplicate records are not permitted!`, 'error');
            alert(`Error: Employee ID ${selectedEmpId} already has an existing document record. Duplicate records are not permitted.`);
            return;
        }

        const payload = {
            id: id,
            empId: selectedEmpId,
            iqamaNo: document.getElementById('form-iqama-no').value.trim() || null,
            iqamaExpiryGrego: document.getElementById('form-iqama-exp-grego').value || null,
            iqamaExpiryHijiri: document.getElementById('form-iqama-exp-hijri').value || null,
            healthStatus: document.getElementById('form-health-status').value.trim() || null,
            healthMedicalDate: document.getElementById('form-health-med-date').value || null,
            healthMadrasaDate: document.getElementById('form-health-madrasa-date').value || null,
            passportNo: document.getElementById('form-passport-no').value.trim() || null,
            passportIssue: document.getElementById('form-passport-issue').value || null,
            passportExpiry: document.getElementById('form-passport-exp').value || null,
            contractExpiry: document.getElementById('form-contract-exp').value || null,
            bloodGroup: document.getElementById('form-blood-group').value || null
        };

        const isEdit = id > 0;
        const url = isEdit ? `${API_BASE_URL}/EmployeeDocuments/${id}` : `${API_BASE_URL}/EmployeeDocuments`;
        const method = isEdit ? 'PUT' : 'POST';

        try {
            const btnSave = document.getElementById('modal-save-btn');
            btnSave.disabled = true;
            btnSave.innerHTML = `<i class="ri-loader-4-line ri-spin"></i> Saving...`;

            const res = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                showToast(`Employee Document ${isEdit ? 'updated' : 'added'} successfully!`, 'success');
                closeModal();
                await fetchEmployeeDocuments();
            } else {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.message || `Save failed (${res.status})`);
            }
        } catch (err) {
            console.error('Error saving document record:', err);
            showToast(err.message || 'Failed to save document record.', 'error');
        } finally {
            const btnSave = document.getElementById('modal-save-btn');
            btnSave.disabled = false;
            btnSave.innerHTML = `<i class="ri-save-line"></i> Save Document Record`;
        }
    }

    // Helper: Toast Notifications
    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.style.position = 'fixed';
        toast.style.bottom = '20px';
        toast.style.right = '20px';
        toast.style.background = type === 'success' ? '#10b981' : (type === 'error' ? '#ef4444' : '#6366f1');
        toast.style.color = 'white';
        toast.style.padding = '0.75rem 1.25rem';
        toast.style.borderRadius = '8px';
        toast.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        toast.style.zIndex = '9999';
        toast.style.fontWeight = '500';
        toast.style.display = 'flex';
        toast.style.alignItems = 'center';
        toast.style.gap = '0.5rem';
        toast.innerHTML = `<i class="${type === 'success' ? 'ri-checkbox-circle-fill' : 'ri-information-fill'}"></i> ${escapeHtml(message)}`;
        
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // Utility: Escape HTML
    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
});
