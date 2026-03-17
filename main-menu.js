/**
 * A-LAB.TECH — Main Menu Component (Public Site) [MENU1]
 * =================================================
 * Dynamic menu loaded from Supabase or fallback config.
 * Rendered top-right on all public pages.
 * Includes language toggle and mobile hamburger.
 */

const MainMenu = (() => {
    const isSubfolder = window.location.pathname.includes('/residents/');
    const prefix = isSubfolder ? '../' : '';
    const residentPrefix = isSubfolder ? '' : 'residents/';

    const fallbackItems = [
        {
            label_ru: 'Главная', label_en: 'Home', url: prefix + 'index.html',
            code: 'CORE_HUB',
            desc_ru: 'Точка входа в экосистему A-LAB. Будущее технологий начинается здесь.',
            desc_en: 'Entry point to the A-LAB ecosystem. The future of technology starts here.'
        },
        {
            label_ru: 'О компании', label_en: 'About', url: prefix + 'about.html',
            code: 'VISION_CORE',
            desc_ru: 'Кто мы и почему мы меняем правила игры. Наша миссия и визионеры.',
            desc_en: 'Who we are and why we change the rules. Our mission and visionaries.'
        },
        {
            label_ru: 'R&D Lab', label_en: 'R&D Lab', url: prefix + 'rd.html',
            code: 'RND_LAB',
            desc_ru: 'Секретные разработки, прототипы будущего и глубокие исследования.',
            desc_en: 'Secret developments, prototypes of the future, and deep research.'
        },
        {
            label_ru: 'Тех консалтинг', label_en: 'Tech Consulting', url: prefix + 'consulting.html',
            code: 'TECH_CONSULT',
            desc_ru: 'Масштабируем ваш бизнес через внедрение передовых архитектурных решений.',
            desc_en: 'Scaling your business through the implementation of advanced architectural solutions.'
        },
        {
            label_ru: 'Digital & AI', label_en: 'Digital & AI', url: prefix + 'digital.html',
            code: 'DIGITAL_AI',
            desc_ru: 'Нейросети, автоматизация и цифровые двойники для лидерства на рынке.',
            desc_en: 'Neural networks, automation, and digital twins for market leadership.'
        },
        {
            label_ru: 'Дизайн', label_en: 'Design', url: prefix + 'design.html',
            code: 'DESIGN_NODE',
            desc_ru: 'Эстетика высоких технологий и интерфейсы, опережающие время.',
            desc_en: 'High-tech aesthetics and interfaces ahead of their time.'
        },
        {
            label_ru: 'Маркетинг', label_en: 'Marketing', url: prefix + 'marketing.html',
            code: 'GROWTH_ENGINE',
            desc_ru: 'Стратегии роста, основанные на данных и психологии потребления.',
            desc_en: 'Growth strategies based on data and consumer psychology.'
        },
        {
            label_ru: 'Контакты', label_en: 'Contacts', url: prefix + 'contacts.html',
            code: 'CONTACT_NODE',
            desc_ru: 'Свяжитесь с нами напрямую. Обсуждение проектов и партнерство.',
            desc_en: 'Contact us directly. Project discussion and partnership.'
        },
        {
            label_ru: 'Эфир', label_en: 'Aether', url: residentPrefix + 'feed.html',
            code: 'COMMUNITY_STREAM',
            desc_ru: 'Прямая трансляция жизни сообщества. Мысли, обновления и инсайды резидентов.',
            desc_en: 'Live stream of community life. Thoughts, updates, and resident insights.',
            requiresAuth: true
        },
        {
            label_ru: 'Резиденты', label_en: 'Residents', url: residentPrefix + 'index.html',
            code: 'RESIDENT_GRID',
            desc_ru: 'Закрытое сообщество инноваторов. Скоро будет открыто для резидентов A-LAB.',
            desc_en: 'A closed community of innovators. Opening soon for A-LAB residents.',
            is_upcoming: false
        }
    ];

    let menuItems = [];
    let isOpen = false;
    let userLoggedIn = false;
    // No more complex observers or intervals needed

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
                    menuItems = data.map(item => {
                        // Ensure URLs are path-aware if they come from DB
                        if (!item.url.startsWith('http') && !item.url.startsWith('/') && !item.url.startsWith('.')) {
                            // If it's a resident page, it might need different prefixing
                            if (item.url.includes('resident') || item.url === 'login.html') {
                                item.url = residentPrefix + item.url;
                            } else {
                                item.url = prefix + item.url;
                            }
                        }
                        return item;
                    });

                    // Ensure Aether is present even if not in DB yet
                    if (!menuItems.some(i => i.code === 'COMMUNITY_STREAM')) {
                        const aether = fallbackItems.find(i => i.code === 'COMMUNITY_STREAM');
                        if (aether) {
                            // Insert before Residents (last one usually)
                            menuItems.splice(menuItems.length - 1, 0, aether);
                        }
                    }
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
     * Get URL in current language (for pages with dedicated files)
     */
    function getURL(item) {
        const lang = typeof I18n !== 'undefined' ? I18n.getLang() : 'ru';
        let url = item.url;
        if (lang === 'en') {
            // Only swap root-level index.html → index-en.html, NOT residents/index.html which has no EN copy
            if ((url === 'index.html' || url === prefix + 'index.html') && !url.includes('residents/')) {
                url = url.replace('index.html', 'index-en.html');
            }
            if (url.endsWith('resident-admin-ru.html')) url = url.replace('resident-admin-ru.html', 'resident-admin-en.html');
            if (url.endsWith('resident-workspace-ru.html')) url = url.replace('resident-workspace-ru.html', 'resident-workspace-en.html');
        } else if (lang === 'ru') {
            if (url.endsWith('index-en.html') && !url.includes('residents/')) url = url.replace('index-en.html', 'index.html');
            if (url.endsWith('resident-admin-en.html')) url = url.replace('resident-admin-en.html', 'resident-admin-ru.html');
            if (url.endsWith('resident-workspace-en.html')) url = url.replace('resident-workspace-en.html', 'resident-workspace-ru.html');
        }
        return url;
    }

    /**
     * Check auth status
     */
    async function checkAuth() {
        if (window.ALabCore?.db) {
            const { data: { session } } = await window.ALabCore.db.auth.getSession();
            userLoggedIn = !!session;
        } else {
            userLoggedIn = Object.keys(localStorage).some(k => k.includes('supabase.auth.token'));
        }
    }

    async function logout() {
        if (window.ALabCore?.db) {
            await window.ALabCore.db.auth.signOut();
        }
        localStorage.removeItem('sb-yirszunrxtunvzpxwvqz-auth-token'); // Clear legacy if any
        localStorage.removeItem('alab_resident_id');
        window.location.reload();
    }

    /**
     * Render the menu
     */
    async function render() {
        await checkAuth();

        let container = document.getElementById('alab-main-menu');
        if (!container) {
            container = document.createElement('div');
            container.id = 'alab-main-menu';
            // Absolute stacking priority
            container.style.position = 'fixed';
            container.style.top = '0';
            container.style.left = '0';
            container.style.width = '100%';
            container.style.zIndex = '2147483647'; // Max 32-bit z-index
            document.body.appendChild(container);
        }

        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        const lang = typeof I18n !== 'undefined' ? I18n.getLang() : 'ru';

        const dashboardUrl = residentPrefix + 'workspace.html';
        const loginUrl = residentPrefix + 'login.html';

        container.innerHTML = `
            <div id="alab-menu-nav-blocker"></div>
            <nav class="menu-overlay ${isOpen ? 'open' : ''}">
                <div class="menu-container">
                    <div class="menu-links-section">
                        <button class="menu-close hover-trigger" onclick="MainMenu.toggle()">✕</button>
                        
                        <div class="menu-nav-list" style="margin-top: auto; margin-bottom: auto;">
                            ${menuItems.map((item, index) => {
            const isLocked = item.requiresAuth && !userLoggedIn;
            const itemUrl = isLocked ? '#' : getURL(item);
            const onclickAttr = isLocked
                ? `onclick="event.preventDefault(); MainMenu.showAccessModal()"`
                : (item.onclick ? `onclick="event.preventDefault(); MainMenu.toggle(); ${item.onclick}"` : '');

            let isActive = false;
            try {
                const linkPath = new URL(getURL(item), window.location.href).pathname;
                isActive = (linkPath === window.location.pathname);
            } catch (e) { }

            return `
                                <a href="${itemUrl}" 
                                   class="nav-link hover-trigger ${isActive ? 'active' : ''} ${isLocked ? 'nav-link--locked' : ''}"
                                   data-index="${String(index + 1).padStart(2, '0')}"
                                   data-target="item-${index}"
                                   ${onclickAttr}
                                   target="${item.target || '_self'}">
                                    ${getLabel(item)}
                                    ${isLocked ? '<span class="nav-link-badge">RESIDENT ONLY</span>' : ''}
                                </a>`;
        }).join('')}
                        </div>

                        <div class="menu-bottom-controls">
                            <div class="menu-lang-toggle">
                                <button class="lang-btn hover-trigger ${lang === 'ru' ? 'active' : ''}" onclick="MainMenu.switchLang('ru')">RU</button>
                                <span class="lang-divider">|</span>
                                <button class="lang-btn hover-trigger ${lang === 'en' ? 'active' : ''}" onclick="MainMenu.switchLang('en')">EN</button>
                            </div>
                            
                            <div style="display: flex; align-items: center; gap: 15px;">
                                <a href="${userLoggedIn ? dashboardUrl : loginUrl}" class="auth-text-btn hover-trigger">
                                    ${userLoggedIn ? (lang === 'en' ? 'DASHBOARD' : 'КАБИНЕТ') : (lang === 'en' ? 'LOGIN' : 'ВХОД')}
                                </a>
                                ${userLoggedIn ? `
                                    <button onclick="MainMenu.logout()" class="hover-trigger" style="background:none; border:none; color: var(--accent); font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; cursor: pointer; opacity: 0.6; padding-left: 10px;">
                                        ${lang === 'en' ? '[ EXIT ]' : '[ ВЫХОД ]'}
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                    </div>

                    <aside class="menu-preview-section">
                        <div class="preview-box active" id="default-preview">
                            <h2>CORE_SYST</h2>
                            <p>${lang === 'en' ? 'Central interface for managing all laboratory units.' : 'Центральный интерфейс управления всеми подразделениями лаборатории.'}</p>
                        </div>
                        ${menuItems.map((item, index) => `
                            <div class="preview-box" id="preview-item-${index}">
                                <!--- PREVIEW CONTENT --->
                                <h2>${item.code || 'SYS_MODULE'}</h2>
                                <p>${lang === 'en' ? (item.desc_en || item.label_en || item.label_ru) : (item.desc_ru || item.desc_en || item.label_ru)}</p>
                                ${item.is_upcoming ? `
                                    <div class="upcoming-badge">
                                        ${lang === 'en' ? 'IN DEVELOPMENT' : 'В РАЗРАБОТКЕ'}
                                    </div>
                                ` : ''}
                            </div>
                        `).join('')}
                    </aside>
                </div>
            </nav>
        `;

        injectStyles();
        attachEvents();
    }

    /**
     * Toggle menu open/close
     */
    function toggle() {
        isOpen = !isOpen;
        const overlay = document.querySelector('.menu-overlay');

        if (!overlay) {
            // First time click, render and then open
            render().then(() => {
                const newOverlay = document.querySelector('.menu-overlay');
                if (newOverlay) {
                    newOverlay.classList.add('open');
                    document.body.classList.add('menu-active');
                    document.body.style.overflow = 'hidden';
                }
            });
            return;
        }

        if (isOpen) {
            overlay.classList.add('open');
            document.body.classList.add('menu-active');
            document.body.style.overflow = 'hidden';
            // Sync auth state in background without blocking
            checkAuth().then(() => {
                const authBtn = document.querySelector('.auth-text-btn');
                if (authBtn) {
                    const lang = typeof I18n !== 'undefined' ? I18n.getLang() : 'ru';
                    const dashboardUrl = residentPrefix + 'workspace.html';
                    const loginUrl = residentPrefix + 'login.html';
                    authBtn.href = userLoggedIn ? dashboardUrl : loginUrl;
                    authBtn.innerText = userLoggedIn ? (lang === 'en' ? 'DASHBOARD' : 'КАБИНЕТ') : (lang === 'en' ? 'LOGIN' : 'ВХОД');
                }
            });
        } else {
            overlay.classList.remove('open');
            document.body.classList.remove('menu-active');
            document.body.style.overflow = '';
        }
    }

    /**
     * Switch language
     */
    function switchLang(lang) {
        if (typeof I18n !== 'undefined') {
            I18n.setLanguage(lang);
        }
        // Redirect if on a page that has a dedicated localized version
        const path = window.location.pathname;
        const currentPage = path.split('/').pop() || 'index.html';
        const isRoot = path === '/' || path === '/index.html' || !path.substring(1).includes('/');
        
        let targetPage = null;
        const isResidents = path.includes('/residents/');
        if (lang === 'en') {
            if (currentPage === 'index.html' && (isRoot || isResidents)) targetPage = 'index-en.html';
            if (currentPage === 'resident-admin-ru.html') targetPage = 'resident-admin-en.html';
        } else {
            if (currentPage === 'index-en.html') targetPage = 'index.html';
            if (currentPage === 'resident-admin-en.html') targetPage = 'resident-admin-ru.html';
        }

        if (targetPage && targetPage !== currentPage) {
            window.location.href = targetPage;
        } else {
            // Re-render menu with new labels if no redirect
            render();
        }
    }

    /**
     * Inject styles
     */
    function injectStyles() {
        if (document.getElementById('alab-menu-styles')) return;

        const style = document.createElement('style');
        style.id = 'alab-menu-styles';
        style.textContent = `
            header {
                transition: opacity 0.4s ease;
            }
            
            /* High-priority nav blocker to hide other headers */
            #alab-menu-nav-blocker {
                position: fixed;
                top: 0; left: 0; width: 100%; height: 100px;
                background: #030407;
                z-index: 2147483646; 
                opacity: 0;
                pointer-events: none;
                transition: opacity 0.3s ease;
            }
            body.menu-active #alab-menu-nav-blocker {
                opacity: 1;
                pointer-events: auto;
            }

            body.menu-active #alab-menu-nav-blocker {
                opacity: 1;
                pointer-events: auto;
            }

            body.menu-active .logo,
            body.menu-active .header-controls,
            body.menu-active .menu-btn,
            body.menu-active .back-btn {
                display: none !important;
                opacity: 0 !important;
                visibility: hidden !important;
                pointer-events: none !important;
                height: 0 !important;
                padding: 0 !important;
                overflow: hidden !important;
            }

            /* --- MENU LAYOUT --- */
            .menu-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100vh;
                background: #030407;
                z-index: 100000;
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
                z-index: 100001;
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
                /* text-transform: uppercase; removed */
                /* letter-spacing: 1px; removed */
                font-family: 'JetBrains Mono', monospace;
                padding-left: 15px;
                border-left: 1px solid rgba(255,255,255,0.2);
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

            /* Tech-blue underline effect */
            .nav-link::after {
                content: '';
                position: absolute;
                bottom: -5px;
                left: 0;
                width: 0;
                height: 2px;
                background: #00E5FF; /* Tech blue */
                transition: width 0.3s cubic-bezier(0.165, 0.84, 0.44, 1);
            }

            .nav-link:hover, .nav-link.active {
                color: white;
                padding-left: 10px;
            }

            .nav-link:hover::after, .nav-link.active::after {
                width: 100%;
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
                background: url('${prefix}assets/img/noise.svg');
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

            .upcoming-badge {
                display: inline-block;
                margin-top: 20px;
                padding: 6px 12px;
                border: 1px solid #FF2A2A;
                color: #FF2A2A;
                font-family: 'JetBrains Mono', monospace;
                font-size: 0.7rem;
                text-transform: uppercase;
                border-radius: 4px;
                background: rgba(255, 42, 42, 0.1);
                animation: pulseBadge 2s infinite;
            }

            @keyframes pulseBadge {
                0% { opacity: 0.6; }
                50% { opacity: 1; }
                100% { opacity: 0.6; }
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
                    padding: 40px 40px 40px 60px; /* Extra left padding for indices */
                    border: none;
                    text-align: left;
                    align-items: flex-start;
                }
                .menu-nav-list {
                    align-items: flex-start;
                    width: 100%;
                }
                .nav-link {
                    font-size: 1.8rem;
                    width: fit-content;
                    margin: 0;
                }
                .nav-link::before {
                    display: block; /* Show red indices */
                }
                .menu-header-mobile {
                    position: relative;
                    top: 0; left: 0; right: 0;
                    margin-bottom: 40px;
                }
                .menu-top-controls {
                    margin-top: 0;
                }
                .nav-link--locked {
                    opacity: 0.5;
                    cursor: pointer;
                }
                .nav-link--locked:hover {
                    opacity: 0.85;
                    color: var(--accent, #FF2A2A);
                }
                .nav-link-badge {
                    display: inline-block;
                    margin-left: 12px;
                    font-family: 'JetBrains Mono', monospace;
                    font-size: 0.55rem;
                    letter-spacing: 1.5px;
                    color: #FF2A2A;
                    border: 1px solid rgba(255,42,42,0.4);
                    padding: 2px 6px;
                    border-radius: 3px;
                    vertical-align: middle;
                    background: rgba(255,42,42,0.06);
                    transform: translateY(-4px);
                    position: relative;
                }
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Show modal for restricted (Resident-only) sections
     */
    function showAccessModal() {
        const lang = typeof I18n !== 'undefined' ? I18n.getLang() : 'ru';
        const loginUrl = residentPrefix + 'login.html';

        let modal = document.getElementById('alab-access-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'alab-access-modal';
            modal.style.cssText = `
                position: fixed; inset: 0; z-index: 15000;
                display: flex; align-items: center; justify-content: center;
                background: rgba(3, 4, 7, 0.9); backdrop-filter: blur(20px);
                animation: fadeIn 0.3s ease;
                cursor: none;
            `;
            document.body.appendChild(modal);

            // Add background glow like in auth
            const glow = document.createElement('div');
            glow.style.cssText = `
                position: absolute; width: 600px; height: 600px;
                background: radial-gradient(circle, rgba(255, 42, 42, 0.05) 0%, transparent 70%);
                top: 50%; left: 50%; transform: translate(-50%, -50%);
                z-index: -1; filter: blur(100px);
            `;
            modal.appendChild(glow);
        }

        modal.innerHTML = `
            <div class="auth-container-style" style="
                width: 400px;
                background: rgba(11, 13, 20, 0.85);
                backdrop-filter: blur(20px);
                border: 1px solid rgba(255, 255, 255, 0.08);
                border-radius: 30px;
                padding: 50px 40px;
                position: relative;
                z-index: 10;
                box-shadow: 0 40px 100px rgba(0, 0, 0, 0.5);
                text-align: center;
                animation: scaleIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                pointer-events: auto;
            ">
                <div style="text-align: center; margin-bottom: 30px;">
                    <img src="${residentPrefix}../assets/img/A-lab-logo.svg" alt="A-LAB" style="height: 40px; margin-bottom: 20px;">
                    <h2 style="font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; color: #00E5FF; letter-spacing: 2px; text-transform: uppercase;">
                        ${lang === 'en' ? 'RESTRICTED_ACCESS' : 'ДОСТУП_ОГРАНИЧЕН'}
                    </h2>
                </div>

                <div style="
                    font-family: 'JetBrains Mono', monospace;
                    color: #FF2A2A; font-size: 0.65rem; letter-spacing: 2px;
                    border: 1px solid rgba(255,42,42,0.3); display: inline-block;
                    padding: 6px 16px; border-radius: 6px; margin-bottom: 24px;
                    background: rgba(255,42,42,0.05);
                ">${lang === 'en' ? 'RESIDENT_NODE_ONLY' : 'ТОЛЬКО ДЛЯ РЕЗИДЕНТОВ'}</div>

                <h2 style="
                    font-family: 'Inter', sans-serif; font-size: 1.4rem;
                    font-weight: 800; color: white; margin-bottom: 12px; line-height: 1.2;
                ">${lang === 'en' ? 'Aether protocol active' : 'Протокол «Эфир» активен'}</h2>

                <p style="
                    color: #666; font-size: 0.85rem; line-height: 1.6; margin-bottom: 35px; font-family: 'Inter', sans-serif;
                ">${lang === 'en'
                ? 'Authentication required to synchronize with the community stream.'
                : 'Требуется авторизация для синхронизации с лентой сообщества.'
            }</p>

                <div style="display: flex; flex-direction: column; gap: 15px;">
                    <a href="${loginUrl}" class="hover-trigger" style="
                        display: block; text-align: center; text-decoration: none;
                        padding: 18px; border-radius: 12px;
                        background: #FF2A2A; color: black;
                        font-family: 'Inter', sans-serif; font-weight: 800;
                        font-size: 0.9rem; text-transform: uppercase;
                        transition: 0.3s;
                        pointer-events: auto;
                    ">${lang === 'en' ? 'Initialize Session' : 'Инициализировать сессию'}</a>
                    
                    <div style="margin-top: 10px;">
                        <a href="javascript:void(0)" onclick="document.getElementById('alab-access-modal').remove()" class="hover-trigger" style="
                            color: #555; text-decoration: none; font-size: 0.7rem; font-family: 'JetBrains Mono', monospace;
                            text-transform: uppercase; letter-spacing: 1px;
                        ">/// TERMINATE_ACCESS_REQUEST</a>
                    </div>
                </div>
            </div>

            <!-- Cursor handled globally by cursor.js -->
        `;
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
        
        // Pre-render the menu to eliminate open delay
        await render();
    }

    // Auto-run init
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    return { init, toggle, switchLang, render, logout, showAccessModal };
})();
