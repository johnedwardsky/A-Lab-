/**
 * A-LAB: PAGE VIEW TRACKER
 * ============================================================
 * Lightweight analytics tracker that records page views to Supabase.
 * Auto-detects country via free geo-IP API.
 * Depends on: supabase-client.js (ALabCore.db)
 * 
 * Features:
 * - Records page URL, referrer, country, user agent
 * - Deduplicates: max 1 view per page per session (sessionStorage)
 * - Non-blocking: runs after page load, never affects UX
 * - Privacy-first: no cookies, no personal data, IP is not stored
 */

(function () {
    'use strict';

    const TRACKER_KEY = 'alab_tracked_pages';
    const GEO_CACHE_KEY = 'alab_geo_country';

    async function track() {
        // Wait for Supabase to be ready
        const db = window.ALabCore?.db;
        if (!db || !window.ALabCore?.isConnected) {
            // Retry once after 3 seconds
            setTimeout(() => {
                const db2 = window.ALabCore?.db;
                if (db2 && window.ALabCore?.isConnected) {
                    _doTrack(db2);
                }
            }, 3000);
            return;
        }
        _doTrack(db);
    }

    async function _doTrack(db) {
        try {
            // Deduplicate: only track each page once per session
            const page = window.location.pathname || '/';
            const tracked = JSON.parse(sessionStorage.getItem(TRACKER_KEY) || '[]');
            if (tracked.includes(page)) return;

            // Get country (cached in sessionStorage for the session)
            let country = sessionStorage.getItem(GEO_CACHE_KEY);
            if (!country) {
                country = await _detectCountry();
                if (country) {
                    sessionStorage.setItem(GEO_CACHE_KEY, country);
                }
            }

            // Record the page view
            await db.from('page_views').insert({
                page: page,
                referrer: document.referrer || null,
                country: country || null,
                user_agent: navigator.userAgent?.substring(0, 255) || null
            });

            // Mark as tracked for this session
            tracked.push(page);
            sessionStorage.setItem(TRACKER_KEY, JSON.stringify(tracked));

        } catch (err) {
            // Silently fail — tracking should never break the site
            console.debug('[TRACKER] Error:', err.message);
        }
    }

    async function _detectCountry() {
        try {
            // Use free, lightweight geo-IP API (no API key needed)
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 3000);

            const res = await fetch('https://api.country.is/', {
                signal: controller.signal
            });
            clearTimeout(timeout);

            if (res.ok) {
                const data = await res.json();
                return data.country || null; // Returns ISO 3166-1 alpha-2 (e.g., "RU", "US")
            }
        } catch (e) {
            // Geo detection failed — that's OK, we still record the visit
            console.debug('[TRACKER] Geo detection skipped');
        }
        return null;
    }

    // Run after page is fully loaded (non-blocking)
    if (document.readyState === 'complete') {
        setTimeout(track, 500);
    } else {
        window.addEventListener('load', () => setTimeout(track, 500));
    }
})();
