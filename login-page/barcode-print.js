/**
 * DynamicsAltx - Barcode Printing Logic (Integrated with Navision API)
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Elements Selection
    const skuInput = document.getElementById('sku-barcode');
    const uomSelect = document.getElementById('uom');
    const qtyInput = document.getElementById('qty');
    const itemGridBody = document.getElementById('item-grid-body');
    const descArInput = document.getElementById('desc-ar');
    const descEnInput = document.getElementById('desc-en');
    const regPriceEl = document.getElementById('reg-price');
    const offerPriceEl = document.getElementById('offer-price');
    const itemLabelBtn = document.getElementById('item-label-btn');
    const shelfLabelBtn = document.getElementById('shelf-label-btn');

    // 2. State Management
    let currentItemNo = null;
    const userEmail = localStorage.getItem('userEmail') || 'admin@example.com';
    const API_BASE = '/api/Barcode';

    // Helper to safely parse JSON or return generic error
    const safeParseJson = async (response) => {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
            return await response.json();
        } else {
            // Not JSON (could be 404 HTML or empty)
            return { message: `Server Error (${response.status})` };
        }
    };

    // 3. API Functions
    const fetchItemData = async (input) => {
        try {
            console.log(`[BarcodePrint] Fetching item data for: ${input}`);
            const response = await fetch(`${API_BASE}/lookup?input=${encodeURIComponent(input)}&userEmail=${encodeURIComponent(userEmail)}`);
            
            if (!response.ok) {
                const error = await safeParseJson(response);
                throw new Error(error.message || 'Item not found');
            }

            return await safeParseJson(response);
        } catch (error) {
            console.error('[BarcodePrint] Lookup Error:', error);
            window.showToast?.(error.message, 'warning');
            return null;
        }
    };

    const fetchBarcodes = async (itemNo, uom) => {
        try {
            const response = await fetch(`${API_BASE}/barcodes?itemNo=${encodeURIComponent(itemNo)}&uom=${encodeURIComponent(uom)}&userEmail=${encodeURIComponent(userEmail)}`);
            if (!response.ok) throw new Error('Failed to fetch barcodes');
            return await safeParseJson(response);
        } catch (error) {
            console.error('[BarcodePrint] Barcode Fetch Error:', error);
            return [];
        }
    };

    // 4. UI Update Functions
    const updateBarcodeGrid = (barcodes) => {
        if (!barcodes || barcodes.length === 0 || !Array.isArray(barcodes)) {
            itemGridBody.innerHTML = `<tr><td colspan="2" class="text-center" style="padding: 1rem; color: var(--text-muted);">No barcodes linked to this UOM</td></tr>`;
            return;
        }

        itemGridBody.innerHTML = barcodes.map(bc => `
            <tr class="animate-in">
                <td>${bc.itemNo}</td>
                <td>${bc.barcode}</td>
            </tr>
        `).join('');
    };

    const populateUOMs = (uoms, defaultUom) => {
        if (!uoms || !Array.isArray(uoms)) return;
        uomSelect.innerHTML = uoms.map(u => `
            <option value="${u}" ${u === defaultUom ? 'selected' : ''}>${u}</option>
        `).join('');
    };

    const clearUI = () => {
        itemGridBody.innerHTML = `<tr><td colspan="2" class="text-center" style="padding: 2rem; color: var(--text-muted);">Enter SKU to see barcodes</td></tr>`;
        descArInput.value = '';
        descEnInput.value = '';
        regPriceEl.innerText = 'SR 0.00';
        offerPriceEl.innerText = 'SR 0.00';
        uomSelect.innerHTML = '<option value="">Select UOM</option>';
        currentItemNo = null;
    };

    // 5. Main Lookup Handler
    const handleLookup = async (input) => {
        const item = await fetchItemData(input);
        
        if (!item || !item.itemNo) {
            clearUI();
            return;
        }

        currentItemNo = item.itemNo;
        
        // Update Descriptions
        descArInput.value = item.descriptionArabic || '';
        descEnInput.value = item.descriptionEnglish || '';

        // Populate UOMs
        populateUOMs(item.unitsOfMeasure, item.defaultUom);

        // Fetch and Update Barcode Grid for initial UOM
        const barcodes = await fetchBarcodes(item.itemNo, item.defaultUom);
        updateBarcodeGrid(barcodes);

        window.showToast?.('Item loaded successfully', 'success');
    };

    // 6. Event Listeners
    skuInput.addEventListener('keypress', async (e) => {
        if (e.key === 'Enter') {
            const input = skuInput.value.trim();
            if (input) {
                await handleLookup(input);
            }
        }
    });

    uomSelect.addEventListener('change', async () => {
        if (currentItemNo) {
            const barcodes = await fetchBarcodes(currentItemNo, uomSelect.value);
            updateBarcodeGrid(barcodes);
        }
    });

    itemLabelBtn.addEventListener('click', () => {
        if (!currentItemNo) {
            window.showToast?.('Please select an item first', 'error');
            return;
        }
        window.showToast?.(`Printing Item Labels for ${currentItemNo} (Qty: ${qtyInput.value})`, 'info');
    });

    shelfLabelBtn.addEventListener('click', () => {
        if (!currentItemNo) {
            window.showToast?.('Please select an item first', 'error');
            return;
        }
        window.showToast?.(`Printing Shelf Label for ${currentItemNo}`, 'info');
    });

    console.log('[DynamicsAltx] Barcode Printing System Initialized (Live NAV Integration)');
});
