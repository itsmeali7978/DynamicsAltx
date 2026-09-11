/**
 * DynamicsAltx - Shared common logic for all pages
 */

// Dynamically load translations.js
const loadTranslations = () => {
    return new Promise((resolve) => {
        if (window.i18n) {
            resolve();
            return;
        }
        const script = document.createElement('script');
        script.src = 'translations.js';
        script.onload = () => resolve();
        script.onerror = () => {
            console.error('Failed to load translations.js');
            resolve();
        };
        document.head.appendChild(script);
    });
};

const sidebarMappings = {
    "overview": "nav_overview",
    "voucher history": "nav_voucher_history",
    "voucher entries": "nav_voucher_entries",
    "miscellaneous income": "nav_misc_income",
    "miscellaneous income entries": "nav_misc_income_entries",
    "business process": "business_process",
    "cashier closing": "nav_cashier_closing",
    "closing reports": "nav_closing_reports",
    "general ledger": "nav_general_ledger",
    "accounts payable": "nav_accounts_payable",
    "accounts receivable": "nav_accounts_receivable",
    "employees": "nav_employees",
    "short breaks": "nav_short_breaks",
    "create vendor": "nav_vendors",
    "create bid": "nav_create_bid",
    "bidding list": "nav_bidding_list",
    "barcode printing": "nav_barcode",
    "inventory management": "nav_inventory",
    "purchase orders": "nav_po",
    "warehousing": "nav_warehousing",
    "invoice reconciliation": "nav_reconciliation",
    "sales pipeline": "nav_sales_pipeline",
    "customers": "nav_customers",
    "lead tracking": "nav_lead_tracking",
    "reports & analytics": "nav_reports",
    "user management": "nav_user_management",
    "locations": "nav_locations",
    "nationalities": "nav_nationalities",
    "shifts": "nav_shifts",
    "data sync (navision)": "nav_data_sync",
    "announcements": "nav_announcements",
    "account settings": "nav_settings",
    "leave types": "nav_leave_types",
    "absence marker": "nav_absence_marker",
    "monthly absence report": "nav_monthly_absence_report",
    "finance": "finance",
    "reports": "nav_reports",
    "human resource": "hr",
    "supply chain": "supply_chain",
    "crm & sales": "crm",
    "system": "system",
    "vendor tasks": "nav_vendor_tasks",
    "altx items sync": "nav_altx_items",
    "sales analysis": "nav_sales_analysis",
    "input daily activities": "nav_input_daily_activities",
    "fetch sales data": "nav_fetch_sales_data",
    "daily kpi": "nav_daily_kpi",
    "item kpi": "nav_item_kpi",
    "profiles": "nav_profiles"
};

