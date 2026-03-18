/**
 * DynamicsAltx - Shared common logic for all pages
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Sidebar Toggle Logic (Desktop & Mobile)
    const erpApp = document.querySelector('.erp-app');
    const sidebar = document.querySelector('.sidebar');
    const desktopToggle = document.getElementById('sidebar-toggle');
    const mobileToggle = document.getElementById('mobile-menu-btn');

    console.log('[DynamicsAltx] UI elements check:', {
        erpApp: !!erpApp,
        sidebar: !!sidebar,
        desktopToggle: !!desktopToggle,
        mobileToggle: !!mobileToggle
    });

    // Create and append overlay if it doesn't exist (for mobile menu)
    let overlay = document.querySelector('.sidebar-overlay');
    if (!overlay && erpApp) {
        overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        erpApp.appendChild(overlay);
        console.log('[DynamicsAltx] Created sidebar-overlay');
    }

    // Desktop Collapse Toggle
    if (desktopToggle && sidebar) {
        desktopToggle.addEventListener('click', () => {
            console.log('[DynamicsAltx] Desktop toggle clicked');
            sidebar.classList.toggle('collapsed');
            const icon = desktopToggle.querySelector('i');
            if (sidebar.classList.contains('collapsed')) {
                icon.className = 'ri-menu-unfold-line';
            } else {
                icon.className = 'ri-menu-fold-line';
            }
        });
    }

    // Mobile Menu Toggle
    if (mobileToggle && sidebar && overlay) {
        mobileToggle.addEventListener('click', (e) => {
            console.log('[DynamicsAltx] Mobile toggle clicked');
            e.preventDefault();
            e.stopPropagation();
            sidebar.classList.add('mobile-open');
            overlay.classList.add('active');
        });
    }

    // Close mobile menu when clicking overlay
    if (overlay) {
        overlay.addEventListener('click', () => {
            console.log('[DynamicsAltx] Overlay clicked, closing sidebar');
            sidebar.classList.remove('mobile-open');
            overlay.classList.remove('active');
        });
    }

    // 2. Shared User Info logic
    const userName = localStorage.getItem('userName') || 'ERP Admin';
    const userLocation = localStorage.getItem('userLocation') || 'Main Office';
    
    const sidebarUserNames = document.querySelectorAll('.user-name');
    const sidebarUserRoles = document.querySelectorAll('.user-role');
    
    sidebarUserNames.forEach(el => el.innerText = userName);
    sidebarUserRoles.forEach(el => el.innerText = userLocation);

    const logoutBtns = document.querySelectorAll('.logout-btn');
    logoutBtns.forEach(btn => {
        // If it's a button with icons (like in some sidebars), update title
        btn.title = `Logout (${userName})`;
        
        // Handle click
        btn.addEventListener('click', () => {
            localStorage.clear();
            window.location.href = 'index.html';
        });
    });

    // 3. Navigation Group (Submenu) Logic
    const groupHeaders = document.querySelectorAll('.group-header');
    groupHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const group = header.parentElement;
            group.classList.toggle('expanded');
        });
    });

    // Auto-expand the active group
    const activeLink = document.querySelector('.nav-item.active, .submenu li a.active');
    if (activeLink) {
        const parentGroup = activeLink.closest('.nav-group');
        if (parentGroup) {
            parentGroup.classList.add('expanded');
        }
    }
});

/**
 * Modern UI Notifications Logic
 */

// 1. Toast Notification System
window.showToast = function(message, type = 'info') {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = 'ri-info-card-line';
    let title = 'Notification';
    
    if (type === 'success') { icon = 'ri-checkbox-circle-line'; title = 'Success'; }
    if (type === 'error') { icon = 'ri-error-warning-line'; title = 'Error'; }
    if (type === 'warning') { icon = 'ri-alert-line'; title = 'Warning'; }

    toast.innerHTML = `
        <i class="${icon}"></i>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        </div>
    `;

    container.appendChild(toast);

    // Auto remove
    const timer = setTimeout(() => {
        removeToast(toast);
    }, 4000);

    toast.onclick = () => {
        clearTimeout(timer);
        removeToast(toast);
    };
};

function removeToast(toast) {
    toast.classList.add('removing');
    toast.addEventListener('animationend', () => {
        toast.remove();
    });
}

// 2. Custom Confirmation Modal System
window.showConfirm = function(message, title = 'Are you sure?') {
    return new Promise((resolve) => {
        let overlay = document.querySelector('.confirm-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'confirm-overlay';
            overlay.innerHTML = `
                <div class="confirm-modal">
                    <div class="confirm-icon">
                        <i class="ri-question-line"></i>
                    </div>
                    <h3 id="confirm-title">Confirmation</h3>
                    <p id="confirm-message">Message goes here...</p>
                    <div class="confirm-actions">
                        <button class="confirm-btn confirm-btn-cancel" id="confirm-btn-no">Cancel</button>
                        <button class="confirm-btn confirm-btn-confirm" id="confirm-btn-yes">Yes, Proceed</button>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);
        }

        const titleEl = overlay.querySelector('#confirm-title');
        const messageEl = overlay.querySelector('#confirm-message');
        const btnYes = overlay.querySelector('#confirm-btn-yes');
        const btnNo = overlay.querySelector('#confirm-btn-no');

        titleEl.innerText = title;
        messageEl.innerText = message;

        // Reset and Show
        overlay.classList.add('active');

        const cleanup = (value) => {
            overlay.classList.remove('active');
            btnYes.removeEventListener('click', onYes);
            btnNo.removeEventListener('click', onNo);
            resolve(value);
        };

        const onYes = () => cleanup(true);
        const onNo = () => cleanup(false);

        btnYes.addEventListener('click', onYes);
        btnNo.addEventListener('click', onNo);
    });
};
