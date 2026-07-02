/**
 * DynamicsAltx - Bidding Creation Logic
 */

let currentBidNo = null;
let currentBidData = null; // Global storage for PDF export
let activeHighlightVendorId = null;

document.addEventListener('DOMContentLoaded', async () => {
    // URL Check for Direct Access
    const urlParams = new URLSearchParams(window.location.search);
    const bidNo = urlParams.get('bidNo');
    
    if (bidNo) {
        currentBidNo = bidNo;
        await loadExistingBid(bidNo);
    }

    const btnUpdateVendors = document.getElementById('btn-update-vendors');
    if (btnUpdateVendors) {
        btnUpdateVendors.addEventListener('click', async () => {
            if (!currentBidNo) {
                showToast('No active bid references found', 'warning');
                return;
            }

            const checkedBoxes = document.querySelectorAll('#vendor-grid input[type="checkbox"]:checked');
            const selectedIds = Array.from(checkedBoxes).map(chk => chk.value).join(',');

            btnUpdateVendors.disabled = true;
            const originalHtml = btnUpdateVendors.innerHTML;
            btnUpdateVendors.innerHTML = '<i class="ri-loader-4-line animate-spin"></i> Applying...';

            try {
                const response = await fetch('/api/Bidding/UpdateSelectedVendors', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        bidNo: currentBidNo,
                        selectedVendorIds: selectedIds
                    })
                });

                const data = await response.json();
                if (response.ok) {
                    currentBidData = data;
                    renderBidLines(data);
                    renderVendorSelector(data);
                    showToast('Vendors list updated successfully', 'success');
                } else {
                    throw new Error(data.message || 'Failed to update vendors list');
                }
            } catch (error) {
                console.error(error);
                showToast(error.message, 'error');
            } finally {
                btnUpdateVendors.disabled = false;
                btnUpdateVendors.innerHTML = originalHtml;
            }
        });
    }
});

function renderVendorSelector(data) {
    const selectorSection = document.getElementById('vendor-selection-section');
    if (!selectorSection) return;

    selectorSection.style.display = 'block';

    const grid = document.getElementById('vendor-grid');
    if (!grid) return;

    grid.innerHTML = '';

    const selectedIdsStr = data.header.selectedVendorIds || "";
    const selectedIds = selectedIdsStr.split(',')
        .map(id => parseInt(id.trim()))
        .filter(id => !isNaN(id));

    data.vendors.forEach(v => {
        const isSelected = selectedIds.includes(v.id);
        const badge = document.createElement('div');
        badge.className = `vendor-badge-checkbox${isSelected ? ' selected' : ''}`;
        badge.dataset.vendorId = v.id;

        badge.innerHTML = `
            <input type="checkbox" id="vendor-chk-${v.id}" value="${v.id}" ${isSelected ? 'checked' : ''} onchange="toggleVendorBadgeState(this)">
            <label for="vendor-chk-${v.id}" style="cursor: pointer; margin-left: 4px;">${v.displayName || v.vendorName}</label>
        `;
        grid.appendChild(badge);
    });
}

function toggleVendorBadgeState(chk) {
    const badge = chk.closest('.vendor-badge-checkbox');
    if (badge) {
        if (chk.checked) {
            badge.classList.add('selected');
        } else {
            badge.classList.remove('selected');
        }
    }
}

const riyalSvg = `
    <svg viewBox="0 0 1124.14 1256.39" style="height: 0.9em; width: auto; vertical-align: middle; fill: currentColor; margin-right: 4px;">
        <path d="M699.62,1113.02h0c-20.06,44.48-33.32,92.75-38.4,143.37l424.51-90.24c20.06-44.47,33.31-92.75,38.4-143.37l-424.51,90.24Z"/>
        <path d="M1085.73,895.8c20.06-44.47,33.32-92.75,38.4-143.37l-330.68,70.33v-135.2l292.27-62.11c20.06-44.47,33.32-92.75,38.4-143.37l-330.68,70.27V66.13c-50.67,28.45-95.67,66.32-132.25,110.99v403.35l-132.25,28.11V0c-50.67,28.44-95.67,66.32-132.25,110.99v525.69l-295.91,62.88c-20.06,44.47-33.33,92.75-38.42,143.37l334.33-71.05v170.26l-358.3,76.14c-20.06,44.47-33.32,92.75-38.4,143.37l375.04-79.7c30.53-6.35,56.77-24.4,73.83-49.24l68.78-101.97v-.02c7.14-10.55,11.3-23.27,11.3-36.97v-149.98l132.25-28.11v270.4l424.53-90.28Z"/>
    </svg>
`;

