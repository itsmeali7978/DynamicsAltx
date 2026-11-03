/**
 * DynamicsAltx - Inventory Altx-NAV Management Console
 * Bridges local stock count entries to Navision table [House Care Live$GITL APP Inventory Count]
 */

document.addEventListener('DOMContentLoaded', () => {
    // Current state
    let entries = [];
    const selectedIds = new Set();
    let isPushing = false;

    // DOM Elements
    const filterCreatedBy = document.getElementById('filterCreatedBy');
    const filterLocation = document.getElementById('filterLocation');
    const filterStatus = document.getElementById('filterStatus');
    const filterSearch = document.getElementById('filterSearch');
    const btnResetFilters = document.getElementById('btnResetFilters');
    const btnRefreshGrid = document.getElementById('btnRefreshGrid');
    const btnPushToNav = document.getElementById('btnPushToNav');
    const pushBtnText = document.getElementById('pushBtnText');
    const btnExportCsv = document.getElementById('btnExportCsv');

    const navGridBody = document.getElementById('navGridBody');
    const thSelectAllCheckbox = document.getElementById('thSelectAllCheckbox');
    const btnSelectAll = document.getElementById('btnSelectAll');
    const btnDeselectAll = document.getElementById('btnDeselectAll');
    const selectionSummary = document.getElementById('selectionSummary');
    const gridRecordsCount = document.getElementById('gridRecordsCount');

    // Metrics DOM
    const metricTotalPending = document.getElementById('metricTotalPending');
    const metricTotalUnverified = document.getElementById('metricTotalUnverified');
    const metricTotalVerified = document.getElementById('metricTotalVerified');
    const metricTotalConverted = document.getElementById('metricTotalConverted');

    // Footer DOM
    const footRows = document.getElementById('footRows');
    const footTotalQty = document.getElementById('footTotalQty');
    const footTotalConv = document.getElementById('footTotalConv');

    // Modal DOM
    const navModalBackdrop = document.getElementById('navModalBackdrop');
    const navModalHeader = document.getElementById('navModalHeader');
    const navModalIcon = document.getElementById('navModalIcon');
    const navModalTitle = document.getElementById('navModalTitle');
    const navModalHighlightText = document.getElementById('navModalHighlightText');
    const navModalDescription = document.getElementById('navModalDescription');
    const navModalBtnCancel = document.getElementById('navModalBtnCancel');
    const navModalBtnConfirm = document.getElementById('navModalBtnConfirm');
    const navModalConfirmLabel = document.getElementById('navModalConfirmLabel');

    let pendingPushCallback = null;

    // Initialize User & Header Details from localStorage
    function initUserHeader() {
        try {
            const userStr = localStorage.getItem('currentUser') || localStorage.getItem('user');
            if (userStr) {
                const user = JSON.parse(userStr);
                const displayNameEl = document.getElementById('user-display-name');
                const headerLocEl = document.getElementById('header-location');
                if (displayNameEl && (user.name || user.email)) {
                    displayNameEl.textContent = user.name || user.email.split('@')[0];
                }
                if (headerLocEl && user.location) {
                    headerLocEl.textContent = user.location;
                }
            }
        } catch (e) {
            console.error('Error reading current user:', e);
        }
    }

    // 1. Load Filter Dropdowns (CreatedBy emails & Locations)
    async function loadFilterDropdowns() {
        try {
            const res = await fetch('/api/StockCount/nav/filters');
            if (!res.ok) return;
            const data = await res.json();
            if (!data.success) return;

            // Preserve current selected values
            const curCreatedBy = filterCreatedBy.value;
            const curLocation = filterLocation.value;

            // Populate CreatedBy
            filterCreatedBy.innerHTML = '<option value="">All Users</option>';
            if (Array.isArray(data.createdByList)) {
                data.createdByList.forEach(email => {
                    const opt = document.createElement('option');
                    opt.value = email;
                    opt.textContent = email;
                    if (email === curCreatedBy) opt.selected = true;
                    filterCreatedBy.appendChild(opt);
                });
            }

            // Populate Locations
            filterLocation.innerHTML = '<option value="">All Locations</option>';
            if (Array.isArray(data.locationList)) {
                data.locationList.forEach(loc => {
                    const opt = document.createElement('option');
                    opt.value = loc;
                    opt.textContent = loc;
                    if (loc === curLocation) opt.selected = true;
                    filterLocation.appendChild(opt);
                });
            }
        } catch (err) {
            console.error('Error loading NAV filters:', err);
        }
    }

    // 2. Load Entries from API based on current filters
    async function loadEntries() {
        try {
            const params = new URLSearchParams();

            // Status filter: "1" by default (Verified), "all" for all pending, "0" for unverified
            const statusVal = filterStatus.value;
            if (statusVal === '1') params.append('status', '1');
            else if (statusVal === '0') params.append('status', '0');
            else if (statusVal === 'all') params.append('status', '-1');

            if (filterCreatedBy.value) params.append('createdBy', filterCreatedBy.value);
            if (filterLocation.value) params.append('location', filterLocation.value);
            if (filterSearch.value.trim()) params.append('search', filterSearch.value.trim());

            navGridBody.innerHTML = `
                <tr>
                    <td colspan="13" style="text-align: center; padding: 2.5rem 1rem; color: #64748b;">
                        <i class="ri-loader-4-line ri-spin" style="font-size: 1.5rem; display: block; margin-bottom: 0.35rem; color: #6366f1;"></i>
                        Loading stock count entries...
                    </td>
                </tr>
            `;

            const res = await fetch(`/api/StockCount/nav/entries?${params.toString()}`);
            if (!res.ok) throw new Error(`HTTP error ${res.status}`);
            const data = await res.json();

            if (!data.success) {
                throw new Error(data.message || 'Failed to load entries');
            }

            entries = data.entries || [];

            // Update Top Metrics
            metricTotalPending.textContent = data.totalPending || 0;
            metricTotalUnverified.textContent = data.totalUnverified || 0;
            metricTotalVerified.textContent = data.totalVerified || 0;
            metricTotalConverted.textContent = (data.entries || []).reduce((acc, row) => acc + (row.convertedQty || 0), 0);

            // Render Table
            renderTable();

            // Re-sync filter dropdown lists in background
            loadFilterDropdowns();
        } catch (err) {
            console.error('Error fetching NAV entries:', err);
            navGridBody.innerHTML = `
                <tr>
                    <td colspan="13" style="text-align: center; padding: 2rem; color: #ef4444;">
                        <i class="ri-error-warning-line" style="font-size: 1.5rem; display: block; margin-bottom: 0.35rem;"></i>
                        Failed to load entries: ${err.message}
                    </td>
                </tr>
            `;
        }
    }

    // 3. Render Table Rows
    function renderTable() {
        if (!entries || entries.length === 0) {
            navGridBody.innerHTML = `
                <tr>
                    <td colspan="13" style="text-align: center; padding: 3rem 1rem; color: #64748b;">
                        <i class="ri-inbox-line" style="font-size: 2.5rem; color: #cbd5e1; display: block; margin-bottom: 0.5rem;"></i>
                        <h4 style="font-family: 'Outfit', sans-serif; font-size: 1rem; margin: 0 0 0.25rem; color: #334155;">No Entries Found</h4>
                        <p style="font-size: 0.78rem; margin: 0; color: #94a3b8;">No matching unpushed stock count entries found with current filters.</p>
                    </td>
                </tr>
            `;
            gridRecordsCount.textContent = '0 records';
            footRows.textContent = '0';
            footTotalQty.textContent = '0';
            footTotalConv.textContent = '0';
            thSelectAllCheckbox.checked = false;
            updateSelectionUI();
            return;
        }

        let totalQty = 0;
        let totalConv = 0;

        const html = entries.map((row, idx) => {
            const isChecked = selectedIds.has(row.id);
            totalQty += (row.qty || 0);
            totalConv += (row.convertedQty || 0);

            const statusBadge = row.status === 0
                ? `<span class="badge-status status-unverified" title="Status 0: Scanned but not verified by scanner"><i class="ri-time-line"></i> Unverified (0)</span>`
                : (row.status === 1
                    ? `<span class="badge-status status-verified" title="Status 1: Verified by user"><i class="ri-checkbox-circle-line"></i> Verified (1)</span>`
                    : `<span class="badge-status status-pushed" title="Status 2: Pushed to NAV"><i class="ri-check-double-line"></i> Pushed (2)</span>`);

            return `
                <tr class="${isChecked ? 'row-selected' : ''}" data-id="${row.id}">
                    <td style="text-align: center;">
                        <input type="checkbox" class="row-checkbox" data-id="${row.id}" ${isChecked ? 'checked' : ''}>
                    </td>
                    <td style="color: #64748b; font-weight: 500;">${idx + 1}</td>
                    <td>${statusBadge}</td>
                    <td class="cell-sku">${escapeHtml(row.sku || '')}</td>
                    <td class="cell-desc" title="${escapeHtml(row.description || '')}">${escapeHtml(row.description || '—')}</td>
                    <td><span class="cell-uom-tag">${escapeHtml(row.scannedUOM || '')}</span></td>
                    <td class="cell-qty">${row.qtyDisplay || row.qty}</td>
                    <td><span class="cell-conv">${row.convertedQtyDisplay || row.convertedQty}</span></td>
                    <td style="font-size: 0.72rem; color: #64748b; font-weight: 600;">${escapeHtml(row.baseUOM || '')}</td>
                    <td><strong style="color: #334155;">${escapeHtml(row.location || '—')}</strong></td>
                    <td><span class="cell-batch">${escapeHtml(row.batchName || '—')}</span></td>
                    <td class="cell-user" title="${escapeHtml(row.createdBy || '')}">${escapeHtml(row.createdBy || '—')}</td>
                    <td style="font-size: 0.72rem; color: #94a3b8;">${escapeHtml(row.createdAt || '')}</td>
                </tr>
            `;
        }).join('');

        navGridBody.innerHTML = html;
        gridRecordsCount.textContent = `${entries.length} records`;
        footRows.textContent = entries.length;
        footTotalQty.textContent = totalQty.toFixed(totalQty % 1 === 0 ? 0 : 2);
        footTotalConv.textContent = totalConv.toFixed(totalConv % 1 === 0 ? 0 : 2);

        // Update header checkbox
        const allVisibleChecked = entries.length > 0 && entries.every(r => selectedIds.has(r.id));
        thSelectAllCheckbox.checked = allVisibleChecked;

        updateSelectionUI();
    }

    // 4. Update Selection UI & Push Button state
    function updateSelectionUI() {
        const count = selectedIds.size;
        selectionSummary.textContent = `${count} selected`;

        if (count > 0) {
            pushBtnText.textContent = `Push to Nav (${count})`;
        } else {
            pushBtnText.textContent = entries.length > 0 ? `Push to Nav (All ${entries.length})` : 'Push to Nav';
        }
    }

    // 5. Table Event Delegation (Checkboxes)
    navGridBody.addEventListener('change', (e) => {
        if (e.target && e.target.classList.contains('row-checkbox')) {
            const id = parseInt(e.target.dataset.id, 10);
            const tr = e.target.closest('tr');
            if (e.target.checked) {
                selectedIds.add(id);
                if (tr) tr.classList.add('row-selected');
            } else {
                selectedIds.delete(id);
                if (tr) tr.classList.remove('row-selected');
            }

            const allVisibleChecked = entries.length > 0 && entries.every(r => selectedIds.has(r.id));
            thSelectAllCheckbox.checked = allVisibleChecked;

            updateSelectionUI();
        }
    });

    // 6. Header Select All Checkbox
    thSelectAllCheckbox.addEventListener('change', () => {
        const checked = thSelectAllCheckbox.checked;
        entries.forEach(r => {
            if (checked) selectedIds.add(r.id);
            else selectedIds.delete(r.id);
        });
        renderTable();
    });

    btnSelectAll.addEventListener('click', () => {
        entries.forEach(r => selectedIds.add(r.id));
        renderTable();
    });

    btnDeselectAll.addEventListener('click', () => {
        selectedIds.clear();
        renderTable();
    });

    // 7. Filter Change Listeners
    filterCreatedBy.addEventListener('change', () => {
        selectedIds.clear();
        loadEntries();
    });

    filterLocation.addEventListener('change', () => {
        selectedIds.clear();
        loadEntries();
    });

    filterStatus.addEventListener('change', () => {
        selectedIds.clear();
        loadEntries();
    });

    let searchTimer = null;
    filterSearch.addEventListener('input', () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
            selectedIds.clear();
            loadEntries();
        }, 250);
    });

    btnResetFilters.addEventListener('click', () => {
        filterCreatedBy.value = '';
        filterLocation.value = '';
        filterStatus.value = '1'; // default is status=1 (Verified)
        filterSearch.value = '';
        selectedIds.clear();
        loadEntries();
    });

    btnRefreshGrid.addEventListener('click', () => {
        loadEntries();
    });

    // 8. Push to NAV Workflow
    btnPushToNav.addEventListener('click', () => {
        if (isPushing) return;

        // Determine targets: either explicitly selected IDs or all currently filtered entries
        let targetEntries = [];
        if (selectedIds.size > 0) {
            targetEntries = entries.filter(r => selectedIds.has(r.id));
        } else {
            targetEntries = [...entries];
        }

        if (targetEntries.length === 0) {
            showModal({
                type: 'info',
                title: 'No Entries Available',
                highlight: 'No records available to push to NAV.',
                description: 'Please adjust your filters or scan new items in the Stock Count module.',
                confirmLabel: 'OK',
                hideCancel: true,
                onConfirm: closeModal
            });
            return;
        }

        // Strict rule: Entries with Status = 0 must NOT be pushed to NAV at any cost!
        const verifiedEntries = targetEntries.filter(r => r.status === 1);
        const unverifiedInSelection = targetEntries.filter(r => r.status === 0).length;
        const totalUnverifiedInSystem = parseInt(metricTotalUnverified.textContent, 10) || 0;
        const verifiedCount = verifiedEntries.length;
        const verifiedIds = verifiedEntries.map(r => r.id);

        if (verifiedCount === 0) {
            // Cannot push unverified entries at any cost
            showModal({
                type: 'warning',
                title: 'Cannot Push Unverified Entries',
                highlight: 'Entries with Status = 0 (Unverified) cannot be pushed to NAV at any cost.',
                description: 'None of the selected or visible entries are verified. In accordance with system policy, unverified entries cannot be pushed to Navision under any circumstances. Please verify them first in the Stock Count module.',
                confirmLabel: 'Understood',
                confirmClass: 'warning',
                hideCancel: true,
                onConfirm: closeModal
            });
            return;
        }

        if (unverifiedInSelection > 0 || totalUnverifiedInSystem > 0) {
            // SPECIFIED WARNING:
            // "if any records prescent with status=0, a warning message need to popup and it display 'Some entries are still not verified, Do you want to continue'"
            const unverifiedDetail = unverifiedInSelection > 0 
                ? `${unverifiedInSelection} unverified entry(ies) in your current selection and ${totalUnverifiedInSystem} unverified entry(ies) in the system`
                : `${totalUnverifiedInSystem} unverified entry(ies) in the system`;

            showModal({
                type: 'warning',
                title: 'Unverified Entries Warning',
                highlight: 'Some entries are still not verified, Do you want to continue',
                description: `Notice: There are currently ${unverifiedDetail} with Status = 0.

Strict Policy: Unverified entries will NOT be pushed to NAV at any cost! Only the ${verifiedCount} verified record(s) (Status = 1) will be pushed to Navision table [House Care Live$GITL APP Inventory Count]. Do you want to continue?`,
                confirmLabel: 'Yes, Continue',
                confirmClass: 'warning',
                onConfirm: () => executePushToNav(verifiedIds, true)
            });
        } else {
            // All records are verified (Status == 1)
            showModal({
                type: 'info',
                title: 'Push to Navision Confirmation',
                highlight: `Push ${verifiedCount} verified record(s) to Navision?`,
                description: `All ${verifiedCount} selected records are verified (Status = 1). They will be inserted into NAV table [House Care Live$GITL APP Inventory Count] and marked as Status = 2.`,
                confirmLabel: 'Push to NAV',
                confirmClass: 'primary',
                onConfirm: () => executePushToNav(verifiedIds, true)
            });
        }
    });

    // 9. Execute Push to NAV via Backend API
    async function executePushToNav(entryIds, confirmUnverified) {
        closeModal();
        isPushing = true;
        btnPushToNav.disabled = true;
        pushBtnText.innerHTML = `<span class="spinner-inline"></span> Pushing to NAV...`;

        try {
            const res = await fetch('/api/StockCount/nav/push', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    entryIds: entryIds,
                    confirmUnverified: confirmUnverified
                })
            });

            const data = await res.json();

            if (data.requireWarning) {
                // Secondary safeguard
                showModal({
                    type: 'warning',
                    title: 'Unverified Entries Warning',
                    highlight: data.message || 'Some entries are still not verified, Do you want to continue',
                    description: `There are ${data.unverifiedCount} unverified records out of ${data.totalCount}.`,
                    confirmLabel: 'Yes, Continue',
                    confirmClass: 'warning',
                    onConfirm: () => executePushToNav(entryIds, true)
                });
                return;
            }

            if (!res.ok || !data.success) {
                throw new Error(data.message || 'Failed to push entries to NAV');
            }

            // Success!
            selectedIds.clear();
            await loadEntries();

            const pushedCount = data.pushedCount || 0;
            const pendingUnverified = typeof data.pendingUnverifiedCount === 'number'
                ? data.pendingUnverifiedCount
                : (parseInt(metricTotalUnverified.textContent, 10) || 0);

            let pendingBannerHtml = '';
            if (pendingUnverified > 0) {
                pendingBannerHtml = `
                    <div class="nav-modal-pending-box has-pending">
                        <i class="ri-error-warning-fill"></i>
                        <div>
                            <strong>Pending Status:</strong> There are still <strong>${pendingUnverified} entries pending under Status = 0</strong> (Unverified). They were <em>not</em> pushed to NAV and remain available for review/verification.
                        </div>
                    </div>`;
            } else {
                pendingBannerHtml = `
                    <div class="nav-modal-pending-box all-clear">
                        <i class="ri-checkbox-circle-fill"></i>
                        <div>
                            <strong>Pending Status:</strong> Zero entries remaining under Status = 0. All physical inventory entries are fully verified and processed!
                        </div>
                    </div>`;
            }

            showModal({
                type: 'success',
                title: 'Push to NAV Successful',
                highlight: `Successfully pushed ${pushedCount} verified record(s) to Navision!`,
                description: `Pushed records have been archived in local database (Status = 2) and inserted into NAV table [House Care Live$GITL APP Inventory Count].`,
                pendingBannerHtml: pendingBannerHtml,
                confirmLabel: 'Done',
                confirmClass: 'primary',
                hideCancel: true,
                onConfirm: closeModal
            });
        } catch (err) {
            console.error('Push to NAV error:', err);
            showModal({
                type: 'warning',
                title: 'Push to NAV Failed',
                highlight: 'Error pushing records to Navision',
                description: err.message,
                confirmLabel: 'Close',
                hideCancel: true,
                onConfirm: closeModal
            });
        } finally {
            isPushing = false;
            btnPushToNav.disabled = false;
            updateSelectionUI();
        }
    }

    // 10. Modal Helper Functions
    function showModal(opts) {
        navModalHeader.className = `nav-modal-header ${opts.type || 'info'}`;
        navModalTitle.textContent = opts.title || 'Confirmation';
        navModalHighlightText.textContent = opts.highlight || '';
        navModalDescription.textContent = opts.description || '';
        navModalConfirmLabel.textContent = opts.confirmLabel || 'Continue';

        navModalBtnConfirm.className = `btn-modal-confirm ${opts.confirmClass || 'primary'}`;

        if (opts.hideCancel) {
            navModalBtnCancel.style.display = 'none';
        } else {
            navModalBtnCancel.style.display = 'block';
        }

        // Handle Pending Banner
        const navModalPendingBanner = document.getElementById('navModalPendingBanner');
        if (navModalPendingBanner) {
            if (opts.pendingBannerHtml) {
                navModalPendingBanner.innerHTML = opts.pendingBannerHtml;
                navModalPendingBanner.style.display = 'block';
            } else {
                navModalPendingBanner.innerHTML = '';
                navModalPendingBanner.style.display = 'none';
            }
        }

        // Set Icon
        if (opts.type === 'warning') {
            navModalIcon.innerHTML = '<i class="ri-alert-fill"></i>';
        } else if (opts.type === 'success') {
            navModalIcon.innerHTML = '<i class="ri-check-line"></i>';
        } else {
            navModalIcon.innerHTML = '<i class="ri-upload-cloud-2-line"></i>';
        }

        pendingPushCallback = opts.onConfirm || null;
        navModalBackdrop.classList.add('active');
    }

    function closeModal() {
        navModalBackdrop.classList.remove('active');
        pendingPushCallback = null;
    }

    navModalBtnCancel.addEventListener('click', closeModal);
    navModalBackdrop.addEventListener('click', (e) => {
        if (e.target === navModalBackdrop) closeModal();
    });

    navModalBtnConfirm.addEventListener('click', () => {
        if (typeof pendingPushCallback === 'function') {
            pendingPushCallback();
        } else {
            closeModal();
        }
    });

    // 11. Export to CSV
    btnExportCsv.addEventListener('click', () => {
        if (!entries || entries.length === 0) {
            alert('No records available to export.');
            return;
        }

        const headers = ['#', 'Status', 'SKU', 'Description', 'Scanned UOM', 'Qty', 'Phys. Quantity', 'Base UOM', 'Location', 'Batch Name', 'Created By', 'Scanned At'];
        const csvRows = [headers.join(',')];

        entries.forEach((row, idx) => {
            const vals = [
                idx + 1,
                row.status === 0 ? 'Unverified(0)' : (row.status === 1 ? 'Verified(1)' : 'Pushed(2)'),
                `"${(row.sku || '').replace(/"/g, '""')}"`,
                `"${(row.description || '').replace(/"/g, '""')}"`,
                `"${(row.scannedUOM || '').replace(/"/g, '""')}"`,
                row.qty,
                row.convertedQty,
                `"${(row.baseUOM || '').replace(/"/g, '""')}"`,
                `"${(row.location || '').replace(/"/g, '""')}"`,
                `"${(row.batchName || '').replace(/"/g, '""')}"`,
                `"${(row.createdBy || '').replace(/"/g, '""')}"`,
                `"${(row.createdAt || '').replace(/"/g, '""')}"`
            ];
            csvRows.push(vals.join(','));
        });

        const csvContent = '\uFEFF' + csvRows.join('\r\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `StockCount_NAV_Bridge_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

    function escapeHtml(text) {
        if (!text) return '';
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // Start
    initUserHeader();
    loadFilterDropdowns();
    loadEntries();
});
