document.addEventListener('DOMContentLoaded', () => {
    // If we need custom user access checks for this page, they are handled by common.js profiles.
    
    const btnSearch = document.getElementById('btnSearch');
    const inputVendorNo = document.getElementById('vendorNo');
    const inputVatRegNo = document.getElementById('vatRegNo');
    const customerIdGroup = document.getElementById('customerIdGroup');
    const inputCustomerId = document.getElementById('customerId');
    const alertBox = document.getElementById('alertBox');
    
    const emptyState = document.getElementById('emptyState');
    const vendorDataArea = document.getElementById('vendorDataArea');
    const businessCard = document.getElementById('businessCard');
    const statusDashboard = document.getElementById('statusDashboard');

    // UI display elements
    const dispEnglishName = document.getElementById('dispEnglishName');
    const dispArabicName = document.getElementById('dispArabicName');
    const dispVendorNo = document.getElementById('dispVendorNo');
    const dispVatNo = document.getElementById('dispVatNo');
    const dispCrNo = document.getElementById('dispCrNo');
    const dispSalesmanName = document.getElementById('dispSalesmanName');
    const dispSalesmanMobile = document.getElementById('dispSalesmanMobile');
    const statAccount = document.getElementById('statAccount');
    const statSellout = document.getElementById('statSellout');
    const statReconciliation = document.getElementById('statReconciliation');

    function showAlert(message, type = 'error') {
        alertBox.textContent = message;
        alertBox.className = `alert alert-${type}`;
        alertBox.style.display = 'block';
        setTimeout(() => alertBox.style.display = 'none', 6000);
    }


    function resetUI() {
        emptyState.style.display = 'flex';
        vendorDataArea.style.display = 'none';
        businessCard.style.display = 'none';
        statusDashboard.style.display = 'none';
        customerIdGroup.style.display = 'none'; // reset customer ID input unless specifically triggered
        alertBox.style.display = 'none';
    }

    // Trigger search on Enter key for all inputs
    [inputVendorNo, inputVatRegNo, inputCustomerId].forEach(input => {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                btnSearch.click();
            }
        });
    });

    btnSearch.addEventListener('click', async () => {
        const vendorNo = inputVendorNo.value.trim();
        const vatRegNo = inputVatRegNo.value.trim();
        const customerId = inputCustomerId.value.trim();

        if (!vendorNo && !vatRegNo) {
            showAlert('Please enter either Vendor No. or VAT Registration No.');
            return;
        }

        // Prepare query parameters
        const params = new URLSearchParams();
        if (vendorNo) params.append('vendorNo', vendorNo);
        if (vatRegNo) params.append('vatRegNo', vatRegNo);
        if (customerId && customerIdGroup.style.display !== 'none') {
            params.append('customerId', customerId);
        }

        btnSearch.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Searching...';
        btnSearch.disabled = true;

        try {
            const response = await fetch(`/api/VendorProfile/Search?${params.toString()}`);
            
            if (response.status === 409) {
                // Multiple results found, need Customer Id
                const data = await response.json();
                showAlert(data.message, 'warning');
                customerIdGroup.style.display = 'block';
                inputCustomerId.focus();
                
                // Hide current data
                emptyState.style.display = 'flex';
                vendorDataArea.style.display = 'none';
            } else if (response.ok) {
                const data = await response.json();
                renderVendorData(data);
                
                // Clear input fields for the next search
                inputVendorNo.value = '';
                inputVatRegNo.value = '';
                
                // Hide customer ID field if it was a successful exact match
                customerIdGroup.style.display = 'none';
                inputCustomerId.value = '';
            } else {
                const err = await response.json();
                showAlert(err.message || 'Vendor not found.');
                resetUI();
            }
        } catch (error) {
            console.error('Error fetching vendor:', error);
            showAlert('A network error occurred. Please try again.');
            resetUI();
        } finally {
            btnSearch.innerHTML = '<i class="ri-search-line"></i> Search Vendor';
            btnSearch.disabled = false;
        }
    });

    function renderVendorData(data) {
        // Hide empty state, show data area
        emptyState.style.display = 'none';
        vendorDataArea.style.display = 'block';
        businessCard.style.display = 'block';
        statusDashboard.style.display = 'grid';

        // Populate Business Card
        dispEnglishName.textContent = data.englishName || 'N/A';
        dispArabicName.textContent = data.arabicName || '';
        dispVendorNo.textContent = data.vendorNo ? `#${data.vendorNo}` : '-';
        dispVatNo.textContent = data.vatRegNo || '-';
        dispCrNo.textContent = data.crNo || '-';
        dispSalesmanName.textContent = data.salesmanName || '-';
        dispSalesmanMobile.textContent = data.salesmanMobile || '-';

        const boxAccount = document.getElementById('boxAccount');
        const boxReconciliation = document.getElementById('boxReconciliation');
        const boxSellout = document.getElementById('boxSellout');
        const boxReturnGoods = document.getElementById('boxReturnGoods');

        // Reset themes
        [boxAccount, boxReconciliation, boxSellout, boxReturnGoods].forEach(box => {
            if(box) box.classList.remove('theme-success', 'theme-warning', 'theme-neutral');
        });
        
        if (data.isBlocked) {
            statAccount.textContent = 'Blocked';
            if(boxAccount) boxAccount.classList.add('theme-warning');
        } else {
            statAccount.textContent = 'Active';
            if(boxAccount) boxAccount.classList.add('theme-success');
        }

        // The following is hardcoded as "Yes" (Success) based on requirements
        if(boxReturnGoods) boxReturnGoods.classList.add('theme-success');

        // Reconciliation dynamic logic
        if (data.isReconciliationValid) {
            if(statReconciliation) statReconciliation.textContent = 'Valid';
            if(boxReconciliation) boxReconciliation.classList.add('theme-success'); // Valid = Green
        } else {
            if(statReconciliation) statReconciliation.textContent = 'Invalid';
            if(boxReconciliation) boxReconciliation.classList.add('theme-warning'); // Invalid = Red
        }

        // Sellout dynamic logic based on Navision response
        if (data.hasSellout) {
            if(statSellout) statSellout.textContent = 'Yes';
            if(boxSellout) boxSellout.classList.add('theme-warning'); // Yes = Red
        } else {
            if(statSellout) statSellout.textContent = 'No';
            if(boxSellout) boxSellout.classList.add('theme-success'); // No = Green
        }
    }
});
