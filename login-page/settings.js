/**
 * DynamicsAltx - Account Settings Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    const passwordForm = document.getElementById('password-form');
    const userEmail = localStorage.getItem('userEmail');

    if (!userEmail) {
        showToast('Session expired. Please log in again.', 'error');
        setTimeout(() => window.location.href = 'index.html', 2000);
        return;
    }

    passwordForm.onsubmit = async (e) => {
        e.preventDefault();

        const currentPass = document.getElementById('current-pass').value;
        const newPass = document.getElementById('new-pass').value;
        const confirmPass = document.getElementById('confirm-pass').value;

        if (newPass !== confirmPass) {
            showToast('New passwords do not match', 'error');
            return;
        }

        if (currentPass === newPass) {
            showToast('New password must be different from the old one', 'warning');
            return;
        }

        try {
            const payload = {
                email: userEmail,
                currentPassword: currentPass,
                newPassword: newPass
            };

            const response = await fetch('/api/Users/change-password', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                showToast('Password updated! Redirecting to login...', 'success');
                localStorage.clear();
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 2000);
            } else {
                const err = await response.json();
                showToast(err.message || 'Update failed', 'error');
            }
        } catch (error) {
            console.error('Password update error:', error);
            showToast('Connection failed', 'error');
        }
    };
});
