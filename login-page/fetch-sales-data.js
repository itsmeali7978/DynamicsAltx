// Fetch Sales Data Module Logic

let allFetchedRecords = [];

document.addEventListener('DOMContentLoaded', () => {
    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    const fromDateInput = document.getElementById('fromDate');
    const toDateInput = document.getElementById('toDate');
    if (fromDateInput) fromDateInput.value = today;
    if (toDateInput) toDateInput.value = today;

    // Load initial sales data for today
    loadSalesData();
});

async function handleFetchSalesData() {
    const fromDateVal = document.getElementById('fromDate') ? document.getElementById('fromDate').value : '';
    const toDateVal = document.getElementById('toDate') ? document.getElementById('toDate').value : '';
    const fetchItemNoVal = document.getElementById('fetchItemNo') ? document.getElementById('fetchItemNo').value.trim() : '';
    const btnFetchSales = document.getElementById('btnFetchSales');
    const alertMsg = document.getElementById('alertMsg');

    if (alertMsg) alertMsg.style.display = 'none';

    if (!fromDateVal || !toDateVal) {
        showAlert('Please select both From Date and To Date.', 'error');
        return;
    }

    const start = new Date(fromDateVal + 'T00:00:00');
    const end = new Date(toDateVal + 'T00:00:00');

    if (end < start) {
        showAlert('To Date cannot be earlier than From Date.', 'error');
        return;
    }

    // Restrict fetching period to maximum 4 days
    const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 3600 * 24));
    if (diffDays > 3) {
        alert('Date period cannot exceed 4 days. Please select a period of 4 days or less.');
        showAlert('Date period cannot exceed 4 days. Please select a period of 4 days or less.', 'error');
        return;
    }

    const currentUser = localStorage.getItem('username') || 'Admin User';

    try {
        btnFetchSales.disabled = true;
        btnFetchSales.innerHTML = '<i class="ri-loader-4-line spin"></i> Fetching...';

        const res = await fetch('/api/FetchSalesData/fetch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fromDate: fromDateVal,
                toDate: toDateVal,
                itemNo: fetchItemNoVal || null,
                fetchedBy: currentUser
            })
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.message || 'Failed to fetch sales data from Navision.');
        }

        showAlert(data.message || `Successfully fetched sales data!`, 'success');
        await loadSalesData();
    } catch (err) {
        console.error(err);
        showAlert(err.message, 'error');
    } finally {
        btnFetchSales.disabled = false;
        btnFetchSales.innerHTML = '<i class="ri-refresh-line"></i> Fetch Sales';
    }
}

async function loadSalesData() {
    const fromDateVal = document.getElementById('fromDate') ? document.getElementById('fromDate').value : '';
    const toDateVal = document.getElementById('toDate') ? document.getElementById('toDate').value : '';
    const fetchItemNoVal = document.getElementById('fetchItemNo') ? document.getElementById('fetchItemNo').value.trim() : '';
    const tableBody = document.getElementById('tableBody');
    const recordCount = document.getElementById('recordCount');
    const sumTotalQty = document.getElementById('sumTotalQty');
    const sumTotalNet = document.getElementById('sumTotalNet');

    if (!fromDateVal || !toDateVal) {
        tableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 2rem;">Please select both From Date and To Date.</td></tr>`;
        if (recordCount) recordCount.textContent = '0 Records';
        if (sumTotalQty) sumTotalQty.textContent = '0';
        if (sumTotalNet) sumTotalNet.textContent = '0.00';
        return;
    }

    const start = new Date(fromDateVal + 'T00:00:00');
    const end = new Date(toDateVal + 'T00:00:00');

    if (end < start) {
        tableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #ef4444; padding: 2rem;">To Date cannot be earlier than From Date.</td></tr>`;
        return;
    }

    const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 3600 * 24));
    if (diffDays > 3) {
        tableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #ef4444; padding: 2rem;">Date period cannot exceed 4 days. Please select a period of 4 days or less.</td></tr>`;
        return;
    }

    tableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 2rem;"><i class="ri-loader-4-line spin"></i> Loading sales data...</td></tr>`;

    try {
        let url = `/api/FetchSalesData?fromDate=${encodeURIComponent(fromDateVal)}&toDate=${encodeURIComponent(toDateVal)}`;
        if (fetchItemNoVal) {
            url += `&itemNo=${encodeURIComponent(fetchItemNoVal)}`;
        }

        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to load sales data');

        allFetchedRecords = await res.json();

        const filterInput = document.getElementById('filterItemNo');
        if (filterInput && filterInput.value.trim()) {
            onFilterInput(filterInput.value);
        } else {
            renderGrid(allFetchedRecords);
        }
    } catch (err) {
        console.error(err);
        tableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #ef4444; padding: 2rem;">Failed to load data. ${err.message}</td></tr>`;
        if (recordCount) recordCount.textContent = '0 Records';
        if (sumTotalQty) sumTotalQty.textContent = '0';
        if (sumTotalNet) sumTotalNet.textContent = '0.00';
    }
}

