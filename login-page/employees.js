/**
 * Employees Management Logic - DynamicsAltx
 */

document.addEventListener('DOMContentLoaded', () => {
    const apiBase = `${window.location.origin}/api/Employees`;
    const apiNationalities = `${window.location.origin}/api/Nationalities`;
    const apiLocations = `${window.location.origin}/api/Locations`;
    const apiShifts = `${window.location.origin}/api/Shifts`;
    
    const userEmail = localStorage.getItem('userEmail');
    const userRole = (localStorage.getItem('userRole') || '').toLowerCase();

    // Elements
    const employeesBody = document.getElementById('employees-body');
    const employeeSearch = document.getElementById('employee-search');
    const btnAddEmployee = document.getElementById('btn-add-employee');
    const employeeModal = document.getElementById('employee-modal');
    const employeeForm = document.getElementById('employee-form');
    const closeModalBtn = document.querySelector('.close-modal');
    const modalTitle = document.getElementById('modal-title');
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    let allEmployees = [];

    // Check Access
    if (userRole !== 'admin') {
        document.querySelector('.employees-container').innerHTML = `
            <div style="text-align:center; padding: 5rem 2rem;">
                <i class="ri-lock-2-line" style="font-size: 4rem; color: #f87171;"></i>
                <h2 style="margin-top: 1rem;">Access Restricted</h2>
                <p>You do not have administrative privileges to access the Employee module.</p>
                <button onclick="location.href='dashboard.html'" class="btn-submit" style="width: auto; margin-top: 2rem;">Return to Dashboard</button>
            </div>
        `;
        return;
    }

    // 1. Initial Load
    async function init() {
        await populateDropdowns();
        await fetchEmployees();
    }

    // 2. Data Fetching
    async function fetchEmployees() {
        try {
            const response = await fetch(`${apiBase}?userEmail=${encodeURIComponent(userEmail)}`);
            if (!response.ok) throw new Error('Failed to fetch employees');
            allEmployees = await response.json();
            renderEmployees(allEmployees);
        } catch (error) {
            console.error(error);
            showToast('Error loading employees', 'error');
        }
    }

    async function populateDropdowns() {
        try {
            // Fetch All Dependencies
            const [nats, locs, shifts] = await Promise.all([
                fetch(`${apiNationalities}?userEmail=${encodeURIComponent(userEmail)}`).then(r => r.json()),
                fetch(`${apiLocations}?userEmail=${encodeURIComponent(userEmail)}`).then(r => r.json()),
                fetch(`${apiShifts}?userEmail=${encodeURIComponent(userEmail)}`).then(r => r.json())
            ]);

            const natSelect = document.getElementById('nationality-dropdown');
            const locSelect = document.getElementById('location-dropdown');
            const shiftSelect = document.getElementById('shift-dropdown');

            nats.forEach(n => natSelect.innerHTML += `<option value="${n.code}">${n.name}</option>`);
            locs.forEach(l => locSelect.innerHTML += `<option value="${l.locationCode}">${l.locationName}</option>`);
            shifts.forEach(s => shiftSelect.innerHTML += `<option value="${s.shiftNo}">${s.shiftNo} - ${s.shiftTime}</option>`);
        } catch (err) {
            console.error('Dropdown population failed:', err);
        }
    }

    // 3. UI Rendering
    function renderEmployees(list) {
        if (list.length === 0) {
            employeesBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-muted);">No employee records found.</td></tr>`;
            return;
        }

        employeesBody.innerHTML = list.map(emp => `
            <tr>
                <td><strong>#${emp.empId}</strong></td>
                <td>
                    <div class="emp-profile">
                        <div class="emp-avatar">${emp.englishName.charAt(0)}</div>
                        <div class="emp-details">
                            <div style="font-weight:600;">${emp.englishName}</div>
                            <div style="font-size:0.75rem; color:var(--text-muted);">${emp.jobTitle || emp.profession || 'N/A'}</div>
                        </div>
                    </div>
                </td>
                <td>${emp.nationalityCode || 'N/A'}</td>
                <td>
                    <div>${emp.locationCode || 'N/A'}</div>
                    <div style="font-size:0.75rem; color:var(--text-muted);">${emp.shiftNo || 'No Shift'}</div>
                </td>
                <td>
                    <span class="status-badge ${emp.status === 'Active' ? 'status-active' : 'status-passive'}">
                        ${emp.status}
                    </span>
                </td>
                <td class="actions-cell">
                    <button class="action-btn btn-edit" title="Edit" onclick="editEmployee(${emp.empId})">
                        <i class="ri-edit-line"></i>
                    </button>
                    <button class="action-btn btn-delete" title="Delete" onclick="deleteEmployee(${emp.empId})">
                        <i class="ri-delete-bin-line"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    // 4. Tab Logic
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            btn.classList.add('active');
            const tabId = `tab-${btn.dataset.tab}`;
            document.getElementById(tabId).classList.add('active');
        });
    });

    // 5. Modal Logic
    if (btnAddEmployee && employeeModal) {
        btnAddEmployee.addEventListener('click', () => {
            console.log('[Employees] Add button clicked');
            modalTitle.textContent = 'Add New Employee Record';
            employeeForm.reset();
            document.getElementById('is-edit').value = 'false';
            document.getElementById('emp-id').readOnly = false;
            
            // Reset tabs to first
            if (tabBtns.length > 0) tabBtns[0].click();
            
            employeeModal.classList.add('active');
            console.log('[Employees] Modal class "active" added');
        });
    } else {
        console.error('[Employees] Required elements not found:', { btnAddEmployee, employeeModal });
    }

    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            employeeModal.classList.remove('active');
        });
    }

    // 6. Form Submission
    employeeForm.onsubmit = async (e) => {
        e.preventDefault();
        
        const isEdit = document.getElementById('is-edit').value === 'true';
        const empId = parseInt(document.getElementById('emp-id').value);

        // Map all fields from form to object
        const data = {
            empId: empId,
            englishName: document.getElementById('english-name').value,
            arabicName: document.getElementById('arabic-name').value,
            nationalityCode: document.getElementById('nationality-dropdown').value,
            gender: document.getElementById('gender').value,
            mobileNo: document.getElementById('mobile-no').value,
            dob: document.getElementById('dob').value || null,
            profession: document.getElementById('profession').value,
            jobTitle: document.getElementById('job-title').value,
            locationCode: document.getElementById('location-dropdown').value,
            shiftNo: document.getElementById('shift-dropdown').value,
            section: document.getElementById('section').value,
            bloodGroup: document.getElementById('blood-group').value,
            iqamaExpiryGrego: document.getElementById('iqama-expiry-grego').value || null,
            iqamaExpiryHijiri: document.getElementById('iqama-expiry-hijiri').value || null,
            iqamaNo: document.getElementById('iqama-no').value,
            passportNo: document.getElementById('passport-no').value,
            passportExpiry: document.getElementById('passport-expiry').value || null,
            dateOfJoin: document.getElementById('join-date').value || null,
            status: document.getElementById('employment-status').value,
            healthMedicalDate: document.getElementById('health-medical-date').value || null,
            healthMadrasaDate: document.getElementById('health-madrasa-date').value || null,
            healthStatus: document.getElementById('health-status').value
        };

        const url = isEdit ? `${apiBase}/${empId}?userEmail=${encodeURIComponent(userEmail)}` : `${apiBase}?userEmail=${encodeURIComponent(userEmail)}`;
        const method = isEdit ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Operation failed');
            }

            showToast(`Employee ${isEdit ? 'updated' : 'added'} successfully`, 'success');
            employeeModal.classList.remove('active');
            fetchEmployees();
        } catch (error) {
            showToast(error.message, 'error');
        }
    };

    // 7. Global Actions
    window.editEmployee = async (id) => {
        try {
            const response = await fetch(`${apiBase}/${id}?userEmail=${encodeURIComponent(userEmail)}`);
            const emp = await response.json();

            modalTitle.textContent = `Edit Employee #${emp.empId}`;
            document.getElementById('is-edit').value = 'true';
            document.getElementById('emp-id').value = emp.empId;
            document.getElementById('emp-id').readOnly = true;

            // Fill all fields
            document.getElementById('english-name').value = emp.englishName || '';
            document.getElementById('arabic-name').value = emp.arabicName || '';
            document.getElementById('nationality-dropdown').value = emp.nationalityCode || '';
            document.getElementById('gender').value = emp.gender || 'Male';
            document.getElementById('mobile-no').value = emp.mobileNo || '';
            document.getElementById('dob').value = emp.dob ? emp.dob.split('T')[0] : '';
            document.getElementById('profession').value = emp.profession || '';
            document.getElementById('job-title').value = emp.jobTitle || '';
            document.getElementById('location-dropdown').value = emp.locationCode || '';
            document.getElementById('shift-dropdown').value = emp.shiftNo || '';
            document.getElementById('section').value = emp.section || '';
            document.getElementById('blood-group').value = emp.bloodGroup || '';
            document.getElementById('iqama-expiry-grego').value = emp.iqamaExpiryGrego ? emp.iqamaExpiryGrego.split('T')[0] : '';
            document.getElementById('iqama-expiry-hijiri').value = emp.iqamaExpiryHijiri || '';
            document.getElementById('iqama-no').value = emp.iqamaNo || '';
            document.getElementById('passport-no').value = emp.passportNo || '';
            document.getElementById('passport-expiry').value = emp.passportExpiry ? emp.passportExpiry.split('T')[0] : '';
            document.getElementById('join-date').value = emp.dateOfJoin ? emp.dateOfJoin.split('T')[0] : '';
            document.getElementById('employment-status').value = emp.status || 'Active';
            document.getElementById('health-medical-date').value = emp.healthMedicalDate ? emp.healthMedicalDate.split('T')[0] : '';
            document.getElementById('health-madrasa-date').value = emp.healthMadrasaDate ? emp.healthMadrasaDate.split('T')[0] : '';
            document.getElementById('health-status').value = emp.healthStatus || 'Active';

            tabBtns[0].click();
            employeeModal.classList.add('active');
        } catch (err) {
            showToast('Error loading employee details', 'error');
        }
    };

    window.deleteEmployee = async (id) => {
        const confirmed = await showConfirm(`Are you sure you want to delete employee #${id}? This action cannot be undone.`, 'Delete Employee');
        if (!confirmed) return;

        try {
            const response = await fetch(`${apiBase}/${id}?userEmail=${encodeURIComponent(userEmail)}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                showToast('Employee deleted successfully', 'success');
                fetchEmployees();
            } else {
                throw new Error('Deletion failed');
            }
        } catch (error) {
            showToast(error.message, 'error');
        }
    };

    // 8. Search Logic
    employeeSearch.oninput = (e) => {
        const term = e.target.value.toLowerCase().trim();
        const filtered = allEmployees.filter(emp => 
            emp.empId.toString() === term || // Exact ID match
            emp.empId.toString().startsWith(term) || // ID starts with
            emp.englishName.toLowerCase().includes(term) || // Name contains (partial)
            (emp.mobileNo && emp.mobileNo.replace(/\s/g, '').startsWith(term)) // Mobile starts with
        );
        renderEmployees(filtered);
    };

    init();
});
