// API Base URL - update if needed, but relative should work since frontend and backend are served together
const API_BASE_URL = 'http://localhost:5047/api'; 
// Wait, actually, since frontend is served from the backend, we can just use '/api'. 
// But let's use the full URL if we are testing locally or just '/api'.
const BASE_URL = '/api';

document.addEventListener('DOMContentLoaded', () => {
    // Form Elements
    const empIdInput = document.getElementById('empId');
    const employeeNameInput = document.getElementById('employeeName');
    const breakStartInput = document.getElementById('breakStart');
    const breakEndInput = document.getElementById('breakEnd');
    const btnCreate = document.getElementById('btnCreate');
    const btnCloseEvent = document.getElementById('btnCloseEvent');
    const btnCancel = document.getElementById('btnCancel');
    const tableBody = document.getElementById('openBreaksTableBody');
    const empIdError = document.getElementById('empIdError');
    const breakIdInput = document.getElementById('breakId');

    // State
    let isClosingMode = false;
    let fetchTimeout = null;

    // Set default break start time to current time
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    breakStartInput.value = now.toISOString().slice(0, 16);

    // Initial Load
    fetchOpenBreaks();

    // Event Listeners
    empIdInput.addEventListener('input', (e) => {
        clearTimeout(fetchTimeout);
        empIdError.style.display = 'none';
        employeeNameInput.value = '';
        
        const val = e.target.value.trim();
        if (val.length >= 2) {
            fetchTimeout = setTimeout(() => {
                fetchEmployeeName(val);
            }, 500);
        }
    });

    btnCreate.addEventListener('click', handleCreateBreak);
    btnCloseEvent.addEventListener('click', handleCloseEvent);
    btnCancel.addEventListener('click', resetForm);

    // --- Functions ---

    async function fetchEmployeeName(empId) {
        try {
            const response = await fetch(`${BASE_URL}/ShortBreaks/Employee/${empId}`);
            if (response.ok) {
                const data = await response.json();
                employeeNameInput.value = data.employeeName;
            } else {
                employeeNameInput.value = '';
                empIdError.textContent = 'Employee not found.';
                empIdError.style.display = 'block';
            }
        } catch (error) {
            console.error('Error fetching employee:', error);
        }
    }

    async function fetchOpenBreaks() {
        try {
            const response = await fetch(`${BASE_URL}/ShortBreaks/Open`);
            if (response.ok) {
                const data = await response.json();
                renderTable(data);
            }
        } catch (error) {
            console.error('Error fetching open breaks:', error);
            tableBody.innerHTML = `<tr><td colspan="5" class="text-error" style="text-align:center;">Failed to load open breaks.</td></tr>`;
        }
    }

    function renderTable(breaks) {
        if (breaks.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; color: var(--text-secondary);">No open breaks found.</td></tr>`;
            return;
        }

        tableBody.innerHTML = '';
        breaks.forEach(b => {
            const row = document.createElement('tr');
            row.className = 'table-row';
            row.dataset.id = b.id;
            
            // Format date
            const startDate = new Date(b.breakStart);
            const formattedDate = startDate.toLocaleString();

            row.innerHTML = `
                <td>#${b.id}</td>
                <td>${b.empId}</td>
                <td>${b.employeeName}</td>
                <td>${formattedDate}</td>
                <td><span class="status-pill warning">${b.status}</span></td>
            `;

            // Double click to close event
            row.addEventListener('dblclick', () => {
                selectRowForClosing(b, row);
            });

            tableBody.appendChild(row);
        });
    }

    function selectRowForClosing(breakData, rowElement) {
        // Highlight row
        document.querySelectorAll('.table-row').forEach(r => r.classList.remove('selected'));
        rowElement.classList.add('selected');

        // Populate Form
        isClosingMode = true;
        breakIdInput.value = breakData.id;
        empIdInput.value = breakData.empId;
        employeeNameInput.value = breakData.employeeName;
        
        // Format breakStart for datetime-local
        const startDate = new Date(breakData.breakStart);
        startDate.setMinutes(startDate.getMinutes() - startDate.getTimezoneOffset());
        breakStartInput.value = startDate.toISOString().slice(0, 16);
        
        // Disable creation fields, enable closing fields
        empIdInput.disabled = true;
        breakStartInput.disabled = true;
        
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        breakEndInput.value = now.toISOString().slice(0, 16);
        breakEndInput.disabled = false;

        // Toggle buttons
        btnCreate.disabled = true;
        btnCloseEvent.disabled = false;
        btnCancel.style.display = 'flex';
    }

    function resetForm() {
        isClosingMode = false;
        document.querySelectorAll('.table-row').forEach(r => r.classList.remove('selected'));
        
        document.getElementById('shortBreakForm').reset();
        breakIdInput.value = '';
        
        empIdInput.disabled = false;
        breakStartInput.disabled = false;
        breakEndInput.disabled = true;

        btnCreate.disabled = false;
        btnCloseEvent.disabled = true;
        btnCancel.style.display = 'none';
        empIdError.style.display = 'none';

        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        breakStartInput.value = now.toISOString().slice(0, 16);
    }

    async function handleCreateBreak() {
        const empId = empIdInput.value.trim();
        const breakStart = breakStartInput.value;

        if (!empId || !breakStart) {
            showToast('Please enter Employee Number and Break Start Time.', 'warning');
            return;
        }
        if (!employeeNameInput.value) {
            showToast('Invalid Employee Number.', 'error');
            return;
        }

        try {
            const response = await fetch(`${BASE_URL}/ShortBreaks/Create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ empId, breakStart })
            });

            const data = await response.json();
            
            if (response.ok) {
                showToast('Break started successfully!', 'success');
                resetForm();
                fetchOpenBreaks();
            } else {
                showToast(data.message || 'Failed to create break.', 'error');
            }
        } catch (error) {
            console.error('Error creating break:', error);
            showToast('A network error occurred.', 'error');
        }
    }

    async function handleCloseEvent() {
        if (!isClosingMode) return;
        
        const id = breakIdInput.value;
        const breakEnd = breakEndInput.value;

        if (!breakEnd) {
            showToast('Please select a Break End time.', 'warning');
            return;
        }

        try {
            const response = await fetch(`${BASE_URL}/ShortBreaks/Close/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ breakEnd })
            });

            const data = await response.json();
            
            if (response.ok) {
                showToast(`Break closed successfully! Time spent: ${data.totalMinutes} minutes.`, 'success');
                resetForm();
                fetchOpenBreaks();
            } else {
                showToast(data.message || 'Failed to close break.', 'error');
            }
        } catch (error) {
            console.error('Error closing break:', error);
            showToast('A network error occurred.', 'error');
        }
    }
});
