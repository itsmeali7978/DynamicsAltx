document.addEventListener('DOMContentLoaded', () => {
    // Current user language (default English)
    // Assuming there's a global userLanguage from common.js or we default to 'en'
    let userLanguage = localStorage.getItem('lang') || 'en';

    const tableHeaderRow = document.getElementById('table-header-row');
    const tableBody = document.getElementById('table-body');
    const btnCloseSelected = document.getElementById('btn-close-selected');

    let allTasks = []; // Definitions from /api/VendorTasks
    let pendingVendorTasks = []; // Active profile tasks from /api/VendorProfileTasks/pending
    let selectedToClose = []; // Array of { profileTaskId: int, taskId: string }

    // Initialize page
    async function init() {
        await fetchAllTasks();
        await fetchPendingTasks();
        renderTable();
    }

    document.addEventListener('languageChanged', (e) => {
        userLanguage = e.detail;
        renderTable();
    });

    async function fetchAllTasks() {
        try {
            const response = await fetch('/api/VendorTasks');
            if (response.ok) {
                allTasks = await response.json();
            } else {
                console.error('Failed to fetch vendor tasks');
            }
        } catch (error) {
            console.error('Error fetching vendor tasks:', error);
        }
    }

    async function fetchPendingTasks() {
        try {
            const response = await fetch('/api/VendorProfileTasks/pending');
            if (response.ok) {
                pendingVendorTasks = await response.json();
            } else {
                console.error('Failed to fetch pending vendor tasks');
            }
        } catch (error) {
            console.error('Error fetching pending vendor tasks:', error);
        }
    }

    function renderTable() {
        // Reset state
        selectedToClose = [];
        updateCloseButtonState();

        // 1. Render Headers
        tableHeaderRow.innerHTML = `
            <th>Vendor No</th>
            <th>Name</th>
        `;
        
        allTasks.forEach(task => {
            const th = document.createElement('th');
            th.textContent = userLanguage === 'ar' ? task.nameArb : task.nameEng;
            th.style.textAlign = 'center';
            tableHeaderRow.appendChild(th);
        });

        // 2. Render Body
        tableBody.innerHTML = '';

        if (pendingVendorTasks.length === 0) {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td colspan="${allTasks.length + 2}" style="text-align: center; color: var(--text-muted);">No pending tasks found.</td>`;
            tableBody.appendChild(tr);
            return;
        }

        pendingVendorTasks.forEach(pt => {
            const tr = document.createElement('tr');

            // Vendor No
            const tdNo = document.createElement('td');
            tdNo.textContent = pt.vendorNo;
            tdNo.style.fontWeight = '500';
            tr.appendChild(tdNo);

            // Vendor Name
            const tdName = document.createElement('td');
            tdName.textContent = userLanguage === 'ar' ? (pt.vendorNameArb || pt.vendorNameEng) : (pt.vendorNameEng || pt.vendorNameArb);
            tr.appendChild(tdName);

            // Parse selected and closed tasks
            const selectedArr = pt.selectedTasks ? pt.selectedTasks.split(',').map(s => s.trim()) : [];
            const closedArr = pt.closedTasks ? pt.closedTasks.split(',').map(s => s.trim()) : [];

            // Task Cells
            allTasks.forEach(task => {
                const td = document.createElement('td');
                td.className = 'task-cell';
                
                const taskIdStr = task.id.toString();
                const isSelected = selectedArr.includes(taskIdStr);
                const isClosed = closedArr.includes(taskIdStr);

                if (isSelected) {
                    if (isClosed) {
                        // Display disabled/closed state
                        td.innerHTML = `<span style="color: var(--success);"><i class="ri-check-line"></i></span>`;
                        td.className = 'task-cell task-disabled';
                    } else {
                        // Display active checkbox
                        const cb = document.createElement('input');
                        cb.type = 'checkbox';
                        cb.className = 'task-checkbox';
                        cb.dataset.profileTaskId = pt.id;
                        cb.dataset.taskId = taskIdStr;
                        
                        cb.addEventListener('change', (e) => handleCheckboxChange(e.target));
                        td.appendChild(cb);
                    }
                } else {
                    // Not assigned to this vendor for this row
                    td.innerHTML = `<span style="color: #cbd5e1;">-</span>`;
                    td.className = 'task-cell task-disabled';
                }

                tr.appendChild(td);
            });

            tableBody.appendChild(tr);
        });
    }

    function handleCheckboxChange(checkbox) {
        const profileTaskId = parseInt(checkbox.dataset.profileTaskId, 10);
        const taskId = checkbox.dataset.taskId;

        if (checkbox.checked) {
            selectedToClose.push({ profileTaskId, taskId });
        } else {
            selectedToClose = selectedToClose.filter(item => !(item.profileTaskId === profileTaskId && item.taskId === taskId));
        }

        updateCloseButtonState();
    }

    function updateCloseButtonState() {
        if (selectedToClose.length > 0) {
            btnCloseSelected.disabled = false;
        } else {
            btnCloseSelected.disabled = true;
        }
    }

    btnCloseSelected.addEventListener('click', async () => {
        if (selectedToClose.length === 0) return;
        
        btnCloseSelected.disabled = true;
        btnCloseSelected.innerHTML = '<i class="ri-loader-4-line ri-spin"></i><span>Closing...</span>';

        // Group selected tasks by profileTaskId
        const grouped = selectedToClose.reduce((acc, curr) => {
            if (!acc[curr.profileTaskId]) {
                acc[curr.profileTaskId] = [];
            }
            acc[curr.profileTaskId].push(curr.taskId);
            return acc;
        }, {});

        // Process all updates
        try {
            const promises = Object.entries(grouped).map(([profileTaskId, taskIds]) => {
                return fetch(`/api/VendorProfileTasks/${profileTaskId}/close`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(taskIds)
                });
            });

            await Promise.all(promises);

            // Refresh data
            await fetchPendingTasks();
            renderTable();

            // Optional: show a toast/notification here
            console.log("Tasks closed successfully.");
        } catch (error) {
            console.error('Error closing tasks:', error);
            alert('Failed to close selected tasks.');
        } finally {
            btnCloseSelected.innerHTML = '<i class="ri-check-double-line"></i><span>Close Selected Tasks</span>';
            updateCloseButtonState();
        }
    });

    // Start
    init();
});
