document.addEventListener('DOMContentLoaded', async () => {
    await loadLocations();
    initCashGrid();
    setupEmployeeValidation();
    setupCalculations();

    // Check if ID is passed in the URL (e.g. from closing-reports.html)
    const urlParams = new URLSearchParams(window.location.search);
    const idParam = urlParams.get('id');
    if (idParam) {
        document.getElementById('loadStatementId').value = idParam;
        await loadStatement();
    }
});

function showToast(message, type = 'error') {
    const box = document.getElementById('alertBox');
    box.textContent = message;
    box.style.display = 'block';
    box.className = `alert alert-${type}`;
    setTimeout(() => {
        box.style.display = 'none';
    }, 5000);
}

// --- Load Locations ---
async function loadLocations() {
    const selectEl = document.getElementById('locationSelect');
    if (!selectEl) return;

    try {
        const response = await fetch('/api/Locations');
        if (response.ok) {
            const locations = await response.json();
            selectEl.innerHTML = '<option value="" disabled>Select Location...</option>';
            locations.forEach(loc => {
                const opt = document.createElement('option');
                opt.value = loc.locationCode;
                opt.textContent = loc.locationCode + ' - ' + loc.locationName;
                opt.dataset.name = loc.locationName;
                selectEl.appendChild(opt);
            });

            const loggedLocation = localStorage.getItem('userLocation') || 'HO';
            const userRole = localStorage.getItem('userRole');

            let matched = false;
            for (let i = 0; i < selectEl.options.length; i++) {
                const opt = selectEl.options[i];
                if (opt.value.trim().toLowerCase() === loggedLocation.trim().toLowerCase() ||
                    opt.dataset.name?.trim().toLowerCase() === loggedLocation.trim().toLowerCase()) {
                    selectEl.selectedIndex = i;
                    matched = true;
                    break;
                }
            }

            if (!matched) {
                const fallbackOpt = document.createElement('option');
                fallbackOpt.value = loggedLocation;
                fallbackOpt.textContent = loggedLocation;
                selectEl.appendChild(fallbackOpt);
                selectEl.value = loggedLocation;
            }

            if (userRole !== 'Admin') {
                selectEl.disabled = true;
            }
        }
    } catch (e) {
        console.error('Error loading locations:', e);
    }
}

// --- Employee Validation ---
function setupEmployeeValidation() {
    const empInput = document.getElementById('employeeNo');
    const nameInput = document.getElementById('employeeName');
    let timeout = null;

    empInput.addEventListener('input', () => {
        clearTimeout(timeout);
        nameInput.value = '';
        const empId = empInput.value.trim();
        if (empId.length >= 2) {
            timeout = setTimeout(async () => {
                try {
                    const response = await fetch(`/api/AbsenceMarkers/Employee/${empId}`);
                    if (response.ok) {
                        const data = await response.json();
                        nameInput.value = data.arabicName || data.englishName || 'Name not found';
                    } else {
                        nameInput.value = 'Employee Not Found';
                    }
                } catch (e) {
                    console.error(e);
                }
            }, 500);
        }
    });
}

// --- Cash Grid ---
const denominations = [1, 5, 10, 20, 50, 100, 200, 500, 'Mixed Coins'];

function initCashGrid() {
    const tbody = document.querySelector('#cashTable tbody');
    denominations.forEach(d => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${d === 'Mixed Coins' ? d : d + ' x'}</td>
            <td><input type="number" class="cash-qty" data-val="${d === 'Mixed Coins' ? 1 : d}" min="0" value="0"></td>
            <td class="text-right cash-line-total">0.00</td>
        `;
        tbody.appendChild(tr);
    });
}

// --- Dynamic Pending Row ---
function addPendingRow() {
    const tbody = document.querySelector('#pendingTable tbody');
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td><input type="text" class="pending-emp" placeholder="ID"></td>
        <td><input type="text" class="pending-name" placeholder="Name" readonly></td>
        <td><input type="text" class="pending-comment" placeholder="Comment"></td>
        <td><input type="number" step="0.01" class="pending-amt text-right" value="0.00" style="padding: 0.1rem 0.2rem;"></td>
        <td class="text-right">
            <button class="remove-btn" onclick="this.closest('tr').remove(); calculateTotals();">
                <i class="ri-close-line"></i>
            </button>
        </td>
    `;
    tbody.appendChild(tr);

    // Dynamic employee validation on pressing Enter
    const empInput = tr.querySelector('.pending-emp');
    const nameInput = tr.querySelector('.pending-name');

    empInput.addEventListener('keydown', async (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const empId = empInput.value.trim();
            if (!empId) return;

            nameInput.value = 'Loading...';
            try {
                const response = await fetch(`/api/AbsenceMarkers/Employee/${empId}`);
                if (response.ok) {
                    const data = await response.json();
                    nameInput.value = data.arabicName || data.englishName || 'Name not found';
                } else {
                    nameInput.value = 'Not Found';
                }
            } catch (err) {
                console.error(err);
                nameInput.value = 'Error';
            }
        }
    });

    tr.querySelector('.pending-amt').addEventListener('input', calculateTotals);
}

