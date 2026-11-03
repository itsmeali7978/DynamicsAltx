/**
 * DynamicsAltx - Stock Count Module
 * Physical stock count, barcode scanning, SKU lookup, UOM conversions, and interactive grid.
 */

// State
let countEntries = [];
let currentItemData = null;
let currentUser = null;
let editingEntryId = null;

// Audio context for sound effects
let audioCtx = null;
function playBeep(success = true) {
    try {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        if (success) {
            osc.frequency.setValueAtTime(880, audioCtx.currentTime); // High pleasant A5
            gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.12);
        } else {
            osc.frequency.setValueAtTime(260, audioCtx.currentTime); // Low error tone
            gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.25);
        }
    } catch (e) {
        // AudioContext might be blocked until user gesture, ignore safely
    }
}

// Elements
const barcodeInput = document.getElementById('barcodeInput');
const skuInput = document.getElementById('skuInput');
const descriptionInput = document.getElementById('descriptionInput');
const baseUomInput = document.getElementById('baseUomInput');
const scannedUomSelect = document.getElementById('scannedUomSelect');
const qtyInput = document.getElementById('qtyInput');
const convertedQtyBox = document.getElementById('convertedQtyBox');
const btnSave = document.getElementById('btnSave');
const btnCancelEdit = document.getElementById('btnCancelEdit');
const scanFeedback = document.getElementById('scanFeedback');
const feedbackText = document.getElementById('feedbackText');
const gridTableBody = document.getElementById('gridTableBody');
const gridEmptyState = document.getElementById('gridEmptyState');
const gridFilterInput = document.getElementById('gridFilterInput');
const btnExportCsv = document.getElementById('btnExportCsv');
const btnClearGrid = document.getElementById('btnClearGrid');
const btnVerifyGrid = document.getElementById('btnVerifyGrid');

// Stats Elements
const statTotalRows = document.getElementById('statTotalRows');
const statTotalConverted = document.getElementById('statTotalConverted');
const statTotalQty = document.getElementById('statTotalQty');
const statLastSku = document.getElementById('statLastSku');
const statLastTime = document.getElementById('statLastTime');
const gridRowsCountPill = document.getElementById('gridRowsCountPill');
const footerTotalRows = document.getElementById('footerTotalRows');
const footerTotalConverted = document.getElementById('footerTotalConverted');

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Resolve current user & location
    try {
        const email = localStorage.getItem('userEmail');
        const name = localStorage.getItem('userName') || 'Admin User';
        const loc = localStorage.getItem('userLocation') || 'HO';
        const batch = localStorage.getItem('userMobileBatchName') || '';
        const role = localStorage.getItem('userRole') || 'Admin';
        currentUser = { email: email || 'admin@example.com', name, location: loc, mobileBatchName: batch, role };
        
        const storedUser = localStorage.getItem('currentUser');
        if (storedUser) {
            currentUser = Object.assign(currentUser, JSON.parse(storedUser));
        }

        // Live refresh user profile from database to get up-to-date Location and MobileBatchName
        if (currentUser.email) {
            try {
                const uRes = await fetch('/api/Users');
                if (uRes.ok) {
                    const uList = await uRes.json();
                    const matchedUser = uList.find(u => u.email && u.email.toLowerCase() === currentUser.email.toLowerCase());
                    if (matchedUser) {
                        if (matchedUser.location) {
                            currentUser.location = matchedUser.location;
                            localStorage.setItem('userLocation', matchedUser.location);
                        }
                        if (matchedUser.mobileBatchName) {
                            currentUser.mobileBatchName = matchedUser.mobileBatchName;
                            localStorage.setItem('userMobileBatchName', matchedUser.mobileBatchName);
                        }
                    }
                }
            } catch (err) {
                console.warn('Could not refresh user profile from API:', err);
            }
        }

        const locationBadge = document.getElementById('header-location');
        if (locationBadge) locationBadge.textContent = currentUser.location || 'HO';

        const avatar = document.getElementById('header-user-avatar');
        if (avatar && currentUser.name) {
            const parts = currentUser.name.split(' ');
            avatar.textContent = parts.length > 1 ? (parts[0][0] + parts[1][0]).toUpperCase() : parts[0].slice(0, 2).toUpperCase();
        }
    } catch (e) {
        console.warn('Error reading currentUser:', e);
    }

    // 2. Load existing entries from backend
    await loadSavedEntries();

    // 3. Set focus to Barcode input
    if (barcodeInput) {
        barcodeInput.focus();
    }

    // 4. Attach event listeners
    setupEventListeners();
});

