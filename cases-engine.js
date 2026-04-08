/**
 * A-LAB ENGINE: DYNAMIC CASES & PORTFOLIO
 * This script fetches and renders projects from the database (currently mocked for transition).
 */

const ALabCases = {
    // Mock data - will be replaced by Supabase / backend calls
    projects: [
        {
            id: 1,
            title: "E-com Giant",
            result_value: "+214",
            result_label: "% ROI",
            description: "Внедрение ИИ-рекомендаций и автоматического ретаргетинга.",
            category: "marketing",
            lang: "ru",
            link_url: "#"
        },
        {
            id: 2,
            title: "SaaS Platform",
            result_value: "-40",
            result_label: "% CAC",
            description: "Оптимизация воронки через предиктивный скоринг лидов.",
            category: "marketing",
            lang: "ru",
            link_url: "#"
        },
        {
            id: 3,
            title: "Global Brand",
            result_value: "1.5M",
            result_label: " Reach",
            description: "Виральная кампания с использованием нейросетевых фильтров.",
            category: "marketing",
            lang: "ru",
            link_url: "#"
        },
        {
            id: 11,
            title: "E-com Giant",
            result_value: "+214",
            result_label: "% ROI",
            description: "AI-driven recommendation engines and automated retargeting implementation.",
            category: "marketing",
            lang: "en",
            link_url: "#"
        },
        {
            id: 12,
            title: "SaaS Platform",
            result_value: "-40",
            result_label: "% CAC",
            description: "Funnel optimization via predictive lead scoring models.",
            category: "marketing",
            lang: "en",
            link_url: "#"
        },
        {
            id: 13,
            title: "Global Brand",
            result_value: "1.5M",
            result_label: " Reach",
            description: "Viral campaign utilizing neural network-based AR filters.",
            category: "marketing",
            lang: "en",
            link_url: "#"
        },

        {
            id: 105,
            title: "Vanguard Techwear",
            result_value: "IDENTITY",
            result_label: "FASHION",
            description: "Creating a futuristic identity and visual communication system for a techwear apparel brand.",
            category: "design",
            lang: "en",
            image_url: "design_case_vanguard.png"
        },
        {
            id: 108,
            title: "Nebula Digital Bank",
            result_value: "BRANDING",
            result_label: "CRYPTO",
            description: "Designing the world's first decentralized banking identity, merging complex blockchain aesthetics with high-end fintech reliability.",
            category: "design",
            lang: "en",
            image_url: "design_case_nebula_v2.png"
        },
        {
            id: 109,
            title: "Aura Blockchain Consortium",
            result_value: "TRACEABILITY",
            result_label: "WEB3 & LUXURY",
            description: "Developing the digital backbone for the world’s leading luxury groups (LVMH, Prada, Cartier), ensuring authenticity and product lifecycle transparency via private blockchain.",
            category: "design",
            lang: "en",
            image_url: "design_case_aura_blockchain.png",
            link_url: "project_aura.html"
        },
        {
            id: 111,
            title: "Neural Health OS",
            result_value: "OPERATING SYSTEM",
            result_label: "MEDICINE",
            description: "Designing a comprehensive OS interface for real-time brain activity monitoring and AI-driven neural diagnostics.",
            category: "design",
            lang: "en",
            image_url: "design_case_med_v4.png"
        },
        {
            id: 5,
            title: "Vanguard Techwear",
            result_value: "IDENTITY",
            result_label: "FASHION",
            description: "Создание футуристичной айдентики и системы визуальных коммуникаций для бренда технологичной одежды.",
            category: "design",
            lang: "ru",
            image_url: "design_case_vanguard.png"
        },
        {
            id: 8,
            title: "Nebula Digital Bank",
            result_value: "BRANDING",
            result_label: "CRYPTO",
            description: "Создание визуальной идентичности первого децентрализованного банка, объединяющей эстетику блокчейна с доверием мирового финтеха.",
            category: "design",
            lang: "ru",
            image_url: "design_case_nebula_v2.png"
        },
        {
            id: 9,
            title: "Aura Blockchain Consortium",
            result_value: "WEB3 / LUXURY",
            result_label: "AUTHENTICITY",
            description: "Разработка технологического ядра для крупнейших мировых люкс-групп (LVMH, Prada, Cartier), обеспечивающего прозрачность жизненного цикла товаров через приватный блокчейн.",
            category: "design",
            lang: "ru",
            image_url: "design_case_aura_blockchain.png"
        },
        {
            id: 11,
            title: "Neural Health OS",
            result_value: "SYSTEM INTERFACE",
            result_label: "MEDICAL_OS",
            description: "Разработка комплексного интерфейса операционной системы для мониторинга активности мозга и нейро-диагностики в реальном времени.",
            category: "design",
            lang: "ru",
            image_url: "design_case_med_v4.png"
        },
        {
            id: 'lumina_ai',
            title: "Lumina AI Framework",
            result_value: "OPEN_SOURCE",
            result_label: "tag-open",
            description: "Ультра-быстрая библиотека для визуализации работы нейросетей. Позволяет в реальном времени отслеживать активации слоев и веса.",
            category: "rd",
            lang: "ru",
            image_url: "rd_lumina_ai.png",
            link_text: "ДОКУМЕНТАЦИЯ",
            link_url: "https://github.com/johnedwardsky/lumina-ai"
        },
        {
            id: 'project_matrix',
            title: "Project Matrix",
            result_value: "CONFIDENTIAL",
            result_label: "tag-closed",
            description: "Система визуализации нейронных связей сообщества. Анализ паттернов взаимодействия и прогнозирование трендов.",
            category: "rd",
            lang: "ru",
            image_url: "rd_project_matrix.png",
            link_text: "ЗАПРОСИТЬ ДОСТУП",
            link_url: "project_matrix.html",
            is_locked: true
        },
        // --- DIGITAL CATEGORY (RU) ---
        {
            id: 201,
            title: "AI Support Platform",
            result_label: "// AI · NLP · CHATBOT",
            description: "Интеллектуальная платформа поддержки клиентов с NLP-движком. CSAT 94.2%, среднее время ответа — 1.2 сек.",
            category: "digital",
            lang: "ru",
            image_url: "case-ai-chatbot.jpg"
        },
        {
            id: 202,
            title: "FinTech Banking App",
            result_label: "// FINTECH · MOBILE · UX",
            description: "Мобильный банкинг с управлением портфелем, аналитикой рынка и мгновенными транзакциями. 50K+ пользователей.",
            category: "digital",
            lang: "ru",
            image_url: "case-fintech-app.jpg"
        },
        {
            id: 203,
            title: "Vision QC System",
            result_label: "// COMPUTER VISION · QC · INDUSTRY",
            description: "Система контроля качества на производстве с детекцией дефектов в реальном времени. Точность 99.8%.",
            category: "digital",
            lang: "ru",
            image_url: "case-cv-industrial.jpg"
        },
        {
            id: 204,
            title: "Smart City Observer",
            result_label: "// IoT · SMART CITY · MONITORING",
            description: "IoT-платформа мониторинга городской инфраструктуры: трафик, энергетика, экология. 1.48M активных узлов.",
            category: "digital",
            lang: "ru",
            image_url: "case-smart-city.jpg"
        },
        // --- DIGITAL CATEGORY (EN) ---
        {
            id: 205,
            title: "AI Support Platform",
            result_label: "// AI · NLP · CHATBOT",
            description: "Intelligent customer support platform with NLP engine. 94.2% CSAT, average response time 1.2 sec.",
            category: "digital",
            lang: "en",
            image_url: "case-ai-chatbot.jpg"
        },
        {
            id: 206,
            title: "FinTech Banking App",
            result_label: "// FINTECH · MOBILE · UX",
            description: "Mobile banking app with portfolio management, market analytics, and instant transactions. 50K+ active users.",
            category: "digital",
            lang: "en",
            image_url: "case-fintech-app.jpg"
        },
        {
            id: 207,
            title: "Vision QC System",
            result_label: "// COMPUTER VISION · QC · INDUSTRY",
            description: "Industrial quality control system with real-time defect detection. 99.8% accuracy.",
            category: "digital",
            lang: "en",
            image_url: "case-cv-industrial.jpg"
        },
        {
            id: 208,
            title: "Smart City Observer",
            result_label: "// IoT · SMART CITY · MONITORING",
            description: "IoT platform for urban infrastructure monitoring: traffic, energy, and ecology. 1.48M active nodes.",
            category: "digital",
            lang: "en",
            image_url: "case-smart-city.jpg"
        }
    ],

    async init(category, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        // Clean lang code (e.g., 'ru-RU' -> 'ru')
        const rawLang = document.documentElement.lang || 'ru';
        const currentLang = rawLang.split('-')[0].toLowerCase();

        try {
            const catLower = category.toLowerCase();
            console.log(`[ALabCases] Initializing for category: ${catLower}, lang: ${currentLang}`);
            container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 50px; color: var(--tech-blue); font-family: var(--font-code); opacity: 0.5;">[ ACCESSING SECURE DATA NODE... ]</div>';

            // Try to fetch from Supabase if client is initialized
            if (window.ALabCore && window.ALabCore.db) {
                console.log('[ALabCases] Fetching from Supabase...');
                
                // First try: current language
                let { data, error } = await window.ALabCore.db
                    .from('projects')
                    .select('*')
                    .eq('category', catLower)
                    .eq('lang', currentLang)
                    .order('order_index', { ascending: true });

                if (error) throw error;

                // Second try fallback: if we requested English but got nothing, load Russian
                if ((!data || data.length === 0) && currentLang !== 'ru') {
                    console.log(`[ALabCases] No ${currentLang} projects found in DB. Falling back to 'ru' versions.`);
                    const fallbackResp = await window.ALabCore.db
                        .from('projects')
                        .select('*')
                        .eq('category', catLower)
                        .eq('lang', 'ru')
                        .order('order_index', { ascending: true });
                    
                    data = fallbackResp.data;
                    if (fallbackResp.error) throw fallbackResp.error;
                }

                if (data && data.length > 0) {
                    console.log(`[ALabCases] Found ${data.length} projects in DB`);
                    this.render(data, container, catLower);
                    return;
                } else {
                    console.log('[ALabCases] No projects found in DB for this category (even with fallback)');
                }
            } else {
                console.warn('[ALabCases] Supabase not connected, skipping DB fetch');
            }
        } catch (err) {
            console.error('Supabase fetch error:', err);
        }

        // Fallback to mock data if DB is empty or fails
        const catLower = category.toLowerCase();
        const filtered = this.projects.filter(p => p.category === catLower && p.lang === currentLang);
        this.render(filtered, container, catLower);
    },

    render(data, container, category) {
        container.innerHTML = '';
        const catLower = category.toLowerCase();

        if (!data || data.length === 0) {
            console.warn(`[ALabCases] No data to render for ${catLower}`);
            container.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 100px 20px; border: 1px dashed var(--border); border-radius: 20px; color: #555;">
                    <div style="font-size: 2rem; margin-bottom: 20px;">∅</div>
                    <p>Кейсы в категории <b>${catLower.toUpperCase()}</b> не найдены.</p>
                    <p style="font-size: 0.8rem; margin-top: 10px;">Язык: <b>${document.documentElement.lang}</b></p>
                    <button onclick="location.reload()" style="margin-top: 20px; background: transparent; border: 1px solid var(--border); color: #fff; padding: 10px 20px; border-radius: 5px; cursor: pointer;">ОБНОВИТЬ СТРАНИЦУ</button>
                </div>
            `;
            return;
        }

        data.forEach(item => {
            const card = document.createElement('div');
            // If item has a link_url, it's public. Otherwise, it's confidential and requires NDA.
            const isConfidential = !item.link_url || item.is_locked;

            // NDA trigger logic using shared NDAManager
            const triggerNDA = (e) => {
                if (e) e.preventDefault();
                if (window.NDAManager) {
                    window.NDAManager.gate(item.id, item.link_url || '#');
                } else if (window.openNdaModal) {
                    window.openNdaModal();
                } else {
                    console.error('[ALabCases] No NDA manager found to handle confidential content.');
                }
            };

            if (catLower === 'design' || catLower === 'digital') {
                let imgPath = item.image_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800&auto=format&fit=crop';
                if (imgPath && !imgPath.startsWith('http') && !imgPath.startsWith('/') && !imgPath.startsWith('assets/')) {
                    imgPath = 'assets/img/' + imgPath;
                }

                card.className = 'case-card';
                // Only add is-restricted if you want styling indicating confidentiality, but disabled hover/click
                // For layout purposes, keeping the class but removing the interaction:
                if (isConfidential) card.classList.add('is-restricted');

                card.innerHTML = `
                    <img src="${imgPath}" alt="${item.title}" 
                         onerror="this.src='https://placehold.co/800x500/000/var(--tech-blue)?text=IMAGE+ERROR:+${item.image_url}'">
                    <div class="case-overlay">
                        <div class="case-tag">${item.result_label || 'DESIGN'} ${isConfidential ? '| [RESTRICTED]' : ''}</div>
                        <div class="case-title">${item.title} ${isConfidential ? '🔒' : ''}</div>
                        <p style="color: #ccc; margin-top: 10px; font-size: 0.8rem;">${item.description || ''}</p>
                    </div>
                `;

                // No onclick event for design and digital cases as per user request to not be clickable
            } else if (catLower === 'rd') {
                const imgPath = item.image_url ? (item.image_url.startsWith('http') || item.image_url.startsWith('assets/') ? item.image_url : 'assets/img/' + item.image_url) : 'assets/img/rd_ai_tech.png';
                card.className = `rd-card hover-trigger`;

                card.innerHTML = `
                    <div class="card-image">
                        <div class="scan-line"></div>
                        <div class="data-grid"></div>
                        <div class="status-indicator"></div>
                        <div class="holo-effect"></div>
                        <img src="${imgPath}" alt="${item.title}" 
                             onerror="this.src='https://placehold.co/800x500/000/00E5FF?text=R%26D+MODULE+${item.title}'">
                        <div class="loading-metric">${isConfidential ? 'SECURE_NODE' : 'ANALYZING...'}</div>
                    </div>
                    <div class="card-content">
                        <div class="card-meta">
                            <span class="meta-tag active">${item.result_value}</span>
                            <span class="meta-tag">${(item.result_label || '').replace('tag-', '').toUpperCase()}</span>
                        </div>
                        <h3>${item.title} ${isConfidential ? '🔒' : ''}</h3>
                        <p>${item.description}</p>
                        <div class="tech-specs">
                            <div class="spec-item">SECURE_NODE</div>
                            <div class="spec-item">ENCRYPTED_V2</div>
                        </div>
                        <a href="${isConfidential ? '#' : item.link_url}" class="${isConfidential ? 'btn-danger' : 'btn-primary'} hover-trigger" style="margin-top:20px; text-align:center;">
                            ${item.link_text || (isConfidential ? 'REQUEST ACCESS' : 'VIEW ARCHIVE')}
                        </a>
                    </div>
                `;

                card.onclick = (e) => {
                    if (isConfidential) {
                        triggerNDA(e);
                    } else if (!e.target.closest('a')) {
                        window.location.href = item.link_url || '#';
                    }
                };
            } else {
                card.className = 'case-card hover-trigger';
                if (isConfidential) card.classList.add('is-restricted');

                const isNegative = (item.result_value || '').startsWith('-');
                const colorClass = isNegative ? 'style="color: var(--accent)"' : '';

                card.innerHTML = `
                    <div class="case-res" ${colorClass}>
                        ${item.result_value}${item.result_label} ${isConfidential ? '🔒' : ''}
                    </div>
                    <div style="font-size: 1.2rem; font-weight: 700; margin-bottom: 10px;">${item.title}</div>
                    <p style="color: #666; font-size: 0.85rem;">${item.description}</p>
                    ${isConfidential ? `<div style="margin-top:15px; font-family:var(--font-code); font-size:0.6rem; color:var(--accent); letter-spacing:1px;">[ NDA_REQUIRED ]</div>` : ''}
                `;

                card.onclick = (e) => {
                    if (isConfidential) {
                        triggerNDA(e);
                    } else if (!e.target.closest('a')) {
                        window.location.href = item.link_url || '#';
                    }
                };
            }

            container.appendChild(card);
        });

        // Cursor hover is handled globally via event delegation in cursor.js
        // No need to re-initialize per-element listeners here.
    }
};

// Updated detector — waits for Supabase to be ready before initializing
document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('casesContainer');
    if (!container) return;

    let cat = container.getAttribute('data-category');
    if (!cat) {
        const path = window.location.pathname.toLowerCase();
        if (path.includes('design')) cat = 'design';
        else if (path.includes('rd')) cat = 'rd';
        else cat = 'marketing';
    }

    // Wait up to 3 seconds for ALabCore.db (Supabase) to be initialized
    let attempts = 0;
    const maxAttempts = 60; // 60 × 50ms = 3s
    function tryInit() {
        attempts++;
        const db = window.ALabCore && window.ALabCore.db;
        if (db || attempts >= maxAttempts) {
            ALabCases.init(cat, 'casesContainer');
        } else {
            setTimeout(tryInit, 50);
        }
    }
    tryInit();
});

// Sync with i18n language changes
window.addEventListener('alab:lang-changed', (e) => {
    const container = document.getElementById('casesContainer');
    if (container) {
        const cat = container.getAttribute('data-category') || 'marketing';
        ALabCases.init(cat, 'casesContainer');
    }
});
