/**
 * A-LAB.TECH — Internationalization Module
 * ==========================================
 * Usage:
 *   1. Include this script on any page: <script src="i18n.js"></script>
 *   2. Add data-i18n="key" to HTML elements for auto-translation
 *   3. Add data-i18n-placeholder="key" for input placeholders
 *   4. Call t('key') in JS for programmatic translation
 *   5. Call setLanguage('en') to switch language
 */

const I18n = (() => {
    let currentLang = localStorage.getItem('alab_lang') || document.documentElement.lang || 'ru';
    let translations = { ru: {}, en: {} };
    let loaded = false;

    // Mapping for pages that have dedicated versions instead of just in-place translation
    const pageMapping = {
        'ru': {
            'index-en.html': 'index.html',
            'resident-admin-en.html': 'resident-admin-ru.html'
        },
        'en': {
            'index.html': 'index-en.html',
            'resident-admin-ru.html': 'resident-admin-en.html'
        }
    };

    /**
     * Load language files
     */
    async function loadTranslations() {
        if (loaded) return;
        try {
            const basePath = getBasePath();
            // 1. Load current language first for speed
            const currentResp = await fetch(`${basePath}lang/${currentLang}.json`);
            if (currentResp.ok) translations[currentLang] = await currentResp.json();

            // Mark as loaded (partially) so we can start applying
            loaded = true;
            applyToDOM();

            // 2. Load other language in background
            const otherLang = currentLang === 'ru' ? 'en' : 'ru';
            fetch(`${basePath}lang/${otherLang}.json`)
                .then(resp => resp.ok ? resp.json() : null)
                .then(json => {
                    if (json) translations[otherLang] = json;
                    // Re-apply if other language loaded late (optional, but good for completeness)
                    applyToDOM();
                })
                .catch(e => console.warn('[i18n] Background load failed:', e));

        } catch (e) {
            console.warn('[i18n] Failed to load translations:', e);
        }
    }

    /**
     * Get base path relative to current page
     */
    function getBasePath() {
        // Try to find script tag first
        const scripts = document.querySelectorAll('script[src*="i18n.js"]');
        if (scripts.length > 0) {
            const src = scripts[0].getAttribute('src');
            return src.replace('i18n.js', '');
        }
        // Fallback for subfolders if script not found via selector
        if (window.location.pathname.includes('/residents/')) return '../';
        return '';
    }

    /**
     * Get nested value from object by dot-path key
     * t('menu.home') → translations[lang].menu.home
     */
    function getNestedValue(obj, path) {
        if (!obj || !path) return undefined;
        return path.split('.').reduce((acc, part) => acc && acc[part], obj);
    }

    /**
     * Translate a key
     */
    function t(key, fallback) {
        const value = getNestedValue(translations[currentLang], key);
        if (value !== undefined) return value;
        // Fallback to Russian if English key missing
        const ruValue = getNestedValue(translations.ru, key);
        if (ruValue !== undefined) return ruValue;
        return fallback || key;
    }

    /**
     * Apply translations to all data-i18n elements
     */
    function applyToDOM() {
        // Text content
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            const translated = t(key);
            if (translated !== key) {
                el.textContent = translated;
            }
        });

        // Placeholders
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            const translated = t(key);
            if (translated !== key) {
                el.placeholder = translated;
            }
        });

        // Titles / aria-labels
        document.querySelectorAll('[data-i18n-title]').forEach(el => {
            const key = el.getAttribute('data-i18n-title');
            const translated = t(key);
            if (translated !== key) {
                el.title = translated;
            }
        });

        // HTML content (for rich text blocks)
        document.querySelectorAll('[data-i18n-html]').forEach(el => {
            const key = el.getAttribute('data-i18n-html');
            const translated = t(key);
            if (translated !== key) {
                el.innerHTML = translated;
            }
        });

        // Link (href) rewriting based on mapping
        const currentMapping = pageMapping[currentLang];
        if (currentMapping) {
            document.querySelectorAll('a[href]').forEach(link => {
                const href = link.getAttribute('href');
                // Check if the exact href should be mapped
                if (currentMapping[href]) {
                    link.setAttribute('href', currentMapping[href]);
                }
                // Also check if it's a relative link to one of the mapped pages
                // (e.g. href="../index.html" should map to "../index-en.html")
                for (const [key, value] of Object.entries(currentMapping)) {
                    // Only rewrite links to index.html if they point to the root or are relative to the root
                    // Avoid rewriting index.html inside subfolders where index-en.html doesn't exist
                    if (key === 'index.html' || key === 'index-en.html') {
                        if (href === key || href.endsWith('/' + key)) {
                            // index.html -> index-en.html is allowed in root and in residents/
                            const isAllowed = !href.includes('/') || href.includes('residents/') || href.startsWith('../index');
                            
                            if (isAllowed) {
                                const newHref = href.replace(key, value);
                                link.setAttribute('href', newHref);
                            }
                        }
                    } else {
                        // For other specific mappings like resident-admin
                        if (href.endsWith('/' + key) || href === key) {
                            const newHref = href.replace(key, value);
                            link.setAttribute('href', newHref);
                        }
                    }
                }
            });
        }

        // Update html lang attribute
        document.documentElement.lang = currentLang;

        // Update active language toggles
        document.querySelectorAll('[data-lang-toggle]').forEach(btn => {
            const lang = btn.getAttribute('data-lang-toggle');
            btn.classList.toggle('active', lang === currentLang);
        });
    }

    /**
     * Set language and re-render
     */
    async function setLanguage(lang) {
        const prevLang = currentLang;
        currentLang = lang;
        localStorage.setItem('alab_lang', lang);
        document.documentElement.lang = lang;

        if (!loaded) await loadTranslations();
        applyToDOM();

        // Check for dedicated page redirect
        const path = window.location.pathname;
        const currentPage = path.split('/').pop() || 'index.html';
        const isRoot = path === '/' || path === '/index.html' || !path.substring(1).includes('/');
        
        // For index.html, we only redirect if it's root OR if it's in the residents folder (which now has index-en.html)
        const isResidents = path.includes('/residents/');
        let targetPage = pageMapping[lang] ? pageMapping[lang][currentPage] : null;
        if (currentPage === 'index.html' && !isRoot && !isResidents) targetPage = null;

        if (targetPage && targetPage !== currentPage) {
            console.log('[i18n] Redirecting to localized version:', targetPage);
            window.location.href = targetPage;
            return;
        }

        // Fire event
        document.dispatchEvent(new CustomEvent('alab:lang-changed', { detail: { lang } }));
    }

    /**
     * Get current language
     */
    function getLang() {
        return currentLang;
    }

    /**
     * Detect user language based on Geo-IP and browser settings
     */
    async function detectLanguage() {
        const saved = localStorage.getItem('alab_lang');
        if (saved) return saved;

        // 1. Primary check: Geo-IP (Targeting non-RF users)
        try {
            const response = await fetch('https://ipapi.co/json/', { mode: 'cors' });
            if (response.ok) {
                const data = await response.json();
                if (data.country_code && data.country_code !== 'RU') {
                    console.log('[i18n] Non-RU Geo detected:', data.country_code);
                    return 'en';
                }
            }
        } catch (e) {
            // Silently skip geo-detection if API blocked
        }

        // 2. Secondary check: Browser Language
        const browserLang = navigator.language || navigator.userLanguage;
        if (browserLang && !browserLang.startsWith('ru')) {
            return 'en';
        }

        return 'ru'; // Default for RF or fallback
    }

    /**
     * Auto-init on DOM ready
     */
    async function init() {
        // Detect if it's the first time
        if (!localStorage.getItem('alab_lang')) {
            const detected = await detectLanguage();
            if (detected !== currentLang) {
                await setLanguage(detected);
                return;
            }
        }

        await loadTranslations();
        applyToDOM();
    }

    // Auto-run
    if (document.readyState !== 'loading') {
        init();
    } else {
        document.addEventListener('DOMContentLoaded', init);
    }

    // Immediate sync for language-dependent elements (prevent jump)
    document.documentElement.lang = currentLang;

    // Public API
    return { t, setLanguage, getLang, applyToDOM, init };
})();

// Global shortcuts and Window exposure
window.I18n = I18n;
window.t = I18n.t;
const t = I18n.t;
const setLanguage = I18n.setLanguage;
