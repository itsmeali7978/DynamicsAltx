/**
 * DynamicsAltx - Printer Configuration Management Script
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Elements Selection
    const form = document.getElementById('printer-config-form');
    const settingIdInput = document.getElementById('setting-id');
    const printTypeSelect = document.getElementById('print-type');
    const printLocationSelect = document.getElementById('print-location');
    const printPrinterSelect = document.getElementById('print-printer-name');
    const printPrinterCustomInput = document.getElementById('print-printer-custom');
    const printMethodSelect = document.getElementById('print-method');
    const toggleCustomBtn = document.getElementById('toggle-custom-printer-btn');
    const saveBtn = document.getElementById('save-btn');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    const formCardTitle = document.getElementById('form-card-title');
    const tbody = document.getElementById('printer-settings-tbody');
    const recordCountBadge = document.getElementById('record-count-badge');
    const refreshPrintersBtn = document.getElementById('refresh-printers-btn');

    const API_BASE = '/api/PrinterSettings';
    let installedPrintersList = [];
    let isCustomPrinterMode = false;
    let currentSettingsData = [];

    // Helper for safe API JSON response parsing
    const safeFetchJson = async (url, options = {}) => {
        const res = await fetch(url, options);
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            return { ok: res.ok, status: res.status, data: await res.json() };
        } else {
            return { ok: res.ok, status: res.status, data: { message: `HTTP ${res.status}` } };
        }
    };

    // 2. Fetch Available Locations
    const loadLocations = async () => {
        try {
            const { ok, data } = await safeFetchJson(`${API_BASE}/locations`);
            if (ok && Array.isArray(data)) {
                printLocationSelect.innerHTML = '<option value="">-- Select Location --</option>' +
                    data.map(loc => `<option value="${loc.locationCode}">${loc.locationCode} - ${loc.locationName || ''}</option>`).join('');
            } else {
                printLocationSelect.innerHTML = '<option value="">Failed to load locations</option>';
            }
        } catch (err) {
            console.error('[PrinterConfig] Error loading locations:', err);
            printLocationSelect.innerHTML = '<option value="">Error loading locations</option>';
        }
    };

    // 3. Fetch Installed Printers on Local Client PC
    const fetchClientLocalPrinters = async () => {
        const localPrinters = [];
        const endpoints = [
            'http://127.0.0.1:9100/available',
            'http://localhost:9100/available',
            'https://localhost:9101/available'
        ];

        for (const url of endpoints) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 1200);

                const res = await fetch(url, { method: 'GET', signal: controller.signal });
                clearTimeout(timeoutId);

                if (res.ok) {
                    const data = await res.json();
                    if (data && Array.isArray(data.printer)) {
                        data.printer.forEach(p => {
                            if (p && p.name && !localPrinters.includes(p.name)) {
                                localPrinters.push(p.name);
                            }
                        });
                    } else if (data && data.name && !localPrinters.includes(data.name)) {
                        localPrinters.push(data.name);
                    }
                }
            } catch (e) {
                // Client local service not responding on this endpoint
            }
        }
        return localPrinters;
    };

    const loadInstalledPrinters = async () => {
        try {
            printPrinterSelect.innerHTML = '<option value="">-- Scanning Local PC Printers... --</option>';
            const hintElem = document.getElementById('printer-scan-hint');
            if (hintElem) {
                hintElem.style.color = 'var(--text-muted)';
                hintElem.textContent = 'Scanning printers connected to this computer...';
            }

            // Scan client local PC endpoints (e.g. Zebra/Thermal print agent running on port 9100 of this PC)
            const clientPrinters = await fetchClientLocalPrinters();
            installedPrintersList = clientPrinters || [];

            console.log('[PrinterConfig] Real local printers detected for this PC:', installedPrintersList);

            if (installedPrintersList.length > 0) {
                if (hintElem) {
                    hintElem.style.color = '#15803d'; // Green
                    hintElem.textContent = `✓ Detected ${installedPrintersList.length} local printer(s) on this computer.`;
                }
                disableCustomPrinterMode();
            } else {
                if (hintElem) {
                    hintElem.style.color = '#4b5563'; // Neutral gray
                    hintElem.textContent = 'No local print agent auto-detected. Please enter the exact printer driver name installed on this computer below.';
                }
                enableCustomPrinterMode();
            }

            renderPrinterDropdown();
        } catch (err) {
            console.error('[PrinterConfig] Error scanning local PC printers:', err);
            installedPrintersList = [];
            enableCustomPrinterMode();
            renderPrinterDropdown();
        }
    };

    const renderPrinterDropdown = (selectedVal = "") => {
        let options = '<option value="">-- Select Installed Printer --</option>';
        if (installedPrintersList.length > 0) {
            options += installedPrintersList.map(prt =>
                `<option value="${prt}" ${prt === selectedVal ? 'selected' : ''}>${prt}</option>`
            ).join('');
        }
        options += '<option value="__custom__">➕ Type custom printer name manually...</option>';
        printPrinterSelect.innerHTML = options;

        if (selectedVal && !installedPrintersList.includes(selectedVal) && selectedVal !== '__custom__') {
            enableCustomPrinterMode(selectedVal);
        }
    };

    const enableCustomPrinterMode = (customVal = "") => {
        isCustomPrinterMode = true;
        printPrinterCustomInput.style.display = 'block';
        printPrinterSelect.style.display = 'none';
        if (customVal) printPrinterCustomInput.value = customVal;
        toggleCustomBtn.innerHTML = '<i class="ri-list-check"></i> Choose from List';
    };

    const disableCustomPrinterMode = () => {
        isCustomPrinterMode = false;
        printPrinterCustomInput.style.display = 'none';
        printPrinterSelect.style.display = 'block';
        toggleCustomBtn.innerHTML = '<i class="ri-edit-line"></i> Enter Manually';
    };

    // Dropdown selection change handler
    printPrinterSelect.addEventListener('change', (e) => {
        if (e.target.value === '__custom__') {
            enableCustomPrinterMode();
            printPrinterCustomInput.focus();
        }
    });

    // Toggle Custom Printer Input Mode
    toggleCustomBtn.addEventListener('click', () => {
        if (isCustomPrinterMode) {
            disableCustomPrinterMode();
        } else {
            enableCustomPrinterMode();
            printPrinterCustomInput.focus();
        }
    });

    refreshPrintersBtn.addEventListener('click', async () => {
        window.showToast?.('Refreshing installed printers...', 'info');
        await loadInstalledPrinters();
        window.showToast?.('Installed printers refreshed', 'success');
    });

    // 4. Load Saved Printer Settings
    const loadPrinterSettings = async () => {
        try {
            const { ok, data } = await safeFetchJson(API_BASE);

            if (!ok || !Array.isArray(data)) {
                tbody.innerHTML = `<tr><td colspan="5" class="text-center" style="padding: 2rem; color: var(--text-muted);">Failed to load settings</td></tr>`;
                recordCountBadge.textContent = '0 Records';
                return;
            }

            currentSettingsData = data;
            recordCountBadge.textContent = `${data.length} Record(s)`;

            if (data.length === 0) {
                tbody.innerHTML = `<tr><td colspan="5" class="text-center" style="padding: 2rem; color: var(--text-muted);">No printer settings configured yet. Add one above.</td></tr>`;
                return;
            }

            tbody.innerHTML = data.map((item, idx) => {
                let badgeClass = 'type-normal';
                let typeIcon = 'ri-printer-line';

                if (item.type === 'Shelf Label') {
                    badgeClass = 'type-shelf';
                    typeIcon = 'ri-price-tag-3-line';
                } else if (item.type === 'Item Label') {
                    badgeClass = 'type-item';
                    typeIcon = 'ri-barcode-line';
                }

                const methodLabel = item.printMethod || 'Zebra Command';
                const methodBadgeClass = methodLabel === 'Report Printing' ? 'type-item' : 'type-shelf';

                return `
                    <tr>
                        <td><strong>${idx + 1}</strong></td>
                        <td>
                            <span class="badge-type ${badgeClass}">
                                <i class="${typeIcon} type-badge-icon"></i> ${item.type}
                            </span>
                        </td>
                        <td><code style="font-size: 0.95rem; font-weight: 600;">${item.location}</code></td>
                        <td><strong>${item.printerName}</strong></td>
                        <td>
                            <span class="badge-type ${methodBadgeClass}">
                                <i class="ri-settings-4-line type-badge-icon"></i> ${methodLabel}
                            </span>
                        </td>
                        <td style="text-align: center;">
                            <button class="icon-btn edit-btn" data-id="${item.id}" title="Edit Setting" style="color: var(--primary); margin-right: 0.5rem;">
                                <i class="ri-edit-line"></i>
                            </button>
                            <button class="icon-btn delete-btn" data-id="${item.id}" title="Delete Setting" style="color: var(--danger);">
                                <i class="ri-delete-bin-line"></i>
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');

            // Attach event listeners for edit and delete buttons
            tbody.querySelectorAll('.edit-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const id = parseInt(btn.dataset.id);
                    const setting = currentSettingsData.find(s => s.id === id);
                    if (setting) startEditSetting(setting);
                });
            });

            tbody.querySelectorAll('.delete-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const id = parseInt(btn.dataset.id);
                    deleteSetting(id);
                });
            });

        } catch (err) {
            console.error('[PrinterConfig] Error loading settings:', err);
            tbody.innerHTML = `<tr><td colspan="6" class="text-center" style="padding: 2rem; color: var(--text-muted);">Error loading settings</td></tr>`;
        }
    };

    // 5. Edit & Cancel Edit Handler
    const startEditSetting = (setting) => {
        settingIdInput.value = setting.id;
        printTypeSelect.value = setting.type;
        printLocationSelect.value = setting.location;
        printMethodSelect.value = setting.printMethod || 'Zebra Command';

        if (installedPrintersList.includes(setting.printerName)) {
            isCustomPrinterMode = false;
            printPrinterSelect.style.display = 'block';
            printPrinterCustomInput.style.display = 'none';
            printPrinterSelect.value = setting.printerName;
            toggleCustomBtn.innerHTML = '<i class="ri-edit-line"></i> Enter Manually';
        } else {
            isCustomPrinterMode = true;
            printPrinterSelect.style.display = 'none';
            printPrinterCustomInput.style.display = 'block';
            printPrinterCustomInput.value = setting.printerName;
            toggleCustomBtn.innerHTML = '<i class="ri-list-check"></i> Choose from List';
        }

        formCardTitle.innerHTML = `<i class="ri-edit-line"></i> Edit Printer Setting #${setting.id}`;
        saveBtn.innerHTML = '<i class="ri-save-line"></i> Update Configuration';
        cancelEditBtn.style.display = 'inline-flex';
        form.scrollIntoView({ behavior: 'smooth' });
    };

    const resetForm = () => {
        settingIdInput.value = '0';
        form.reset();
        printMethodSelect.value = 'Zebra Command';
        isCustomPrinterMode = false;
        printPrinterSelect.style.display = 'block';
        printPrinterCustomInput.style.display = 'none';
        toggleCustomBtn.innerHTML = '<i class="ri-edit-line"></i> Enter Manually';
        formCardTitle.innerHTML = '<i class="ri-add-line"></i> Add / Edit Printer Setting';
        saveBtn.innerHTML = '<i class="ri-save-line"></i> Save Configuration';
        cancelEditBtn.style.display = 'none';
    };

    cancelEditBtn.addEventListener('click', resetForm);

    // 6. Save (Create/Update) Form Submit
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const id = parseInt(settingIdInput.value) || 0;
        const type = printTypeSelect.value;
        const location = printLocationSelect.value;
        const printerName = isCustomPrinterMode ? printPrinterCustomInput.value.trim() : printPrinterSelect.value;
        const printMethod = printMethodSelect.value || 'Zebra Command';

        if (!type || !location || !printerName) {
            window.showToast?.('Please fill out Type, Location, and Printer Name.', 'warning');
            return;
        }

        const payload = { id, type, location, printerName, printMethod };

        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Saving...';

        try {
            const { ok, data } = await safeFetchJson(API_BASE, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (ok) {
                window.showToast?.(`Printer configuration saved successfully for ${location} (${type})`, 'success');
                resetForm();
                await loadPrinterSettings();
            } else {
                window.showToast?.(data.message || 'Failed to save printer setting', 'error');
            }
        } catch (err) {
            console.error('[PrinterConfig] Save error:', err);
            window.showToast?.(`Save Error: ${err.message}`, 'error');
        } finally {
            saveBtn.disabled = false;
        }
    });

    // 7. Delete Setting Handler
    const deleteSetting = async (id) => {
        if (!confirm(`Are you sure you want to delete printer setting #${id}?`)) return;

        try {
            const { ok, data } = await safeFetchJson(`${API_BASE}/${id}`, { method: 'DELETE' });
            if (ok) {
                window.showToast?.('Printer setting deleted successfully', 'success');
                await loadPrinterSettings();
            } else {
                window.showToast?.(data.message || 'Failed to delete printer setting', 'error');
            }
        } catch (err) {
            console.error('[PrinterConfig] Delete error:', err);
            window.showToast?.(`Delete Error: ${err.message}`, 'error');
        }
    };

    // Initialize Page
    loadLocations();
    loadInstalledPrinters();
    loadPrinterSettings();
});
