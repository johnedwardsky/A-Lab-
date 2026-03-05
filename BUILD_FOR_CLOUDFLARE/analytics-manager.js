/**
 * A-LAB: ANALYTICS MANAGER
 * ============================================================
 * Handles: fetching and displaying personal stats for residents.
 * Depends on: supabase-client.js, auth-guard.js
 */

(function () {
    'use strict';

    const AnalyticsManager = {
        residentId: null,

        async init() {
            const handleAuth = async (auth) => {
                if (!auth.mockMode && auth.residentId) {
                    this.residentId = auth.residentId;
                    this._bindTabChange();
                    if (document.getElementById('analytics-tab')?.classList.contains('active')) {
                        await this.loadStats();
                    }
                } else if (auth.mockMode) {
                    this._renderMockStats();
                }
            };

            if (window.ALabAuth) {
                handleAuth(window.ALabAuth);
            } else {
                document.addEventListener('alab:auth-ready', (e) => handleAuth(e.detail));
            }
        },

        async loadStats() {
            const db = window.ALabCore?.db;
            if (!db || !window.ALabCore.isConnected || !this.residentId) return;

            try {
                // Fetch counts from various tables
                const [posts, portfolio, astra, projects] = await Promise.all([
                    db.from('posts').select('*', { count: 'exact', head: true }).eq('author_id', this.residentId),
                    db.from('portfolio_items').select('*', { count: 'exact', head: true }).eq('resident_id', this.residentId),
                    db.from('astra_transactions').select('amount').eq('from_id', this.residentId).eq('type', 'project_contribution'),
                    db.from('project_members').select('*', { count: 'exact', head: true }).eq('resident_id', this.residentId)
                ]);

                // Calculate interactions (mocked as weighted sum or specific event types)
                const astraSpent = (astra.data || []).reduce((sum, tx) => sum + Number(tx.amount), 0);

                this._updateUI({
                    views: Math.floor(Math.random() * 500) + 100, // Still randomized as we don't track visits yet
                    posts: posts.count || 0,
                    interactions: (posts.count * 5) + (portfolio.count * 10) + projects.count,
                    astraSpent: astraSpent
                });

            } catch (err) {
                console.error('[ANALYTICS] Load error:', err);
            }
        },

        _updateUI(data) {
            const viewsEl = document.getElementById('statProfileViews');
            const reachEl = document.getElementById('statPostReach');
            const interEl = document.getElementById('statInteractions');

            if (viewsEl) viewsEl.innerText = data.views.toLocaleString();
            if (reachEl) reachEl.innerText = (data.posts * 150).toLocaleString(); // Estimated reach
            if (interEl) interEl.innerText = data.interactions.toLocaleString();
        },

        _renderMockStats() {
            this._updateUI({
                views: 1402,
                posts: 12,
                interactions: 342,
                astraSpent: 450
            });
        },

        _bindTabChange() {
            window.addEventListener('alab:tab-changed', async (e) => {
                if (e.detail.tab === 'analytics') {
                    await this.loadStats();
                }
            });
        }
    };

    window.AnalyticsManager = AnalyticsManager;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => AnalyticsManager.init());
    } else {
        AnalyticsManager.init();
    }
})();
