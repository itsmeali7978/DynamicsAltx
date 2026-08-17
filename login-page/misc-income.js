document.addEventListener('DOMContentLoaded', () => {
    // Set default date to today
    const dateInput = document.getElementById('trans-date');
    if (dateInput) {
        dateInput.valueAsDate = new Date();
    }

    loadBalance();

    const form = document.getElementById('misc-income-form');
    if (form) {
        form.addEventListener('submit', handlePostEntry);
    }
});

async function handlePostEntry(e) {
    e.preventDefault();

    const entryType = document.getElementById('entry-type').value;
    const amount = parseFloat(document.getElementById('amount').value);
    const transDate = document.getElementById('trans-date').value;
    const remarks = document.getElementById('remarks').value;

    if (!entryType || isNaN(amount) || amount <= 0 || !transDate) {
        showMessage('Please fill all mandatory fields correctly.', 'error');
        return;
    }

    const btn = document.getElementById('btn-post');
    btn.disabled = true;
    btn.innerHTML = '<i class="ri-loader-4-line ri-spin"></i><span>POSTING...</span>';

    const payload = {
        entryType,
        amount,
        remarks,
        transactionDate: transDate
    };

    try {
        const response = await fetch('/api/MiscellaneousIncome/post', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (response.ok) {
            showMessage('Entry saved successfully!', 'success');
            document.getElementById('misc-income-form').reset();
            // Reset date to today
            document.getElementById('trans-date').valueAsDate = new Date();
            
            // Refresh widgets
            loadBalance();
        } else {
            showMessage(data.message || 'Error saving entry.', 'error');
        }
    } catch (err) {
        console.error('Error posting entry:', err);
        showMessage('Network error while saving entry.', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="ri-save-line"></i><span>POST ENTRY</span>';
    }
}

async function loadBalance() {
    try {
        const response = await fetch('/api/MiscellaneousIncome/balance');
        if (!response.ok) throw new Error('Failed to fetch balance');
        
        const data = await response.json();
        
        const balanceEl = document.getElementById('current-balance');
        if (balanceEl) {
            // Format as currency
            const formatter = new Intl.NumberFormat('en-SA', {
                style: 'currency',
                currency: 'SAR'
            });
            balanceEl.textContent = formatter.format(data.balance);
            
            if (data.balance < 0) {
                balanceEl.style.color = '#fee2e2'; // Light red for negative balance
            } else {
                balanceEl.style.color = 'white';
            }
        }
    } catch (err) {
        console.error('Error loading balance:', err);
    }
}

function showMessage(msg, type) {
    const msgContainer = document.getElementById('message-container');
    if (!msgContainer) return;
    
    msgContainer.className = `info-message ${type}`;
    
    let icon = 'ri-information-fill';
    if (type === 'error') icon = 'ri-error-warning-fill';
    if (type === 'success') icon = 'ri-checkbox-circle-fill';
    if (type === 'warning') icon = 'ri-alert-fill';

    msgContainer.innerHTML = `<i class="${icon}"></i> <span>${msg}</span>`;
    msgContainer.style.display = 'flex';

    // Auto hide after 5 seconds
    setTimeout(() => {
        msgContainer.style.display = 'none';
    }, 5000);
}