async function loadExistingBid(bidNo) {
    try {
        const response = await fetch(`/api/Bidding/BidDetails/${bidNo}`);
        if (!response.ok) throw new Error('Failed to load bid details');
        
        const data = await response.json();
        currentBidData = data; // Store globally for PDF export
        
        document.getElementById('display-bid-no').innerText = bidNo;
        document.getElementById('bid-identifier').style.display = 'flex';
        document.getElementById('fetch-section').style.display = 'block';
        document.getElementById('btn-new-bid').style.display = 'none';

        // Display Linked Documents from Header
        if (data.header && data.header.navDocNo) {
            document.getElementById('nav-doc-no').value = data.header.navDocNo;
            if (document.getElementById('multi-nav-doc')) {
                document.getElementById('multi-nav-doc').value = data.header.navDocNo;
            }
        }
        
        renderBidLines(data);
        renderVendorSelector(data);
        document.getElementById('lines-section').style.display = 'block';
    } catch (error) {
        console.error('Error loading bid:', error);
        showToast('Error loading bid: ' + error.message, 'error');
    }
}

// Handler: Mark Bid Inactive
document.getElementById('btn-mark-inactive').addEventListener('click', async () => {
    if (!currentBidNo) return;
    
    const confirmed = await showConfirm(
        `Are you sure you want to make Bid ${currentBidNo} inactive? It will be removed from the main list.`,
        'Confirm Status Change'
    );

    if (!confirmed) return;

    const btn = document.getElementById('btn-mark-inactive');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="ri-loader-4-line animate-spin"></i> Processing...';

    try {
        const response = await fetch('/api/Bidding/UpdateBidStatus', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                bidNo: currentBidNo,
                newStatus: 'Inactive'
            })
        });

        if (response.ok) {
            showToast(`Bid ${currentBidNo} marked as inactive`, 'success');
            window.location.href = 'bidding-list.html';
        } else {
            const data = await response.json();
            throw new Error(data.message || 'Failed to update status');
        }
    } catch (error) {
        showToast(error.message, 'error');
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
});

// Handler: Download Excel
const btnExcel = document.getElementById('btn-download-excel');
if (btnExcel) {
    btnExcel.addEventListener('click', () => {
        exportBidToExcel();
    });
}

// Handler: Download PDF Comparison
const btnPdf = document.getElementById('btn-download-pdf');
if (btnPdf) {
    btnPdf.addEventListener('click', () => {
        exportBidToPDF();
    });
}

// Handler: Initialize New Bid
document.getElementById('btn-new-bid').addEventListener('click', async () => {
    const btn = document.getElementById('btn-new-bid');
    btn.disabled = true;
    btn.innerHTML = '<i class="ri-loader-4-line animate-spin"></i> Initializing...';

    try {
        const response = await fetch('/api/Bidding/InitializeBid', {
            method: 'POST'
        });
        
        const data = await response.json();
        
        if (response.ok) {
            currentBidNo = data.header.bidNo;
            currentBidData = data; // Initialize state
            document.getElementById('display-bid-no').innerText = currentBidNo;
            document.getElementById('bid-identifier').style.display = 'flex';
            document.getElementById('fetch-section').style.display = 'block';
            renderVendorSelector(data);
            btn.style.display = 'none';
        } else {
            throw new Error(data.message || 'Failed to initialize bid');
        }
    } catch (error) {
        showToast(error.message, 'error');
        btn.disabled = false;
        btn.innerHTML = '<i class="ri-add-circle-line"></i> Generate New Bid';
    }
});

