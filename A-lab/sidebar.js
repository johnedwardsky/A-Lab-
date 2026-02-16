/**
 * A-LAB.TECH — Sidebar Navigation Component
 * ============================================
 * Injected on all internal (resident) pages.
 * Shows different menu items based on auth state.
 * Hides main site navigation when active.
 */

const Sidebar = (() => {
    let isAuthenticated = false;
    let isAdmin = false;
    let currentTab = 'profile';

    /**
     * Menu items configuration
     */
    const guestItems = [
        { id: 'join', icon: '🚀', labelKey: 'sidebar.join', action: 'navigate', url: 'register-resident.html' },
        { id: 'feed', icon: '📡', labelKey: 'sidebar.feed', action: 'tab' },
        { id: 'residents', icon: '👥', labelKey: 'sidebar.residents', action: 'navigate', url: 'residents.html' },
        { id: 'projects', icon: '📋', labelKey: 'sidebar.projects', action: 'tab' },
    ];

    const residentItems = [
        { id: 'profile', icon: '👤', labelKey: 'sidebar.profile', action: 'tab' },
        { id: 'feed', icon: '📡', labelKey: 'sidebar.activity', action: 'tab' },
        { id: 'notifications', icon: '🔔', labelKey: 'sidebar.notifications', action: 'tab' },
        { id: 'portfolio', icon: '🖼️', labelKey: 'sidebar.portfolio', action: 'tab' },
        { id: 'projects', icon: '📋', labelKey: 'sidebar.projects', action: 'tab' },
        { id: 'astra', icon: '✦', labelKey: 'sidebar.astra', action: 'tab' },
        { id: 'rd', icon: '🧠', labelKey: 'sidebar.rd_lab', action: 'tab' },
        { id: 'analytics', icon: '📊', labelKey: 'sidebar.analytics', action: 'tab' },
        { id: 'community', icon: '🤝', labelKey: 'sidebar.community', action: 'tab' },
    ];

    const adminExtraItems = [
        { id: 'admin-panel', icon: '🛡️', labelKey: 'admin.title', action: 'tab' },
    ];

    /**
     * Build sidebar HTML
     */
    function render() {
        // Remove main site navigation if it exists
        const mainNav = document.querySelector('nav.main-nav, header.main-header, .main-navigation');
        if (mainNav) mainNav.style.display = 'none';

        // Don't duplicate
        if (document.querySelector('.alab-sidebar')) return;

        const items = isAuthenticated
            ? [...residentItems, ...(isAdmin ? adminExtraItems : [])]
            : guestItems;

        const sidebar = document.createElement('aside');
        sidebar.className = 'alab-sidebar';
        sidebar.innerHTML = `
            <a href="index.html" class="sidebar-logo hover-trigger" title="A-LAB Home">
                <img src="A-lab_logo.svg" alt="A-LAB" style="width: 35px; height: auto;">
            </a>
            <nav class="sidebar-nav">
                ${items.map(item => `
                    <a href="${item.action === 'navigate' ? item.url : '#'}"
                       class="side-icon hover-trigger ${item.id === currentTab ? 'active' : ''}"
                       data-tab="${item.id}"
                       data-action="${item.action}"
                       ${item.action === 'tab' ? `onclick="Sidebar.switchTab('${item.id}', this); return false;"` : ''}>
                        <i>${item.icon}</i>
                        <span data-i18n="${item.labelKey}">${typeof t === 'function' ? t(item.labelKey) : item.labelKey.split('.').pop()}</span>
                    </a>
                `).join('')}
            </nav>
            <div class="sidebar-bottom">
                ${isAuthenticated ? `
                    <a href="#" class="side-icon hover-trigger" onclick="Sidebar.toggleTheme(); return false;" id="sidebarThemeBtn">
                        <i>${document.body.classList.contains('light-theme') ? '☀' : '☽'}</i>
                        <span data-i18n="sidebar.theme_dark">${typeof t === 'function' ? t('sidebar.theme_dark') : 'Тема'}</span>
                    </a>
                    <a href="#" class="side-icon hover-trigger" data-tab="settings"
                       onclick="Sidebar.switchTab('settings', this); return false;">
                        <i>⚙️</i>
                        <span data-i18n="sidebar.settings">${typeof t === 'function' ? t('sidebar.settings') : 'Настройки'}</span>
                    </a>
                ` : ''}
                ${isAuthenticated ? `
                    <a href="index.html" class="side-icon hover-trigger" style="color: var(--accent, #FF2A2A);">
                        <i>🔌</i>
                        <span data-i18n="sidebar.logout">${typeof t === 'function' ? t('sidebar.logout') : 'Выход'}</span>
                    </a>
                ` : ''}
            </div>
        `;

        document.body.insertBefore(sidebar, document.body.firstChild);
        injectStyles();
    }

    /**
     * Switch active tab
     */
    function switchTab(tabId, clickedEl) {
        // Handle guest restrictions
        if (!isAuthenticated && (tabId === 'feed' || tabId === 'projects')) {
            // Guests can view feed/projects read-only
        }

        currentTab = tabId;

        // Update sidebar active states
        document.querySelectorAll('.alab-sidebar .side-icon').forEach(el => {
            el.classList.remove('active');
        });
        if (clickedEl) clickedEl.classList.add('active');

        // Switch tab content panels
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        const target = document.getElementById(tabId + '-tab');
        if (target) target.classList.add('active');

        // Update page title if element exists
        const titleEl = document.getElementById('workstationTitle');
        if (titleEl && typeof t === 'function') {
            const titleMap = {
                'profile': 'profile.title',
                'feed': 'feed.title',
                'notifications': 'notifications.title',
                'portfolio': 'portfolio.title',
                'projects': 'projects.title',
                'astra': 'astra.title',
                'rd': 'sidebar.rd_lab',
                'analytics': 'sidebar.analytics',
                'security': 'sidebar.security',
                'community': 'sidebar.community',
                'settings': 'sidebar.settings',
                'admin-panel': 'admin.title'
            };
            titleEl.textContent = t(titleMap[tabId] || tabId);
        }

        // Update mode badge if exists
        const modeBadge = document.getElementById('modeBadge');
        if (modeBadge) {
            const modeMap = {
                'profile': 'РЕЖИМ_УПРАВЛЕНИЯ_ПРОФИЛЕМ',
                'feed': 'РЕЖИМ_ЛЕНТЫ',
                'portfolio': 'РЕЖИМ_ПОРТФОЛИО',
                'projects': 'РЕЖИМ_ПРОЕКТОВ',
                'astra': 'РЕЖИМ_ASTRA',
                'settings': 'РЕЖИМ_НАСТРОЕК',
                'admin-panel': 'РЕЖИМ_АДМИНИСТРАТОРА'
            };
            modeBadge.textContent = modeMap[tabId] || tabId.toUpperCase();
        }

        // Fire event for other modules
        window.dispatchEvent(new CustomEvent('alab:tab-changed', { detail: { tab: tabId } }));
    }

    /**
     * Theme toggle
     */
    function toggleTheme() {
        document.body.classList.toggle('light-theme');
        const isLight = document.body.classList.contains('light-theme');
        localStorage.setItem('alab_theme', isLight ? 'light' : 'dark');

        const themeBtn = document.getElementById('sidebarThemeBtn');
        if (themeBtn) {
            themeBtn.querySelector('i').textContent = isLight ? '☀' : '☽';
            const labelKey = isLight ? 'sidebar.theme_light' : 'sidebar.theme_dark';
            const span = themeBtn.querySelector('span');
            if (span && typeof t === 'function') span.textContent = t(labelKey);
        }

        // Also update standalone theme button if exists
        const standaloneBtn = document.getElementById('themeBtn');
        if (standaloneBtn) standaloneBtn.textContent = isLight ? '☀' : '☽';
    }

    /**
     * Inject sidebar CSS
     */
    function injectStyles() {
        if (document.getElementById('alab-sidebar-styles')) return;

        const style = document.createElement('style');
        style.id = 'alab-sidebar-styles';
        style.textContent = `
            .alab-sidebar {
                position: fixed;
                top: 0;
                left: 0;
                width: 80px;
                height: 100vh;
                background: #000;
                border-right: 1px solid var(--border, rgba(255,255,255,0.06));
                display: flex;
                flex-direction: column;
                padding: 30px 17px;
                z-index: 200;
                overflow-y: auto;
                transition: width 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
            }

            .alab-sidebar:hover {
                width: 220px;
            }

            .sidebar-logo {
                display: block;
                margin-bottom: 20px;
                padding-left: 5px;
            }

            .sidebar-nav {
                display: flex;
                flex-direction: column;
                gap: 4px;
                flex: 1;
            }

            .alab-sidebar .side-icon {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 12px;
                border-radius: 10px;
                color: #999;
                text-decoration: none;
                transition: 0.2s;
                white-space: nowrap;
                overflow: hidden;
            }

            .alab-sidebar .side-icon:hover {
                background: rgba(0, 229, 255, 0.05);
                color: var(--tech-blue, #00E5FF);
            }

            .alab-sidebar .side-icon.active {
                color: var(--tech-blue, #00E5FF);
                background: rgba(0, 229, 255, 0.08);
            }

            .alab-sidebar .side-icon i {
                font-style: normal;
                font-size: 1.2rem;
                min-width: 24px;
                display: flex;
                justify-content: center;
            }

            .alab-sidebar .side-icon span {
                opacity: 0;
                transform: translateX(-10px);
                transition: 0.3s;
                font-size: 0.85rem;
                font-weight: 600;
                font-family: var(--font-main, 'Inter', sans-serif);
            }

            .alab-sidebar:hover .side-icon span {
                opacity: 1;
                transform: translateX(0);
            }

            .sidebar-bottom {
                margin-top: auto;
                display: flex;
                flex-direction: column;
                gap: 4px;
                padding-top: 15px;
                border-top: 1px solid var(--border, rgba(255,255,255,0.06));
            }

            /* Light theme */
            body.light-theme .alab-sidebar {
                background: rgba(255, 255, 255, 0.95);
                border-right: 1px solid rgba(0, 0, 0, 0.05);
            }

            body.light-theme .alab-sidebar .side-icon {
                color: #666;
            }

            body.light-theme .alab-sidebar .side-icon:hover,
            body.light-theme .alab-sidebar .side-icon.active {
                background: rgba(0, 143, 164, 0.05);
                color: var(--tech-blue, #008fa4);
            }

            /* Push main content when sidebar exists */
            body.has-sidebar .main-container,
            body.has-sidebar .main-content {
                margin-left: 80px;
            }

            /* --- MOBILE: Bottom Tab Bar --- */
            @media (max-width: 768px) {
                .alab-sidebar {
                    position: fixed;
                    top: auto;
                    bottom: 0;
                    left: 0;
                    width: 100% !important;
                    height: 70px;
                    flex-direction: row;
                    padding: 0 10px;
                    border-right: none;
                    border-top: 1px solid var(--border, rgba(255,255,255,0.06));
                    overflow-x: auto;
                    overflow-y: hidden;
                    z-index: 300;
                }

                .alab-sidebar:hover {
                    width: 100% !important;
                }

                .sidebar-logo {
                    display: none;
                }

                .sidebar-nav {
                    flex-direction: row;
                    gap: 0;
                    align-items: center;
                    width: 100%;
                    justify-content: space-around;
                }

                .alab-sidebar .side-icon {
                    flex-direction: column;
                    gap: 4px;
                    padding: 8px 6px;
                    font-size: 0.6rem;
                    min-width: auto;
                }

                .alab-sidebar .side-icon i {
                    font-size: 1.3rem;
                }

                .alab-sidebar .side-icon span {
                    opacity: 1;
                    transform: none;
                    font-size: 0.55rem;
                    font-weight: 400;
                }

                .sidebar-bottom {
                    display: none;
                }

                body.has-sidebar .main-container,
                body.has-sidebar .main-content {
                    margin-left: 0;
                    padding-bottom: 80px;
                }
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Initialize
     */
    function init(options = {}) {
        isAuthenticated = options.authenticated || false;
        isAdmin = options.admin || false;
        currentTab = options.defaultTab || 'profile';

        // Apply saved theme
        const savedTheme = localStorage.getItem('alab_theme');
        if (savedTheme === 'light') document.body.classList.add('light-theme');

        render();
        document.body.classList.add('has-sidebar');

        // Re-render on language change
        window.addEventListener('alab:lang-changed', () => {
            const existing = document.querySelector('.alab-sidebar');
            if (existing) existing.remove();
            render();
        });
    }

    return { init, switchTab, toggleTheme, render };
})();
