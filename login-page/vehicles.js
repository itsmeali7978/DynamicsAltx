/**
 * DynamicsAltx - Vehicles & Expense Tracking
 * Connected to Navision [House Care Live$Dimension Value] WHERE [Dimension Code] = 'VEHICLE'
 */

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const vehiclesTableBody = document.getElementById('vehiclesTableBody');
    const filterSearch = document.getElementById('filterSearch');
    const filterStatus = document.getElementById('filterStatus');
    const btnRefresh = document.getElementById('btnRefresh');

    // Metrics Elements
    const metricTotalVehicles = document.getElementById('metricTotalVehicles');
    const metricActiveVehicles = document.getElementById('metricActiveVehicles');
    const metricTotalExpense = document.getElementById('metricTotalExpense');
    const metricFilteredVehicles = document.getElementById('metricFilteredVehicles');
    const gridBadgeCount = document.getElementById('gridBadgeCount');
    const footCount = document.getElementById('footCount');
    const footTotalExpense = document.getElementById('footTotalExpense');

    // Lightbox Modal
    const lightboxModal = document.getElementById('lightboxModal');
    const lightboxImg = document.getElementById('lightboxImg');
    const lightboxVehicleCode = document.getElementById('lightboxVehicleCode');
    const lightboxVehicleName = document.getElementById('lightboxVehicleName');
    const btnCloseLightbox = document.getElementById('btnCloseLightbox');
    const btnCloseLightbox2 = document.getElementById('btnCloseLightbox2');

    // State
    let allVehicles = [];

    // Load initial data
    loadVehicles();

    // Event Listeners
    if (filterSearch) {
        filterSearch.addEventListener('input', debounce(renderFilteredGrid, 150));
    }
    if (filterStatus) {
        filterStatus.addEventListener('change', renderFilteredGrid);
    }
    if (btnRefresh) {
        btnRefresh.addEventListener('click', () => {
            btnRefresh.classList.add('spinning');
            loadVehicles().finally(() => {
                btnRefresh.classList.remove('spinning');
            });
        });
    }

    if (btnCloseLightbox) btnCloseLightbox.addEventListener('click', closeLightbox);
    if (btnCloseLightbox2) btnCloseLightbox2.addEventListener('click', closeLightbox);

    if (lightboxModal) {
        lightboxModal.addEventListener('click', (e) => {
            if (e.target === lightboxModal) {
                closeLightbox();
            }
        });
    }

    // 1. Fetch Vehicles from NAV API
    async function loadVehicles() {
        showLoadingState();

        try {
            const res = await fetch('/api/Vehicles');
            if (!res.ok) {
                throw new Error(`HTTP ${res.status}: Failed to load vehicles`);
            }

            const data = await res.json();
            if (!data.success) {
                throw new Error(data.message || 'Error fetching vehicles');
            }

            allVehicles = data.vehicles || [];

            // Render table grid
            renderFilteredGrid();

            // Update Metrics
            updateTopMetrics();

        } catch (err) {
            console.error('Error loading vehicles:', err);
            showErrorState(err.message);
        }
    }

    function showLoadingState() {
        vehiclesTableBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 2.5rem 1rem;">
                    <div style="display: flex; flex-direction: column; align-items: center; gap: 0.6rem; color: #64748b;">
                        <i class="ri-loader-4-line ri-spin" style="font-size: 2rem; color: #0284c7;"></i>
                        <span style="font-weight: 600; font-size: 0.85rem;">Fetching fleet records from Navision [Dimension Value]...</span>
                    </div>
                </td>
            </tr>
        `;
    }

    function showErrorState(msg) {
        vehiclesTableBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 2.5rem 1rem;">
                    <div class="empty-state">
                        <i class="ri-error-warning-line" style="color: #ef4444;"></i>
                        <p style="font-weight: 700; color: #0f172a; margin-bottom: 0.25rem;">Unable to load vehicles</p>
                        <p style="font-size: 0.8rem; color: #64748b;">${msg}</p>
                        <button class="btn-compact primary" style="margin-top: 0.75rem;" onclick="location.reload()">
                            <i class="ri-refresh-line"></i> Retry
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }

    function updateTopMetrics() {
        const total = allVehicles.length;
        const active = allVehicles.filter(v => v.blocked === 0).length;
        const grandTotalExpense = allVehicles.reduce((sum, v) => sum + (parseFloat(v.expenseAmount) || 0), 0);

        if (metricTotalVehicles) metricTotalVehicles.textContent = total;
        if (metricActiveVehicles) metricActiveVehicles.textContent = active;
        if (metricTotalExpense) {
            metricTotalExpense.textContent = grandTotalExpense.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' SAR';
        }
        if (footTotalExpense) {
            footTotalExpense.textContent = grandTotalExpense.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' SAR';
        }
    }

    // 2. Render Grid based on Filters
    function renderFilteredGrid() {
        const query = (filterSearch ? filterSearch.value : '').trim().toLowerCase();
        const statusVal = filterStatus ? filterStatus.value : '';

        let filtered = allVehicles.filter(v => {
            const matchesQuery = !query ||
                (v.code && v.code.toLowerCase().includes(query)) ||
                (v.name && v.name.toLowerCase().includes(query));

            let matchesStatus = true;
            if (statusVal === 'active') matchesStatus = v.blocked === 0;
            else if (statusVal === 'blocked') matchesStatus = v.blocked === 1;

            return matchesQuery && matchesStatus;
        });

        // Update counts
        if (metricFilteredVehicles) metricFilteredVehicles.textContent = filtered.length;
        if (gridBadgeCount) gridBadgeCount.textContent = `${filtered.length} vehicle(s)`;
        if (footCount) footCount.textContent = filtered.length;

        if (filtered.length === 0) {
            vehiclesTableBody.innerHTML = `
                <tr>
                    <td colspan="6">
                        <div class="empty-state">
                            <i class="ri-search-line"></i>
                            <p style="font-weight: 700; color: #0f172a; margin-bottom: 0.25rem;">No vehicles found</p>
                            <p style="font-size: 0.8rem;">Try clearing your search query or changing the status filter.</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        // Render rows immediately with images
        vehiclesTableBody.innerHTML = filtered.map((v, idx) => {
            const isBlocked = v.blocked === 1;
            const statusClass = isBlocked ? 'blocked' : 'active';
            const statusLabel = isBlocked ? 'Blocked' : 'Active';
            const expenseVal = parseFloat(v.expenseAmount) || 0;
            const expenseDisplay = v.expenseAmountDisplay || (expenseVal.toFixed(2) + ' SAR');
            const zeroClass = expenseVal === 0 ? 'zero' : '';
            const safeCode = escapeHtml(v.code);
            const safeName = escapeHtml(v.name);
            const imgUrl = v.imageUrl || '';

            return `
                <tr data-code="${safeCode}">
                    <td style="text-align: center; color: #64748b; font-size: 0.75rem;">${idx + 1}</td>
                    <td style="text-align: center; padding: 0.25rem 0.45rem;">
                        <div class="vehicle-img-box" title="Click to view full image" onclick="window.previewVehicleImage('${imgUrl}', '${safeCode}', '${safeName}')">
                            ${imgUrl ? `
                                <img src="${imgUrl}" loading="lazy" alt="${safeName}" class="loaded" onerror="this.parentElement.classList.add('blank'); this.remove();">
                            ` : `
                                <div class="vehicle-img-box blank">
                                    <i class="ri-image-line" title="No image available"></i>
                                </div>
                            `}
                        </div>
                    </td>
                    <td>
                        <span class="cell-code">${safeCode}</span>
                    </td>
                    <td>
                        <span class="cell-name">${safeName}</span>
                    </td>
                    <td>
                        <div class="cell-expense-pill ${zeroClass}">
                            <i class="ri-money-dollar-circle-line"></i>
                            <span>${expenseDisplay}</span>
                        </div>
                    </td>
                    <td style="text-align: center;">
                        <span class="badge-status ${statusClass}">
                            <i class="${isBlocked ? 'ri-close-circle-fill' : 'ri-checkbox-circle-fill'}"></i>
                            ${statusLabel}
                        </span>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // 3. Image Lightbox
    window.previewVehicleImage = function (imgUrl, code, name) {
        if (!lightboxModal || !imgUrl) return;
        lightboxImg.src = imgUrl;
        lightboxVehicleCode.textContent = code;
        lightboxVehicleName.textContent = name;
        lightboxModal.classList.add('active');
    };

    function closeLightbox() {
        if (lightboxModal) lightboxModal.classList.remove('active');
    }

    // Helpers
    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function debounce(func, wait) {
        let timeout;
        return function (...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }
});