// Handler: Fetch & Sync Data
document.getElementById('btn-fetch-data').addEventListener('click', async () => {
    const mainInput = document.getElementById('nav-doc-no');
    
    // 1. Capture existing NAVDocNo from Header if it exists
    let existingDocNos = [];
    if (currentBidData && currentBidData.header && currentBidData.header.navDocNo) {
        currentBidData.header.navDocNo.split('|').forEach(d => {
            const trimmed = d.trim();
            if (trimmed && !existingDocNos.includes(trimmed)) {
                existingDocNos.push(trimmed);
            }
        });
    }

    // 2. Read new input from nav-doc-no field (user may have added new docs with pipe symbol)
    const newInput = mainInput && mainInput.value.trim();
    
    // 3. Merge new input with existing header docs
    let finalDocNos = [...existingDocNos];
    if (newInput) {
        newInput.split(/[|,]/).forEach(d => {
            const trimmed = d.trim();
            if (trimmed && !finalDocNos.includes(trimmed)) {
                finalDocNos.push(trimmed);
            }
        });
    }

    const navDocNo = finalDocNos.join(' | ');

    // Show the merged list in the nav-doc-no field immediately
    if (mainInput) mainInput.value = navDocNo;

    if (!navDocNo) {
        showToast('Please enter a NavDocument No', 'warning');
        return;
    }

    // 4. Confirmation if records already exist
    const hasExistingRecords = document.querySelectorAll('#bid-lines-body tr').length > 0;
    if (hasExistingRecords) {
        const confirmed = await showConfirm(
            'The system will fetch data for: ' + navDocNo + '. Any existing items not in these documents will be removed. Existing costs will be preserved. Do you want to continue?',
            'Confirm Data Fetch'
        );
        if (!confirmed) return;

        // Second popup displaying all linked documents
        const docList = navDocNo.split('|').map(s => s.trim()).join('\n');
        await showAlert("Documents to be Synchronized:\n" + docList, "Linked Documents for Final Sync");
    }

    const btn = document.getElementById('btn-fetch-data');
    btn.disabled = true;
    btn.innerHTML = '<i class="ri-refresh-line animate-spin"></i> Syncing...';

    try {
        const response = await fetch('/api/Bidding/FetchAndSyncLines', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                bidNo: currentBidNo,
                navDocNo: navDocNo
            })
        });

        const data = await response.json();

        if (response.ok) {
            currentBidData = data; // Store globally
            renderBidLines(data);
            renderVendorSelector(data);
            document.getElementById('lines-section').style.display = 'block';
            
            // Update nav-doc-no with the saved cumulative list from the header
            if (data.header && data.header.navDocNo) {
                if (mainInput) mainInput.value = data.header.navDocNo;
            }
        } else {
            throw new Error(data.message || 'Failed to sync data');
        }
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="ri-download-cloud-line"></i> Fetch Data';
    }
});

