document.addEventListener('DOMContentLoaded', () => {
    loadVouchers();

    // Event listener for date filter
    const dateInput = document.getElementById('filter-date');
    if (dateInput) {
        dateInput.addEventListener('change', loadVouchers);
    }

    // Event listener for location filter
    const locationInput = document.getElementById('filter-location');
    if (locationInput) {
        locationInput.addEventListener('change', loadVouchers);
    }

    // Event listener for check status button
    const checkStatusBtn = document.getElementById('check-status-btn');
    if (checkStatusBtn) {
        checkStatusBtn.addEventListener('click', checkVoucherStatus);
    }

    // Event listener for clear date button
    const clearDateBtn = document.getElementById('clear-date-btn');
    if (clearDateBtn) {
        clearDateBtn.addEventListener('click', () => {
            if (dateInput) {
                dateInput.value = '';
            }
            loadVouchers();
        });
    }

    // Event listener for clear location button
    const clearLocationBtn = document.getElementById('clear-location-btn');
    if (clearLocationBtn) {
        clearLocationBtn.addEventListener('click', () => {
            if (locationInput) {
                locationInput.value = '';
            }
            loadVouchers();
        });
    }
});

async function loadVouchers() {
    const tableBody = document.getElementById('vouchers-table-body');
    if (!tableBody) return;

    tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Loading...</td></tr>';

    const filterDate = document.getElementById('filter-date')?.value || '';
    const filterLocation = document.getElementById('filter-location')?.value.trim() || '';

    const params = new URLSearchParams();
    if (filterDate) params.append('date', filterDate);
    if (filterLocation) params.append('location', filterLocation);

    const queryString = params.toString();
    const url = `/api/Voucher/list${queryString ? '?' + queryString : ''}`;

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch vouchers');
        
        const vouchers = await response.json();

        if (vouchers.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; color: var(--text-muted);">No entries found.</td></tr>';
            return;
        }

        tableBody.innerHTML = vouchers.map(v => `
            <tr>
                <td><strong>${v.voucherNo}</strong></td>
                <td>${formatDate(v.transDate)}</td>
                <td>${formatDate(v.createdDate)}</td>
                <td>${v.createdUser || '-'}</td>
                <td>${v.transLocation || '-'}</td>
            </tr>
        `).join('');

    } catch (err) {
        console.error('Error loading vouchers:', err);
        tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; color: var(--danger);">Error loading data.</td></tr>';
        showToast('Failed to load voucher entries', 'error');
    }
}

async function checkVoucherStatus() {
    const voucherInput = document.getElementById('voucher-input');
    const msgContainer = document.getElementById('message-container');
    const voucherNo = voucherInput.value.trim();

    if (!voucherNo) {
        showMessage('Please enter a voucher number to check.', 'warning');
        return;
    }

    const btn = document.getElementById('check-status-btn');
    btn.disabled = true;
    btn.innerHTML = '<i class="ri-loader-4-line ri-spin"></i><span>Checking...</span>';

    try {
        const response = await fetch(`/api/Voucher/fetch/${voucherNo}`);
        const data = await response.json();

        // 400 response from backend usually means it's already in the ERP
        if (response.status === 400 && data.message && data.message.includes('already been updated')) {
            showMessage(data.message, 'success');
        } 
        // 200 response means it's in Navision but not in ERP yet
        else if (response.ok) {
            showMessage(`Voucher ${voucherNo} exists in Navision but has NOT been entered yet.`, 'warning');
        } 
        // 404 or other errors
        else {
            showMessage(data.message || `Voucher ${voucherNo} not found.`, 'error');
        }

    } catch (err) {
        console.error('Error checking voucher status:', err);
        showMessage('Network error while checking status.', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="ri-search-eye-line"></i><span>Check Status</span>';
    }
}

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString();
}

function showMessage(msg, type) {
    const msgContainer = document.getElementById('message-container');
    if (!msgContainer) return;
    
    msgContainer.className = `info-message ${type}`;
    
    let icon = 'ri-information-fill';
    if (type === 'error') icon = 'ri-error-warning-fill';
    if (type === 'success') icon = 'ri-checkbox-circle-fill';
    if (type === 'warning') icon = 'ri-alert-fill';

    msgContainer.innerHTML = `<i class="${icon}"></i> <span>${msg}</span>`;
    msgContainer.style.display = 'flex';

    // Auto hide after 5 seconds
    setTimeout(() => {
        msgContainer.style.display = 'none';
    }, 5000);
}
