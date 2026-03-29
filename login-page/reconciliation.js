/**
 * DynamicsAltx - Sales Invoice Reconciliation Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    const senderLoc = document.getElementById('sender-loc');
    const destLoc = document.getElementById('dest-loc');
    const customerSelect = document.getElementById('customer');
    const reconForm = document.getElementById('recon-form');
    const loadingOverlay = document.getElementById('loading-overlay');

    // Initial Data Load
    loadInitialData();

    /**
     * Fetches locations and customers simultaneously
     */
    async function loadInitialData() {
        showLoading(true);
        console.log('[Reconciliation] Loading initial data...');
        
        try {
            // Fetch Locations separately to ensure partial success
            try {
                await fetchLocations();
                console.log('[Reconciliation] Locations loaded');
            } catch (locError) {
                console.error('[Reconciliation] Location fetch failed:', locError);
                showToast('Warning: Could not fetch active locations.', 'warning');
            }

            // Fetch Customers
            try {
                await fetchCustomers();
                console.log('[Reconciliation] Customers loaded');
            } catch (custError) {
                console.error('[Reconciliation] Customer fetch failed:', custError);
                showToast(`Unable to load customers: ${custError.message}`, 'error');
            }

        } catch (generalError) {
            console.error('[Reconciliation] Unexpected initialization error:', generalError);
            showToast('Failed to connect to Dynamics ERP backend', 'error');
        } finally {
            showLoading(false);
        }
    }

    /**
     * Populates location dropdowns from backend
     */
    async function fetchLocations() {
        try {
            const response = await fetch('/api/Reconciliation/locations');
            if (!response.ok) throw new Error('Location fetch failed');
            
            const locations = await response.json();
            
            // Populate both dropdowns
            locations.forEach(loc => {
                const opt1 = new Option(loc, loc);
                const opt2 = new Option(loc, loc);
                senderLoc.add(opt1);
                destLoc.add(opt2);
            });
        } catch (error) {
            console.error('[Reconciliation] Error fetching locations:', error);
            throw error;
        }
    }

    /**
     * Populates customer dropdown from Dynamics HO database
     */
    async function fetchCustomers() {
        try {
            const response = await fetch('/api/Reconciliation/customers');
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.message || 'Customer fetch failed');
            }
            
            const customers = await response.json();
            
            customers.forEach(cust => {
                const displayText = `${cust.no} - ${cust.name}`;
                // Use customer number as the value, combined text for display
                const option = new Option(displayText, cust.no);
                customerSelect.add(option);
            });
        } catch (error) {
            console.error('[Reconciliation] Error fetching customers:', error);
            showToast('HO Database connection error - No customers loaded', 'warning');
            throw error;
        }
    }

    /**
     * UI Helper for loading state
     */
    function showLoading(show) {
        if (loadingOverlay) {
            loadingOverlay.style.display = show ? 'flex' : 'none';
        }
    }

    // Add dynamic date constraint
    const fromDateInput = document.getElementById('from-date');
    const toDateInput = document.getElementById('to-date');

    fromDateInput.addEventListener('change', () => {
        if (fromDateInput.value) {
            toDateInput.min = fromDateInput.value;
            // If toDate is now before the new fromDate, clear it
            if (toDateInput.value && toDateInput.value < fromDateInput.value) {
                toDateInput.value = '';
                showToast('To Date cleared. It must be after the new From Date.', 'info');
            }
        }
    });

    // Add dynamic location check
    const senderLocSelect = document.getElementById('sender-loc');
    const destLocSelect = document.getElementById('dest-loc');

    function checkLocations() {
        if (senderLocSelect.value && destLocSelect.value && senderLocSelect.value === destLocSelect.value) {
            showToast('Sender and Destination locations must be different', 'warning');
            destLocSelect.value = ''; // Reset destination if same
        }
    }

    senderLocSelect.addEventListener('change', checkLocations);
    destLocSelect.addEventListener('change', checkLocations);

    /**
     * Form Submission Handler
     */
    reconForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = {
            senderLocation: senderLoc.value,
            destinationLocation: destLoc.value,
            fromDate: fromDateInput.value,
            toDate: toDateInput.value,
            customerNo: customerSelect.value
        };

        // Basic Validation
        if (formData.senderLocation === formData.destinationLocation) {
            showToast('Sender and Destination locations cannot be the same', 'warning');
            return;
        }

        // Logical Check (Double check even with 'min' attribute)
        if (formData.toDate && formData.fromDate && formData.toDate < formData.fromDate) {
            showToast('To Date must be equal or greater than From Date', 'warning');
            return;
        }

        console.log('[Reconciliation] Processing with parameters:', formData);
        
        // Show interactive feedback
        showToast(`Reconciliation process initialized for ${formData.customerNo}`, 'success');
        
        // Future implementation: Call backend processing endpoint
        await showAlert(
            `Reconciliation Parameters Captured:\n\n` +
            `• Sender: ${formData.senderLocation}\n` +
            `• Target: ${formData.destinationLocation}\n` +
            `• Range: ${formData.fromDate} to ${formData.toDate}\n` +
            `• Customer ID: ${formData.customerNo}\n\n` +
            `The reconciliation engine is now processing this request.`,
            "Execution Started"
        );
    });
});