document.addEventListener('DOMContentLoaded', () => {
    loadTranslations().then(() => {
        // Universal Dynamic Menu Injector
        // Dynamically ensures all standard nav groups (Finance, Reports, Business Process, HR, Sales Analysis, System, etc.)
        // and permitted links exist in the sidebar DOM across ALL pages before profile filtering runs.
        const userRole = localStorage.getItem('userRole') || '';
        const isAdmin = userRole && userRole.toLowerCase() === 'admin';
        const allowedPagesStr = localStorage.getItem('allowedPages');
        const allowedPages = allowedPagesStr ? JSON.parse(allowedPagesStr) : null;
        const currentFileName = window.location.pathname.split('/').pop().split('?')[0];

        const isPagePermitted = (pagePath) => {
            if (isAdmin || !allowedPages) return true;
            return allowedPages.includes(pagePath);
        };

        const navModules = [
            {
                groupName: "Finance",
                groupIcon: "ri-bank-line",
                groupI18n: "finance",
                items: [
                    { path: "voucher-history.html", label: "Voucher History", i18n: "nav_voucher_history" },
                    { path: "misc-income.html", label: "Miscellaneous Income", i18n: "nav_misc_income" }
                ]
            },
            {
                groupName: "Reports",
                groupIcon: "ri-file-chart-line",
                groupI18n: "nav_reports",
                items: [
                    { path: "misc-income-entries.html", label: "Miscellaneous Income Entries", i18n: "nav_misc_income_entries" },
                    { path: "voucher-entries.html", label: "Voucher Entries", i18n: "nav_voucher_entries" }
                ]
            },
            {
                groupName: "Business Process",
                groupIcon: "ri-briefcase-4-line",
                groupI18n: "business_process",
                items: [
                    { path: "cashier-closing.html", label: "Cashier Closing", i18n: "nav_cashier_closing" },
                    { path: "closing-reports.html", label: "Closing Reports", i18n: "nav_closing_reports" }
                ]
            },
            {
                groupName: "Human Resource",
                groupIcon: "ri-team-line",
                groupI18n: "hr",
                items: [
                    { path: "employees.html", label: "Employees", i18n: "nav_employees" },
                    { path: "short-breaks.html", label: "Short Breaks", i18n: "nav_short_breaks" },
                    { path: "absence-marker.html", label: "Absence Marker", i18n: "nav_absence_marker" },
                    { path: "absence-report.html", label: "Monthly Absence Report", i18n: "nav_monthly_absence_report" }
                ]
            },
            {
                groupName: "Sales Analysis",
                groupIcon: "ri-line-chart-line",
                groupI18n: "nav_sales_analysis",
                items: [
                    { path: "input-daily-activities.html", label: "Input Daily Activities", i18n: "nav_input_daily_activities" },
                    { path: "fetch-sales-data.html", label: "Fetch Sales Data", i18n: "nav_fetch_sales_data" },
                    { path: "daily-kpi.html", label: "Daily KPI", i18n: "nav_daily_kpi" },
                    { path: "item-kpi.html", label: "Item KPI", i18n: "nav_item_kpi" }
                ]
            },
            {
                groupName: "System",
                groupIcon: "ri-settings-4-line",
                groupI18n: "system",
                items: [
                    { path: "users.html", label: "User Management", i18n: "nav_user_management" },
                    { path: "profiles.html", label: "Profiles", i18n: "nav_profiles" },
                    { path: "locations.html", label: "Locations", i18n: "nav_locations" },
                    { path: "nationalities.html", label: "Nationalities", i18n: "nav_nationalities" },
                    { path: "shifts.html", label: "Shifts", i18n: "nav_shifts" },
                    { path: "leave-types.html", label: "Leave Types", i18n: "nav_leave_types" },
                    { path: "sync.html", label: "Data Sync (Navision)", i18n: "nav_data_sync" },
                    { path: "altx-items.html", label: "Altx Items Sync", i18n: "nav_altx_items" },
                    { path: "vendor-tasks.html", label: "Vendor Tasks", i18n: "nav_vendor_tasks" },
                    { path: "announcements.html", label: "Announcements", i18n: "nav_announcements" },
                    { path: "settings.html", label: "Account Settings", i18n: "nav_settings" }
                ]
            }
        ];

        const navMenu = document.querySelector('.nav-menu, .nav-list');
        if (navMenu) {
            navModules.forEach(mod => {
                const permittedItems = mod.items.filter(item => isPagePermitted(item.path));
                if (permittedItems.length === 0) return;

                // Find or create group element
                let groupEl = Array.from(navMenu.querySelectorAll('.nav-group')).find(g => {
                    const headerSpan = g.querySelector('.group-header span');
                    if (!headerSpan) return false;
                    const txt = headerSpan.textContent.trim().toLowerCase();
                    const i18nVal = headerSpan.getAttribute('data-i18n');
                    return txt === mod.groupName.toLowerCase() || i18nVal === mod.groupI18n;
                });

                if (!groupEl) {
                    groupEl = document.createElement('li');
                    groupEl.className = 'nav-group';
                    groupEl.innerHTML = `
                        <div class="group-header">
                            <i class="${mod.groupIcon}"></i>
                            <span data-i18n="${mod.groupI18n}">${mod.groupName}</span>
                            <i class="ri-arrow-down-s-line arrow-icon"></i>
                        </div>
                        <ul class="submenu"></ul>
                    `;

                    // Insert before System group if it exists, else append
                    const systemGrp = Array.from(navMenu.querySelectorAll('.nav-group')).find(g => {
                        const h = g.querySelector('.group-header span');
                        return h && (h.textContent.trim().toLowerCase() === 'system' || h.getAttribute('data-i18n') === 'system');
                    });

                    if (systemGrp && mod.groupName !== 'System') {
                        navMenu.insertBefore(groupEl, systemGrp);
                    } else {
                        navMenu.appendChild(groupEl);
                    }
                }

                const submenu = groupEl.querySelector('.submenu');
                if (submenu) {
                    permittedItems.forEach(item => {
                        if (!submenu.querySelector(`a[href*="${item.path}"]`)) {
                            const li = document.createElement('li');
                            const a = document.createElement('a');
                            a.href = item.path;
                            a.setAttribute('data-i18n', item.i18n);
                            a.textContent = item.label;

                            if (currentFileName === item.path) {
                                a.className = 'active';
                                groupEl.classList.add('expanded', 'active');
                                submenu.style.display = 'block';
                            }
                            li.appendChild(a);
                            submenu.appendChild(li);
                        } else if (currentFileName === item.path) {
                            const existingA = submenu.querySelector(`a[href*="${item.path}"]`);
                            if (existingA) existingA.className = 'active';
                            groupEl.classList.add('expanded', 'active');
                            submenu.style.display = 'block';
                        }
                    });
                }
            });
        }

        // Tag sidebar elements dynamically (handles text nodes inside a tags preserving icons)
        document.querySelectorAll('.sidebar-nav span, .submenu li a, .group-header span').forEach(el => {
            let textNode = null;
            el.childNodes.forEach(node => {
                if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
                    textNode = node;
                }
            });
            
            if (textNode) {
                const text = textNode.textContent.trim().toLowerCase();
                if (sidebarMappings[text]) {
                    const span = document.createElement('span');
                    span.setAttribute('data-i18n', sidebarMappings[text]);
                    span.textContent = textNode.textContent.trim();
                    el.replaceChild(span, textNode);
                }
            } else {
                const text = el.textContent.trim().toLowerCase();
                if (sidebarMappings[text]) {
                    el.setAttribute('data-i18n', sidebarMappings[text]);
                }
            }
        });

        // Tag search bar
        const searchInput = document.querySelector('.search-bar input');
        if (searchInput) {
            searchInput.setAttribute('data-i18n', 'search_placeholder');
        }

        // Tag page title
        const pageTitle = document.querySelector('.page-title');
        if (pageTitle) {
            const text = pageTitle.textContent.trim().toLowerCase();
            if (sidebarMappings[text]) {
                pageTitle.setAttribute('data-i18n', sidebarMappings[text]);
            } else if (text === 'bid creation' || text === 'prepare competitive bid') {
                pageTitle.setAttribute('data-i18n', 'nav_create_bid');
            } else if (text === 'barcode print') {
                pageTitle.setAttribute('data-i18n', 'nav_barcode');
            }
        }

        // Tag dashboard welcome messages
        const welcomeH1 = document.querySelector('.welcome-text h1');
        if (welcomeH1 && welcomeH1.textContent.includes('Good afternoon')) {
            welcomeH1.setAttribute('data-i18n', 'welcome_afternoon');
        }
        const welcomeP = document.querySelector('.welcome-text p');
        if (welcomeP && welcomeP.textContent.includes('happening across')) {
            welcomeP.setAttribute('data-i18n', 'welcome_sub');
        }

        // Tag stats and mini elements
        document.querySelectorAll('.stat-mini .label').forEach(el => {
            const text = el.textContent.trim().toLowerCase();
            if (text === 'system load') el.setAttribute('data-i18n', 'sys_load');
            if (text === 'active sessions') el.setAttribute('data-i18n', 'active_sessions');
        });
        document.querySelectorAll('.stat-mini .value').forEach(el => {
            const text = el.textContent.trim().toLowerCase();
            if (text === 'stable') el.setAttribute('data-i18n', 'sys_stable');
        });
        document.querySelectorAll('.insight-label').forEach(el => {
            const text = el.textContent.trim().toLowerCase();
            if (text === 'hijri calendar') el.setAttribute('data-i18n', 'insight_hijri');
            if (text === 'last data sync') el.setAttribute('data-i18n', 'insight_last_sync');
        });

        // Inject language switcher in topbar
        const injectLanguageSwitcher = () => {
            const topbar = document.querySelector('.topbar');
            if (!topbar) return;
            
            let actions = topbar.querySelector('.topbar-actions');
            if (!actions) {
                let right = topbar.querySelector('.topbar-right');
                if (!right) {
                    right = document.createElement('div');
                    right.className = 'topbar-right';
                    topbar.appendChild(right);
                }
                actions = document.createElement('div');
                actions.className = 'topbar-actions';
                right.appendChild(actions);
            }
            
            if (!document.getElementById('topbar-lang-switcher')) {
                const btn = document.createElement('button');
                btn.id = 'topbar-lang-switcher';
                btn.className = 'icon-btn lang-toggle-btn';
                btn.title = 'Change Language';
                btn.style.fontWeight = '600';
                btn.style.fontSize = '0.9rem';
                btn.style.padding = '0.25rem 0.5rem';
                btn.style.borderRadius = '8px';
                btn.style.border = '1px solid var(--border-color)';
                btn.style.marginLeft = '0.5rem';
                btn.style.marginRight = '0.5rem';
                btn.style.cursor = 'pointer';
                btn.style.background = 'transparent';
                btn.style.color = 'var(--text-main)';
                
                const updateBtnLabel = () => {
                    const currentLang = localStorage.getItem('lang') || 'en';
                    btn.innerHTML = currentLang === 'en' ? '🌐 AR' : '🌐 EN';
                };
                
                updateBtnLabel();
                
                btn.addEventListener('click', () => {
                    const currentLang = localStorage.getItem('lang') || 'en';
                    const nextLang = currentLang === 'en' ? 'ar' : 'en';
                    window.setLanguage(nextLang);
                    updateBtnLabel();
                });
                
                actions.insertBefore(btn, actions.firstChild);
            }
        };

        injectLanguageSwitcher();

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
            const currentLang = localStorage.getItem('lang') || 'en';
            const titleText = currentLang === 'en' ? 'Logout' : 'تسجيل الخروج';
            btn.title = `${titleText} (${userName})`;
            
            // Handle click
            btn.addEventListener('click', () => {
                localStorage.clear();
                window.location.href = 'index.html';
            });
        });

        // 3. Navigation Group (Submenu) Logic
        document.addEventListener('click', (e) => {
            const header = e.target.closest('.group-header');
            if (header) {
                const group = header.parentElement;
                if (group && group.classList.contains('nav-group')) {
                    group.classList.toggle('expanded');
                    const submenu = group.querySelector('.submenu');
                    if (submenu) {
                        const isExpanded = group.classList.contains('expanded');
                        submenu.style.display = isExpanded ? 'block' : 'none';
                    }
                }
            }
        });

        // Auto-expand the active group
        const activeLink = document.querySelector('.nav-item.active, .submenu li a.active');
        if (activeLink) {
            const parentGroup = activeLink.closest('.nav-group');
            if (parentGroup) {
                parentGroup.classList.add('expanded');
            }
        }

        // 4. Role/Profile-based Navigation Control
        console.log('[DynamicsAltx] Current User Role:', userRole);
        
        const userDashboard = localStorage.getItem('userDashboard') || 'dashboard.html';
        const currentPath = window.location.pathname.split('/').pop().split('?')[0] || 'index.html';
        const dashboardFilename = userDashboard.split('/').pop().split('?')[0];

        // Route Guard: Protect pages from direct URL typing
        // Skip guard for index.html, and always allow userDashboard page itself
        // Also skip guard for Admin users who have full access
        if (currentPath && currentPath !== 'index.html' && allowedPagesStr && !isAdmin) {
            if (!allowedPages.includes(currentPath) && currentPath !== dashboardFilename) {
                console.log('[DynamicsAltx] Unauthorized page access, redirecting:', currentPath, '→', userDashboard);
                window.location.href = userDashboard;
                return;
            }
        }

        // Sidebar Filtering: run AFTER all dynamic injections above
        if (allowedPagesStr && !isAdmin) {
            console.log('[DynamicsAltx] Restricting sidebar based on profile allowed pages:', allowedPages);

            // Hide every sidebar link whose page is not in the allowedPages list
            document.querySelectorAll('.sidebar-nav a[href]').forEach(link => {
                const href = link.getAttribute('href');
                if (!href || href === 'index.html') return;
                
                // If link is placeholder href="#" inside a submenu, hide it for profile-restricted users
                if (href === '#') {
                    const parentLi = link.closest('li');
                    if (parentLi) parentLi.style.display = 'none';
                    return;
                }

                const filename = href.split('/').pop().split('?')[0];
                if (!allowedPages.includes(filename)) {
                    const parentLi = link.closest('li');
                    if (parentLi) parentLi.style.display = 'none';
                }
            });

            // Collapse nav-groups whose entire submenu is now hidden
            document.querySelectorAll('.nav-group').forEach(group => {
                const submenu = group.querySelector('.submenu');
                if (!submenu) return;
                const visibleItems = Array.from(submenu.querySelectorAll('li'))
                    .filter(li => li.style.display !== 'none');
                if (visibleItems.length === 0) {
                    group.style.display = 'none';
                }
            });

            // Also hide top-level nav-items (non-group) that point to restricted pages
            document.querySelectorAll('.nav-item').forEach(item => {
                const link = item.querySelector('a[href]');
                if (!link) return;
                const href = link.getAttribute('href');
                if (!href || href === '#' || href === 'index.html') return;
                const filename = href.split('/').pop().split('?')[0];
                if (!allowedPages.includes(filename)) {
                    item.style.display = 'none';
                }
            });
        }
        else if (!isAdmin) {
            // Hide Admin-only menu items fallback (if no allowedPages profile is in storage)
            const adminLinks = [
                'users.html',
                'announcements.html',
                'locations.html',
                'nationalities.html',
                'shifts.html',
                'employees.html',
                'closing-reports.html',
                'profiles.html'
            ];
            
            console.log('[DynamicsAltx] Restricting access for non-admin role:', userRole);
            document.querySelectorAll('.submenu li a').forEach(link => {
                const href = link.getAttribute('href');
                if (adminLinks.some(adminHref => href.includes(adminHref))) {
                    console.log('[DynamicsAltx] Hiding admin link:', href);
                    link.parentElement.style.display = 'none';
                }
            });
        } else {
            console.log('[DynamicsAltx] Full access granted for role:', userRole);
        }

        // Set initial language and apply translations
        const savedLang = localStorage.getItem('lang') || 'en';
        window.setLanguage(savedLang);
        
        // Listen to language change to update logout tooltips
        document.addEventListener('languageChanged', (e) => {
            const titleText = e.detail === 'en' ? 'Logout' : 'تسجيل الخروج';
            document.querySelectorAll('.logout-btn').forEach(btn => {
                btn.title = `${titleText} (${userName})`;
            });
        });
    });
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
window.showAlert = function(message, title = 'Information') {
    return new Promise((resolve) => {
        // Remove any stale instance to ensure fresh state
        const stale = document.getElementById('__alert-modal-root');
        if (stale) stale.remove();

        const overlay = document.createElement('div');
        overlay.id = '__alert-modal-root';
        overlay.style.cssText = [
            'position:fixed', 'inset:0', 'z-index:99999',
            'display:flex', 'align-items:center', 'justify-content:center',
            'background:rgba(0,0,0,0.45)', 'animation:fadeInOverlay 0.2s ease'
        ].join(';');

        overlay.innerHTML = `
            <div style="
                background:#fff; border-radius:16px; padding:2rem;
                width:420px; max-width:90vw; box-shadow:0 20px 60px rgba(0,0,0,0.25);
                text-align:center; animation:slideInModal 0.25s ease;
            ">
                <div style="
                    width:56px;height:56px;border-radius:50%;
                    background:#e0f2fe;color:#0369a1;
                    display:flex;align-items:center;justify-content:center;
                    font-size:1.75rem;margin:0 auto 1rem;
                "><i class="ri-information-line"></i></div>
                <h3 style="margin:0 0 0.5rem;font-size:1.1rem;color:#1e293b;">${title}</h3>
                <p style="
                    white-space:pre-wrap;text-align:left;
                    background:#f8fafc;border-radius:8px;padding:0.75rem 1rem;
                    font-size:0.9rem;color:#334155;line-height:1.6;margin-bottom:1.25rem;
                ">${message}</p>
                <button id="__alert-ok-btn" style="
                    width:100%;padding:0.75rem;border:none;border-radius:10px;
                    background:#4f46e5;color:#fff;font-weight:600;font-size:0.95rem;
                    cursor:pointer;
                ">OK, I Understand</button>
            </div>
        `;

        document.body.appendChild(overlay);

        const btn = overlay.querySelector('#__alert-ok-btn');
        btn.addEventListener('click', () => {
            overlay.remove();
            resolve();
        });
    });
};