function renderBidLines(data) {
    const lines = data.lines;
    
    // Parse selected vendor IDs
    const selectedVendorIds = (data.header.selectedVendorIds || "")
        .split(',')
        .map(id => parseInt(id.trim()))
        .filter(id => !isNaN(id));

    // Filter vendors to only selected ones
    const vendors = data.vendors.filter(v => selectedVendorIds.includes(v.id));

    const headerRow = document.getElementById('bid-lines-header');
    const body = document.getElementById('bid-lines-body');
    const countBadge = document.getElementById('line-count');
    
    // 1. Rebuild Header
    headerRow.innerHTML = `
        <th>SKU/Code</th>
        <th>Description</th>
        <th>UOM</th>
        <th>Quantity</th>
    `;
    vendors.forEach(v => {
        const th = document.createElement('th');
        th.className = 'vendor-header';
        th.dataset.vendorId = v.id;
        
        // Wrap content to include PDF export button
        th.innerHTML = `
            <div class="vendor-header-content">
                <span class="v-name" style="flex: 1;">${v.displayName || v.vendorName}</span>
                <button class="btn-vendor-pdf" title="Download Best Cost PDF" 
                        onclick="event.stopPropagation(); generateVendorPDF(${v.id})">
                    <i class="ri-file-pdf-line"></i>
                </button>
            </div>
        `;

        th.onclick = () => toggleVendorHighlight(v.id, th);
        headerRow.appendChild(th);
    });

    // 2. Rebuild Body
    body.innerHTML = '';
    countBadge.innerText = `${lines.length} Items`;

    lines.forEach(line => {
        const row = document.createElement('tr');
        row.className = 'animate-in bid-row';
        row.dataset.lineId = line.id;
        
        let vendorCells = '';
        vendors.forEach(v => {
            const priceObj = line.prices.find(p => p.vendorId === v.id);
            const cost = priceObj ? priceObj.cost : 0;
            vendorCells += `
                <td class="vendor-cost-cell" data-vendor-id="${v.id}" data-cost="${cost}">
                    <div style="display: flex; align-items: center; gap: 0.5rem; background: #f0fdf4; padding: 0.25rem 0.5rem; border-radius: 8px; border: 1px solid #dcfce7;">
                        <span style="font-size: 0.75rem; font-weight: 700; color: #166534;">${riyalSvg}</span>
                        <input type="number" 
                               value="${cost.toFixed(2)}" 
                               step="0.01"
                               style="width: 80px; border: none; background: transparent; font-weight: 600; color: #15803d; outline: none; font-family: 'Inter', sans-serif;"
                               onchange="updateVendorPrice(${line.id}, ${v.id}, this)">
                    </div>
                </td>`;
        });

        row.innerHTML = `
            <td><code style="font-weight: 600; color: var(--primary);">#${line.navSku}</code></td>
            <td style="font-size: 0.85rem; color: var(--text-muted); max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${line.description || ''}">${line.description || 'N/A'}</td>
            <td>${line.uom}</td>
            <td style="font-weight: 500;">${line.quantity}</td>
            ${vendorCells}
        `;

        // Add Enter and Arrow key navigation
        row.querySelectorAll('input[type="number"]').forEach(input => {
            input.addEventListener('keydown', (e) => {
                // 1. Disable ArrowUp and ArrowDown value changes
                if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                    e.preventDefault();
                    return;
                }

                // 2. Updated Enter key navigation (Horizontal then Vertical)
                if (e.key === 'Enter') {
                    e.preventDefault();
                    const currentCell = input.closest('td');
                    let nextTarget = null;

                    // Try next vendor in the same row
                    let nextVendorCell = currentCell.nextElementSibling;
                    while (nextVendorCell && !nextVendorCell.classList.contains('vendor-cost-cell')) {
                        nextVendorCell = nextVendorCell.nextElementSibling;
                    }

                    if (nextVendorCell) {
                        nextTarget = nextVendorCell.querySelector('input');
                    } else {
                        // Move to first vendor of the next row
                        const nextRow = row.nextElementSibling;
                        if (nextRow) {
                            nextTarget = nextRow.querySelector('.vendor-cost-cell input');
                        }
                    }
                    
                    if (nextTarget) {
                        nextTarget.focus();
                        nextTarget.select();
                    }
                }
            });
        });

        body.appendChild(row);
    });
}

function toggleVendorHighlight(vendorId, thElement) {
    const isAlreadyActive = activeHighlightVendorId === vendorId;
    
    // Clear all existing highlights
    document.querySelectorAll('.vendor-header').forEach(el => el.classList.remove('active-highlight'));
    document.querySelectorAll('.bid-row').forEach(el => el.classList.remove('best-cost-row'));

    if (isAlreadyActive) {
        activeHighlightVendorId = null;
        return;
    }

    activeHighlightVendorId = vendorId;
    thElement.classList.add('active-highlight');

    // Highlight rows where this vendor has the best cost
    document.querySelectorAll('.bid-row').forEach(row => {
        const cells = Array.from(row.querySelectorAll('.vendor-cost-cell'));
        const validCosts = cells
            .map(c => parseFloat(c.dataset.cost))
            .filter(cost => cost > 0);

        if (validCosts.length === 0) return;

        const minCost = Math.min(...validCosts);
        const targetCell = cells.find(c => parseInt(c.dataset.vendorId) === vendorId);
        const vendorCost = parseFloat(targetCell.dataset.cost);

        if (vendorCost > 0 && vendorCost === minCost) {
            row.classList.add('best-cost-row');
        }
    });
}

