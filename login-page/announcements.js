/**
 * DynamicsAltx - System Announcements Management Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    const userRole = localStorage.getItem('userRole');
    
    // Safety check for non-admins (though common.js should hide the menu)
    if (userRole && userRole.toLowerCase() !== 'admin') {
        window.location.href = 'dashboard.html';
        return;
    }

    const annForm = document.getElementById('announcement-form');
    const annList = document.getElementById('active-announcements-list');

    const fetchAnnouncementsView = async () => {
        try {
            const res = await fetch('/api/Announcements');
            const data = await res.json();
            annList.innerHTML = '';
            
            if (data.length === 0) {
                annList.innerHTML = '<p style="font-size: 0.85rem; color: var(--text-muted); padding: 1rem;">No active announcements.</p>';
                return;
            }

            data.forEach(ann => {
                const li = document.createElement('li');
                li.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 1rem; background: #f8fafc; border-radius: 12px; margin-bottom: 0.75rem; border: 1px solid var(--border-color); transition: var(--transition);';
                
                let typeIcon = 'ri-information-line';
                let typeColor = 'var(--primary)';
                if (ann.type === 'Success') { typeIcon = 'ri-checkbox-circle-line'; typeColor = 'var(--success)'; }
                if (ann.type === 'Warning') { typeIcon = 'ri-error-warning-line'; typeColor = 'var(--orange)'; }

                li.innerHTML = `
                    <div style="display: flex; gap: 1rem; align-items: center; flex: 1;">
                        <i class="${typeIcon}" style="font-size: 1.5rem; color: ${typeColor};"></i>
                        <div>
                            <div style="font-weight: 600; font-size: 0.95rem; color: var(--text-main);">${ann.title}</div>
                            <div style="font-size: 0.85rem; color: var(--text-muted);">${ann.content}</div>
                        </div>
                    </div>
                    <button class="icon-btn" onclick="deleteAnnouncement(${ann.id})" style="color: var(--error); background: rgba(239, 68, 68, 0.1); border: none; cursor: pointer; padding: 8px; border-radius: 8px;">
                        <i class="ri-delete-bin-line"></i>
                    </button>
                `;
                annList.appendChild(li);
            });
        } catch (err) {
            console.error('Error fetching announcements list:', err);
        }
    };

    window.deleteAnnouncement = async (id) => {
        const confirmed = await showConfirm('Are you sure you want to remove this announcement?', 'Confirm Deletion');
        if (confirmed) {
            try {
                await fetch(`/api/Announcements/${id}`, { method: 'DELETE' });
                fetchAnnouncementsView();
                showToast('Announcement removed', 'info');
            } catch (e) {
                showToast('Failed to delete', 'error');
            }
        }
    };

    annForm.onsubmit = async (e) => {
        e.preventDefault();
        const payload = {
            title: document.getElementById('ann-title').value,
            content: document.getElementById('ann-content').value,
            type: document.getElementById('ann-type').value
        };

        try {
            const res = await fetch('/api/Announcements', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                showToast('Announcement posted!', 'success');
                annForm.reset();
                fetchAnnouncementsView();
            } else {
                showToast('Failed to post', 'error');
            }
        } catch (err) {
            showToast('Connection error', 'error');
        }
    };

    fetchAnnouncementsView();
});