function setupEventListeners() {
    // Barcode input Enter listener
    barcodeInput.addEventListener('keydown', async (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const barcode = barcodeInput.value.trim();
            if (barcode) {
                await lookupByBarcode(barcode);
            }
        }
    });

    // SKU input Enter listener
    skuInput.addEventListener('keydown', async (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const sku = skuInput.value.trim();
            if (sku) {
                await lookupBySKU(sku);
            }
        }
    });

    // Dropdown change listener
    scannedUomSelect.addEventListener('change', () => {
        recalculateConvertedQty();
    });

    // Qty input listeners
    qtyInput.addEventListener('input', () => {
        recalculateConvertedQty();
    });

    qtyInput.addEventListener('keydown', async (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            await saveCurrentEntry();
        }
    });

    // Save button click
    btnSave.addEventListener('click', async () => {
        await saveCurrentEntry();
    });

    // Grid filter search
    if (gridFilterInput) {
        gridFilterInput.addEventListener('input', () => {
            renderGrid(gridFilterInput.value.trim().toLowerCase());
        });
    }

    // Export CSV
    if (btnExportCsv) {
        btnExportCsv.addEventListener('click', exportToCsv);
    }

    // Verify Grid (Marks Status = 1 and hides from active grid)
    if (btnVerifyGrid) {
        btnVerifyGrid.addEventListener('click', verifySession);
    }

    // Clear Grid
    if (btnClearGrid) {
        btnClearGrid.addEventListener('click', clearSession);
    }

    // Cancel Edit button
    if (btnCancelEdit) {
        btnCancelEdit.addEventListener('click', () => {
            cancelEdit();
        });
    }

    // Escape key cancels edit mode
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && editingEntryId !== null) {
            cancelEdit();
        }
    });
}

/**
 * Recalculate Converted Qty = Qty * QtyPerUOM
 */
function recalculateConvertedQty() {
    const qtyVal = parseFloat(qtyInput.value) || 0;
    const selectedOption = scannedUomSelect.selectedOptions[0];
    let qtyPerUom = 1;

    if (selectedOption && selectedOption.dataset.qtyPerUom) {
        qtyPerUom = parseFloat(selectedOption.dataset.qtyPerUom) || 1;
    }

    const converted = qtyVal * qtyPerUom;
    convertedQtyBox.textContent = formatNumber(converted);
}

/**
 * Format quantity display (strip redundant trailing decimals)
 */
function formatNumber(num) {
    if (num % 1 === 0) return num.toString();
    return parseFloat(num.toFixed(4)).toString();
}

/**
 * Feedback banner display
 */
function showFeedback(type, message) {
    scanFeedback.className = `scan-feedback-banner ${type}`;
    let icon = 'ri-checkbox-circle-fill';
    if (type === 'error') icon = 'ri-error-warning-fill';
    if (type === 'loading') icon = 'ri-loader-4-line ri-spin';

    feedbackText.innerHTML = `<i class="${icon}"></i> <span>${message}</span>`;
    scanFeedback.style.display = 'flex';

    if (type !== 'loading') {
        setTimeout(() => {
            if (scanFeedback.className.includes(type)) {
                scanFeedback.style.display = 'none';
            }
        }, 5000);
    }
}

/**
 * Lookup by Barcode from Local Master Data
 */
async function lookupByBarcode(barcode) {
    showFeedback('loading', `Looking up barcode: ${barcode}...`);
    try {
        const res = await fetch(`/api/StockCount/lookup?barcode=${encodeURIComponent(barcode)}`);
        const data = await res.json();

        if (res.ok && data.found) {
            playBeep(true);
            populateItemData(data);
            showFeedback('success', `Found: <strong>${data.sku}</strong> - ${data.description}`);

            // Automatically move control to Qty field and highlight it
            setTimeout(() => {
                qtyInput.focus();
                qtyInput.select();
            }, 60);
        } else {
            playBeep(false);
            showFeedback('error', data.message || `Barcode '${barcode}' not found.`);
            barcodeInput.select();
        }
    } catch (err) {
        console.error('Barcode lookup error:', err);
        playBeep(false);
        showFeedback('error', 'Error connecting to server. Please try again.');
    }
}

