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
    const btnCheckPayment = document.getElementById('btnCheckPayment');
    const paymentResultsArea = document.getElementById('paymentResultsArea');
    const paymentGrid = document.getElementById('paymentGrid');

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

    function t(key, defaultText) {
        const lang = localStorage.getItem('lang') || 'en';
        if (window.i18n && window.i18n[lang] && window.i18n[lang][key]) {
            return window.i18n[lang][key];
        }
        return defaultText;
    }

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
        document.getElementById('vendorTasksSection').style.display = 'none';
        customerIdGroup.style.display = 'none'; // reset customer ID input unless specifically triggered
        alertBox.style.display = 'none';
        if (paymentResultsArea) paymentResultsArea.style.display = 'none';
        if (paymentGrid) paymentGrid.innerHTML = '';
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
        const vendorNo = inputVendorNo.value.trim().toUpperCase();
        inputVendorNo.value = vendorNo; // Switch UI to uppercase immediately
        
        const vatRegNo = inputVatRegNo.value.trim();
        const customerId = inputCustomerId.value.trim();

        if (!vendorNo && !vatRegNo) {
            showAlert(t('alert_enter_vendor_or_vat', 'Please enter either Vendor No. or VAT Registration No.'));
            return;
        }

        // Prepare query parameters
        const params = new URLSearchParams();
        if (vendorNo) params.append('vendorNo', vendorNo);
        if (vatRegNo) params.append('vatRegNo', vatRegNo);
        if (customerId && customerIdGroup.style.display !== 'none') {
            params.append('customerId', customerId);
        }

        btnSearch.innerHTML = `<i class="ri-loader-4-line ri-spin"></i> ${t('loading_records', 'Searching...')}`;
        btnSearch.disabled = true;

        // Clear previous payment results when starting a new search
        if (paymentResultsArea) paymentResultsArea.style.display = 'none';
        if (paymentGrid) paymentGrid.innerHTML = '';

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
                showAlert(err.message || t('alert_vendor_not_found', 'Vendor not found.'));
                resetUI();
            }
        } catch (error) {
            console.error('Error fetching vendor:', error);
            showAlert(t('alert_network_error', 'A network error occurred. Please try again.'));
            resetUI();
        } finally {
            btnSearch.innerHTML = `<i class="ri-search-line"></i> <span data-i18n="vendor_btn_search">${t('vendor_btn_search', 'Search Vendor')}</span>`;
            btnSearch.disabled = false;
        }
    });

    function renderVendorData(data) {
        // Hide empty state, show data area
        emptyState.style.display = 'none';
        vendorDataArea.style.display = 'block';
        businessCard.style.display = 'block';
        statusDashboard.style.display = 'grid';
        document.getElementById('vendorTasksSection').style.display = 'block';

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

        // Automatically load tasks for the selected vendor
        loadOpenTasks();
    }

    // Payment check logic

    btnCheckPayment.addEventListener('click', async () => {
        const vendorNo = dispVendorNo.textContent.replace('#', '').trim();
        if (!vendorNo || vendorNo === '-') {
            showAlert('No valid vendor selected.');
            return;
        }

        btnCheckPayment.innerHTML = `<i class="ri-loader-4-line ri-spin" style="font-size: 1.3rem;"></i> ${t('loading_records', 'Checking...')}`;
        btnCheckPayment.disabled = true;

        try {
            const response = await fetch(`/api/VendorProfile/Payments?vendorNo=${encodeURIComponent(vendorNo)}`);
            if (response.ok) {
                const data = await response.json();
                
                paymentGrid.innerHTML = '';
                if (data.length === 0) {
                    paymentGrid.innerHTML = '<div style="padding: 1rem; text-align: center; color: var(--text-muted);">No payment records found.</div>';
                } else {
                    data.forEach(item => {
                        let dateStr = '';
                        if (item.assignedDate && item.assignedDate.startsWith('1753-01-01')) {
                            dateStr = 'Date not decided';
                        } else {
                            dateStr = new Date(item.assignedDate).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
                        }
                        const isApproved = item.status === 'Approved';
                        const badgeClass = isApproved ? 'badge-approved' : 'badge-pending';
                        const rowClass = isApproved ? 'status-approved' : 'status-pending';
                        const icon = isApproved ? 'ri-checkbox-circle-fill' : 'ri-time-fill';
                        const iconColor = isApproved ? '#10b981' : '#f59e0b';

                        const div = document.createElement('div');
                        div.className = `data-row ${rowClass}`;
                        div.innerHTML = `
                            <div class="data-row-date">
                                <i class="${icon}" style="color: ${iconColor}; font-size: 1.2rem;"></i>
                                ${dateStr}
                            </div>
                            <span class="badge ${badgeClass}">${item.status}</span>
                        `;
                        paymentGrid.appendChild(div);
                    });
                }
                paymentResultsArea.style.display = 'block';
            } else {
                showAlert('Failed to fetch payment info.');
            }
        } catch (error) {
            console.error('Error fetching payments:', error);
            showAlert('A network error occurred while checking payments.');
        } finally {
            btnCheckPayment.innerHTML = `<i class="ri-secure-payment-line" style="font-size: 1.3rem;"></i> <span data-i18n="vendor_btn_check_payment">${t('vendor_btn_check_payment', 'Check Payment')}</span>`;
            btnCheckPayment.disabled = false;
        }
    });

    // --- Tasks Section Logic ---
    const btnToggleTasks = document.getElementById('btnToggleTasks');
    const taskCreationForm = document.getElementById('taskCreationForm');
    const taskCheckboxesContainer = document.getElementById('task-checkboxes-container');
    const taskComments = document.getElementById('taskComments');
    const btnCreateTask = document.getElementById('btnCreateTask');
    const openTasksArea = document.getElementById('openTasksArea');
    
    let allTasks = []; // Cache for tasks
    
    btnToggleTasks.addEventListener('click', async () => {
        const isHidden = taskCreationForm.style.display === 'none';
        
        if (isHidden) {
            taskCreationForm.style.display = 'block';
            btnToggleTasks.innerHTML = `<i class="ri-close-line"></i> Cancel`;
            
            // Fetch task types if not cached
            if (allTasks.length === 0) {
                await fetchTasks();
            } else {
                populateTaskSelect();
            }
        } else {
            taskCreationForm.style.display = 'none';
            btnToggleTasks.innerHTML = `<i class="ri-add-line"></i> <span data-i18n="vendor_btn_create_tasks">${t('vendor_btn_create_tasks', 'Create Tasks')}</span>`;
        }

        // Always load open tasks when clicking the button
        await loadOpenTasks();
    });

    async function fetchTasks() {
        try {
            taskCheckboxesContainer.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: var(--text-muted);">Loading tasks...</div>';
            const response = await fetch('/api/VendorTasks');
            if (response.ok) {
                allTasks = await response.json();
                populateTaskSelect();
            } else {
                taskCheckboxesContainer.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: #ef4444;">Failed to load tasks</div>';
            }
        } catch (error) {
            console.error('Error fetching tasks:', error);
            taskCheckboxesContainer.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: #ef4444;">Error loading tasks</div>';
        }
    }

    function populateTaskSelect() {
        const lang = localStorage.getItem('lang') || 'en';
        
        taskCheckboxesContainer.innerHTML = allTasks.map(task => {
            const taskName = lang === 'ar' ? task.nameArb : task.nameEng;
            return `
                <label class="task-checkbox-label">
                    <input type="checkbox" name="selectedVendorTasks" value="${task.id}">
                    <span>${taskName}</span>
                </label>
            `;
        }).join('');
    }

    btnCreateTask.addEventListener('click', async () => {
        const selectedCheckboxes = document.querySelectorAll('input[name="selectedVendorTasks"]:checked');
        if (selectedCheckboxes.length === 0) {
            showAlert('Please select at least one task.', 'warning');
            return;
        }

        const selectedTaskIds = Array.from(selectedCheckboxes).map(cb => cb.value).join(',');
        const comments = taskComments.value.trim();
        const vendorNo = dispVendorNo.textContent.replace('#', '').trim();
        
        if (!vendorNo || vendorNo === '-') {
            showAlert('No valid vendor selected.');
            return;
        }

        btnCreateTask.innerHTML = `<i class="ri-loader-4-line ri-spin"></i> ${t('loading_records', 'Creating...')}`;
        btnCreateTask.disabled = true;

        const payload = {
            vendorNo: vendorNo,
            vendorNameEng: dispEnglishName.textContent.trim(),
            vendorNameArb: dispArabicName.textContent.trim(),
            selectedTasks: selectedTaskIds,
            comments: comments
        };

        try {
            const response = await fetch('/api/VendorProfileTasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                showAlert('Task created successfully!', 'success');
                // Reset form
                document.querySelectorAll('input[name="selectedVendorTasks"]').forEach(cb => cb.checked = false);
                taskComments.value = '';
                
                // Reload list
                await loadOpenTasks();
                
                // Optionally hide form
                taskCreationForm.style.display = 'none';
                btnToggleTasks.innerHTML = '<i class="ri-add-line"></i> Create Tasks';
            } else {
                showAlert('Failed to create task.');
            }
        } catch (error) {
            console.error('Error creating task:', error);
            showAlert(t('alert_network_error', 'A network error occurred.'));
        } finally {
            btnCreateTask.innerHTML = `<i class="ri-save-line"></i> <span data-i18n="vendor_btn_create_task">${t('vendor_btn_create_task', 'Create Task')}</span>`;
            btnCreateTask.disabled = false;
        }
    });

    async function loadOpenTasks() {
        const vendorNo = dispVendorNo.textContent.replace('#', '').trim();
        if (!vendorNo || vendorNo === '-') return;

        openTasksArea.innerHTML = '<div style="padding: 1rem; text-align: center;"><i class="ri-loader-4-line ri-spin"></i> Loading...</div>';

        try {
            const response = await fetch(`/api/VendorProfileTasks/vendor/${encodeURIComponent(vendorNo)}`);
            if (response.ok) {
                const tasks = await response.json();
                
                if (tasks.length === 0) {
                    openTasksArea.innerHTML = `<div style="padding: 1rem; text-align: center; color: var(--text-muted); background: #f8fafc; border-radius: 8px; border: 1px dashed var(--border-color);">${t('alert_no_open_tasks', 'No open tasks found.')}</div>`;
                    return;
                }

                // If task types are not loaded yet, try to load them to resolve names
                if (allTasks.length === 0) {
                    await fetchTasks();
                }

                const lang = localStorage.getItem('lang') || 'en';
                let html = '<div class="data-grid">';
                
                tasks.forEach(t => {
                    const dateStr = new Date(t.createdDate).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
                    
                    // Resolve task IDs to names
                    let taskIds = t.selectedTasks.split(',').map(id => id.trim());
                    if (t.closedTasks) {
                        const closedIds = t.closedTasks.split(',').map(id => id.trim());
                        taskIds = taskIds.filter(id => !closedIds.includes(id));
                    }
                    
                    const taskNames = taskIds.map(id => {
                        const matched = allTasks.find(x => x.id.toString() === id);
                        if (matched) {
                            return lang === 'ar' ? matched.nameArb : matched.nameEng;
                        }
                        return `Task #${id}`;
                    });

                    html += `
                        <div class="data-row status-pending">
                            <div style="flex-grow: 1;">
                                <div style="font-weight: 600; margin-bottom: 0.25rem;">${taskNames.join(', ')}</div>
                                <div style="font-size: 0.85rem; color: var(--text-muted);"><i class="ri-time-line"></i> ${dateStr}</div>
                                ${t.comments ? `<div style="font-size: 0.85rem; margin-top: 0.25rem; color: var(--text-main);"><i class="ri-chat-1-line"></i> ${t.comments}</div>` : ''}
                            </div>
                            <span class="badge badge-pending" style="text-transform: capitalize;">${t.status}</span>
                        </div>
                    `;
                });
                html += '</div>';
                openTasksArea.innerHTML = html;
            } else {
                openTasksArea.innerHTML = `<div style="color: #ef4444; padding: 1rem;">${t('alert_failed_load_tasks', 'Failed to load tasks.')}</div>`;
            }
        } catch (error) {
            console.error('Error loading tasks:', error);
            openTasksArea.innerHTML = `<div style="color: #ef4444; padding: 1rem;">${t('alert_error_load_tasks', 'Error loading tasks.')}</div>`;
        }
    }
});
