/**
 * A-LAB.TECH — Main Menu Component (Public Site) [MENU1]
 * =================================================
 * Dynamic menu loaded from Supabase or fallback config.
 * Rendered top-right on all public pages.
 * Includes language toggle and mobile hamburger.
 */

const MainMenu = (() => {
    const fallbackItems = [
        { label_ru: 'Главная', label_en: 'Home', url: 'index.html' },
        { label_ru: 'О компании', label_en: 'About', url: 'about.html' },
        { label_ru: 'R&D Lab', label_en: 'R&D Lab', url: 'rd.html' },
        { label_ru: 'Тех консалтинг', label_en: 'Tech Consulting', url: 'consulting.html' },
        { label_ru: 'Digital & AI', label_en: 'Digital & AI', url: 'digital.html' },
        { label_ru: 'Дизайн', label_en: 'Design', url: 'design.html' },
        { label_ru: 'Маркетинг', label_en: 'Marketing', url: 'marketing.html' },
        { label_ru: 'Резиденты', label_en: 'Residents', url: 'residents.html' },
    ];

    let menuItems = [];
    let isOpen = false;
    let userLoggedIn = false;

    /**
     * Load menu items from Supabase or use fallback
     */
    async function loadItems() {
        try {
            if (typeof SupabaseClient !== 'undefined' && SupabaseClient.isConfigured()) {
                const sb = SupabaseClient.getClient();
                const { data, error } = await sb
                    .from('menu_items')
                    .select('*')
                    .eq('is_visible', true)
                    .order('order_index', { ascending: true });

                if (!error && data && data.length > 0) {
                    menuItems = data;
                    return;
                }
            }
        } catch (e) {
            console.warn('[MainMenu] Supabase not ready, using fallback');
        }
        menuItems = fallbackItems;
    }

    /**
     * Get label in current language
     */
    function getLabel(item) {
        const lang = typeof I18n !== 'undefined' ? I18n.getLang() : 'ru';
        return lang === 'en' ? (item.label_en || item.label_ru) : item.label_ru;
    }

    /**
     * Check auth status
     */
    function checkAuth() {
        const token = localStorage.getItem('sb-yirszunrxtunvzpxwvqz-auth-token') || localStorage.getItem('alab_resident_id');
        userLoggedIn = !!token;
    }

    /**
     * Render the menu
     */
    function render() {
        checkAuth();
        // Remove existing
        const existing = document.getElementById('alab-main-menu');
        if (existing) existing.remove();

        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        const lang = typeof I18n !== 'undefined' ? I18n.getLang() : 'ru';

        const container = document.createElement('div');
        container.id = 'alab-main-menu';
        container.innerHTML = `
            <nav class="menu-overlay ${isOpen ? 'open' : ''}">
                <div class="menu-overlay-inner">
                    <button class="menu-close hover-trigger" onclick="MainMenu.toggle()">✕</button>
                    
                    <div class="menu-profile-section" style="margin-bottom: 40px;">
                        <a href="login.html" class="cabinet-btn hover-trigger">
                            <i>👤</i> ${lang === 'en' ? 'CABINET' : 'ЛИЧНЫЙ КАБИНЕТ'}
                        </a>
                    </div>

                    <ul class="menu-list">
                        ${menuItems.map(item => `
                            <li>
                                <a href="${item.url}" 
                                   class="menu-link hover-trigger ${item.url === currentPage ? 'active' : ''}"
                                   target="${item.target || '_self'}">
                                    ${getLabel(item)}
                                </a>
                            </li>
                        `).join('')}
                    </ul>
                    <div class="menu-lang-toggle">
                        <button class="lang-btn hover-trigger ${lang === 'ru' ? 'active' : ''}" 
                                data-lang-toggle="ru"
                                onclick="MainMenu.switchLang('ru')">RU</button>
                        <span class="lang-divider">/</span>
                        <button class="lang-btn hover-trigger ${lang === 'en' ? 'active' : ''}"
                                data-lang-toggle="en" 
                                onclick="MainMenu.switchLang('en')">EN</button>
                    </div>
                </div>
            </nav>
        `;

        document.body.appendChild(container);
        injectStyles();
    }

    /**
     * Toggle menu open/close
     */
    function toggle() {
        isOpen = !isOpen;
        const overlay = document.querySelector('.menu-overlay');
        const hamburger = document.querySelector('.menu-hamburger');
        if (overlay) overlay.classList.toggle('open', isOpen);
        if (hamburger) hamburger.classList.toggle('active', isOpen);
        document.body.style.overflow = isOpen ? 'hidden' : '';
    }

    /**
     * Switch language
     */
    function switchLang(lang) {
        if (typeof I18n !== 'undefined') {
            I18n.setLanguage(lang);
        }
        // Re-render menu with new labels
        render();
    }

    /**
     * Inject styles
     */
    function injectStyles() {
        if (document.getElementById('alab-menu-styles')) return;

        const style = document.createElement('style');
        style.id = 'alab-menu-styles';
        style.textContent = `
            #alab-main-menu {
                position: fixed;
                top: 0;
                right: 0;
                z-index: 1000;
            }

            .menu-overlay {
                position: fixed;
                top: 0;
                right: -100%;
                width: 100%;
                height: 100vh;
                background: rgba(0, 0, 0, 0.95);
                backdrop-filter: blur(40px);
                -webkit-backdrop-filter: blur(40px);
                transition: right 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94);
                z-index: 1001;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .menu-overlay.open {
                right: 0;
            }

            .menu-overlay-inner {
                text-align: center;
                max-width: 600px;
                width: 90%;
            }

            .menu-close {
                position: absolute;
                top: 30px;
                right: 30px;
                background: none;
                border: 1px solid rgba(255,255,255,0.1);
                color: white;
                font-size: 1.5rem;
                width: 44px;
                height: 44px;
                border-radius: 12px;
                cursor: pointer;
                transition: 0.3s;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .menu-close:hover {
                border-color: var(--accent, #FF2A2A);
                color: var(--accent, #FF2A2A);
            }

            .menu-list {
                list-style: none;
                padding: 0;
                margin: 0;
            }

            .menu-list li {
                margin-bottom: 5px;
            }

            .menu-link {
                display: inline-block;
                color: rgba(255, 255, 255, 0.6);
                text-decoration: none;
                font-family: var(--font-main, 'Inter', sans-serif);
                font-size: 2rem;
                font-weight: 300;
                padding: 8px 20px;
                border-radius: 10px;
                transition: 0.3s;
                letter-spacing: 1px;
            }

            .menu-link:hover {
                color: white;
                background: rgba(0, 229, 255, 0.05);
            }

            .menu-link.active {
                color: var(--tech-blue, #00E5FF);
                font-weight: 600;
            }

            .menu-lang-toggle {
                margin-top: 50px;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 10px;
            }

            .lang-btn {
                background: none;
                border: 1px solid rgba(255,255,255,0.1);
                color: rgba(255,255,255,0.4);
                font-family: var(--font-code, 'JetBrains Mono', monospace);
                font-size: 0.85rem;
                font-weight: 700;
                padding: 8px 16px;
                border-radius: 6px;
                cursor: pointer;
                transition: 0.3s;
                letter-spacing: 2px;
            }

            .lang-btn:hover {
                border-color: var(--tech-blue, #00E5FF);
                color: white;
            }

            .lang-btn.active {
                background: var(--tech-blue, #00E5FF);
                color: #000;
                border-color: var(--tech-blue, #00E5FF);
            }

            .cabinet-btn {
                display: inline-flex;
                align-items: center;
                gap: 15px;
                padding: 15px 40px;
                background: rgba(255, 42, 42, 0.1);
                border: 1px solid var(--accent, #FF2A2A);
                color: white;
                text-decoration: none;
                font-family: var(--font-code, 'JetBrains Mono', monospace);
                font-weight: 700;
                font-size: 0.9rem;
                letter-spacing: 2px;
                border-radius: 4px;
                transition: 0.3s;
                margin-bottom: 20px;
            }

            .cabinet-btn:hover {
                background: var(--accent, #FF2A2A);
                color: white;
                box-shadow: 0 0 30px rgba(255, 42, 42, 0.3);
            }

            .cabinet-btn i {
                font-style: normal;
                font-size: 1.2rem;
            }

            .lang-divider {
                color: rgba(255,255,255,0.2);
                font-size: 1.2rem;
            }

            /* Light theme */
            body.light-theme .menu-hamburger {
                background: rgba(255, 255, 255, 0.9);
                border-color: rgba(0, 0, 0, 0.08);
            }

            body.light-theme .menu-hamburger span {
                background: #1d1d1f;
            }

            /* Mobile */
            @media (max-width: 768px) {
                .menu-hamburger {
                    top: 15px;
                    right: 15px;
                    width: 40px;
                    height: 40px;
                }

                .menu-link {
                    font-size: 1.3rem;
                    padding: 6px 15px;
                }

                .menu-close {
                    top: 15px;
                    right: 15px;
                }
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Initialize
     */
    async function init() {
        await loadItems();
        render();

        // Re-render on lang change
        window.addEventListener('alab:lang-changed', () => {
            render();
        });
    }

    // Auto-run
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    return { init, toggle, switchLang, render };
})();
