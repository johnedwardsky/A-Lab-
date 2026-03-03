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

        // Heartbeat: update last_seen for online tracking
        if (window.ALabAuth.profile) {
            try {
                // Initial ping
                db.rpc('update_last_seen').catch(e => console.error('[AUTH] last_seen initial update failed', e));
                // Ping every 5 minutes
                setInterval(() => {
                    db.rpc('update_last_seen').catch(() => { });
                }, 5 * 60 * 1000);
            } catch (err) {
                console.warn('[AUTH] Could not setup last_seen heartbeat', err);
            }
        }

        // Expose logout
        window.ALabAuth.logout = async () => {
            await db.auth.signOut();
            window.location.href = 'login.html';
        };

        // Log the visit
        window.ALabCore.log('page_visit', window.location.pathname);

    } catch (err) {
        console.error('[AUTH] Critical error:', err);
        window.ALabAuth = { session: null, profile: null, userId: null, mockMode: true, error: err };
        document.dispatchEvent(new CustomEvent('alab:auth-ready', { detail: window.ALabAuth }));
    }
})();
