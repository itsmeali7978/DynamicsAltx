// Daily KPI Module Logic

let allKpiRecords = [];

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
    } else if (type === 'thisYear') {
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear(), 11, 31);
    }

    if (start && end) {
        document.getElementById('fromDate').value = formatDateIso(start);
        document.getElementById('toDate').value = formatDateIso(end);
        loadDailyKpi();
    }
}

function formatDateIso(d) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

async function loadDailyKpi() {
    const fromDateVal = document.getElementById('fromDate').value;
    const toDateVal = document.getElementById('toDate').value;
    const tableBody = document.getElementById('tableBody');
    const recordCount = document.getElementById('recordCount');

    if (!fromDateVal || !toDateVal) {
        tableBody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 2rem;">Please select both From Date and To Date.</td></tr>`;
        return;
    }

    tableBody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 2rem;"><i class="ri-loader-4-line spin"></i> Loading Daily KPI data...</td></tr>`;

    try {
        const url = `/api/DailyKpi?fromDate=${encodeURIComponent(fromDateVal)}&toDate=${encodeURIComponent(toDateVal)}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to load Daily KPI metrics');

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

        allKpiRecords = data.items || [];

        const filterInput = document.getElementById('filterDateStr');
        if (filterInput && filterInput.value.trim()) {
            onFilterInput(filterInput.value);
        } else {
            renderGrid(allKpiRecords);
        }
    } catch (err) {
        console.error(err);
        tableBody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #ef4444; padding: 2rem;">Failed to load KPI data. ${err.message}</td></tr>`;
        recordCount.textContent = '0 Days';
    }
}

function onFilterInput(filterVal) {
    const cleanFilter = filterVal.trim().toLowerCase();

    if (!cleanFilter) {
        renderGrid(allKpiRecords);
        return;
    }

    const filtered = allKpiRecords.filter(item => {
        return (item.date || '').toLowerCase().includes(cleanFilter);
    });

    renderGrid(filtered);
}

function renderGrid(records) {
    const tableBody = document.getElementById('tableBody');
    const recordCount = document.getElementById('recordCount');

    recordCount.textContent = `${records.length} Day${records.length === 1 ? '' : 's'}`;

    if (records.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 2rem;">No KPI data available for the selected period.</td></tr>`;
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
