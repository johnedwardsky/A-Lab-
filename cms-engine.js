/**
 * A-LAB CMS ENGINE
 * ============================================================
 * Loads data from Supabase into the CMS admin dashboard tables.
 * Depends on: supabase-client.js (window.ALabCore.db)
 */

(function () {
    'use strict';

    const CMS = {
        db: null,

        async init() {
            // Wait for Supabase
            let attempts = 0;
            while (!window.ALabCore?.db && attempts < 30) {
                await new Promise(r => setTimeout(r, 200));
                attempts++;
            }
            this.db = window.ALabCore?.db;
            if (!this.db) {
                console.warn('[CMS] Supabase not available');
                return;
            }

            console.log('[CMS] Engine initialized');
            await this.loadAll();
        },

        async loadAll() {
            await Promise.all([
                this.loadDashboardStats(),
                this.loadRecentLeads(),
                this.loadLeads(),
                this.loadResidents(),
                this.loadNDA(),
                this.loadApplications(),
                this.loadAstra(),
                this.loadLogs()
            ]);
        },

        // ─── DASHBOARD STATS ─────────────────────────────
        async loadDashboardStats() {
            try {
                const safeCount = async (table) => {
                    try {
                        const res = await this.db.from(table).select('*', { count: 'exact', head: true });
                        return res;
                    } catch { return { count: 0 }; }
                };

                const [leads, residents, projects, nda, menu] = await Promise.all([
                    safeCount('leads'),
                    safeCount('residents'),
                    safeCount('projects'),
                    safeCount('nda_agreements'),
                    safeCount('menu_items')
                ]);

                this._setText('statLeads', leads.count ?? '—');
                this._setText('statResidents', residents.count ?? '—');
                this._setText('statProjects', projects.count ?? '—');
                this._setText('statNDA', nda.count ?? '—');
                this._setText('statMenu', menu.count ?? '—');

                // New leads (last 7 days)
                const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
                const { count: newCount } = await this.db
                    .from('leads')
                    .select('*', { count: 'exact', head: true })
                    .gte('created_at', weekAgo);
                this._setText('statNewLeads', newCount ?? '—');

            } catch (err) {
                console.error('[CMS] Stats error:', err);
            }
        },

        // ─── RECENT LEADS (Dashboard) ────────────────────
        async loadRecentLeads() {
            try {
                const { data, error } = await this.db
                    .from('leads')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .limit(5);

                if (error) throw error;
                const tbody = document.getElementById('recentLeadsBody');
                if (!tbody) return;

                if (!data || data.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color: var(--text-dim);">Нет лидов</td></tr>';
                    return;
                }

                tbody.innerHTML = data.map(l => `
                    <tr>
                        <td>${this._esc(l.name || '—')}</td>
                        <td>${this._esc(l.contact || l.email || '—')}</td>
                        <td><span class="badge badge-info">${this._esc(l.source || 'direct')}</span></td>
                        <td><span class="badge ${this._statusBadge(l.status)}">${(l.status || 'new').toUpperCase()}</span></td>
                        <td>${this._formatDate(l.created_at)}</td>
                    </tr>
                `).join('');

            } catch (err) {
                console.error('[CMS] Recent leads error:', err);
            }
        },

        // ─── ALL LEADS ───────────────────────────────────
        async loadLeads(filter = 'all') {
            try {
                let query = this.db.from('leads').select('*').order('created_at', { ascending: false });
                if (filter !== 'all') query = query.eq('status', filter);

                const { data, error } = await query;
                if (error) throw error;

                const tbody = document.getElementById('leadsBody');
                if (!tbody) return;

                if (!data || data.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="7" class="empty-state"><div class="empty-icon">📭</div><p>Нет лидов с фильтром: ' + filter + '</p></td></tr>';
                    return;
                }

                tbody.innerHTML = data.map(l => `
                    <tr>
                        <td>${this._esc(l.name || '—')}</td>
                        <td>${this._esc(l.contact || l.email || '—')}</td>
                        <td><span class="badge badge-info">${this._esc(l.source || 'direct')}</span></td>
                        <td style="max-width:200px; overflow:hidden; text-overflow:ellipsis;">${this._esc(l.message || '—')}</td>
                        <td>
                            <select onchange="CMS.updateLeadStatus('${l.id}', this.value)" style="background:transparent;border:1px solid var(--border);color:var(--text);padding:4px 8px;border-radius:6px;font-size:0.7rem;">
                                <option value="new" ${l.status === 'new' ? 'selected' : ''}>NEW</option>
                                <option value="contacted" ${l.status === 'contacted' ? 'selected' : ''}>CONTACTED</option>
                                <option value="closed" ${l.status === 'closed' ? 'selected' : ''}>CLOSED</option>
                            </select>
                        </td>
                        <td>${this._formatDate(l.created_at)}</td>
                        <td>
                            <button class="action-btn hover-trigger" onclick="CMS.deleteLead('${l.id}')" title="Удалить">🗑</button>
                        </td>
                    </tr>
                `).join('');

            } catch (err) {
                console.error('[CMS] Leads error:', err);
            }
        },

        // ─── RESIDENTS ───────────────────────────────────
        async loadResidents() {
            try {
                const { data, error } = await this.db
                    .from('residents')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (error) throw error;

                const tbody = document.getElementById('residentsBody');
                if (!tbody) return;

                if (!data || data.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="7" class="empty-state"><div class="empty-icon">👥</div><p>Нет резидентов.</p></td></tr>';
                    return;
                }

                tbody.innerHTML = data.map(r => `
                    <tr>
                        <td><div class="resident-status ${r.status || 'offline'}" style="width:10px;height:10px;border-radius:50%;display:inline-block;"></div></td>
                        <td>
                            <strong>${this._esc(r.full_name || '—')}</strong>
                            <div style="font-size:0.65rem;color:var(--text-dim);font-family:var(--font-code);">${this._esc(r.user_id || '—')}</div>
                        </td>
                        <td>${this._esc(r.role || 'Resident')}</td>
                        <td>${r.show_on_main ? '✅' : '❌'}</td>
                        <td>${r.is_admin ? '👑' : '—'}</td>
                        <td>${this._formatDate(r.created_at)}</td>
                        <td>
                            <button class="action-btn hover-trigger" onclick="window.open('profile.html?id=${r.user_id}', '_blank')" title="Профиль">👁</button>
                        </td>
                    </tr>
                `).join('');

            } catch (err) {
                console.error('[CMS] Residents error:', err);
            }
        },

        // ─── NDA ─────────────────────────────────────────
        async loadNDA() {
            try {
                const { data, error } = await this.db
                    .from('nda_agreements')
                    .select('*')
                    .order('signed_at', { ascending: false });

                if (error) throw error;

                const tbody = document.getElementById('ndaBody');
                if (!tbody) return;

                if (!data || data.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="6" class="empty-state"><div class="empty-icon">🔒</div><p>Нет подписанных NDA.</p></td></tr>';
                    return;
                }

                tbody.innerHTML = data.map(n => `
                    <tr>
                        <td>${this._esc(n.full_name || '—')}</td>
                        <td>${this._esc(n.email || '—')}</td>
                        <td>${this._esc(n.company || '—')}</td>
                        <td>${this._formatDate(n.signed_at)}</td>
                        <td><span class="badge badge-info">${(n.status || 'signed').toUpperCase()}</span></td>
                        <td>
                            <button class="action-btn hover-trigger" onclick="CMS.deleteNDA('${n.id}')" title="Удалить">🗑</button>
                        </td>
                    </tr>
                `).join('');

            } catch (err) {
                console.error('[CMS] NDA error:', err);
            }
        },

        // ─── APPLICATIONS ────────────────────────────────
        async loadApplications(filter = 'all') {
            try {
                let query = this.db.from('resident_applications').select('*').order('created_at', { ascending: false });
                if (filter !== 'all') query = query.eq('status', filter);

                const { data, error } = await query;
                if (error && error.code !== '42P01') throw error; // table may not exist

                const tbody = document.getElementById('appsBody');
                if (!tbody) return;

                if (!data || data.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="7" class="empty-state"><div class="empty-icon">📝</div><p>Нет заявок.</p></td></tr>';
                    return;
                }

                tbody.innerHTML = data.map(a => `
                    <tr>
                        <td>${this._esc(a.full_name || '—')}</td>
                        <td>${this._esc(a.email || '—')}</td>
                        <td>${this._esc(a.telegram || '—')}</td>
                        <td><span style="font-family:var(--font-code);font-size:0.7rem;">${this._esc(a.desired_id || '—')}</span></td>
                        <td>
                            <select onchange="CMS.updateAppStatus('${a.id}', this.value)" style="background:transparent;border:1px solid var(--border);color:var(--text);padding:4px 8px;border-radius:6px;font-size:0.7rem;">
                                <option value="pending" ${a.status === 'pending' ? 'selected' : ''}>PENDING</option>
                                <option value="approved" ${a.status === 'approved' ? 'selected' : ''}>APPROVED</option>
                                <option value="rejected" ${a.status === 'rejected' ? 'selected' : ''}>REJECTED</option>
                            </select>
                        </td>
                        <td>${this._formatDate(a.created_at)}</td>
                        <td>
                            <button class="action-btn hover-trigger" onclick="CMS.deleteApp('${a.id}')" title="Удалить">🗑</button>
                        </td>
                    </tr>
                `).join('');

            } catch (err) {
                console.error('[CMS] Applications error:', err);
            }
        },

        // ─── ASTRA BALANCES ──────────────────────────────
        async loadAstra() {
            try {
                const { data, error } = await this.db
                    .from('residents')
                    .select('user_id, full_name, role')
                    .order('created_at', { ascending: false });

                if (error) throw error;

                const grid = document.getElementById('astraGrid');
                if (!grid) return;

                if (!data || data.length === 0) {
                    grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1;"><div class="empty-icon">💎</div><p>Нет данных о балансах.</p></div>';
                    return;
                }

                let totalAstra = 0;
                grid.innerHTML = data.map(r => {
                    const bal = 0; // astra_balance column TBD
                    totalAstra += bal;
                    return `
                        <div class="astra-card hover-trigger">
                            <div>
                                <div class="astra-name">${this._esc(r.full_name)}</div>
                                <div class="astra-role">${this._esc(r.role || 'Resident')}</div>
                            </div>
                            <div class="astra-balance">${bal.toLocaleString()} ✦</div>
                        </div>
                    `;
                }).join('');

                this._setText('statTotalAstra', totalAstra.toLocaleString());

            } catch (err) {
                console.error('[CMS] Astra error:', err);
            }
        },

        // ─── SYSTEM LOGS ─────────────────────────────────
        async loadLogs(filter = 'all') {
            try {
                let query = this.db.from('system_logs').select('*').order('created_at', { ascending: false }).limit(50);
                if (filter !== 'all') query = query.eq('level', filter);

                const { data, error } = await query;
                if (error && error.code !== '42P01') throw error;

                const tbody = document.getElementById('logsBody');
                if (!tbody) return;

                if (!data || data.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="5" class="empty-state"><div class="empty-icon">📜</div><p>Нет логов.</p></td></tr>';
                    return;
                }

                tbody.innerHTML = data.map(l => `
                    <tr>
                        <td><span class="badge badge-${l.level || 'info'}">${(l.level || 'info').toUpperCase()}</span></td>
                        <td>${this._esc(l.action || '—')}</td>
                        <td>${this._esc(l.user_name || '—')}</td>
                        <td style="max-width:250px; overflow:hidden; text-overflow:ellipsis;">${this._esc(l.details || '—')}</td>
                        <td>${this._formatDate(l.created_at)}</td>
                    </tr>
                `).join('');

            } catch (err) {
                console.error('[CMS] Logs error:', err);
            }
        },

        // ─── CRUD OPERATIONS ─────────────────────────────
        async updateLeadStatus(id, status) {
            try {
                const { error } = await this.db.from('leads').update({ status }).eq('id', id);
                if (error) throw error;
                await this.loadDashboardStats();
            } catch (err) {
                console.error('[CMS] Update lead:', err);
                alert('Error: ' + err.message);
            }
        },

        async deleteLead(id) {
            if (!confirm('Удалить лид?')) return;
            try {
                const { error } = await this.db.from('leads').delete().eq('id', id);
                if (error) throw error;
                await this.loadLeads();
                await this.loadDashboardStats();
            } catch (err) {
                alert('Error: ' + err.message);
            }
        },

        async updateAppStatus(id, status) {
            try {
                const { error } = await this.db.from('resident_applications').update({ status }).eq('id', id);
                if (error) throw error;
            } catch (err) {
                alert('Error: ' + err.message);
            }
        },

        async deleteApp(id) {
            if (!confirm('Удалить заявку?')) return;
            try {
                const { error } = await this.db.from('resident_applications').delete().eq('id', id);
                if (error) throw error;
                await this.loadApplications();
            } catch (err) {
                alert('Error: ' + err.message);
            }
        },

        async deleteNDA(id) {
            if (!confirm('Удалить запись NDA?')) return;
            try {
                const { error } = await this.db.from('nda_agreements').delete().eq('id', id);
                if (error) throw error;
                await this.loadNDA();
                await this.loadDashboardStats();
            } catch (err) {
                alert('Error: ' + err.message);
            }
        },

        // ─── HELPERS ─────────────────────────────────────
        _esc(str) {
            const div = document.createElement('div');
            div.textContent = str || '';
            return div.innerHTML;
        },

        _setText(id, text) {
            const el = document.getElementById(id);
            if (el) el.textContent = text;
        },

        _formatDate(iso) {
            if (!iso) return '—';
            const d = new Date(iso);
            return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' }) +
                ' ' + d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        },

        _statusBadge(status) {
            switch (status) {
                case 'new': return 'badge-info';
                case 'contacted': return 'badge-warn';
                case 'closed': return 'badge-error';
                default: return 'badge-info';
            }
        }
    };

    // Expose globally for filter buttons
    window.CMS = CMS;

    // Global filter functions used by CMS admin HTML
    window.filterLeads = (f) => CMS.loadLeads(f);
    window.filterApps = (f) => CMS.loadApplications(f);
    window.filterLogs = (f) => CMS.loadLogs(f);

    // ─── TAB SWITCHING ───────────────────────────────
    window.switchTab = function(tabName) {
        document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.side-icon').forEach(s => s.classList.remove('active'));
        
        const tab = document.getElementById('tab-' + tabName);
        if (tab) tab.classList.add('active');
        
        // Highlight sidebar item
        const sideItems = document.querySelectorAll('.side-icon');
        sideItems.forEach(s => {
            if (s.getAttribute('onclick')?.includes(tabName)) s.classList.add('active');
        });

        // Update page title
        const titles = {
            dashboard: 'CMS Dashboard',
            leads: 'Лиды',
            projects: 'Проекты',
            residents: 'Резиденты',
            blocks: 'Контент-блоки',
            menu: 'Управление меню',
            nda: 'NDA Подписи',
            astra: 'ASTRA Токены',
            messages: 'Сообщения',
            apps: 'Заявки',
            logs: 'Системные логи'
        };
        const pageTitle = document.getElementById('pageTitle');
        if (pageTitle) pageTitle.textContent = titles[tabName] || tabName;
    };

    // ─── THEME TOGGLE ────────────────────────────────
    window.toggleTheme = function() {
        document.body.classList.toggle('light-theme');
        const btn = document.getElementById('themeBtn');
        if (btn) btn.textContent = document.body.classList.contains('light-theme') ? '☀' : '☽';
        localStorage.setItem('theme', document.body.classList.contains('light-theme') ? 'light' : 'dark');
    };

    // Restore theme
    document.addEventListener('DOMContentLoaded', () => {
        if (localStorage.getItem('theme') === 'light') {
            document.body.classList.add('light-theme');
            const btn = document.getElementById('themeBtn');
            if (btn) btn.textContent = '☀';
        }
    });

    // ─── TABLE SEARCH ────────────────────────────────
    window.searchTable = function(tbodyId, query) {
        const tbody = document.getElementById(tbodyId);
        if (!tbody) return;
        const rows = tbody.querySelectorAll('tr');
        const q = query.toLowerCase();
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(q) || !q ? '' : 'none';
        });
    };

    // ─── GLOBAL SEARCH ───────────────────────────────
    window.globalSearchHandler = function(query) {
        if (!query) return;
        // Search across visible table
        const activeTab = document.querySelector('.tab-content.active');
        if (!activeTab) return;
        const tbody = activeTab.querySelector('tbody');
        if (tbody) searchTable(tbody.id, query);
    };

    // ─── EXPORT CSV ──────────────────────────────────
    window.exportCSV = function(type) {
        const tbodyId = type + 'Body';
        const tbody = document.getElementById(tbodyId);
        if (!tbody) return alert('Нет данных для экспорта');

        const table = tbody.closest('table');
        if (!table) return;

        let csv = '';
        // Headers
        const headers = table.querySelectorAll('thead th');
        csv += Array.from(headers).map(h => '"' + h.textContent.trim() + '"').join(',') + '\n';

        // Rows
        const rows = tbody.querySelectorAll('tr');
        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length > 1) { // skip empty-state rows
                csv += Array.from(cells).map(c => '"' + c.textContent.trim().replace(/"/g, '""') + '"').join(',') + '\n';
            }
        });

        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `a-lab_${type}_${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
    };

    // ─── MODAL SYSTEM ────────────────────────────────
    window.closeModal = function() {
        const modal = document.getElementById('cmsModal');
        if (modal) modal.classList.remove('active');
    };

    window.openModal = function(html) {
        const modal = document.getElementById('cmsModal');
        const content = document.getElementById('modalContent');
        if (modal && content) {
            content.innerHTML = html;
            modal.classList.add('active');
        }
    };

    // Placeholder stubs for advanced features
    window.openProjectForm = window.openProjectForm || function() { alert('Функция в разработке'); };
    window.openBlockForm = window.openBlockForm || function() { alert('Функция в разработке'); };
    window.openMenuForm = window.openMenuForm || function() { alert('Функция в разработке'); };
    window.openGrantForm = window.openGrantForm || function() { alert('Функция в разработке'); };
    window.publishDaoVote = window.publishDaoVote || function() { alert('Функция в разработке'); };
    window.searchAstra = window.searchAstra || function(q) { /* placeholder */ };
    window.filterAdminChats = window.filterAdminChats || function(q) { /* placeholder */ };
    window.adminSendMsg = window.adminSendMsg || function() { alert('Функция в разработке'); };
    window.adminMsgKeyDown = window.adminMsgKeyDown || function(e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); adminSendMsg(); } };
    window.sendResidentNotify = window.sendResidentNotify || function(type) { alert('Функция в разработке'); };

    // Init on DOM ready
    document.addEventListener('DOMContentLoaded', () => CMS.init());

})();
