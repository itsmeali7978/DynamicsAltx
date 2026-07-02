document.addEventListener('DOMContentLoaded', () => {
    // Check if user is logged in
    const userRole = localStorage.getItem('userRole');
    if (!userRole) {
        window.location.href = 'index.html';
        return;
    }

    // Load locations and leave types
    loadLocations();
    loadLeaveTypes();

    // Initialize Flatpickr with 45-day restriction
    const minDateLimit = new Date();
    minDateLimit.setDate(minDateLimit.getDate() - 45);
    
    flatpickr("#leaveDatesInput", {
        mode: "multiple",
        dateFormat: "Y-m-d",
        minDate: minDateLimit,
        maxDate: "today"
    });

    // Event listeners for employee verification
    setupEmployeeValidation();
});

// --- Load Locations ---
async function loadLocations() {
    const selectEl = document.getElementById('location');
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
            
            // Robustly match location (handles if session stored Name instead of Code, or case differences)
            const searchVal = loggedLocation.trim().toLowerCase();
            let matched = false;
            for (let i = 0; i < selectEl.options.length; i++) {
                const opt = selectEl.options[i];
                if (opt.value.toLowerCase() === searchVal || (opt.dataset.name && opt.dataset.name.toLowerCase() === searchVal)) {
                    selectEl.selectedIndex = i;
                    matched = true;
                    break;
                }
            }
            
            if (!matched && userRole !== 'Admin') {
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
    } catch (error) {
        console.error('Error loading locations:', error);
    }
}

// --- Load Leave Types ---
async function loadLeaveTypes() {
    const selectEl = document.getElementById('leaveType');
    if (!selectEl) return;

    try {
        const response = await fetch('/api/AbsenceMarkers/LeaveTypes');
        if (response.ok) {
            const leaveTypes = await response.json();
            selectEl.innerHTML = '<option value="" disabled selected>Select Leave Type...</option>';
            leaveTypes.forEach(lt => {
                const opt = document.createElement('option');
                opt.value = lt.id;
                opt.textContent = `${lt.nameEn} - ${lt.nameAr}`;
                selectEl.appendChild(opt);
            });
        } else {
            selectEl.innerHTML = '<option value="" disabled selected>Failed to load leave types</option>';
        }
    } catch (error) {
        console.error('Error loading leave types:', error);
        selectEl.innerHTML = '<option value="" disabled selected>Failed to load leave types</option>';
    }
}

// --- Validate Employee ID ---
function setupEmployeeValidation() {
    const empIdInput = document.getElementById('empId');
    const empWarning = document.getElementById('empIdWarning');
    const empSuccess = document.getElementById('empIdSuccess');
    const empNameInput = document.getElementById('employeeName');

    if (!empIdInput) return;

    let empIdTimeout = null;

    empIdInput.addEventListener('input', () => {
        clearTimeout(empIdTimeout);
        if (empWarning) empWarning.style.display = 'none';
        if (empSuccess) empSuccess.style.display = 'none';
        if (empNameInput) empNameInput.value = '';
        
        const empId = empIdInput.value.trim();
        if (empId.length >= 2) {
            empIdTimeout = setTimeout(async () => {
                try {
                    const response = await fetch(`/api/AbsenceMarkers/Employee/${empId}`);
                    if (response.ok) {
                        const data = await response.json();
                        if (empNameInput) empNameInput.value = `${data.englishName} / ${data.arabicName}`;
                        if (empSuccess) empSuccess.style.display = 'inline-flex';
                        if (empWarning) empWarning.style.display = 'none';
                    } else {
                        if (empNameInput) empNameInput.value = '';
                        if (empWarning) empWarning.style.display = 'inline-flex';
                        if (empSuccess) empSuccess.style.display = 'none';
                    }
                } catch (error) {
                    console.error('Error validating employee:', error);
                    if (empNameInput) empNameInput.value = '';
                    if (empWarning) empWarning.style.display = 'inline-flex';
                    if (empSuccess) empSuccess.style.display = 'none';
                }
            }, 500);
        }
    });
}



// --- Submit Absence ---
window.submitAbsence = async function() {
    const empId = document.getElementById('empId').value.trim();
    let employeeName = document.getElementById('employeeName').value;
    const leaveTypeId = document.getElementById('leaveType').value;
    let location = document.getElementById('location').value;
    const userRole = localStorage.getItem('userRole');
    if (userRole !== 'Admin') {
        location = localStorage.getItem('userLocation') || location;
    }
    const comments = document.getElementById('comments').value.trim();
    const loggedUser = localStorage.getItem('userName') || 'ERP Admin';

    // Fallback: If they clicked submit before the 500ms auto-validate timeout finished, validate now.
    if (empId && !employeeName) {
        try {
            const response = await fetch(`/api/AbsenceMarkers/Employee/${empId}`);
            if (response.ok) {
                const data = await response.json();
                employeeName = `${data.englishName} / ${data.arabicName}`;
                document.getElementById('employeeName').value = employeeName;
                document.getElementById('empSuccess').style.display = 'inline-flex';
                document.getElementById('empWarning').style.display = 'none';
            }
        } catch (error) {
            console.error('Instant validation failed', error);
        }
    }

    if (!empId || !employeeName) {
        showToast('Please enter and validate Employee Number.', 'warning');
        return;
    }
    if (!leaveTypeId) {
        showToast('Please select a Leave Type.', 'warning');
        return;
    }
    const leaveDatesStr = document.getElementById('leaveDatesInput').value;
    if (!leaveDatesStr) {
        showToast('Please select at least one date.', 'warning');
        return;
    }
    if (!location) {
        showToast('Please select a location.', 'warning');
        return;
    }
    const leaveDatesArr = leaveDatesStr.split(',').map(d => d.trim()).filter(d => d);

    const payload = {
        employeeNo: empId,
        leaveTypeId: parseInt(leaveTypeId),
        leaveDates: leaveDatesArr,
        location: location,
        comments: comments,
        createdUser: loggedUser
    };

    try {
        const response = await fetch('/api/AbsenceMarkers/Create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (response.ok) {
            showToast(result.message || 'Absence marked successfully!', 'success');
            resetForm();
        } else {
            showToast(result.message || 'Failed to mark absence.', 'error');
        }
    } catch (error) {
        console.error('Error submitting absence:', error);
        showToast('An error occurred. Please try again.', 'error');
    }
};

window.resetForm = function() {
    const form = document.getElementById('absenceForm');
    if (form) form.reset();

    const empWarning = document.getElementById('empIdWarning');
    const empSuccess = document.getElementById('empIdSuccess');
    if (empWarning) empWarning.style.display = 'none';
    if (empSuccess) empSuccess.style.display = 'none';

    const fp = document.getElementById('leaveDatesInput')._flatpickr;
    if (fp) fp.clear();

    const locationInput = document.getElementById('location');
    if (locationInput) {
        locationInput.value = localStorage.getItem('userLocation') || 'HO';
    }
};
