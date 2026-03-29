document.addEventListener('DOMContentLoaded', () => {
    const fetchBtn = document.getElementById('fetch-btn');
    const voucherInput = document.getElementById('voucher-input');
    let currentVoucherDate = null; // Store for posting
    const detailsCard = document.getElementById('details-card');
    const postSection = document.getElementById('post-section');
    const postForm = document.getElementById('post-form');
    const messageContainer = document.getElementById('message-container');

    // API Base URL (relative to match common pattern)
    const API_BASE = '/api/Voucher';

    const showMessage = (msg, type = 'info') => {
        messageContainer.innerHTML = `
            <div class="info-message ${type}" style="display: flex;">
                <i class="ri-${type === 'success' ? 'checkbox-circle' : type === 'error' ? 'error-warning' : 'information'}-line"></i>
                <span>${msg}</span>
            </div>
        `;
        setTimeout(() => {
            // Optional: auto-hide after some time
        }, 5000);
    };

    const clearMessage = () => {
        messageContainer.innerHTML = '';
    };

    fetchBtn.addEventListener('click', async () => {
        const voucherNo = voucherInput.value.trim();
        if (!voucherNo) {
            showMessage('Please enter a voucher number.', 'warning');
            return;
        }

        clearMessage();
        fetchBtn.disabled = true;
        fetchBtn.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> <span>Fetching...</span>';

        try {
            const response = await fetch(`${API_BASE}/fetch/${voucherNo}`);
            const data = await response.json();

            if (!response.ok) {
                showMessage(data.message || 'Error fetching voucher.', 'error');
                detailsCard.style.display = 'none';
                return;
            }

            // Populate details
            document.getElementById('v-no').textContent = data.voucherNo;
            const vDate = data.createdDate ? new Date(data.createdDate) : null;
            document.getElementById('v-date').textContent = vDate ? 
                (`${vDate.getDate().toString().padStart(2, '0')}/${(vDate.getMonth() + 1).toString().padStart(2, '0')}/${vDate.getFullYear()}`) : 'N/A';
            currentVoucherDate = data.createdDate;
            
            // Using the official new Saudi Riyal symbol SVG
            const riyalSvg = `
                <svg viewBox="0 0 1124.14 1256.39" style="height: 0.9em; width: auto; vertical-align: middle; fill: currentColor; margin-right: 4px;">
                    <path d="M699.62,1113.02h0c-20.06,44.48-33.32,92.75-38.4,143.37l424.51-90.24c20.06-44.47,33.31-92.75,38.4-143.37l-424.51,90.24Z"/>
                    <path d="M1085.73,895.8c20.06-44.47,33.32-92.75,38.4-143.37l-330.68,70.33v-135.2l292.27-62.11c20.06-44.47,33.32-92.75,38.4-143.37l-330.68,70.27V66.13c-50.67,28.45-95.67,66.32-132.25,110.99v403.35l-132.25,28.11V0c-50.67,28.44-95.67,66.32-132.25,110.99v525.69l-295.91,62.88c-20.06,44.47-33.33,92.75-38.42,143.37l334.33-71.05v170.26l-358.3,76.14c-20.06,44.47-33.32,92.75-38.4,143.37l375.04-79.7c30.53-6.35,56.77-24.4,73.83-49.24l68.78-101.97v-.02c7.14-10.55,11.3-23.27,11.3-36.97v-149.98l132.25-28.11v270.4l424.53-90.28Z"/>
                </svg>`;
            
            const formattedAmount = new Intl.NumberFormat('en-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(data.amount);
            document.getElementById('v-amount').innerHTML = `${riyalSvg}${formattedAmount}`;

            // Populate visual voucher
            document.getElementById('vv-no').textContent = data.voucherNo;
            document.getElementById('vv-date').textContent = document.getElementById('v-date').textContent;
            document.getElementById('vv-amount').innerHTML = `${riyalSvg}${formattedAmount}`;
            document.getElementById('visual-voucher').style.display = 'block';

            detailsCard.style.display = 'block';
            postSection.style.display = 'block';
            
            // Set default date to today
            document.getElementById('trans-date').valueAsDate = new Date();

        } catch (error) {
            console.error('Fetch error:', error);
            showMessage('Connection error. Is the backend running?', 'error');
        } finally {
            fetchBtn.disabled = false;
            fetchBtn.innerHTML = '<i class="ri-search-eye-line"></i> <span>Fetch Details</span>';
        }
    });

    postForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const voucherNo = voucherInput.value.trim();
        const transDate = document.getElementById('trans-date').value;
        const currentUser = localStorage.getItem('userEmail') || 'admin@example.com'; // Fallback for testing

        const submitBtn = postForm.querySelector('.btn-post');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> <span>Posting...</span>';

        try {
            const response = await fetch(`${API_BASE}/post`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    voucherNo,
                    createdDate: currentVoucherDate,
                    transDate,
                    createdUser: currentUser
                })
            });

            const data = await response.json();

            if (response.ok) {
                showMessage(data.message, 'success');
                // Optional: reset UI
                setTimeout(() => {
                    detailsCard.style.display = 'none';
                    voucherInput.value = '';
                }, 2000);
            } else {
                showMessage(data.message || 'Error posting voucher.', 'error');
            }
        } catch (error) {
            console.error('Post error:', error);
            showMessage('Connection error during posting.', 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="ri-send-plane-fill"></i> <span>Post to ERP Database</span>';
        }
    });
});