async function updateVendorPrice(lineId, vendorId, inputElement) {
    const newCost = parseFloat(inputElement.value) || 0;
    const cell = inputElement.closest('.vendor-cost-cell');
    const parent = inputElement.parentElement;
    
    cell.dataset.cost = newCost;
    parent.style.borderColor = '#4f46e5';

    // Sync global in-memory state for exports
    if (currentBidData && currentBidData.lines) {
        const line = currentBidData.lines.find(l => l.id === parseInt(lineId));
        if (line) {
            if (!line.prices) line.prices = [];
            let priceObj = line.prices.find(p => p.vendorId === parseInt(vendorId));
            if (!priceObj) {
                line.prices.push({
                    bidLineId: parseInt(lineId),
                    vendorId: parseInt(vendorId),
                    cost: newCost
                });
            } else {
                priceObj.cost = newCost;
            }
        }
    }
    
    try {
        const response = await fetch('/api/Bidding/UpdateVendorPrice', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                bidLineId: parseInt(lineId),
                vendorId: parseInt(vendorId),
                newCost: newCost
            })
        });

        if (response.ok) {
            parent.style.borderColor = '#10b981';
            setTimeout(() => parent.style.borderColor = '#dcfce7', 2000);
            
            if (activeHighlightVendorId) {
                refreshRowHighlight(cell.closest('.bid-row'));
            }
        } else {
            throw new Error('Failed to update price');
        }
    } catch (error) {
        console.error('Update error:', error);
        parent.style.borderColor = '#ef4444';
        showToast('Failed to save price: ' + error.message, 'error');
    }
}

function refreshRowHighlight(row) {
    row.classList.remove('best-cost-row');
    if (!activeHighlightVendorId) return;

    const cells = Array.from(row.querySelectorAll('.vendor-cost-cell'));
    const validCosts = cells
        .map(c => parseFloat(c.dataset.cost))
        .filter(cost => cost > 0);

    if (validCosts.length === 0) return;

    const minCost = Math.min(...validCosts);
    const targetCell = cells.find(c => parseInt(c.dataset.vendorId) === activeHighlightVendorId);
    if (!targetCell) return;
    
    const vendorCost = parseFloat(targetCell.dataset.cost);

    if (vendorCost > 0 && vendorCost === minCost) {
        row.classList.add('best-cost-row');
    }
}

