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
    "item kpi": "nav_item_kpi"
};

document.addEventListener('DOMContentLoaded', () => {
    loadTranslations().then(() => {
        // Dynamic Menu Injection for Admin
        const userRole = localStorage.getItem('userRole');
        if (userRole && userRole.toLowerCase() === 'admin') {
            const systemGroup = Array.from(document.querySelectorAll('.nav-group')).find(group => {
                const header = group.querySelector('.group-header span');
                return header && (header.textContent.trim().toLowerCase() === 'system' || header.getAttribute('data-i18n') === 'system');
            });
            
            if (systemGroup) {
                const submenu = systemGroup.querySelector('.submenu');
                if (submenu) {
                    if (!submenu.querySelector('a[href="altx-items.html"]')) {
                        const liItem = document.createElement('li');
                        const aItem = document.createElement('a');
                        aItem.href = 'altx-items.html';
                        aItem.setAttribute('data-i18n', 'nav_altx_items');
                        aItem.textContent = 'Altx Items Sync';
                        
                        if (window.location.pathname.endsWith('altx-items.html')) {
                            aItem.className = 'active';
                            systemGroup.classList.add('active');
                            submenu.style.display = 'block';
                        }
                        
                        liItem.appendChild(aItem);
                        
                        // Insert it before settings.html or at the end
                        const settingsLiItem = Array.from(submenu.querySelectorAll('li')).find(item => {
                            const link = item.querySelector('a');
                            return link && link.getAttribute('href') === 'settings.html';
                        });
                        if (settingsLiItem) {
                            submenu.insertBefore(liItem, settingsLiItem);
                        } else {
                            submenu.appendChild(liItem);
                        }
                    }

                    if (!submenu.querySelector('a[href="leave-types.html"]')) {
                        const li = document.createElement('li');
                        const a = document.createElement('a');
                        a.href = 'leave-types.html';
                        a.setAttribute('data-i18n', 'nav_leave_types');
                        a.textContent = 'Leave Types';
                        
                        if (window.location.pathname.endsWith('leave-types.html')) {
                            a.className = 'active';
                            systemGroup.classList.add('active');
                            submenu.style.display = 'block';
                        }
                        
                        li.appendChild(a);
                        
                        // Insert it before settings.html or at the end
                        const settingsLi = Array.from(submenu.querySelectorAll('li')).find(item => {
                            const link = item.querySelector('a');
                            return link && link.getAttribute('href') === 'settings.html';
                        });
                        if (settingsLi) {
                            submenu.insertBefore(li, settingsLi);
                        } else {
                            submenu.appendChild(li);
                        }
                    }

                    if (!submenu.querySelector('a[href="vendor-tasks.html"]')) {
                        const liTask = document.createElement('li');
                        const aTask = document.createElement('a');
                        aTask.href = 'vendor-tasks.html';
                        aTask.setAttribute('data-i18n', 'nav_vendor_tasks');
                        aTask.textContent = 'Vendor Tasks';
                        
                        if (window.location.pathname.endsWith('vendor-tasks.html')) {
                            aTask.className = 'active';
                            systemGroup.classList.add('active');
                            submenu.style.display = 'block';
                        }
                        
                        liTask.appendChild(aTask);
                        
                        // Insert it before settings.html or at the end
                        const settingsLiTask = Array.from(submenu.querySelectorAll('li')).find(item => {
                            const link = item.querySelector('a');
                            return link && link.getAttribute('href') === 'settings.html';
                        });
                        if (settingsLiTask) {
                            submenu.insertBefore(liTask, settingsLiTask);
                        } else {
                            submenu.appendChild(liTask);
                        }
                    }
                }
            }

        }

        // Dynamic Menu Injection for Sales Analysis
        const _salesAllowedPagesStr = localStorage.getItem('allowedPages');
        const _salesAllowedPages = _salesAllowedPagesStr ? JSON.parse(_salesAllowedPagesStr) : null;
        const _salesUserRole = localStorage.getItem('userRole');

        if (_salesUserRole?.toLowerCase() === 'admin' || !_salesAllowedPages || _salesAllowedPages.includes('input-daily-activities.html') || _salesAllowedPages.includes('fetch-sales-data.html')) {
            let salesGroup = Array.from(document.querySelectorAll('.nav-group')).find(group => {
                const header = group.querySelector('.group-header span');
                return header && (header.textContent.trim().toLowerCase() === 'sales analysis' || header.getAttribute('data-i18n') === 'nav_sales_analysis');
            });

            if (!salesGroup) {
                const navMenu = document.querySelector('.nav-menu, .nav-list');
                if (navMenu) {
                    salesGroup = document.createElement('li');
                    salesGroup.className = 'nav-group';
                    salesGroup.innerHTML = `
                        <div class="group-header">
                            <i class="ri-line-chart-line"></i>
                            <span data-i18n="nav_sales_analysis">Sales Analysis</span>
                            <i class="ri-arrow-down-s-line arrow-icon"></i>
                        </div>
                        <ul class="submenu">
                            <li><a href="input-daily-activities.html" data-i18n="nav_input_daily_activities">Input Daily Activities</a></li>
                            <li><a href="fetch-sales-data.html" data-i18n="nav_fetch_sales_data">Fetch Sales Data</a></li>
                        </ul>
                    `;

                    const systemGroup = Array.from(navMenu.querySelectorAll('.nav-group')).find(group => {
                        const header = group.querySelector('.group-header span');
                        return header && (header.textContent.trim().toLowerCase() === 'system' || header.getAttribute('data-i18n') === 'system');
                    });

                    if (systemGroup) {
                        navMenu.insertBefore(salesGroup, systemGroup);
                    } else {
                        navMenu.appendChild(salesGroup);
                    }
                }
            } else {
                const submenu = salesGroup.querySelector('.submenu');
                if (submenu && !submenu.querySelector('a[href="fetch-sales-data.html"]')) {
                    const li = document.createElement('li');
                    const a = document.createElement('a');
                    a.href = 'fetch-sales-data.html';
                    a.setAttribute('data-i18n', 'nav_fetch_sales_data');
                    a.textContent = 'Fetch Sales Data';
                    if (window.location.pathname.endsWith('fetch-sales-data.html')) {
                        a.className = 'active';
                    }
                    li.appendChild(a);
                    submenu.appendChild(li);
                }
            }

            if (salesGroup && (window.location.pathname.endsWith('input-daily-activities.html') || window.location.pathname.endsWith('fetch-sales-data.html'))) {
                salesGroup.classList.add('expanded', 'active');
                const submenu = salesGroup.querySelector('.submenu');
                if (submenu) submenu.style.display = 'block';
                const currentFileName = window.location.pathname.split('/').pop();
                const activeLink = salesGroup.querySelector(`a[href="${currentFileName}"]`);
                if (activeLink) activeLink.classList.add('active');
            }
        }

        // Dynamic Menu Injection for Human Resource (only inject pages allowed by user profile)
        const _hrAllowedPagesStr = localStorage.getItem('allowedPages');
        const _hrAllowedPages = _hrAllowedPagesStr ? JSON.parse(_hrAllowedPagesStr) : null;
        const hrGroup = Array.from(document.querySelectorAll('.nav-group')).find(group => {
            const header = group.querySelector('.group-header span');
            return header && (header.textContent.trim().toLowerCase() === 'human resource' || header.getAttribute('data-i18n') === 'hr');
        });
        
        if (hrGroup) {
            const submenu = hrGroup.querySelector('.submenu');
            if (submenu) {
                // 1. Ensure Short Breaks exists (only if allowed by profile)
                let shortBreaksLi = Array.from(submenu.querySelectorAll('li')).find(item => {
                    const link = item.querySelector('a');
                    return link && link.getAttribute('href') && link.getAttribute('href').includes('short-breaks.html');
                });
                
                if (!shortBreaksLi && (!_hrAllowedPages || _hrAllowedPages.includes('short-breaks.html'))) {
                    shortBreaksLi = document.createElement('li');
                    const a = document.createElement('a');
                    a.href = 'short-breaks.html';
                    a.setAttribute('data-i18n', 'nav_short_breaks');
                    a.innerHTML = '<i class="ri-time-line"></i> Short Breaks';
                    
                    if (window.location.pathname.endsWith('short-breaks.html')) {
                        a.className = 'active';
                        hrGroup.classList.add('expanded');
                        submenu.style.display = 'block';
                    }
                    shortBreaksLi.appendChild(a);
                    
                    // Insert after Employees (if it exists) or append
                    const employeesLi = Array.from(submenu.querySelectorAll('li')).find(item => {
                        const link = item.querySelector('a');
                        return link && link.getAttribute('href') && link.getAttribute('href').includes('employees.html');
                    });
                    if (employeesLi) {
                        employeesLi.parentNode.insertBefore(shortBreaksLi, employeesLi.nextSibling);
                    } else {
                        submenu.appendChild(shortBreaksLi);
                    }
                }
                
                // 2. Ensure Absence Marker exists (only if allowed by profile)
                let absenceMarkerLi = Array.from(submenu.querySelectorAll('li')).find(item => {
                    const link = item.querySelector('a');
                    return link && link.getAttribute('href') && link.getAttribute('href').includes('absence-marker.html');
                });
                
                if (!absenceMarkerLi && (!_hrAllowedPages || _hrAllowedPages.includes('absence-marker.html'))) {
                    absenceMarkerLi = document.createElement('li');
                    const a = document.createElement('a');
                    a.href = 'absence-marker.html';
                    a.setAttribute('data-i18n', 'nav_absence_marker');
                    a.innerHTML = '<i class="ri-calendar-close-line"></i> Absence Marker';
                    
                    if (window.location.pathname.endsWith('absence-marker.html')) {
                        a.className = 'active';
                        hrGroup.classList.add('expanded');
                        submenu.style.display = 'block';
                    }
                    absenceMarkerLi.appendChild(a);
                    
                    // Insert after Short Breaks (if injected) or after Employees
                    const insertAfter = shortBreaksLi || Array.from(submenu.querySelectorAll('li')).find(item => {
                        const link = item.querySelector('a');
                        return link && link.getAttribute('href') && link.getAttribute('href').includes('employees.html');
                    });
                    if (insertAfter) {
                        insertAfter.parentNode.insertBefore(absenceMarkerLi, insertAfter.nextSibling);
                    } else {
                        submenu.appendChild(absenceMarkerLi);
                    }
                }

                // 3. Ensure Monthly Absence Report exists (only if allowed by profile)
                let monthlyReportLi = Array.from(submenu.querySelectorAll('li')).find(item => {
                    const link = item.querySelector('a');
                    return link && link.getAttribute('href') && link.getAttribute('href').includes('absence-report.html');
                });
                
                if (!monthlyReportLi && (!_hrAllowedPages || _hrAllowedPages.includes('absence-report.html'))) {
                    monthlyReportLi = document.createElement('li');
                    const a = document.createElement('a');
                    a.href = 'absence-report.html';
                    a.setAttribute('data-i18n', 'nav_monthly_absence_report');
                    a.innerHTML = '<i class="ri-file-chart-line"></i> Monthly Absence Report';
                    
                    if (window.location.pathname.endsWith('absence-report.html')) {
                        a.className = 'active';
                        hrGroup.classList.add('expanded');
                        submenu.style.display = 'block';
                    }
                    monthlyReportLi.appendChild(a);
                    
                    // Insert after Absence Marker (if injected)
                    const insertAfterReport = absenceMarkerLi || shortBreaksLi;
                    if (insertAfterReport) {
                        insertAfterReport.parentNode.insertBefore(monthlyReportLi, insertAfterReport.nextSibling);
                    } else {
                        submenu.appendChild(monthlyReportLi);
                    }
                }
            }
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
        
        const allowedPagesStr = localStorage.getItem('allowedPages');
        const userDashboard = localStorage.getItem('userDashboard') || 'dashboard.html';
        const currentPath = window.location.pathname.split('/').pop().split('?')[0] || 'index.html';
        const dashboardFilename = userDashboard.split('/').pop().split('?')[0];

        // Route Guard: Protect pages from direct URL typing
        // Skip guard for index.html, and always allow userDashboard page itself
        // Also skip guard for Admin users who have full access
        if (currentPath && currentPath !== 'index.html' && allowedPagesStr && (!userRole || userRole.toLowerCase() !== 'admin')) {
            const allowedPages = JSON.parse(allowedPagesStr);
            if (!allowedPages.includes(currentPath) && currentPath !== dashboardFilename) {
                console.log('[DynamicsAltx] Unauthorized page access, redirecting:', currentPath, '→', userDashboard);
                window.location.href = userDashboard;
                return;
            }
        }

        // Sidebar Filtering: run AFTER all dynamic injections above
        if (allowedPagesStr && (!userRole || userRole.toLowerCase() !== 'admin')) {
            const allowedPages = JSON.parse(allowedPagesStr);
            console.log('[DynamicsAltx] Restricting sidebar based on profile allowed pages:', allowedPages);

            // Hide every sidebar link whose page is not in the allowedPages list
            document.querySelectorAll('.sidebar-nav a[href]').forEach(link => {
                const href = link.getAttribute('href');
                if (!href || href === '#' || href === 'index.html') return;
                const filename = href.split('/').pop().split('?')[0];
                if (!allowedPages.includes(filename)) {
                    link.closest('li').style.display = 'none';
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
        else if (userRole && userRole.toLowerCase() !== 'admin') {
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
