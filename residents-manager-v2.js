/**
 * A-LAB: RESIDENTS COMMUNITY LOADER
 * ============================================================
 * Handles fetching all public residents and rendering the grid.
 * Connects the static residents.html to the Supabase database.
 */

(function () {
    'use strict';

    const ResidentsManager = {
        residents: [],

        async init() {
            // Wait for ALabCore to be ready (it handles supabase-client.js initialization)
            if (window.ALabCore) {
                await this.loadResidents();
            } else {
                document.addEventListener('alab:ready', () => this.loadResidents());
            }
        },

        async loadResidents() {
            const db = window.ALabCore?.db;
            if (!db) return;

            try {
                // Fetch all residents
                const { data, error } = await db
                    .from('residents')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (error) throw error;

                this.residents = data || [];
                this._renderGrid();

            } catch (err) {
                console.error('[RESIDENTS] Load error:', err);
            }
        },

        _renderGrid() {
            const container = document.querySelector('.residents-grid');
            if (!container) return;

            // Optional: Filter by visibility (handled by RLS or manually)
            const visibleList = this.residents.filter(r => {
                const s = r.settings || {};
                return s.visibility !== 'hidden';
            });

            if (visibleList.length === 0) return;

            // Generate HTML for dynamic residents
            const html = visibleList.map((r, index) => {
                const skills = r.skills || [];
                const links = r.links || {};
                const delay = ((index + 8) % 6 + 1) * 0.1;

                const roleKey = `roles.${(r.role || 'resident').toLowerCase()}`;
                const translatedRole = (window.I18n && window.I18n.t(roleKey) !== roleKey)
                    ? window.I18n.t(roleKey)
                    : (r.role || 'RESIDENT');

                return `
                    <a href="profile.html?id=${r.user_id}" class="resident-card dynamic-resident hover-trigger" style="animation-delay: ${delay}s">
                        <div class="resident-image">
                            <img src="${r.avatar_url || 'maya_neural.png'}" alt="${r.full_name}">
                            <div class="resident-status ${r.status || 'online'}"></div>
                        </div>
                        <div class="resident-info">
                            <div class="resident-role">${translatedRole.toUpperCase()}</div>
                            <h3 class="resident-name">${r.full_name}</h3>
                            <p class="resident-bio">${this._escapeHtml(r.bio || 'Нет описания / No bio provided.')}</p>
                            <div class="resident-skills">
                                ${skills.slice(0, 4).map(s => `<span class="skill-tag">${s}</span>`).join('')}
                            </div>
                            <div class="resident-links">
                                ${links.portfolio ? `<div class="social-link">🌐</div>` : ''}
                                ${links.github ? `<div class="social-link">💻</div>` : ''}
                                ${links.telegram ? `<div class="social-link">📱</div>` : ''}
                            </div>
                        </div>
                    </a>
                `;
            }).join('');

            // Dedicated container to prevent double-append and loss during lang switch
            let dynamicWrapper = container.querySelector('.dynamic-residents-wrapper');
            if (dynamicWrapper) {
                dynamicWrapper.innerHTML = html;
            } else {
                container.insertAdjacentHTML('beforeend', `<div class="dynamic-residents-wrapper" style="display: contents;">${html}</div>`);
            }

            // Re-bind cursor triggers for new elements
            this._rebindCursor();
        },

        _rebindCursor() {
            const cursor = document.querySelector('.cursor');
            if (!cursor) return;
            document.querySelectorAll('.hover-trigger').forEach(trigger => {
                trigger.addEventListener('mouseenter', () => cursor.classList.add('hovered'));
                trigger.addEventListener('mouseleave', () => cursor.classList.remove('hovered'));
            });
        },

        _escapeHtml(str) {
            const div = document.createElement('div');
            div.textContent = str;
            return div.innerHTML;
        }
    };

    window.ResidentsManager = ResidentsManager;
    document.addEventListener('DOMContentLoaded', () => ResidentsManager.init());

    // Dynamic residents will now render in RU by default
    // (Listener removed as dynamic switching is disabled)
})();
