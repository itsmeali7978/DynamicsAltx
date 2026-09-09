// Item KPI Module Logic

let allItemKpiRecords = [];

document.addEventListener('DOMContentLoaded', () => {
    // Set default date period to current month (1st to last day)
    setPreset('thisMonth');
});

function setPreset(type) {
    const now = new Date();
    let start, end;

    if (type === 'thisMonth') {
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else if (type === 'lastMonth') {
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0);
    }

    if (start && end) {
        document.getElementById('fromDate').value = formatDateIso(start);
        document.getElementById('toDate').value = formatDateIso(end);
        loadItemKpi();
    }
}

function formatDateIso(d) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

async function loadItemKpi() {
    const fromDateVal = document.getElementById('fromDate').value;
    const toDateVal = document.getElementById('toDate').value;
    const itemNoVal = document.getElementById('itemNoFilter') ? document.getElementById('itemNoFilter').value.trim() : '';
    const tableBody = document.getElementById('tableBody');
    const recordCount = document.getElementById('recordCount');

    if (!fromDateVal || !toDateVal) {
        alert('Please select both From Date and To Date.');
        tableBody.innerHTML = `<tr><td colspan="11" style="text-align: center; padding: 2rem;">Please select both From Date and To Date.</td></tr>`;
        return;
    }

    const start = new Date(fromDateVal + 'T00:00:00');
    const end = new Date(toDateVal + 'T00:00:00');

    if (end < start) {
        alert('To Date cannot be earlier than From Date.');
        tableBody.innerHTML = `<tr><td colspan="11" style="text-align: center; color: #ef4444; padding: 2rem;">To Date cannot be earlier than From Date.</td></tr>`;
        return;
    }

    // Restrict date range to maximum 2 months
    const maxAllowedEnd = new Date(start);
    maxAllowedEnd.setMonth(maxAllowedEnd.getMonth() + 2);

    if (end > maxAllowedEnd) {
        alert('Date range cannot exceed 2 months. Please select a date period within 2 months.');
        tableBody.innerHTML = `<tr><td colspan="11" style="text-align: center; color: #ef4444; padding: 2rem;">Date range cannot exceed 2 months. Please select a date period within 2 months.</td></tr>`;
        return;
    }

    tableBody.innerHTML = `<tr><td colspan="11" style="text-align: center; padding: 2rem;"><i class="ri-loader-4-line spin"></i> Loading Item KPI data...</td></tr>`;

    try {
        let url = `/api/ItemKpi?fromDate=${encodeURIComponent(fromDateVal)}&toDate=${encodeURIComponent(toDateVal)}`;
        if (itemNoVal) {
            url += `&itemNo=${encodeURIComponent(itemNoVal)}`;
        }

        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to load Item KPI metrics');

        const data = await res.json();

        // Update Summary Cards
        document.getElementById('kpiSalesQty').textContent = data.totalSalesQty.toLocaleString();
        document.getElementById('kpiNetSales').textContent = data.totalNetSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        document.getElementById('kpiProducedQty').textContent = data.totalProducedQty.toLocaleString();
        document.getElementById('kpiExpiredQty').textContent = data.totalExpiredQty.toLocaleString();
        document.getElementById('kpiWastePct').textContent = `${data.averageWastePercent.toFixed(2)}%`;
        document.getElementById('kpiSellThroughPct').textContent = `${data.averageSellThroughPercent.toFixed(2)}%`;

        const balanceEl = document.getElementById('kpiProdBalance');
        balanceEl.textContent = data.totalProductionBalance.toLocaleString();
        if (data.totalProductionBalance < 0) {
            balanceEl.style.color = '#dc2626';
        } else if (data.totalProductionBalance > 0) {
            balanceEl.style.color = '#059669';
        } else {
            balanceEl.style.color = '#6b7280';
        }

        allItemKpiRecords = data.items || [];

        const filterInput = document.getElementById('filterQuery');
        if (filterInput && filterInput.value.trim()) {
            onFilterInput(filterInput.value);
        } else {
            renderGrid(allItemKpiRecords);
        }
    } catch (err) {
        console.error(err);
        tableBody.innerHTML = `<tr><td colspan="11" style="text-align: center; color: #ef4444; padding: 2rem;">Failed to load KPI data. ${err.message}</td></tr>`;
        recordCount.textContent = '0 Records';
    }
}

function onFilterInput(filterVal) {
    const cleanFilter = (filterVal || '').trim().toLowerCase();
    const hideZeros = document.getElementById('hideZerosCheckbox') ? document.getElementById('hideZerosCheckbox').checked : false;

    let filtered = allItemKpiRecords;

    if (hideZeros) {
        filtered = filtered.filter(item => item.salesQty !== 0 || item.netSales !== 0 || item.producedQty !== 0 || item.expiredQty !== 0);
    }

    if (cleanFilter) {
        filtered = filtered.filter(item => {
            const itemNoStr = item.itemNo ? item.itemNo.toString() : '';
            const descEng = (item.descEng || '').toLowerCase();
            const descAra = (item.descAra || '').toLowerCase();
            const dateStr = (item.date || '').toLowerCase();

            return itemNoStr.includes(cleanFilter) || descEng.includes(cleanFilter) || descAra.includes(cleanFilter) || dateStr.includes(cleanFilter);
        });
    }

    renderGrid(filtered);
}

function renderGrid(records) {
    const tableBody = document.getElementById('tableBody');
    const recordCount = document.getElementById('recordCount');

    recordCount.textContent = `${records.length} Record${records.length === 1 ? '' : 's'}`;

    if (records.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="11" style="text-align: center; color: var(--text-muted); padding: 2rem;">No Item KPI data available for the selected criteria.</td></tr>`;
        return;
    }

    tableBody.innerHTML = records.map(item => {
        const formattedDate = new Date(item.date).toLocaleDateString('en-GB'); // DD/MM/YYYY
        const wasteColor = item.wastePercent > 10 ? '#dc2626' : (item.wastePercent > 5 ? '#d97706' : '#059669');
        const sellThroughColor = item.sellThroughPercent >= 80 ? '#059669' : (item.sellThroughPercent >= 50 ? '#d97706' : '#dc2626');
        const balanceColor = item.productionBalance < 0 ? '#dc2626' : (item.productionBalance > 0 ? '#059669' : 'var(--text-main)');

        return `
            <tr>
                <td class="col-date"><strong>${formattedDate}</strong></td>
                <td class="col-itemno"><code>${item.itemNo}</code></td>
                <td class="col-desc-ara">${item.descAra || '-'}</td>
                <td class="col-desc-eng">${item.descEng || '-'}</td>
                <td class="col-num"><span style="font-weight: 600;">${item.salesQty.toLocaleString()}</span></td>
                <td class="col-num"><span style="font-weight: 600; color: var(--primary);">${item.netSales.toFixed(2)}</span></td>
                <td class="col-num">${item.producedQty.toLocaleString()}</td>
                <td class="col-num"><span style="color: ${item.expiredQty > 0 ? '#dc2626' : 'inherit'};">${item.expiredQty.toLocaleString()}</span></td>
                <td class="col-pct"><span style="font-weight: 600; color: ${wasteColor};">${item.wastePercent.toFixed(2)}%</span></td>
                <td class="col-pct"><span style="font-weight: 600; color: ${sellThroughColor};">${item.sellThroughPercent.toFixed(2)}%</span></td>
                <td class="col-num"><span style="font-weight: 600; color: ${balanceColor};">${item.productionBalance.toLocaleString()}</span></td>
            </tr>
        `;
    }).join('');
}