function onFilterInput(filterVal) {
    const cleanFilter = filterVal.trim().toLowerCase();

    if (!cleanFilter) {
        renderGrid(allFetchedRecords);
        return;
    }

    const filtered = allFetchedRecords.filter(item => {
        const itemNoStr = item.itemNo ? item.itemNo.toString() : '';
        const descEng = (item.descEng || '').toLowerCase();
        const descAra = (item.descAra || '').toLowerCase();

        return itemNoStr.includes(cleanFilter) || descEng.includes(cleanFilter) || descAra.includes(cleanFilter);
    });

    renderGrid(filtered);
}

function renderGrid(records) {
    const tableBody = document.getElementById('tableBody');
    const recordCount = document.getElementById('recordCount');
    const sumTotalQty = document.getElementById('sumTotalQty');
    const sumTotalNet = document.getElementById('sumTotalNet');

    recordCount.textContent = `${records.length} Record${records.length === 1 ? '' : 's'}`;

    let totalQty = 0;
    let totalNet = 0;

    records.forEach(r => {
        totalQty += (r.qty || 0);
        totalNet += (r.netAmount || 0);
    });

    if (sumTotalQty) sumTotalQty.textContent = totalQty.toLocaleString();
    if (sumTotalNet) sumTotalNet.textContent = totalNet.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    if (records.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 2rem;">No sales data available for the specified criteria.</td></tr>`;
        return;
    }

    tableBody.innerHTML = records.map(item => {
        const formattedDate = new Date(item.salesDate).toLocaleDateString('en-GB'); // DD/MM/YYYY
        const qtyColor = item.qty < 0 ? '#dc2626' : '#059669';
        const netAmtColor = item.netAmount < 0 ? '#dc2626' : '#059669';

        return `
            <tr>
                <td class="col-date"><strong>${formattedDate}</strong></td>
                <td class="col-itemno"><code>${item.itemNo}</code></td>
                <td class="col-desc-ara">${item.descAra || '-'}</td>
                <td class="col-desc-eng">${item.descEng || '-'}</td>
                <td class="col-qty"><span style="font-weight: 600; color: ${qtyColor};">${item.qty}</span></td>
                <td class="col-price">${item.price.toFixed(2)}</td>
                <td class="col-netamt"><span style="font-weight: 600; color: ${netAmtColor};">${item.netAmount.toFixed(2)}</span></td>
            </tr>
        `;
    }).join('');
}

function showAlert(message, type) {
    const alertMsg = document.getElementById('alertMsg');
    alertMsg.className = `alert-msg ${type}`;
    alertMsg.innerHTML = `<i class="${type === 'success' ? 'ri-checkbox-circle-fill' : 'ri-error-warning-fill'}"></i> ${message}`;
    alertMsg.style.display = 'flex';

    setTimeout(() => {
        alertMsg.style.display = 'none';
    }, 4000);
}
