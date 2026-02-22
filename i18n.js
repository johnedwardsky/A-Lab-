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

    /**
     * Load language files
     */
    async function loadTranslations() {
        if (loaded) return;
        try {
            const basePath = getBasePath();
            const [ruResp, enResp] = await Promise.all([
                fetch(`${basePath}lang/ru.json`),
                fetch(`${basePath}lang/en.json`)
            ]);
            if (ruResp.ok) translations.ru = await ruResp.json();
            if (enResp.ok) translations.en = await enResp.json();
            loaded = true;
        } catch (e) {
            console.warn('[i18n] Failed to load translations:', e);
        }
    }

    /**
     * Get base path relative to current page
     */
    function getBasePath() {
        const scripts = document.querySelectorAll('script[src*="i18n.js"]');
        if (scripts.length > 0) {
            const src = scripts[0].getAttribute('src');
            const path = src.replace('i18n.js', '');
            // If it's a relative path starting with ./ or ../, or an absolute path
            return path;
        }
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
        currentLang = lang;
        localStorage.setItem('alab_lang', lang);
        document.documentElement.lang = lang;
        if (!loaded) await loadTranslations();
        applyToDOM();
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
     * Auto-init on DOM ready
     */
    async function init() {
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

// Global shortcuts
const t = I18n.t;
const setLanguage = I18n.setLanguage;
