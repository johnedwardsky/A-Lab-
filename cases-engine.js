/**
 * A-LAB ENGINE: DYNAMIC CASES & PORTFOLIO
 * This script fetches and renders projects from the database (currently mocked for transition).
 */

const ALabCases = {
    // Digital cases fallbacks embedded so we don't have to bypass Supabase RLS limits
    projects: [
        // --- DIGITAL RU ---
        {
            id: 201,
            title: "Lumina AI Chatbot",
            result_label: "// AI · NLP · AUTOMATION",
            description: "Разработка генеративного AI-ассистента для корпоративной экосистемы. Снижение нагрузки на саппорт на 70%, среднее время решения проблемы — 0.8 секунд. Интеграция с внутренними ERP-системами.",
            category: "digital",
            lang: "ru",
            image_url: "case-ai-chatbot.jpg"
        },
        {
            id: 202,
            title: "Nexus FinTech App",
            result_label: "// FINTECH · MOBILE · WEB3",
            description: "Проектирование и запуск необанка премиум-сегмента. Реализован AI-модуль управления портфелем, предиктивная аналитика криптоактивов и ультра-чистый UX/UI. 150K установок за первый месяц.",
            category: "digital",
            lang: "ru",
            image_url: "case-fintech-app.jpg"
        },
        {
            id: 203,
            title: "Aegis Vision QC",
            result_label: "// COMPUTER VISION · INDUSTRY 4.0",
            description: "Внедрение системы компьютерного зрения на конвейерном производстве. Нейросеть детектирует микродефекты металлоконструкций в реальном времени с точностью 99.9%.",
            category: "digital",
            lang: "ru",
            image_url: "case-cv-industrial.jpg"
        },
        {
            id: 204,
            title: "Urban Node",
            result_label: "// SMART CITY · BIG DATA",
            description: "Платформа омниканального экологического и транспортного мониторинга для 'умного города'. Анализ данных с 2.5 млн IoT сонаров в реальном времени с помощью машинного обучения.",
            category: "digital",
            lang: "ru",
            image_url: "case-smart-city.jpg"
        },
        // --- DIGITAL EN ---
        {
            id: 205,
            title: "Lumina AI Chatbot",
            result_label: "// AI · NLP · AUTOMATION",
            description: "Generative AI corporate assistant development. Reduced support dependency by 70%, decreasing average ticket resolution time to 0.8 seconds. Full internal ERP integration.",
            category: "digital",
            lang: "en",
            image_url: "case-ai-chatbot.jpg"
        },
        {
            id: 206,
            title: "Nexus FinTech App",
            result_label: "// FINTECH · MOBILE · WEB3",
            description: "Design and launch of a premium segment neobank. Implemented an AI-driven portfolio management module, predictive crypto analytics, and ultra-sleek UX/UI. 150K downloads in the first month.",
            category: "digital",
            lang: "en",
            image_url: "case-fintech-app.jpg"
        },
        {
            id: 207,
            title: "Aegis Vision QC",
            result_label: "// COMPUTER VISION · INDUSTRY 4.0",
            description: "Implementation of a computer vision quality control system on manufacturing lines. The neural network detects metal micro-defects in real-time with 99.9% accuracy.",
            category: "digital",
            lang: "en",
            image_url: "case-cv-industrial.jpg"
        },
        {
            id: 208,
            title: "Urban Node",
            result_label: "// SMART CITY · BIG DATA",
            description: "Omnichannel ecological and transport monitoring platform for smart cities. Real-time machine learning analysis of data points from over 2.5 million IoT nodes.",
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
