document.getElementById('vendor-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = document.getElementById('submit-btn');
    const btnText = submitBtn.querySelector('span');
    const btnIcon = submitBtn.querySelector('i');
    const originalText = btnText.innerText;
    const originalIcon = btnIcon.className;

    // Loading State
    submitBtn.disabled = true;
    btnText.innerText = 'Creating...';
    btnIcon.className = 'ri-refresh-line ri-spin';

    const payload = {
        vendorName: document.getElementById('vendorName').value,
        displayName: document.getElementById('displayName').value,
        navReferCode: document.getElementById('navReferCode').value,
        email: document.getElementById('email').value,
        mobileNo: document.getElementById('mobileNo').value
    };

    try {
        const response = await fetch('/api/VendorSubs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (response.ok) {
            // Success State
            btnText.innerText = 'Success!';
            btnIcon.className = 'ri-check-line';
            submitBtn.style.backgroundColor = 'var(--success)';
            
            showToast('Vendor created successfully!', 'success');

            // Clear form
            document.getElementById('vendor-form').reset();

            // Refresh Grid
            await fetchVendors();

            setTimeout(() => {
                submitBtn.disabled = false;
                btnText.innerText = originalText;
                btnIcon.className = originalIcon;
                submitBtn.style.backgroundColor = '';
            }, 2000);
        } else {
            throw new Error(data.message || 'Failed to create vendor');
        }
    } catch (error) {
        // Error State
        btnText.innerText = 'Error';
        btnIcon.className = 'ri-error-warning-line';
        submitBtn.style.backgroundColor = 'var(--error)';
        
        showToast(error.message, 'error');

        setTimeout(() => {
            submitBtn.disabled = false;
            btnText.innerText = originalText;
            btnIcon.className = originalIcon;
            submitBtn.style.backgroundColor = '';
        }, 3000);
    }
});

// Vendor Grid Logic
async function fetchVendors() {
    const gridBody = document.getElementById('vendor-grid-body');
    const emptyState = document.getElementById('grid-empty-state');
    
    try {
        const response = await fetch('/api/VendorSubs');
        const vendors = await response.json();

        renderVendorGrid(vendors);
    } catch (error) {
        console.error('Error fetching vendors:', error);
        showToast('Failed to load vendors', 'error');
    }
}

function renderVendorGrid(vendors) {
    const gridBody = document.getElementById('vendor-grid-body');
    const emptyState = document.getElementById('grid-empty-state');
    
    gridBody.innerHTML = '';
    
    if (vendors.length === 0) {
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';
    
    vendors.forEach(vendor => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><span class="badge">#${vendor.id}</span></td>
            <td style="font-weight: 500;">${vendor.vendorName}</td>
            <td>${vendor.displayName}</td>
            <td><code>${vendor.navReferCode}</code></td>
            <td>${vendor.email}</td>
            <td>${vendor.mobileNo}</td>
            <td>
                <button class="btn-delete" onclick="handleDeleteVendor(${vendor.id}, '${vendor.displayName.replace(/'/g, "\\'")}')"> 
                    <i class="ri-delete-bin-line"></i> Delete
                </button>
            </td>
        `;
        gridBody.appendChild(row);
    });
}

// --- Dynamic Delete Logic ---
async function handleDeleteVendor(vendorId, vendorName) {
    const confirmed = await showConfirm(
        `Are you sure you want to delete ${vendorName}? This will also remove all bidding prices related to this vendor.`,
        'Confirm Deletion'
    );

    if (!confirmed) return;

    try {
        const response = await fetch(`/api/VendorSubs/${vendorId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            showToast(`${vendorName} deleted successfully`, 'success');
            await fetchVendors();
        } else {
            const data = await response.json();
            showToast(data.message || 'Could not delete vendor', 'error');
        }
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// Search Logic
document.getElementById('vendor-search').addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const rows = document.querySelectorAll('#vendor-grid-body tr');
    let hasResults = false;

    rows.forEach(row => {
        const text = row.innerText.toLowerCase();
        if (text.includes(term)) {
            row.style.display = '';
            hasResults = true;
        } else {
            row.style.display = 'none';
        }
    });

    document.getElementById('grid-empty-state').style.display = hasResults ? 'none' : 'block';
});

// Initial Load
document.addEventListener('DOMContentLoaded', async () => {
    // Fetch vendors for the grid
    await fetchVendors();
});
