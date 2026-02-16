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
                <div class="menu-container">
                    <div class="menu-links-section">
                        <button class="menu-close hover-trigger" onclick="MainMenu.toggle()">✕</button>
                        
                        <div class="menu-nav-list" style="margin-top: auto; margin-bottom: auto;">
                            ${menuItems.map((item, index) => `
                                <a href="${item.url}" 
                                   class="nav-link hover-trigger ${item.url === currentPage ? 'active' : ''}"
                                   data-index="${String(index + 1).padStart(2, '0')}"
                                   data-target="item-${index}"
                                   target="${item.target || '_self'}">
                                    ${getLabel(item)}
                                </a>
                            `).join('')}
                        </div>

                        <div class="menu-bottom-controls">
                            <div class="menu-lang-toggle">
                                <button class="lang-btn hover-trigger ${lang === 'ru' ? 'active' : ''}" onclick="MainMenu.switchLang('ru')">RU</button>
                                <span class="lang-divider">|</span>
                                <button class="lang-btn hover-trigger ${lang === 'en' ? 'active' : ''}" onclick="MainMenu.switchLang('en')">EN</button>
                            </div>
                            
                            <a href="${userLoggedIn ? 'resident-workspace-ru.html' : 'login.html'}" class="auth-text-btn hover-trigger">
                                ${userLoggedIn ? (lang === 'en' ? 'DASHBOARD' : 'КАБИНЕТ') : (lang === 'en' ? 'LOGIN' : 'ВХОД')}
                            </a>
                        </div>
                    </div>

                    <aside class="menu-preview-section">
                        <div class="preview-box active" id="default-preview">
                            <h2>CORE_SYST</h2>
                            <p>${lang === 'en' ? 'Central interface for managing all laboratory units.' : 'Центральный интерфейс управления всеми подразделениями лаборатории.'}</p>
                        </div>
                        ${menuItems.map((item, index) => `
                            <div class="preview-box" id="preview-item-${index}">
                                <h2>${item.code || 'SYS_MODULE'}</h2>
                                <p>${lang === 'en' ? (item.desc_en || item.label_en) : (item.desc_ru || item.label_ru)}</p>
                            </div>
                        `).join('')}
                    </aside>
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
            /* --- MENU LAYOUT --- */
            .menu-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100vh;
                background: #030407;
                z-index: 9999;
                opacity: 0;
                pointer-events: none;
                transition: opacity 0.4s ease;
                display: flex;
            }

            .menu-overlay.open {
                opacity: 1;
                pointer-events: auto;
            }

            .menu-container {
                display: grid;
                grid-template-columns: 1fr 1fr;
                width: 100%;
                height: 100%;
            }

            /* --- LEFT COLUMN (LINKS) --- */
            .menu-links-section {
                padding: 60px;
                display: flex;
                flex-direction: column;
                justify-content: center;
                border-right: 1px solid rgba(255, 255, 255, 0.1);
                position: relative;
                overflow-y: auto;
            }

            .menu-close {
                position: absolute;
                top: 40px;
                right: 40px;
                font-family: 'Inter', sans-serif;
                color: #FFFFFF;
                background: transparent;
                border: 1px solid rgba(255,255,255,0.2);
                width: 50px;
                height: 50px;
                border-radius: 50%;
                cursor: pointer;
                font-size: 1.5rem;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: 0.3s;
                z-index: 10;
            }
            
            .menu-close:hover {
                background: #FF2A2A;
                border-color: #FF2A2A;
                color: white;
            }

            .menu-bottom-controls {
                margin-top: 40px;
                display: flex;
                gap: 30px;
                align-items: center;
                font-family: 'JetBrains Mono', monospace;
                font-size: 0.9rem;
            }

            .auth-text-btn {
                color: white;
                text-decoration: none;
                font-weight: 700;
                transition: 0.3s;
                text-transform: uppercase;
                letter-spacing: 1px;
            }

            .auth-text-btn:hover {
                color: #FF2A2A;
            }

            .menu-nav-list {
                display: flex;
                flex-direction: column;
                gap: 10px;
                margin-bottom: auto;
            }

            .nav-link {
                font-family: 'Inter', sans-serif;
                font-size: clamp(1.8rem, 3vw, 3rem);
                font-weight: 800;
                text-transform: uppercase;
                color: rgba(255, 255, 255, 0.2);
                text-decoration: none;
                line-height: 1.1;
                transition: 0.4s;
                position: relative;
                width: fit-content;
            }

            .nav-link::before {
                content: attr(data-index);
                position: absolute;
                left: -40px;
                top: 5px;
                font-size: 0.8rem;
                font-family: 'JetBrains Mono', monospace;
                color: #FF2A2A;
                opacity: 0;
                transition: 0.3s;
            }

            .nav-link:hover, .nav-link.active {
                color: white;
                padding-left: 10px;
            }

            .nav-link:hover::before, .nav-link.active::before {
                opacity: 1;
                left: -35px;
            }

            /* --- RIGHT COLUMN (PREVIEW) --- */
            .menu-preview-section {
                background: linear-gradient(135deg, #111 0%, #050505 100%);
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 60px;
                position: relative;
                overflow: hidden;
            }

            .menu-preview-section::after {
                content: '';
                position: absolute;
                inset: 0;
                background: url('https://grainy-gradients.vercel.app/noise.svg');
                opacity: 0.05;
                pointer-events: none;
            }

            .preview-box {
                max-width: 400px;
                display: none;
                animation: fadeIn 0.4s ease-out;
                z-index: 2;
                text-align: left;
            }

            .preview-box.active {
                display: block;
            }

            .preview-box h2 {
                font-family: 'JetBrains Mono', monospace;
                color: #00E5FF;
                font-size: 1.5rem;
                margin-bottom: 20px;
            }

            .preview-box p {
                font-family: 'Inter', sans-serif;
                font-size: 1.1rem;
                line-height: 1.6;
                color: #aaa;
            }

            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }

            /* --- CONTROLS --- */
            .menu-lang-toggle {
                display: flex;
                gap: 15px;
                color: rgba(255,255,255,0.4);
            }

            .lang-btn {
                background: none;
                border: none;
                color: inherit;
                cursor: pointer;
                font-size: 1rem;
                padding: 0;
            }

            .lang-btn.active {
                color: white;
                text-decoration: underline;
                text-decoration-color: #00E5FF;
            }

            /* --- MOBILE --- */
            @media (max-width: 1024px) {
                .menu-container {
                    grid-template-columns: 1fr;
                }
                .menu-preview-section {
                    display: none;
                }
                .menu-links-section {
                    padding: 30px;
                    border: none;
                }
                .nav-link {
                    font-size: 2rem;
                }
                .menu-header-mobile {
                    position: relative;
                    top: 0; left: 0; right: 0;
                    margin-bottom: 40px;
                }
                .menu-top-controls {
                    margin-top: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Initialize keys and events
     */
    function attachEvents() {
        const links = document.querySelectorAll('.nav-link');
        const previews = document.querySelectorAll('.preview-box');

        links.forEach(link => {
            link.addEventListener('mouseenter', () => {
                const targetId = 'preview-' + link.getAttribute('data-target');
                const target = document.getElementById(targetId);

                if (target) {
                    previews.forEach(p => p.classList.remove('active'));
                    target.classList.add('active');
                }
            });
        });
    }

    /**
     * Initialize
     */
    async function init() {
        await loadItems();
        // Pre-inject styles so they are ready
        injectStyles();
    }

    // Re-assign toggle function
    toggle = function () {
        if (!isOpen) {
            render();
            // Small delay to allow DOM to paint before adding open class for transition
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    const overlay = document.querySelector('.menu-overlay');
                    if (overlay) overlay.classList.add('open');
                    document.body.style.overflow = 'hidden';
                    isOpen = true;
                    attachEvents();
                });
            });
        } else {
            const overlay = document.querySelector('.menu-overlay');
            if (overlay) overlay.classList.remove('open');
            document.body.style.overflow = '';
            isOpen = false;
        }
    }

    // Auto-run init
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    return { init, toggle, switchLang, render };
})();