// --- PDF Export Logic ---
function generateVendorPDF(vendorId) {
    if (!currentBidData) return;

    const vendor = currentBidData.vendors.find(v => v.id === vendorId);
    if (!vendor) return;

    const { header, lines } = currentBidData;

    // 1. Identify "Best Cost" items for this vendor
    const bestItems = lines.filter(line => {
        const vendorPrice = line.prices.find(p => p.vendorId === vendorId);
        if (!vendorPrice || vendorPrice.cost <= 0) return false;

        const validCosts = line.prices
            .map(p => p.cost)
            .filter(c => c > 0);
        
        const minCost = Math.min(...validCosts);
        return vendorPrice.cost === minCost;
    });

    if (bestItems.length === 0) {
        showToast('No best-cost items found for this vendor.', 'info');
        return;
    }

    const creationDate = new Date(header.createdDate).toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric'
    });

    // 2. Build HTML Template for PDF
    const rowsHtml = bestItems.map(line => {
        const vendorPrice = line.prices.find(p => p.vendorId === vendorId);
        return `
            <tr>
                <td class="col-sku">${line.navSku}</td>
                <td class="col-desc">${line.description || 'N/A'}</td>
                <td class="col-qty">${line.quantity}</td>
                <td class="col-cost">${vendorPrice.cost.toFixed(2)}</td>
            </tr>
        `;
    }).join('');

    const template = `
        <div class="pdf-report-wrapper">
            <div class="pdf-header">
                <div>
                    <h1 class="pdf-title">Best Cost Comparison</h1>
                    <p style="font-size: 10px; color: #64748b; margin-top: 5px;">Generated on: ${new Date().toLocaleString()}</p>
                </div>
                <div style="text-align: right;">
                    <div style="background: #4f46e5; color: white; padding: 5px 12px; border-radius: 6px; font-weight: 700; font-size: 14px;">
                        ${header.bidNo}
                    </div>
                </div>
            </div>

            <div class="pdf-info-grid">
                <div class="info-col">
                    <h4>Vendor Details</h4>
                    <p>${vendor.displayName || vendor.vendorName}</p>
                    <p style="font-size: 11px; color: #64748b; font-weight: 400;">NAV Ref: ${vendor.navReferCode || 'N/A'}</p>
                </div>
                <div class="info-col" style="text-align: right;">
                    <h4>Bid Information</h4>
                    <p>Bid No: ${header.bidNo}</p>
                    <p style="font-size: 11px; color: #64748b; font-weight: 400;">Created: ${creationDate}</p>
                </div>
            </div>

            <table class="pdf-table">
                <thead>
                    <tr>
                        <th style="width: 15%;">SKU</th>
                        <th style="width: 55%;">Description (Arabic/English)</th>
                        <th style="width: 10%; text-align: center;">Qty</th>
                        <th style="width: 20%; text-align: right;">Cost (Riyal)</th>
                    </tr>
                </thead>
                <tbody>
                    ${rowsHtml}
                </tbody>
            </table>

            <div class="pdf-footer">
                <p>This report contains items where <b>${vendor.displayName}</b> provides the lowest price.</p>
                <p style="margin-top: 10px;">Confidential - ERP System Generated Report</p>
            </div>
        </div>
    `;

    // 3. Render and Export using html2pdf
    const container = document.getElementById('pdf-template-container');
    container.innerHTML = template;
    container.style.display = 'block'; // Temporarily show for capture

    const opt = {
        margin: 0,
        filename: `BestCost_${vendor.displayName.replace(/\s+/g, '_')}_${header.bidNo}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(container).save().then(() => {
        container.style.display = 'none';
        container.innerHTML = '';
        showToast('PDF Report generated successfully!', 'success');
    });
}

// --- Excel Export Logic for Full Bid ---
function exportBidToExcel() {
    if (typeof XLSX === 'undefined') {
        showToast('Excel export library (SheetJS) is not loaded. Please verify your internet connection.', 'error');
        console.error('SheetJS (XLSX) library is undefined.');
        return;
    }

    if (!currentBidData || !currentBidData.lines || currentBidData.lines.length === 0) {
        showToast('No bid lines available to export.', 'warning');
        return;
    }

    const { header, lines, distributions } = currentBidData;
    const selectedVendorIds = (header.selectedVendorIds || "")
        .split(',')
        .map(id => parseInt(id.trim()))
        .filter(id => !isNaN(id));
    const vendors = currentBidData.vendors.filter(v => selectedVendorIds.includes(v.id));

    // Build the sheet data array
    const sheetData = [];

    // Identify unique locations in distributions
    const dists = distributions || [];
    const uniqueLocations = [...new Set(dists.map(d => d.location || 'N/A').filter(loc => loc))].sort();

    // Header row
    const headers = ['SKU/Code', 'Description', 'UOM', 'Quantity', ...uniqueLocations];
    vendors.forEach(v => {
        const name = v.displayName || v.vendorName;
        headers.push(`${name} (Unit Cost)`);
        headers.push(`${name} (Total Cost)`);
    });
    headers.push('Lowest Cost');
    headers.push('Lowest Bidder');
    sheetData.push(headers);

    // Data rows
    lines.forEach(line => {
        const row = [
            line.navSku,
            line.description || 'N/A',
            line.uom,
            line.quantity
        ];

        // Add location-wise quantities
        const distsForLine = dists.filter(d => d.navSku === line.navSku);
        uniqueLocations.forEach(loc => {
            const match = distsForLine.find(d => (d.location || 'N/A') === loc);
            row.push(match ? match.qty : 0);
        });

        // Find row element in DOM to read live values
        const rowEl = document.querySelector(`#bid-lines-body tr[data-line-id="${line.id}"]`);

        let minCost = Infinity;
        let minVendor = 'N/A';

        vendors.forEach(v => {
            let cost = 0;
            if (rowEl) {
                const cellEl = rowEl.querySelector(`.vendor-cost-cell[data-vendor-id="${v.id}"]`);
                if (cellEl) {
                    const inputEl = cellEl.querySelector('input[type="number"]');
                    if (inputEl) {
                        cost = parseFloat(inputEl.value) || 0;
                    }
                }
            } else {
                // Fallback to memory
                const priceObj = line.prices.find(p => p.vendorId === v.id);
                cost = priceObj ? priceObj.cost : 0;
            }

            const total = cost * line.quantity;
            row.push(cost);
            row.push(total);

            if (cost > 0 && cost < minCost) {
                minCost = cost;
                minVendor = v.displayName || v.vendorName;
            }
        });

        if (minCost === Infinity) {
            row.push(0);
            row.push('N/A');
        } else {
            row.push(minCost);
            row.push(minVendor);
        }

        sheetData.push(row);
    });

    // Create Excel Workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(sheetData);

    // Apply auto-column width
    const colWidths = headers.map((h, i) => {
        let maxLen = h.length;
        sheetData.forEach(row => {
            const val = row[i];
            if (val !== null && val !== undefined) {
                const len = val.toString().length;
                if (len > maxLen) maxLen = len;
            }
        });
        return { wch: maxLen + 3 };
    });
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, 'Bid Comparison');

    // Trigger download
    const filename = `Bid_Comparison_${header.bidNo}.xlsx`;
    XLSX.writeFile(wb, filename);
    showToast('Excel report downloaded successfully!', 'success');
}