// --- Calculations ---
function setupCalculations() {
    document.getElementById('bankPos').addEventListener('input', calculateTotals);
    document.getElementById('bankTransfer').addEventListener('input', calculateTotals);
    
    document.getElementById('cashTable').addEventListener('input', (e) => {
        if (e.target.classList.contains('cash-qty')) {
            const qty = parseFloat(e.target.value) || 0;
            const val = parseFloat(e.target.dataset.val) || 0;
            const lineTotal = qty * val;
            e.target.closest('tr').querySelector('.cash-line-total').textContent = lineTotal.toFixed(2);
            calculateTotals();
        }
    });
}

function calculateTotals() {
    // Bank
    const pos = parseFloat(document.getElementById('bankPos').value) || 0;
    const transfer = parseFloat(document.getElementById('bankTransfer').value) || 0;
    const totalBank = pos + transfer;
    document.getElementById('totalBank').textContent = totalBank.toFixed(2);
    
    // Cash
    let totalCash = 0;
    document.querySelectorAll('.cash-line-total').forEach(el => {
        totalCash += parseFloat(el.textContent) || 0;
    });
    document.getElementById('totalCash').textContent = totalCash.toFixed(2);
    
    // Pending
    let totalPending = 0;
    document.querySelectorAll('.pending-amt').forEach(el => {
        totalPending += parseFloat(el.value) || 0;
    });
    document.getElementById('totalPending').textContent = totalPending.toFixed(2);
    
    // Overall Received
    const totalReceived = totalBank + totalCash + totalPending;
    document.getElementById('totReceived').textContent = totalReceived.toFixed(2);
    
    // Update Difference
    const sysSales = parseFloat(document.getElementById('sysSales').textContent) || 0;
    const diff = sysSales - totalReceived;
    const diffEl = document.getElementById('sysDiff');
    diffEl.textContent = diff.toFixed(2);
    diffEl.className = 'summary-value ' + (diff >= 0 ? 'val-positive' : 'val-negative');
}

