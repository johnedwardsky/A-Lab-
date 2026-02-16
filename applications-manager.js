/**
 * A-LAB: APPLICATIONS MANAGER
 * ============================================================
 * Handles viewing and processing resident applications.
 */

(function () {
    'use strict';

    const ApplicationsManager = {
        apps: [],

        async init() {
            if (window.ALabAuth) {
                const user = await window.ALabAuth.getUser();
                if (user) {
                    // Check admin status from our DB table
                    const db = window.ALabCore?.db;
                    const { data: resident } = await db
                        .from('residents')
                        .select('is_admin')
                        .eq('user_id', user.id)
                        .single();

                    const isAdmin = resident?.is_admin === true;
                    const icon = document.getElementById('adminAppsIcon');
                    if (icon) icon.style.display = isAdmin ? 'flex' : 'none';

                    if (isAdmin) {
                        this._bindUI();
                        await this.loadApplications();
                    }
                }
            }
        },

        async loadApplications() {
            const db = window.ALabCore?.db;
            if (!db) return;

            try {
                const { data, error } = await db
                    .from('resident_applications')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (error) throw error;
                this.apps = data || [];
                this._renderApps();
            } catch (err) {
                console.error('[APPS] Load error:', err);
            }
        },

        async processApplication(id, status) {
            const db = window.ALabCore?.db;
            if (!db) return;

            try {
                const { error } = await db
                    .from('resident_applications')
                    .update({
                        status: status,
                        processed_at: new Date().toISOString()
                    })
                    .eq('id', id);

                if (error) throw error;

                // Refresh list
                await this.loadApplications();

                // Notify User (Simulated email/tg send)
                if (status === 'approved') {
                    alert('Заявка одобрена. Ссылка на регистрацию отправлена (имитация).');
                } else {
                    alert('Заявка отклонена.');
                }

            } catch (err) {
                console.error('[APPS] Update error:', err);
                alert('Ошибка: ' + err.message);
            }
        },

        _renderApps() {
            const container = document.getElementById('applicationsList');
            if (!container) return;

            if (this.apps.length === 0) {
                container.innerHTML = '<div style="padding: 20px; color: #555;">НЕТ НОВЫХ ЗАЯВОК</div>';
                return;
            }

            container.innerHTML = this.apps.map(app => `
                <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border); border-radius: 12px; padding: 20px; margin-bottom: 15px;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                        <div>
                            <div style="font-weight: 800; font-size: 1.1rem; color: var(--tech-blue);">${app.full_name}</div>
                            <div style="font-family: var(--font-code); font-size: 0.7rem; color: #555;">${app.telegram} // ${app.strength}</div>
                        </div>
                        <div style="font-size: 0.6rem; color: #333;">${new Date(app.created_at).toLocaleString()}</div>
                    </div>
                    
                    <div style="font-size: 0.85rem; color: #ccc; margin-bottom: 15px; border-left: 2px solid var(--accent); padding-left: 10px;">
                        ${app.bio || 'Нет описания'}
                    </div>

                    <div style="font-size: 0.7rem; color: #555; margin-bottom: 15px;">
                        РЕКОМЕНДАЦИЯ: <span style="color: var(--tech-blue);">${app.recommender_id}</span>
                    </div>

                    <div style="display: flex; gap: 10px;">
                        ${app.status === 'pending' ? `
                            <button onclick="ApplicationsManager.processApplication('${app.id}', 'approved')" 
                                style="background: #00FF41; color: black; border: none; padding: 8px 15px; border-radius: 6px; font-weight: 800; cursor: pointer;">ОДОБРИТЬ</button>
                            <button onclick="ApplicationsManager.processApplication('${app.id}', 'rejected')" 
                                style="background: var(--accent); color: white; border: none; padding: 8px 15px; border-radius: 6px; font-weight: 800; cursor: pointer;">ОТКЛОНИТЬ</button>
                        ` : `
                            <div style="text-transform: uppercase; font-weight: 800; font-family: var(--font-code); font-size: 0.7rem; color: ${app.status === 'approved' ? '#00FF41' : 'var(--accent)'}">
                                СТАТУС: ${app.status}
                            </div>
                        `}
                    </div>
                </div>
            `).join('');
        },

        _bindUI() {
            // Placeholder for filters if needed
        }
    };

    window.ApplicationsManager = ApplicationsManager;
    document.addEventListener('DOMContentLoaded', () => ApplicationsManager.init());

})();
