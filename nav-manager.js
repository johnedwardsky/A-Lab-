/**
 * A-LAB.TECH — Resident Ecosystem Navigation [MENU2]
 * =================================================
 * Managed sidebar (Desktop) and bottom navigation (Mobile).
 * Used in: Residents, Social Feed, Messages, Projects, Admin/Workspace.
 */

const ResidentNav = {
    init() {
        this.checkAuth();
        if (document.body.hasAttribute('data-no-resident-nav')) {
            document.body.classList.add('resident-nav-loaded'); // Mark as loaded for scripts that check it
            return;
        }
        this.render();
        this.bindEvents();
        this.applyTheme();
        document.body.classList.add('has-resident-nav');
    },

    checkAuth() {
        const token = localStorage.getItem('sb-yirszunrxtunvzpxwvqz-auth-token') || localStorage.getItem('alab_resident_id');
        this.userLoggedIn = !!token;
    },

    render() {
        // Remove existing nav if any
        const oldSidebar = document.querySelector('.sidebar');
        const oldBottomNav = document.querySelector('.bottom-nav');
        if (oldSidebar) oldSidebar.remove();
        if (oldBottomNav) oldBottomNav.remove();

        const currentPage = window.location.pathname.split('/').pop() || 'index.html';

        // Render Sidebar (Desktop)
        const sidebar = document.createElement('aside');
        sidebar.className = 'sidebar';
        sidebar.innerHTML = `
            <a href="index.html" class="logo hover-trigger"><img src="A-lab-logo.svg" alt="A-LAB"></a>
            <button class="join-btn-sidebar hover-trigger" onclick="ResidentNav.handleJoinClick()">
                <i>+</i> <span>${window.I18n?.t('nav.join') || 'ВСТУПИТЬ'}</span>
            </button>
            <nav style="display: flex; flex-direction: column; gap: 10px; width: 100%;">
                <a href="${this.userLoggedIn ? 'social-feed.html' : '#'}" onclick="${!this.userLoggedIn ? 'ResidentNav.showRestrictedModal(); return false;' : ''}" class="nav-item hover-trigger ${currentPage === 'social-feed.html' ? 'active' : ''}"><i>📡</i> <span>${window.I18n?.t('nav.feed') || 'Лента'}</span></a>
                <a href="residents.html" class="nav-item hover-trigger ${currentPage === 'residents.html' ? 'active' : ''}"><i>👥</i> <span>${window.I18n?.t('nav.residents') || 'Резиденты'}</span></a>
                <a href="${this.userLoggedIn ? 'messages.html' : '#'}" onclick="${!this.userLoggedIn ? 'ResidentNav.showRestrictedModal(); return false;' : ''}" class="nav-item hover-trigger ${currentPage === 'messages.html' ? 'active' : ''}"><i>💬</i> <span>${window.I18n?.t('nav.messenger') || 'Messenger'}</span></a>
                <a href="${this.userLoggedIn ? 'projects.html' : '#'}" onclick="${!this.userLoggedIn ? 'ResidentNav.showRestrictedModal(); return false;' : ''}" class="nav-item hover-trigger ${currentPage === 'projects.html' ? 'active' : ''}"><i>🛡️</i> <span>${window.I18n?.t('nav.projects') || 'Проекты'}</span></a>
            </nav>
            <div style="margin-top: auto; display: flex; flex-direction: column; gap: 10px; width: 100%;">
                <button class="nav-item hover-trigger" style="background:none; border:none; width:100%;" onclick="ResidentNav.toggleTheme()">
                    <i id="sidebarThemeIcon">☽</i> <span>${window.I18n?.t('nav.theme') || 'Фон'}</span>
                </button>
                <button class="nav-item hover-trigger ${currentPage.includes('admin') ? 'active' : ''}" style="background:none; border:none; width:100%;" onclick="ResidentNav.handleSettingsClick()">
                    <i>${this.userLoggedIn ? '⚙️' : '🔑'}</i> <span>${this.userLoggedIn ? (window.I18n?.t('sidebar.settings') || 'Настройки') : (window.I18n?.t('auth.login') || 'Войти')}</span>
                </button>
            </div>
        `;

        // Render Bottom Nav (Mobile)
        const bottomNav = document.createElement('nav');
        bottomNav.className = 'bottom-nav';
        bottomNav.innerHTML = `
            <a href="index.html" class="logo-bottom hover-trigger"><img src="A-lab-logo.svg" alt="A-LAB"></a>
            <a href="${this.userLoggedIn ? 'social-feed.html' : '#'}" onclick="${!this.userLoggedIn ? 'ResidentNav.showRestrictedModal(); return false;' : ''}" class="nav-item-bottom hover-trigger ${currentPage === 'social-feed.html' ? 'active' : ''}">
                <i>📡</i> <span>${window.I18n?.t('nav.feed') || 'Лента'}</span>
            </a>
            <a href="${this.userLoggedIn ? 'messages.html' : '#'}" onclick="${!this.userLoggedIn ? 'ResidentNav.showRestrictedModal(); return false;' : ''}" class="nav-item-bottom hover-trigger ${currentPage === 'messages.html' ? 'active' : ''}">
                <i>💬</i> <span>${window.I18n?.t('nav.messenger') || 'Messenger'}</span>
            </a>
            <button class="nav-item-bottom hover-trigger" onclick="ResidentNav.toggleTheme()">
                <i id="bottomThemeIcon">☽</i> <span>${window.I18n?.t('nav.theme') || 'Фон'}</span>
            </button>
            <button class="nav-item-bottom hover-trigger" onclick="ResidentNav.toggleMoreMenu()">
                <i>📂</i> <span>${window.I18n?.t('nav.more') || 'ЕЩЕ'}</span>
            </button>
        `;

        // Render More Menu Popup
        const moreMenu = document.createElement('div');
        moreMenu.className = 'more-menu-popup';
        moreMenu.id = 'moreMenuPopup';

        let moreItemsHTML = `
            <a href="residents.html" class="more-item hover-trigger ${currentPage === 'residents.html' ? 'active' : ''}"><i>👥</i> <span>${window.I18n?.t('nav.residents') || 'Резиденты'}</span></a>
            <a href="${this.userLoggedIn ? 'projects.html' : '#'}" onclick="${!this.userLoggedIn ? 'ResidentNav.showRestrictedModal(); return false;' : ''}" class="more-item hover-trigger ${currentPage === 'projects.html' ? 'active' : ''}"><i>🛡️</i> <span>${window.I18n?.t('nav.projects') || 'Проекты'}</span></a>
        `;

        // If we have custom items (e.g. for Admin page), prepend or replace
        if (this.config && this.config.moreItems) {
            moreItemsHTML = this.config.moreItems.map(item => `
                <button class="more-item hover-trigger ${item.active ? 'active' : ''}" onclick="${item.onclick}">
                    <i>${item.icon || '🔹'}</i> <span>${item.text}</span>
                </button>
            `).join('');
        }

        moreMenu.innerHTML = `
            ${moreItemsHTML}
            <div style="height: 1px; background: rgba(255,255,255,0.1); margin: 5px 0;"></div>
            <div style="height: 1px; background: rgba(255,255,255,0.1); margin: 5px 0;"></div>
            <button class="more-item join-btn hover-trigger" onclick="ResidentNav.handleJoinClick()"><i>+</i> <span>${window.I18n?.t('nav.join') || 'ВСТУПИТЬ'}</span></button>
            <button class="more-item hover-trigger ${currentPage.includes('admin') ? 'active' : ''}" onclick="ResidentNav.handleSettingsClick()">
                <i>${this.userLoggedIn ? '⚙️' : '🔑'}</i> <span>${this.userLoggedIn ? (window.I18n?.t('nav.settings') || 'Настройки') : (window.I18n?.t('nav.login') || 'Войти')}</span>
            </button>
            ${this.config && this.config.showLogout ? `
                <button class="more-item hover-trigger" style="color: var(--accent);" onclick="ResidentNav.logout()"><i>🔌</i> <span>${window.I18n?.t('nav.logout') || 'Выход'}</span></button>
            ` : ''}
        `;

        document.body.appendChild(sidebar);
        document.body.appendChild(bottomNav);
        document.body.appendChild(moreMenu);

        this.updateThemeIcons();
    },

    config: {
        moreItems: null,
        showLogout: false
    },

    logout() {
        if (window.ALabAuth && window.ALabCore && window.ALabCore.db && window.ALabCore.db.auth) {
            window.ALabCore.db.auth.signOut().then(() => window.location.href = 'index.html');
        } else {
            localStorage.removeItem('sb-yirszunrxtunvzpxwvqz-auth-token');
            localStorage.removeItem('alab_resident_id');
            window.location.href = 'index.html';
        }
    },

    bindEvents() {
        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            const menu = document.getElementById('moreMenuPopup');
            const moreBtn = e.target.closest('button');
            if (menu && menu.classList.contains('active') && !menu.contains(e.target) && (!moreBtn || !moreBtn.innerText.includes('ЕЩЕ'))) {
                menu.classList.remove('active');
            }
        });

        // Re-bind cursor triggers for injected elements
        if (typeof bindHover === 'function') bindHover();
        else {
            const cursor = document.querySelector('.cursor');
            if (cursor) {
                document.querySelectorAll('.hover-trigger').forEach(t => {
                    t.addEventListener('mouseenter', () => cursor.classList.add('hovered'));
                    t.addEventListener('mouseleave', () => cursor.classList.remove('hovered'));
                });
            }
        }
    },

    toggleMoreMenu() {
        const menu = document.getElementById('moreMenuPopup');
        if (menu) menu.classList.toggle('active');
    },

    toggleTheme() {
        const body = document.body;
        body.classList.toggle('light-theme');
        const isLight = body.classList.contains('light-theme');
        localStorage.setItem('theme', isLight ? 'light' : 'dark');
        this.updateThemeIcons();
    },

    applyTheme() {
        if (localStorage.getItem('theme') === 'light') {
            document.body.classList.add('light-theme');
        }
    },

    updateThemeIcons() {
        const isLight = document.body.classList.contains('light-theme');
        const sIcon = document.getElementById('sidebarThemeIcon');
        const bIcon = document.getElementById('bottomThemeIcon');
        if (sIcon) sIcon.innerText = isLight ? '☀' : '☽';
        if (bIcon) bIcon.innerText = isLight ? '☀' : '☽';
    },

    async handleSettingsClick() {
        this.checkAuth();
        const lang = window.I18n?.getLang() || (document.documentElement.lang === 'en' ? 'en' : 'ru');
        const adminPage = lang === 'en' ? 'resident-admin-en.html' : 'resident-admin-ru.html';

        if (this.userLoggedIn) {
            window.location.href = adminPage;
        } else {
            window.location.href = 'login.html';
        }
    },

    handleJoinClick() {
        if (typeof openQuiz === 'function') {
            openQuiz();
        } else {
            window.location.href = 'residents.html?join=true';
        }
    },

    showRestrictedModal() {
        let modal = document.getElementById('restrictedModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'restrictedModal';
            modal.className = 'quiz-modal';
            document.body.appendChild(modal);
        }

        // Always refresh content to match current language
        modal.innerHTML = `
            <div class="quiz-content" style="max-width: 500px; text-align: center;">
                <span class="close-quiz" onclick="ResidentNav.closeRestrictedModal()">&times;</span>
                <div style="margin-bottom: 30px;">
                    <i style="font-size: 4rem; color: var(--accent); display: block; margin-bottom: 20px;">🔒</i>
                    <h2 class="quiz-q" style="font-size: 1.6rem; margin-bottom: 15px;">${window.I18n?.t('nav.restricted_title') || 'ACCESS RESTRICTED'}</h2>
                    <p style="color: #888; line-height: 1.6; font-size: 0.95rem;">${window.I18n?.t('nav.restricted_desc') || 'Entry to the closed A-LAB ecosystem is available only to residents. Please log in or apply for membership.'}</p>
                </div>
                <div style="display: flex; flex-direction: column; gap: 12px; width: 100%;">
                    <a href="login.html" class="btn-quiz-next" style="width: 100%; box-sizing: border-box;">${window.I18n?.t('nav.login_btn') || 'LOGIN TO SYSTEM'}</a>
                    <button class="btn-quiz-back" style="width: 100%; margin: 0; box-sizing: border-box;" onclick="ResidentNav.closeRestrictedModal(); ResidentNav.handleJoinClick();">${window.I18n?.t('nav.join_btn') || 'BECOME A RESIDENT'}</button>
                    <p style="font-family: var(--font-code); color: #444; font-size: 0.6rem; margin-top: 10px; text-transform: uppercase; letter-spacing: 1px;">[ ${window.I18n?.t('nav.protocol_tag') || 'END-TO-END ENCRYPTED PROTOCOL'} ]</p>
                </div>
            </div>
        `;

        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    },

    closeRestrictedModal() {
        const modal = document.getElementById('restrictedModal');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }
    }
};

// Global shortcuts for historical reasons/inline calls
window.toggleTheme = () => ResidentNav.toggleTheme();
window.toggleMoreMenu = () => ResidentNav.toggleMoreMenu();
window.handleSettingsClick = () => ResidentNav.handleSettingsClick();

// Auto-init
document.addEventListener('DOMContentLoaded', () => ResidentNav.init());