/**
 * Lookup by SKU (ItemNo) from Local Master Data
 */
async function lookupBySKU(sku) {
    showFeedback('loading', `Looking up SKU: ${sku}...`);
    try {
        const res = await fetch(`/api/StockCount/lookup?sku=${encodeURIComponent(sku)}`);
        const data = await res.json();

        if (res.ok && data.found) {
            playBeep(true);
            populateItemData(data);
            showFeedback('success', `Found: <strong>${data.sku}</strong> - ${data.description}`);

            // Automatically move control to Qty field and highlight it
            setTimeout(() => {
                qtyInput.focus();
                qtyInput.select();
            }, 60);
        } else {
            playBeep(false);
            showFeedback('error', data.message || `SKU '${sku}' not found.`);
            skuInput.select();
        }
    } catch (err) {
        console.error('SKU lookup error:', err);
        playBeep(false);
        showFeedback('error', 'Error connecting to server. Please try again.');
    }
}

/**
 * Populate item details into form fields
 */
function populateItemData(data) {
    currentItemData = data;

    // Display ItemNo on field SKU
    skuInput.value = data.sku || '';

    // Description = ArabicName (non-editable)
    descriptionInput.value = data.description || '';

    // BaseUOM = BaseUOM (non-editable)
    baseUomInput.value = data.baseUOM || '';

    // Populate Scanned UOM dropdown
    // All UOMCodes against scanned ItemNo displayed like PCS(1)
    scannedUomSelect.innerHTML = '';
    if (data.uoms && data.uoms.length > 0) {
        data.uoms.forEach(uom => {
            const opt = document.createElement('option');
            opt.value = uom.uomCode;
            opt.dataset.qtyPerUom = uom.qtyPerUOM;
            opt.textContent = uom.displayText; // e.g. PCS(1) or CTN(12)
            scannedUomSelect.appendChild(opt);
        });

        // Set default selected option
        if (data.selectedUOMCode) {
            scannedUomSelect.value = data.selectedUOMCode;
        }
    } else {
        const opt = document.createElement('option');
        opt.value = data.baseUOM || 'PCS';
        opt.dataset.qtyPerUom = '1';
        opt.textContent = `${data.baseUOM || 'PCS'}(1)`;
        scannedUomSelect.appendChild(opt);
    }

    // Default Qty = 1
    qtyInput.value = '1';

    // Converted Qty = Qty * QtyPerUOM
    recalculateConvertedQty();
}

/**
 * Save or Update current entry to Database and Grid
 */