// --- API Calls ---
async function verifyInvoices() {
    const loc = document.getElementById('locationSelect').value;
    const date = document.getElementById('closingDate').value;
    const startInv = document.getElementById('startInvoice').value.trim();
    const endInv = document.getElementById('endInvoice').value.trim();
    const startCr = document.getElementById('startCrMemo').value.trim();
    const endCr = document.getElementById('endCrMemo').value.trim();
    
    if (!loc) {
        showToast('Please select a location.');
        return;
    }
    
    if (!startInv && !endInv && !startCr && !endCr) {
        showToast('Please enter at least one boundary (Invoice or CrMemo) to verify.');
        return;
    }

    const payload = {
        LocationCode: loc,
        Date: date,
        StartingInvoiceNo: startInv,
        ClosingInvoiceNo: endInv,
        StartingCreditMemoNo: startCr,
        ClosingCreditMemoNo: endCr
    };

    const btn = document.getElementById('verifyBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Verifying...';

    try {
        const response = await fetch('/api/CashierClosing/Verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showToast('Documents Verified Successfully!', 'success');
            // Toggle collection section using grid layout!
            document.getElementById('collectionSection').style.display = 'grid';
        } else {
            showToast(data.message || 'Verification Failed');
        }
    } catch (e) {
        showToast('Network error during verification.');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="ri-check-double-line"></i> Verify Documents';
    }
}

async function closeSales() {
    const loc = document.getElementById('locationSelect').value;
    const empId = document.getElementById('employeeNo').value.trim();
    const empName = document.getElementById('employeeName').value.trim();
    
    if (!loc) {
        showToast('Please select a location.');
        return;
    }
    
    if (!empId || empName === 'Employee Not Found' || !empName) {
        showToast('Please provide a valid Employee.');
        return;
    }
    
    const denoms = [];
    document.querySelectorAll('#cashTable tbody tr').forEach(tr => {
        const qtyInput = tr.querySelector('.cash-qty');
        const qty = parseInt(qtyInput.value) || 0;
        if (qty > 0) {
            denoms.push({
                Denomination: qtyInput.dataset.val === "1" && tr.cells[0].textContent.includes('Mixed') ? "Mixed Coins" : qtyInput.dataset.val,
                Quantity: qty,
                LineTotal: parseFloat(tr.querySelector('.cash-line-total').textContent)
            });
        }
    });
    
    const pendings = [];
    document.querySelectorAll('#pendingTable tbody tr').forEach(tr => {
        const amt = parseFloat(tr.querySelector('.pending-amt').value) || 0;
        if (amt > 0) {
            pendings.push({
                EmpId: tr.querySelector('.pending-emp').value.trim(),
                EmpName: tr.querySelector('.pending-name').value.trim(),
                CustomerComments: tr.querySelector('.pending-comment').value.trim(),
                Amount: amt
            });
        }
    });
    
    const payload = {
        EmployeeNo: empId,
        ClosingDate: document.getElementById('closingDate').value,
        LocationCode: loc,
        StartingInvoiceNo: document.getElementById('startInvoice').value.trim(),
        ClosingInvoiceNo: document.getElementById('endInvoice').value.trim(),
        StartingCreditMemoNo: document.getElementById('startCrMemo').value.trim(),
        ClosingCreditMemoNo: document.getElementById('endCrMemo').value.trim(),
        TotalBankPOS: parseFloat(document.getElementById('bankPos').value) || 0,
        TotalBankTransfer: parseFloat(document.getElementById('bankTransfer').value) || 0,
        TotalCash: parseFloat(document.getElementById('totalCash').textContent) || 0,
        TotalPendingCash: parseFloat(document.getElementById('totalPending').textContent) || 0,
        CreatedBy: localStorage.getItem('userName') || 'Unknown',
        Denominations: denoms,
        PendingCash: pendings
    };
    
    try {
        const response = await fetch('/api/CashierClosing/CloseSales', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const data = await response.json();
        if (response.ok) {
            document.getElementById('sysSales').textContent = (data.systemSales).toFixed(2);
            calculateTotals();
            showToast(`Sales Closed Successfully! Statement No: #${data.id}`, 'success');
            
            // Show badge
            const badge = document.getElementById('statementNoBadge');
            badge.textContent = `Statement #${data.id}`;
            badge.style.display = 'inline-block';
            
            // Lock form so they can't double close
            lockForm(true);
            document.getElementById('resetBtn').style.display = 'inline-block';
        } else {
            showToast(data.message || 'Failed to close sales.');
        }
    } catch (e) {
        showToast('Network error during Close Sales.');
    }
}

// --- Load/Search Statements ---
async function loadStatement() {
    const id = document.getElementById('loadStatementId').value.trim();
    if (!id) {
        showToast('Please enter a Statement ID to load.');
        return;
    }

    try {
        const response = await fetch(`/api/CashierClosing/${id}`);
        const data = await response.json();

        if (response.ok) {
            showToast(`Loaded Statement #${id} successfully!`, 'success');
            
            // Populate Cashier Info
            document.getElementById('employeeNo').value = data.employeeNo;
            document.getElementById('employeeName').value = 'Loading Name...';
            // Trigger employee name resolve manually
            const empRes = await fetch(`/api/AbsenceMarkers/Employee/${data.employeeNo}`);
            if (empRes.ok) {
                const empData = await empRes.json();
                document.getElementById('employeeName').value = empData.arabicName || empData.englishName || 'Name not found';
            } else {
                document.getElementById('employeeName').value = 'Employee Not Found';
            }

            // Populate Invoice Info
            // Dynamic check: make sure locationSelect has the value, or add fallback option
            const selectEl = document.getElementById('locationSelect');
            let hasOpt = false;
            for (let i = 0; i < selectEl.options.length; i++) {
                if (selectEl.options[i].value === data.locationCode) {
                    selectEl.selectedIndex = i;
                    hasOpt = true;
                    break;
                }
            }
            if (!hasOpt) {
                const opt = document.createElement('option');
                opt.value = data.locationCode;
                opt.textContent = data.locationCode;
                selectEl.appendChild(opt);
                selectEl.value = data.locationCode;
            }

            document.getElementById('closingDate').value = data.closingDate.split('T')[0];
            document.getElementById('startInvoice').value = data.startingInvoiceNo || '';
            document.getElementById('endInvoice').value = data.closingInvoiceNo || '';
            document.getElementById('startCrMemo').value = data.startingCreditMemoNo || '';
            document.getElementById('endCrMemo').value = data.closingCreditMemoNo || '';

            // Populate Bank Collection
            document.getElementById('bankPos').value = data.totalBankPOS.toFixed(2);
            document.getElementById('bankTransfer').value = data.totalBankTransfer.toFixed(2);

            // Populate Denominations
            document.querySelectorAll('#cashTable tbody tr').forEach(tr => {
                const qtyInput = tr.querySelector('.cash-qty');
                const valStr = qtyInput.dataset.val;
                
                const denomObj = data.denominations.find(d => {
                    if (valStr === "1" && tr.cells[0].textContent.includes('Mixed')) {
                        return d.denomination === "Mixed Coins";
                    }
                    return d.denomination === valStr;
                });
                
                if (denomObj) {
                    qtyInput.value = denomObj.quantity;
                    tr.querySelector('.cash-line-total').textContent = denomObj.lineTotal.toFixed(2);
                } else {
                    qtyInput.value = 0;
                    tr.querySelector('.cash-line-total').textContent = "0.00";
                }
            });

            // Populate Pending
            const pendingTbody = document.querySelector('#pendingTable tbody');
            pendingTbody.innerHTML = '';
            data.pendingCash.forEach(p => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><input type="text" class="pending-emp" value="${p.empId || ''}"></td>
                    <td><input type="text" class="pending-name" value="${p.empName || ''}" readonly></td>
                    <td><input type="text" class="pending-comment" value="${p.customerComments || ''}"></td>
                    <td><input type="number" step="0.01" class="pending-amt text-right" value="${p.amount.toFixed(2)}" style="padding: 0.1rem 0.2rem;"></td>
                    <td class="text-right">
                        <button class="remove-btn" onclick="this.closest('tr').remove(); calculateTotals();">
                            <i class="ri-close-line"></i>
                        </button>
                    </td>
                `;
                pendingTbody.appendChild(tr);
            });

            // Populate Totals
            document.getElementById('totalBank').textContent = data.totalBank.toFixed(2);
            document.getElementById('totalCash').textContent = data.totalCash.toFixed(2);
            document.getElementById('totalPending').textContent = data.totalPendingCash.toFixed(2);
            document.getElementById('totReceived').textContent = (data.totalBank + data.totalCash + data.totalPendingCash).toFixed(2);
            document.getElementById('sysSales').textContent = (data.systemSalesAmount - data.systemReturnAmount).toFixed(2);
            
            // Calculate difference and set colors
            calculateTotals();

            // Set badge
            const badge = document.getElementById('statementNoBadge');
            badge.textContent = `Statement #${data.id}`;
            badge.style.display = 'inline-block';

            // Show sections
            document.getElementById('collectionSection').style.display = 'grid';

            // Lock the form
            lockForm(true);
            document.getElementById('resetBtn').style.display = 'inline-block';
        } else {
            showToast(data.message || `Failed to load statement #${id}`);
        }
    } catch (err) {
        console.error(err);
        showToast('Network error while retrieving statement.');
    }
}

function lockForm(lock) {
    const inputs = document.querySelectorAll('.form-control, .cash-qty, .pending-emp, .pending-comment, .pending-amt, .bank-input');
    inputs.forEach(input => {
        if (input.id !== 'loadStatementId') {
            input.disabled = lock;
            if (input.tagName === 'INPUT') {
                input.readOnly = lock;
            }
        }
    });
    
    // Hide action buttons
    document.getElementById('verifyBtn').style.display = lock ? 'none' : 'inline-flex';
    document.querySelectorAll('.remove-btn').forEach(btn => btn.style.display = lock ? 'none' : 'inline-block');
    
    const addRowBtn = document.querySelector('button[onclick="addPendingRow()"]');
    if (addRowBtn) addRowBtn.style.display = lock ? 'none' : 'inline-flex';
    
    const closeBtn = document.querySelector('button[onclick="closeSales()"]');
    if (closeBtn) closeBtn.disabled = lock;
}

function resetForm() {
    window.location.reload();
}
