/**
 * A-LAB: COMMUNITY MANAGER
 * ============================================================
 * Handles: fetching all residents, search, and online status.
 * Depends on: supabase-client.js, auth-guard.js
 */

(function () {
    'use strict';

    const CommunityManager = {
        residents: [],
        residentId: null,

        async init() {
            const handleAuth = async (auth) => {
                if (!auth.mockMode && auth.residentId) {
                    this.residentId = auth.residentId;
                    this._bindUI();
                    if (document.getElementById('network-tab')?.classList.contains('active')) {
                        await this.loadCommunity();
                    }
                } else if (auth.mockMode) {
                    this._renderMockCommunity();
                }
            };

            if (window.ALabAuth) {
                handleAuth(window.ALabAuth);
            } else {
                document.addEventListener('alab:auth-ready', (e) => handleAuth(e.detail));
            }

            window.addEventListener('alab:tab-changed', async (e) => {
                if (e.detail.tab === 'network') {
                    await this.loadCommunity();
                }
            });
        },

        async loadCommunity() {
            const db = window.ALabCore?.db;
            if (!db || !window.ALabCore.isConnected) return;

            try {
                const { data, error } = await db
                    .from('residents')
                    .select('id, full_name, role, avatar_url, status')
                    .order('full_name');

                if (error) throw error;
                this.residents = data || [];
                this._renderCommunity(this.residents);
                this._updateStats();

            } catch (err) {
                console.error('[COMMUNITY] Load error:', err);
            }
        },

        _renderCommunity(list) {
            const container = document.querySelector('#communityContainer');
            if (!container) return;

            if (list.length === 0) {
                container.innerHTML = '<div style="text-align: center; padding: 20px; color: #555;">НЕТ РЕЗУЛЬТАТОВ</div>';
                return;
            }

            container.innerHTML = list.map(r => `
                <div class="hover-trigger" style="display: flex; align-items: center; gap: 15px; padding: 12px; background: rgba(255,255,255,0.02); border: 1px solid var(--border); border-radius: 12px; transition: 0.3s;">
                    <img src="${r.avatar_url || 'maya_neural.png'}" style="width: 36px; height: 36px; border-radius: 50%; object-fit: cover; border: 1px solid var(--border);">
                    <div style="flex: 1;">
                        <div style="font-size: 0.85rem; font-weight: 700;">${r.full_name}</div>
                        <div style="font-size: 0.65rem; color: #555; text-transform: uppercase;">${r.role || 'РЕЗИДЕНТ'}</div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 5px;">
                        <span style="width: 8px; height: 8px; border-radius: 50%; background: ${r.status === 'open' ? '#00FF41' : r.status === 'busy' ? '#FF8A00' : '#555'};"></span>
                        <span style="font-size: 0.55rem; color: #555; font-weight: 800;">${(r.status || 'AWAY').toUpperCase()}</span>
                    </div>
                </div>
            `).join('');
        },

        _updateStats() {
            const totalEl = document.getElementById('statTotalResidents');
            const onlineEl = document.getElementById('statOnlineResidents');

            if (totalEl) totalEl.innerText = this.residents.length;
            if (onlineEl) onlineEl.innerText = this.residents.filter(r => r.status === 'open').length;
        },

        _renderMockCommunity() {
            const mock = [
                { full_name: 'Dmitry AI', role: 'Architect', status: 'open' },
                { full_name: 'Alex River', role: 'Designer', status: 'away' },
                { full_name: 'Viktor Code', role: 'DevOps', status: 'busy' }
            ];
            this._renderCommunity(mock);
            const totalEl = document.getElementById('statTotalResidents');
            const onlineEl = document.getElementById('statOnlineResidents');
            if (totalEl) totalEl.innerText = '124';
            if (onlineEl) onlineEl.innerText = '18';
        },

        _bindUI() {
            const search = document.getElementById('networkSearch');
            if (search) {
                search.addEventListener('input', (e) => {
                    const q = e.target.value.toLowerCase();
                    const filtered = this.residents.filter(r =>
                        r.full_name.toLowerCase().includes(q) ||
                        (r.role && r.role.toLowerCase().includes(q))
                    );
                    this._renderCommunity(filtered);
                });
            }
        }
    };

    window.CommunityManager = CommunityManager;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => CommunityManager.init());
    } else {
        CommunityManager.init();
    }
})();