// --- PDF Export Logic for Full Bid ---
function exportBidToPDF() {
    if (typeof html2pdf === 'undefined') {
        showToast('PDF generation library (html2pdf) is not loaded. Please verify your internet connection.', 'error');
        console.error('html2pdf library is undefined.');
        return;
    }

    if (!currentBidData || !currentBidData.lines || currentBidData.lines.length === 0) {
        showToast('No bid lines available to export.', 'warning');
        return;
    }

    const { header, lines, distributions } = currentBidData;
    const selectedVendorIds = (header.selectedVendorIds || "")
        .split(',')
        .map(id => parseInt(id.trim()))
        .filter(id => !isNaN(id));
    const vendors = currentBidData.vendors.filter(v => selectedVendorIds.includes(v.id));
    const creationDate = new Date(header.createdDate).toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric'
    });

    // Generate table headers
    const vendorHeadersHtml = vendors.map(v => `
        <th style="text-align: right; width: 12%;">${v.displayName || v.vendorName}<br/><span style="font-size: 8px; font-weight: normal; color: #64748b;">Cost / Total</span></th>
    `).join('');

    // Generate table rows
    const rowsHtml = lines.map(line => {
        // Find row element in DOM to read live values
        const rowEl = document.querySelector(`#bid-lines-body tr[data-line-id="${line.id}"]`);

        // Find best cost for this line from DOM inputs
        let minCost = Infinity;
        const vendorCosts = vendors.map(v => {
            let cost = 0;
            if (rowEl) {
                const cellEl = rowEl.querySelector(`.vendor-cost-cell[data-vendor-id="${v.id}"]`);
                if (cellEl) {
                    const inputEl = cellEl.querySelector('input[type="number"]');
                    if (inputEl) {
                        cost = parseFloat(inputEl.value) || 0;
                    }
                }
            } else {
                const priceObj = line.prices.find(p => p.vendorId === v.id);
                cost = priceObj ? priceObj.cost : 0;
            }

            if (cost > 0 && cost < minCost) {
                minCost = cost;
            }
            return { vendorId: v.id, cost: cost };
        });

        if (minCost === Infinity) minCost = 0;

        const vendorCellsHtml = vendors.map(v => {
            const costObj = vendorCosts.find(vc => vc.vendorId === v.id);
            const cost = costObj ? costObj.cost : 0;
            const total = cost * line.quantity;

            const isBest = cost > 0 && cost === minCost;
            const highlightClass = isBest ? 'class="pdf-comp-best-cost"' : '';

            return `
                <td ${highlightClass} style="text-align: right;">
                    ${cost > 0 ? `${cost.toFixed(2)}<br/><span style="font-size: 9px; color: #64748b;">${total.toFixed(2)}</span>` : '<span style="color: #cbd5e1;">-</span>'}
                </td>
            `;
        }).join('');

        return `
            <tr>
                <td style="font-weight: 700; color: #4f46e5;">${line.navSku}</td>
                <td>${line.description || 'N/A'}</td>
                <td style="text-align: center;">${line.uom}</td>
                <td style="text-align: center; font-weight: 500;">${line.quantity}</td>
                ${vendorCellsHtml}
            </tr>
        `;
    }).join('');

    // Group distributions by Location for Location-wise tables
    const dists = distributions || [];
    const groupedByLocation = {};
    dists.forEach(d => {
        const loc = d.location || 'N/A';
        if (!groupedByLocation[loc]) {
            groupedByLocation[loc] = [];
        }
        groupedByLocation[loc].push(d);
    });

    const locationsHtml = Object.keys(groupedByLocation).map(loc => {
        const locRows = groupedByLocation[loc].map(d => {
            const itemLine = lines.find(l => l.navSku === d.navSku);
            const desc = itemLine ? (itemLine.description || 'N/A') : 'N/A';
            return `
                <tr>
                    <td style="font-weight: 700; color: #4f46e5;">${d.navSku}</td>
                    <td>${desc}</td>
                    <td style="text-align: center; font-weight: 600;">${d.qty}</td>
                    <td style="font-size: 11px; color: #64748b;">${d.navDocNo || 'N/A'}</td>
                </tr>
            `;
        }).join('');

        return `
            <div style="page-break-inside: avoid; margin-top: 30px;">
                <h3 style="font-size: 13px; font-weight: 700; color: #1e293b; margin-bottom: 8px; font-family: 'Outfit', sans-serif; display: flex; align-items: center; gap: 6px; border-bottom: 1.5px solid #cbd5e1; padding-bottom: 4px;">
                    <i class="ri-store-2-line" style="color: #059669; margin-right: 4px;"></i> Location / Store: ${loc}
                </h3>
                <table class="pdf-comp-table">
                    <thead>
                        <tr>
                            <th style="width: 15%;">SKU</th>
                            <th style="width: 50%;">Description</th>
                            <th style="width: 15%; text-align: center;">Qty</th>
                            <th style="width: 20%;">Source Documents</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${locRows}
                    </tbody>
                </table>
            </div>
        `;
    }).join('');

    const template = `
        <div class="pdf-comp-wrapper">
            <div class="pdf-comp-header">
                <div>
                    <h1 class="pdf-comp-title">Bid Comparison Matrix</h1>
                    <p class="pdf-comp-meta">Generated: ${new Date().toLocaleString()}</p>
                </div>
                <div style="background: #059669; color: white; padding: 6px 15px; border-radius: 6px; font-weight: 700; font-size: 14px;">
                    Reference: ${header.bidNo}
                </div>
            </div>

            <div class="pdf-comp-info">
                <div>
                    <p><b>Bid Number:</b> ${header.bidNo}</p>
                    <p><b>Created Date:</b> ${creationDate}</p>
                </div>
                <div style="text-align: right;">
                    <p><b>Source Documents:</b> ${header.navDocNo || 'N/A'}</p>
                    <p><b>Total Items:</b> ${lines.length}</p>
                </div>
            </div>

            <table class="pdf-comp-table">
                <thead>
                    <tr>
                        <th style="width: 10%;">SKU</th>
                        <th style="width: 30%;">Description</th>
                        <th style="width: 8%; text-align: center;">UOM</th>
                        <th style="width: 8%; text-align: center;">Qty</th>
                        ${vendorHeadersHtml}
                    </tr>
                </thead>
                <tbody>
                    ${rowsHtml}
                </tbody>
            </table>

            <div style="margin-top: 40px; page-break-before: auto;">
                <h2 style="font-size: 16px; font-weight: 700; color: #0f172a; font-family: 'Outfit', sans-serif; border-bottom: 2.5px solid #4f46e5; padding-bottom: 6px; margin-bottom: 15px;">
                    Location-wise Bid Item Distribution
                </h2>
                ${locationsHtml || '<p style="color: #64748b; font-style: italic;">No item distribution details available.</p>'}
            </div>

            <div class="pdf-footer" style="margin-top: 40px;">
                <p>Highlighted cells indicate the lowest cost option for the respective SKU.</p>
                <p style="margin-top: 8px;">Confidential - DynamicsAltx Procurement Report</p>
            </div>
        </div>
    `;

    // Render using html2pdf
    const container = document.getElementById('pdf-template-container');
    container.innerHTML = template;
    container.style.display = 'block';

    const opt = {
        margin: 0.25,
        filename: `Bid_Comparison_${header.bidNo}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'landscape' }
    };

    html2pdf().set(opt).from(container).save().then(() => {
        container.style.display = 'none';
        container.innerHTML = '';
        showToast('PDF Comparison Report generated successfully!', 'success');
    });
}