async function saveCurrentEntry() {
    const sku = skuInput.value.trim();
    const qtyVal = parseFloat(qtyInput.value);

    if (!sku) {
        playBeep(false);
        showFeedback('error', 'Please scan a barcode or enter an SKU before saving.');
        barcodeInput.focus();
        return;
    }

    if (isNaN(qtyVal) || qtyVal <= 0) {
        playBeep(false);
        showFeedback('error', 'Please enter a valid positive quantity.');
        qtyInput.focus();
        qtyInput.select();
        return;
    }

    const selectedOption = scannedUomSelect.selectedOptions[0];
    const uomText = selectedOption ? selectedOption.textContent.trim() : 'PCS(1)';
    const uomCode = selectedOption ? selectedOption.value : (baseUomInput.value || 'PCS');
    const qtyPerUom = selectedOption && selectedOption.dataset.qtyPerUom ? parseFloat(selectedOption.dataset.qtyPerUom) : 1;
    const convertedQty = qtyVal * qtyPerUom;

    // IF IN EDIT MODE: Update existing entry
    if (editingEntryId !== null) {
        btnSave.disabled = true;
        btnSave.innerHTML = `<i class="ri-loader-4-line ri-spin"></i> Updating...`;

        try {
            const res = await fetch(`/api/StockCount/entry/${editingEntryId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    barcode: barcodeInput.value.trim(),
                    sku: sku,
                    description: descriptionInput.value.trim(),
                    baseUOM: baseUomInput.value.trim(),
                    scannedUOM: uomText,
                    uomCode: uomCode,
                    qty: qtyVal,
                    qtyPerUOM: qtyPerUom,
                    convertedQty: convertedQty,
                    createdBy: currentUser?.email || localStorage.getItem('userEmail') || ''
                })
            });

            const data = await res.json();
            if (res.ok && data.success) {
                playBeep(true);

                // Update entry in local array
                const idx = countEntries.findIndex(e => e.id === editingEntryId);
                if (idx !== -1) {
                    countEntries[idx] = data.entry;
                }

                showFeedback('success', `Updated: <strong>${sku}</strong> | Qty: ${qtyVal} (${uomText}) &rarr; Converted: ${formatNumber(convertedQty)}`);

                resetInputForm();
                renderGrid(gridFilterInput ? gridFilterInput.value.trim().toLowerCase() : '');
                updateStats();

                setTimeout(() => {
                    barcodeInput.focus();
                }, 60);
            } else {
                playBeep(false);
                showFeedback('error', data.message || 'Failed to update entry.');
            }
        } catch (err) {
            console.error('Update error:', err);
            playBeep(false);
            showFeedback('error', 'Network error while updating. Please try again.');
        } finally {
            btnSave.disabled = false;
            if (editingEntryId !== null) {
                btnSave.innerHTML = `<i class="ri-check-line"></i> <span>Update</span>`;
            } else {
                btnSave.innerHTML = `<i class="ri-save-line"></i> <span>Save</span>`;
                btnSave.style.background = '';
            }
        }
        return;
    }

    // CREATE MODE: Add new entry
    const payload = {
        barcode: barcodeInput.value.trim(),
        sku: sku,
        description: descriptionInput.value.trim(),
        baseUOM: baseUomInput.value.trim(),
        scannedUOM: uomText, // displayed as e.g. PCS(1)
        uomCode: uomCode,
        qty: qtyVal,
        qtyPerUOM: qtyPerUom,
        convertedQty: convertedQty,
        createdBy: currentUser?.email || localStorage.getItem('userEmail') || 'admin@example.com',
        location: currentUser?.location || localStorage.getItem('userLocation') || 'HO',
        batchName: currentUser?.mobileBatchName || localStorage.getItem('userMobileBatchName') || ''
    };

    btnSave.disabled = true;
    btnSave.innerHTML = `<i class="ri-loader-4-line ri-spin"></i> Saving...`;

    try {
        const res = await fetch('/api/StockCount/entry', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (res.ok && data.success) {
            playBeep(true);

            // Prepend saved entry to local array
            countEntries.unshift(data.entry);
            renderGrid();
            updateStats();

            showFeedback('success', `Saved: <strong>${payload.sku}</strong> | Qty: ${payload.qty} (${payload.scannedUOM}) &rarr; Converted: ${formatNumber(convertedQty)}`);

            // Reset form fields
            resetInputForm();

            // Return focus automatically back to Barcode field for continuous scanning
            setTimeout(() => {
                barcodeInput.focus();
            }, 60);
        } else {
            playBeep(false);
            showFeedback('error', data.message || 'Failed to save entry.');
        }
    } catch (err) {
        console.error('Save error:', err);
        playBeep(false);
        showFeedback('error', 'Network error while saving. Please try again.');
    } finally {
        btnSave.disabled = false;
        btnSave.innerHTML = `<i class="ri-save-line"></i> <span>Save (Enter)</span>`;
    }
}

/**
 * Edit an existing entry from the grid
 */
window.editEntry = async function (id) {
    const entry = countEntries.find(e => e.id === id);
    if (!entry) return;

    editingEntryId = id;

    // Populate input fields
    barcodeInput.value = entry.barcode || '';
    skuInput.value = entry.sku || '';
    descriptionInput.value = entry.description || '';
    baseUomInput.value = entry.baseUOM || '';
    qtyInput.value = formatNumber(entry.qty);

    // Fetch UOM options for this SKU
    try {
        const res = await fetch(`/api/StockCount/lookup?sku=${encodeURIComponent(entry.sku)}`);
        if (res.ok) {
            const data = await res.json();
            if (data.found && data.uoms && data.uoms.length > 0) {
                scannedUomSelect.innerHTML = '';
                data.uoms.forEach(uom => {
                    const opt = document.createElement('option');
                    opt.value = uom.uomCode;
                    opt.dataset.qtyPerUom = uom.qtyPerUOM;
                    opt.textContent = uom.displayText;
                    scannedUomSelect.appendChild(opt);
                });

                // Match entry.uomCode or entry.scannedUOM
                let matched = false;
                if (entry.uomCode) {
                    for (let i = 0; i < scannedUomSelect.options.length; i++) {
                        if (scannedUomSelect.options[i].value.toLowerCase() === entry.uomCode.toLowerCase()) {
                            scannedUomSelect.selectedIndex = i;
                            matched = true;
                            break;
                        }
                    }
                }
                if (!matched && entry.scannedUOM) {
                    for (let i = 0; i < scannedUomSelect.options.length; i++) {
                        if (scannedUomSelect.options[i].textContent.trim().toLowerCase() === entry.scannedUOM.trim().toLowerCase()) {
                            scannedUomSelect.selectedIndex = i;
                            matched = true;
                            break;
                        }
                    }
                }
            } else {
                setFallbackUom(entry);
            }
        } else {
            setFallbackUom(entry);
        }
    } catch (e) {
        setFallbackUom(entry);
    }

    recalculateConvertedQty();

    // Visual button update for editing state
    btnSave.innerHTML = `<i class="ri-check-line"></i> <span>Update</span>`;
    btnSave.style.background = 'linear-gradient(135deg, #059669 0%, #10b981 100%)';
    if (btnCancelEdit) btnCancelEdit.style.display = 'inline-flex';

    // Highlight row in grid
    renderGrid(gridFilterInput ? gridFilterInput.value.trim().toLowerCase() : '');

    showFeedback('loading', `Editing item: <strong>${escapeHtml(entry.sku)}</strong>. Modify Qty or UOM and click Update.`);

    // Automatically focus qtyInput and select text
    setTimeout(() => {
        qtyInput.focus();
        qtyInput.select();
    }, 60);
};

function setFallbackUom(entry) {
    scannedUomSelect.innerHTML = '';
    const opt = document.createElement('option');
    opt.value = entry.uomCode || entry.baseUOM || 'PCS';
    opt.dataset.qtyPerUom = entry.qtyPerUOM || 1;
    opt.textContent = entry.scannedUOM || `${entry.baseUOM || 'PCS'}(1)`;
    scannedUomSelect.appendChild(opt);
}

/**
 * Cancel Edit Mode
 */
window.cancelEdit = function () {
    if (editingEntryId === null) return;
    editingEntryId = null;
    resetInputForm();
    renderGrid(gridFilterInput ? gridFilterInput.value.trim().toLowerCase() : '');
    showFeedback('success', 'Edit mode cancelled.');
    barcodeInput.focus();
};

/**
 * Reset Form Fields after Save or Cancel
 */
function resetInputForm() {
    barcodeInput.value = '';
    skuInput.value = '';
    descriptionInput.value = '';
    baseUomInput.value = '';
    scannedUomSelect.innerHTML = '<option value="">-- Select UOM --</option>';
    qtyInput.value = '1';
    convertedQtyBox.textContent = '0';
    currentItemData = null;
    editingEntryId = null;
    btnSave.innerHTML = `<i class="ri-save-line"></i> <span>Save</span>`;
    btnSave.style.background = '';
    if (btnCancelEdit) btnCancelEdit.style.display = 'none';
}

/**
 * Load saved active entries for the current logged-in user from backend (Status == 0 only)
 */
async function loadSavedEntries() {
    try {
        const userEmail = currentUser?.email || localStorage.getItem('userEmail') || '';
        const url = userEmail 
            ? `/api/StockCount/entries?userEmail=${encodeURIComponent(userEmail)}&limit=1000`
            : `/api/StockCount/entries?limit=1000`;

        const res = await fetch(url);
        if (res.ok) {
            const data = await res.json();
            if (data.success && Array.isArray(data.entries)) {
                countEntries = data.entries;
                renderGrid();
                updateStats();
            }
        }
    } catch (err) {
        console.error('Error fetching count entries:', err);
    }
}

/**
 * Render the Grid Table (Base UOM and Time removed, Edit option added)
 */
function renderGrid(filterQuery = '') {
    gridTableBody.innerHTML = '';

    const filtered = countEntries.filter(item => {
        if (!filterQuery) return true;
        const q = filterQuery.toLowerCase();
        return (
            (item.sku && item.sku.toLowerCase().includes(q)) ||
            (item.description && item.description.toLowerCase().includes(q)) ||
            (item.barcode && item.barcode.toLowerCase().includes(q)) ||
            (item.scannedUOM && item.scannedUOM.toLowerCase().includes(q))
        );
    });

    if (filtered.length === 0) {
        gridEmptyState.style.display = 'block';
        return;
    }

    gridEmptyState.style.display = 'none';

    filtered.forEach((item, index) => {
        const tr = document.createElement('tr');
        const isEditingThisRow = (editingEntryId === item.id);
        if (isEditingThisRow) {
            tr.classList.add('row-editing');
        }

        tr.innerHTML = `
            <td style="color: #94a3b8; font-weight: 600; text-align: center;">${index + 1}</td>
            <td class="cell-sku">${escapeHtml(item.sku)}</td>
            <td class="cell-desc" dir="rtl" style="text-align: right;">${escapeHtml(item.description || '—')}</td>
            <td style="text-align: center;"><span class="cell-uom">${escapeHtml(item.scannedUOM || '—')}</span></td>
            <td style="text-align: center;" class="cell-qty">${formatNumber(item.qty)}</td>
            <td style="text-align: center;"><span class="cell-converted">${formatNumber(item.convertedQty)}</span></td>
            <td style="text-align: center; white-space: nowrap;">
                <button type="button" class="btn-action-row btn-edit-row" title="Edit entry" onclick="editEntry(${item.id})">
                    <i class="ri-edit-line"></i>
                </button>
                <button type="button" class="btn-action-row btn-delete-row" title="Delete entry" onclick="deleteEntry(${item.id})">
                    <i class="ri-delete-bin-line"></i>
                </button>
            </td>
        `;

        gridTableBody.appendChild(tr);
    });
}

/**
 * Delete a single active entry (user-specific)
 */
window.deleteEntry = async function (id) {
    const confirmed = typeof showConfirm === 'function'
        ? await showConfirm('Are you sure you want to remove this counted item?', 'Delete Entry')
        : confirm('Are you sure you want to remove this counted item?');
    if (!confirmed) return;

    try {
        const userEmail = currentUser?.email || localStorage.getItem('userEmail') || '';
        const res = await fetch(`/api/StockCount/entry/${id}?userEmail=${encodeURIComponent(userEmail)}`, { method: 'DELETE' });
        const data = await res.json();
        if (res.ok && data.success) {
            countEntries = countEntries.filter(e => e.id !== id);
            renderGrid(gridFilterInput ? gridFilterInput.value.trim().toLowerCase() : '');
            updateStats();
            showFeedback('success', 'Entry removed successfully.');
        } else {
            showFeedback('error', data.message || 'Failed to delete entry.');
        }
    } catch (err) {
        console.error('Delete error:', err);
        showFeedback('error', 'Error deleting entry.');
    }
};

/**
 * Verify current active count session (marks all user's active entries to Status = 1 and clears them from grid)
 */
async function verifySession() {
    if (countEntries.length === 0) {
        playBeep(false);
        showFeedback('error', 'No active count entries to verify in your grid.');
        return;
    }

    const userEmail = currentUser?.email || localStorage.getItem('userEmail') || '';
    if (!userEmail) {
        showFeedback('error', 'Unable to determine logged-in user. Please re-login.');
        return;
    }

    const totalItems = countEntries.length;
    const confirmed = typeof showConfirm === 'function'
        ? await showConfirm(`Are you sure you want to verify all ${totalItems} active counted entries? Once verified, their status becomes 1 and they will be completed and cleared from your active workspace.`, 'Verify Stock Count')
        : confirm(`Are you sure you want to verify all ${totalItems} active counted entries?`);
    if (!confirmed) return;

    btnVerifyGrid.disabled = true;
    btnVerifyGrid.innerHTML = `<i class="ri-loader-4-line ri-spin"></i> <span>Verifying...</span>`;

    try {
        const res = await fetch('/api/StockCount/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userEmail: userEmail })
        });

        const data = await res.json();
        if (res.ok && data.success) {
            playBeep(true);
            const verifiedTotal = data.verifiedCount || totalItems;

            // All verified entries immediately clear/hide from the active grid
            countEntries = [];
            renderGrid();
            updateStats();
            resetInputForm();

            showFeedback('success', `Verification successful! <strong>${verifiedTotal}</strong> entries verified (Status = 1) and cleared from active grid.`);
            setTimeout(() => {
                barcodeInput.focus();
            }, 60);
        } else {
            playBeep(false);
            showFeedback('error', data.message || 'Verification failed.');
        }
    } catch (err) {
        console.error('Verify error:', err);
        playBeep(false);
        showFeedback('error', 'Network error during verification. Please try again.');
    } finally {
        btnVerifyGrid.disabled = false;
        btnVerifyGrid.innerHTML = `<i class="ri-check-double-line"></i> <span>Verify</span>`;
    }
}

/**
 * Clear the current user's active count session
 */
async function clearSession() {
    if (countEntries.length === 0) {
        alert('There are no active entries to clear.');
        return;
    }

    const confirmed = typeof showConfirm === 'function'
        ? await showConfirm(`Are you sure you want to clear your ${countEntries.length} active count entries? This action cannot be undone.`, 'Clear Active Session')
        : confirm(`Are you sure you want to clear your active count entries?`);
    if (!confirmed) return;

    try {
        const userEmail = currentUser?.email || localStorage.getItem('userEmail') || '';
        const res = await fetch(`/api/StockCount/clear?userEmail=${encodeURIComponent(userEmail)}`, { method: 'POST' });
        const data = await res.json();
        if (res.ok && data.success) {
            countEntries = [];
            renderGrid();
            updateStats();
            resetInputForm();
            showFeedback('success', 'Your active count entries were cleared.');
            barcodeInput.focus();
        } else {
            showFeedback('error', data.message || 'Failed to clear session.');
        }
    } catch (err) {
        console.error('Clear error:', err);
        showFeedback('error', 'Error clearing session.');
    }
}

/**
 * Update Summary Statistics KPI
 */
function updateStats() {
    const totalRows = countEntries.length;
    const totalQty = countEntries.reduce((sum, item) => sum + (parseFloat(item.qty) || 0), 0);
    const totalConverted = countEntries.reduce((sum, item) => sum + (parseFloat(item.convertedQty) || 0), 0);

    statTotalRows.textContent = totalRows.toLocaleString();
    statTotalQty.textContent = formatNumber(totalQty);
    statTotalConverted.textContent = formatNumber(totalConverted);

    gridRowsCountPill.textContent = `${totalRows} records`;
    footerTotalRows.textContent = totalRows;
    footerTotalConverted.textContent = formatNumber(totalConverted);

    if (countEntries.length > 0) {
        const last = countEntries[0];
        statLastSku.textContent = last.sku;
        const lastTime = last.createdAt 
            ? new Date(last.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
            : 'Just now';
        statLastTime.textContent = `Scanned at ${lastTime} (${formatNumber(last.convertedQty)} ${last.baseUOM || ''})`;
    } else {
        statLastSku.textContent = '—';
        statLastTime.textContent = 'No scans yet';
    }
}

/**
 * Export count entries to CSV
 */
function exportToCsv() {
    if (countEntries.length === 0) {
        alert('No records available to export.');
        return;
    }

    const headers = ['#', 'Barcode', 'SKU', 'Description', 'Base UOM', 'Scanned UOM', 'Qty', 'Converted Qty', 'Counted At', 'Counted By', 'Location', 'Mobile Batch Name'];
    const rows = countEntries.map((item, idx) => [
        idx + 1,
        `"${(item.barcode || '').replace(/"/g, '""')}"`,
        `"${(item.sku || '').replace(/"/g, '""')}"`,
        `"${(item.description || '').replace(/"/g, '""')}"`,
        `"${(item.baseUOM || '').replace(/"/g, '""')}"`,
        `"${(item.scannedUOM || '').replace(/"/g, '""')}"`,
        item.qty,
        item.convertedQty,
        `"${item.createdAt || ''}"`,
        `"${(item.createdBy || '').replace(/"/g, '""')}"`,
        `"${(item.location || '').replace(/"/g, '""')}"`,
        `"${(item.batchName || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Stock_Count_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
