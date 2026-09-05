// Altx Items Sync Module Frontend Script

document.addEventListener('DOMContentLoaded', () => {
    loadLocalItems();

    const form = document.getElementById('item-sync-form');
    if (form) {
        form.addEventListener('submit', processItemSync);
    }
});

function resetForm() {
    document.getElementById('input-brand').value = '';
    document.getElementById('input-vendor-no').value = '';
    document.getElementById('input-prod-posting-group').value = '';
    document.getElementById('input-shelf-class').value = '';
    
    const resultMsg = document.getElementById('result-message');
    if (resultMsg) {
        resultMsg.style.display = 'none';
        resultMsg.className = 'result-bar';
    }
}

async function loadLocalItems() {
    const tbody = document.querySelector('#altx-items-table tbody');
    const badge = document.getElementById('items-count-badge');
    if (!tbody) return;

    try {
        const response = await fetch('/api/AltxItem');
        if (!response.ok) throw new Error('Failed to fetch local AltxItems');

        const items = await response.json();

        if (badge) {
            badge.textContent = `${items.length} Item(s)`;
        }

        if (items.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; color: var(--text-muted); padding: 2.5rem;">
                        <i class="ri-inbox-line" style="font-size: 2rem; display: block; margin-bottom: 0.5rem; color: #cbd5e1;"></i>
                        No items synchronized in local AltxItems table yet. Use the process form above to sync items from Navision.
                    </td>
                </tr>`;
            return;
        }

        tbody.innerHTML = items.map(item => `
            <tr>
                <td><strong>#${item.itemNo}</strong></td>
                <td>${item.descEng || '-'}</td>
                <td dir="rtl" style="text-align: right;">${item.descAra || '-'}</td>
                <td>${item.brand ? `<span class="badge" style="background:#f1f5f9; padding:0.2rem 0.5rem; border-radius:6px;">${item.brand}</span>` : '-'}</td>
                <td><code>${item.vendorNo || '-'}</code></td>
                <td>${item.shelfClass || '-'}</td>
                <td>${item.aLtxDivision || '-'}</td>
                <td>
                    <span class="status-pill ${item.status ? 'active' : 'inactive'}">
                        <i class="${item.status ? 'ri-checkbox-circle-line' : 'ri-close-circle-line'}"></i>
                        ${item.status ? 'Active' : 'Inactive'}
                    </span>
                </td>
            </tr>
        `).join('');
    } catch (err) {
        console.error('Error loading local AltxItems:', err);
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; color: #ef4444; padding: 2rem;">
                    Failed to load local items: ${err.message}
                </td>
            </tr>`;
    }
}

async function processItemSync(event) {
    event.preventDefault();

    const brand = document.getElementById('input-brand').value.trim();
    const vendorNo = document.getElementById('input-vendor-no').value.trim();
    const productPostingGroup = document.getElementById('input-prod-posting-group').value.trim();
    const shelfClass = document.getElementById('input-shelf-class').value.trim();

    const btnProcess = document.getElementById('btn-process');
    const resultMsg = document.getElementById('result-message');

    if (btnProcess) {
        btnProcess.classList.add('loading');
        btnProcess.disabled = true;
        btnProcess.querySelector('span').textContent = 'Processing...';
    }

    if (resultMsg) {
        resultMsg.style.display = 'none';
    }

    try {
        const payload = {
            brand,
            vendorNo,
            productPostingGroup,
            shelfClass
        };

        const response = await fetch('/api/AltxItem/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (response.ok) {
            if (resultMsg) {
                resultMsg.className = 'result-bar success';
                resultMsg.innerHTML = `<i class="ri-checkbox-circle-fill" style="font-size:1.25rem;"></i> <span>${data.message}</span>`;
                resultMsg.style.display = 'flex';
            }
            if (typeof showToast === 'function') {
                showToast(data.message, 'success');
            }
            loadLocalItems();
        } else {
            if (resultMsg) {
                resultMsg.className = 'result-bar error';
                resultMsg.innerHTML = `<i class="ri-error-warning-fill" style="font-size:1.25rem;"></i> <span>${data.message || 'Sync failed'}</span>`;
                resultMsg.style.display = 'flex';
            }
            if (typeof showToast === 'function') {
                showToast(data.message || 'Sync failed', 'error');
            }
        }
    } catch (err) {
        console.error('Error during item sync:', err);
        if (resultMsg) {
            resultMsg.className = 'result-bar error';
            resultMsg.innerHTML = `<i class="ri-error-warning-fill" style="font-size:1.25rem;"></i> <span>Network error: ${err.message}</span>`;
            resultMsg.style.display = 'flex';
        }
        if (typeof showToast === 'function') {
            showToast('Network error, failed to execute item sync', 'error');
        }
    } finally {
        if (btnProcess) {
            btnProcess.classList.remove('loading');
            btnProcess.disabled = false;
            btnProcess.querySelector('span').textContent = 'Process Sync';
        }
    }
}
