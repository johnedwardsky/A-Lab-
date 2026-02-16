/**
 * A-LAB: AUTH GUARD
 * ============================================================
 * Include this script on any protected page.
 * It checks the session and redirects to login if not authenticated.
 * Exposes: window.ALabAuth = { session, profile, userId }
 */

(async function () {
    'use strict';

    const db = window.ALabCore?.db;

    // If Supabase is not configured, skip auth (dev mode)
    if (!db || !window.ALabCore.isConnected) {
        console.warn('[AUTH] Backend not connected — running in dev/mock mode.');
        window.ALabAuth = { session: null, profile: null, userId: null, mockMode: true };
        document.dispatchEvent(new CustomEvent('alab:auth-ready', { detail: window.ALabAuth }));
        return;
    }

    try {
        const { data: { session }, error: sessionError } = await db.auth.getSession();

        if (sessionError || !session) {
            console.warn('[AUTH] No session. Redirecting to login.');
            const redirect = encodeURIComponent(window.location.pathname + window.location.search);
            window.location.href = 'login.html?redirect=' + redirect;
            return;
        }

        // Fetch resident profile
        const { data: profile, error: profileError } = await db
            .from('residents')
            .select('*')
            .eq('user_id', session.user.id)
            .single();

        if (profileError || !profile) {
            console.warn('[AUTH] No resident profile found for user:', session.user.id);
            // Profile might not exist yet — allow access but flag it
            window.ALabAuth = {
                session,
                profile: null,
                userId: session.user.id,
                needsProfile: true,
                mockMode: false
            };
        } else {
            window.ALabAuth = {
                session,
                profile,
                userId: session.user.id,
                residentId: profile.id,
                mockMode: false
            };
        }

        // Fire event so other scripts know auth is ready
        document.dispatchEvent(new CustomEvent('alab:auth-ready', { detail: window.ALabAuth }));

        // Log the visit
        window.ALabCore.log('page_visit', window.location.pathname);

    } catch (err) {
        console.error('[AUTH] Critical error:', err);
        window.ALabAuth = { session: null, profile: null, userId: null, mockMode: true, error: err };
        document.dispatchEvent(new CustomEvent('alab:auth-ready', { detail: window.ALabAuth }));
    }
})();
