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
    let selectedBarcode = null;
    const userEmail = localStorage.getItem('userEmail');
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

    const fetchPrice = async (itemNo, uom) => {
        try {
            const response = await fetch(`${API_BASE}/price?itemNo=${encodeURIComponent(itemNo)}&uom=${encodeURIComponent(uom)}&userEmail=${encodeURIComponent(userEmail)}`);
            if (!response.ok) return 0;
            const data = await safeParseJson(response);
            return data.price || 0;
        } catch (error) {
            console.error('[BarcodePrint] Price Fetch Error:', error);
            return 0;
        }
    };

    // 4. UI Update Functions
    const updateBarcodeGrid = (barcodes) => {
        if (!barcodes || barcodes.length === 0 || !Array.isArray(barcodes)) {
            itemGridBody.innerHTML = `<tr><td colspan="3" class="text-center" style="padding: 1rem; color: var(--text-muted);">No barcodes linked to this UOM</td></tr>`;
            selectedBarcode = null;
            return;
        }

        // Set default selected barcode to first item
        selectedBarcode = barcodes[0]?.barcode || null;

        itemGridBody.innerHTML = barcodes.map((bc, idx) => `
            <tr class="barcode-row ${idx === 0 ? 'selected-row' : ''}" data-barcode="${bc.barcode}" style="cursor: pointer;">
                <td style="text-align: center;">
                    <input type="radio" name="barcode-radio-selection" value="${bc.barcode}" ${idx === 0 ? 'checked' : ''} style="cursor: pointer; accent-color: var(--primary);">
                </td>
                <td><strong>${bc.itemNo}</strong></td>
                <td><code style="font-family: monospace; font-size: 0.95rem;">${bc.barcode}</code></td>
            </tr>
        `).join('');

        // Attach click listener for barcode row selection
        const rows = itemGridBody.querySelectorAll('.barcode-row');
        rows.forEach(row => {
            row.addEventListener('click', (e) => {
                const radio = row.querySelector('input[type="radio"]');
                if (radio) radio.checked = true;

                rows.forEach(r => r.classList.remove('selected-row'));
                row.classList.add('selected-row');

                selectedBarcode = row.dataset.barcode;
                console.log('[BarcodePrint] Selected Barcode:', selectedBarcode);
            });
        });
    };

    const populateUOMs = (uoms, defaultUom) => {
        if (!uoms || !Array.isArray(uoms)) return;
        uomSelect.innerHTML = uoms.map(u => `
            <option value="${u}" ${u === defaultUom ? 'selected' : ''}>${u}</option>
        `).join('');
    };

    const riyalIconSvg = `<svg class="riyal-symbol-icon" viewBox="0 0 1124.14 1256.39" style="width: 0.85em; height: 0.95em; vertical-align: -0.1em; fill: currentColor; margin-right: 0.25rem;"><path d="M699.62,1113.02h0c-20.06,44.48-33.32,92.75-38.4,143.37l424.51-90.24c20.06-44.47,33.31-92.75,38.4-143.37l-424.51,90.24Z"/><path d="M1085.73,895.8c20.06-44.47,33.32-92.75,38.4-143.37l-330.68,70.33v-135.2l292.27-62.11c20.06-44.47,33.32-92.75,38.4-143.37l-330.68,70.27V66.13c-50.67,28.45-95.67,66.32-132.25,110.99v403.35l-132.25,28.11V0c-50.67,28.44-95.67,66.32-132.25,110.99v525.69l-295.91,62.88c-20.06,44.47-33.33,92.75-38.42,143.37l334.33-71.05v170.26l-358.3,76.14c-20.06,44.47-33.32,92.75-38.4,143.37l375.04-79.7c30.53-6.35,56.77-24.4,73.83-49.24l68.78-101.97v-.02c7.14-10.55,11.3-23.27,11.3-36.97v-149.98l132.25-28.11v270.4l424.53-90.28Z"/></svg>`;

    const updateRegularPriceDisplay = (price) => {
        const val = Number(price) || 0;
        regPriceEl.innerHTML = `${riyalIconSvg}${val.toFixed(2)}`;
    };

    const clearUI = () => {
        itemGridBody.innerHTML = `<tr><td colspan="3" class="text-center" style="padding: 2rem; color: var(--text-muted);">Enter SKU to see barcodes</td></tr>`;
        descArInput.value = '';
        descEnInput.value = '';
        regPriceEl.innerHTML = `${riyalIconSvg}0.00`;
        offerPriceEl.innerHTML = `${riyalIconSvg}0.00`;
        uomSelect.innerHTML = '<option value="">Select UOM</option>';
        currentItemNo = null;
        selectedBarcode = null;
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

        // Display Regular Price (from lookup response)
        updateRegularPriceDisplay(item.regularPrice);

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
            const selectedUom = uomSelect.value;
            const [barcodes, price] = await Promise.all([
                fetchBarcodes(currentItemNo, selectedUom),
                fetchPrice(currentItemNo, selectedUom)
            ]);
            updateBarcodeGrid(barcodes);
            updateRegularPriceDisplay(price);
        }
    });

    itemLabelBtn.addEventListener('click', () => {
        if (!currentItemNo) {
            window.showToast?.('Please select an item first', 'error');
            return;
        }
        if (!selectedBarcode) {
            window.showToast?.('Please select a barcode from the list', 'warning');
            return;
        }
        window.showToast?.(`Printing Item Labels for ${currentItemNo} (Barcode: ${selectedBarcode}, Qty: ${qtyInput.value})`, 'info');
    });

    // Fallback browser window print function when local print agent is inactive (8cm x 3.5cm single page, no borders)
    const printViaBrowserWindow = (itemNo, barcode, desc, uom, price, qty, printerName) => {
        const printWindow = window.open('', '_blank', 'width=650,height=400');
        if (!printWindow) {
            window.showToast?.('Pop-up blocked! Please allow pop-ups for barcode label printing.', 'error');
            return;
        }

        const riyalSvg = `<svg class="riyal-symbol-icon" viewBox="0 0 1124.14 1256.39" style="width: 0.85em; height: 0.95em; vertical-align: -0.05em; fill: currentColor;"><path d="M699.62,1113.02h0c-20.06,44.48-33.32,92.75-38.4,143.37l424.51-90.24c20.06-44.47,33.31-92.75,38.4-143.37l-424.51,90.24Z"/><path d="M1085.73,895.8c20.06-44.47,33.32-92.75,38.4-143.37l-330.68,70.33v-135.2l292.27-62.11c20.06-44.47,33.32-92.75,38.4-143.37l-330.68,70.27V66.13c-50.67,28.45-95.67,66.32-132.25,110.99v403.35l-132.25,28.11V0c-50.67,28.44-95.67,66.32-132.25,110.99v525.69l-295.91,62.88c-20.06,44.47-33.33,92.75-38.42,143.37l334.33-71.05v170.26l-358.3,76.14c-20.06,44.47-33.32,92.75-38.4,143.37l375.04-79.7c30.53-6.35,56.77-24.4,73.83-49.24l68.78-101.97v-.02c7.14-10.55,11.3-23.27,11.3-36.97v-149.98l132.25-28.11v270.4l424.53-90.28Z"/></svg>`;

        const safeItemNo = itemNo || currentItemNo || '';
        const safeUom = uom || uomSelect.value || '';
        const safeDesc = desc || descArInput.value || descEnInput.value || safeItemNo;
        const safePrice = parseFloat(price || regPriceEl.innerText.replace(/[^0-9.]/g, '') || 0).toFixed(2);
        const printQty = parseInt(qty) || 1;

        let labelsArray = [];
        for (let i = 0; i < printQty; i++) {
            labelsArray.push(`<div class="shelf-label"><div class="company-name">HouseCare</div><div class="item-price">${riyalSvg}<span>${safePrice}</span></div><div class="item-name">${safeDesc}</div><div class="bottom-row"><span class="item-no">${safeItemNo}</span><span class="item-uom">(${safeUom})</span></div></div>`);
        }
        const labelsHtml = labelsArray.join('');

        printWindow.document.write(`<!DOCTYPE html><html><head><title></title><style>@page{size:80mm 35mm;margin:0 !important;}*{box-sizing:border-box;margin:0;padding:0;-webkit-font-smoothing:none !important;font-smooth:never !important;text-rendering:geometricPrecision !important;-webkit-text-stroke:0.3px #000000 !important;}html,body{width:80mm;height:35mm;margin:0 !important;padding:0 !important;overflow:hidden !important;font-family:Arial,Helvetica,sans-serif;background:#fff;color:#000000 !important;-webkit-print-color-adjust:exact;print-color-adjust:exact;filter:contrast(300%) grayscale(100%) !important;}body{font-size:0;}.shelf-label{width:80mm;height:33.5mm;padding:1mm 3mm;display:flex;flex-direction:column;justify-content:space-between;align-items:center;text-align:center;box-sizing:border-box;border:none;overflow:hidden;page-break-inside:avoid;break-inside:avoid;}.shelf-label:not(:last-child){page-break-after:always;break-after:page;}.company-name{font-weight:900;font-size:16px;color:#000;line-height:1;letter-spacing:0.5px;margin:0;}.item-price{font-weight:900;font-size:36px;color:#000;line-height:1;margin:0.5mm 0;display:flex;align-items:center;justify-content:center;gap:3px;}.item-name{font-weight:900;font-size:22px;line-height:1.15;color:#000;max-height:8.5mm;overflow:hidden;word-break:break-word;margin:0;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;}.bottom-row{width:100%;display:flex;justify-content:space-between;align-items:center;font-weight:900;font-size:12px;color:#000;border:none;margin:0;padding-top:0.5mm;}.item-no{font-weight:900;font-size:12px;text-align:left;}.item-uom{font-weight:900;font-size:12px;text-align:right;}@media print{html,body{width:80mm !important;height:35mm !important;margin:0 !important;padding:0 !important;overflow:hidden !important;filter:contrast(300%) grayscale(100%) !important;}.shelf-label{height:33.5mm !important;page-break-inside:avoid !important;break-inside:avoid !important;}.shelf-label:last-child{page-break-after:avoid !important;break-after:avoid !important;}}</style><script>window.onload=function(){setTimeout(function(){window.print();window.close();},250);};</script></head><body>${labelsHtml}</body></html>`);
        printWindow.document.close();
    };

    // Helper function to print directly via Zebra Browser Print on client's local PC
    const tryLocalZebraBrowserPrint = async (zplData, targetPrinterName) => {
        const endpoints = [
            'http://127.0.0.1:9100',
            'http://localhost:9100',
            'https://localhost:9101'
        ];

        for (const base of endpoints) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 1200);

                const defaultRes = await fetch(`${base}/default`, {
                    method: 'GET',
                    signal: controller.signal
                });
                clearTimeout(timeoutId);

                if (defaultRes.ok) {
                    const printerInfo = await defaultRes.json();
                    const activePrinterName = printerInfo.name || targetPrinterName;

                    const writeRes = await fetch(`${base}/write`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'text/plain' },
                        body: JSON.stringify({
                            device: { name: activePrinterName },
                            data: zplData
                        })
                    });

                    if (writeRes.ok) {
                        return { success: true, printerName: activePrinterName };
                    }
                }
            } catch (err) {
                // Local Zebra Browser Print not reachable on this endpoint
            }
        }
        return { success: false };
    };

    shelfLabelBtn.addEventListener('click', async () => {
        if (!currentItemNo) {
            window.showToast?.('Please select an item first', 'warning');
            return;
        }
        if (!selectedBarcode) {
            window.showToast?.('Please select a barcode from the list', 'warning');
            return;
        }

        const qty = parseInt(qtyInput.value) || 1;
        const currentPriceText = regPriceEl.innerText.replace(/[^0-9.]/g, '');
        const currentPrice = parseFloat(currentPriceText) || 0;

        const originalBtnText = shelfLabelBtn.innerHTML;
        shelfLabelBtn.disabled = true;
        shelfLabelBtn.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Printing...';

        try {
            const itemDesc = descArInput.value || descEnInput.value || currentItemNo;
            const zplPayload = `^XA
^PW640
^LL280
^CI28
^FO20,8^A0N,48,50^FB600,1,0,C^FDHouseCare^FS
^FO20,50^A0N,100,112^FB600,1,0,C^FDSAR ${currentPrice.toFixed(2)}^FS
^FO20,140^A0N,44,46^FB600,2,0,C^FD${itemDesc}^FS
^FO20,230^A0N,38,38^FD${currentItemNo}^FS
^FO460,230^A0N,38,38^FD(${uomSelect.value})^FS
^PQ${qty}
^XZ`;

            const payload = {
                itemNo: currentItemNo,
                barcode: selectedBarcode,
                uom: uomSelect.value,
                descAr: descArInput.value,
                descEn: descEnInput.value,
                price: currentPrice,
                qty: qty
            };

            const response = await fetch(`${API_BASE}/print-shelf-label?userEmail=${encodeURIComponent(userEmail)}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await safeParseJson(response);

            if (response.ok) {
                if (result.clientPrint) {
                    const printMethod = result.printMethod || 'Zebra Command';
                    console.log(`[BarcodePrint] Mode: '${printMethod}', Printer: '${result.printerName}'`);

                    if (printMethod === 'Report Printing') {
                        // Report Printing Mode: Direct browser report window (like Crystal Reports)
                        window.showToast?.(`Opening report print window for '${result.printerName}'...`, 'info');
                        printViaBrowserWindow(
                            result.itemNo || currentItemNo,
                            result.barcode || selectedBarcode,
                            result.desc || itemDesc,
                            result.uom || uomSelect.value,
                            result.price || currentPrice,
                            result.qty || qty,
                            result.printerName || 'Printer'
                        );
                    } else {
                        // Zebra Command Mode: Direct ZPL payload via Zebra agent with browser fallback
                        const localResult = await tryLocalZebraBrowserPrint(result.zpl || zplPayload, result.printerName);

                        if (localResult.success) {
                            window.showToast?.(`Successfully printed ${qty} label(s) to '${localResult.printerName}'`, 'success');
                        } else {
                            window.showToast?.(`Opening print dialog for '${result.printerName}'...`, 'info');
                            printViaBrowserWindow(
                                result.itemNo || currentItemNo,
                                result.barcode || selectedBarcode,
                                result.desc || itemDesc,
                                result.uom || uomSelect.value,
                                result.price || currentPrice,
                                result.qty || qty,
                                result.printerName || 'Printer'
                            );
                        }
                    }
                } else {
                    window.showToast?.(result.message || 'Shelf Label printed successfully', 'success');
                }
            } else {
                window.showToast?.(result.message || 'Printer not configured on this machine', 'error');
            }
        } catch (err) {
            console.error('[BarcodePrint] Print error:', err);
            window.showToast?.(`Print Error: ${err.message}`, 'error');
        } finally {
            shelfLabelBtn.disabled = false;
            shelfLabelBtn.innerHTML = originalBtnText;
        }
    });

    console.log('[DynamicsAltx] Barcode Printing System Initialized');
});
