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

        _user: null,

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

            // Check authentication
            try {
                const { data: { user } } = await this.db.auth.getUser();
                this._user = user;
                if (user) {
                    console.log('[CMS] Authenticated as:', user.email);
                } else {
                    console.warn('[CMS] Not authenticated — write operations will fail');
                }
            } catch (e) {
                console.warn('[CMS] Auth check failed:', e.message);
            }

            console.log('[CMS] Engine initialized');
            await this.loadAll();
        },

        async loadAll() {
            await Promise.all([
                this.loadDashboardStats(),
                this.loadRecentLeads(),
                this.loadLeads(),
                this.loadProjects(),
                this.loadResidents(),
                this.loadNDA(),
                this.loadApplications(),
                this.loadAstra(),
                this.loadLogs(),
                this.loadMenu(),
                this.loadAnalytics()
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
                    tbody.innerHTML = '<tr><td colspan="8" class="empty-state"><div class="empty-icon">📭</div><p>Нет лидов с фильтром: ' + filter + '</p></td></tr>';
                    return;
                }

                tbody.innerHTML = data.map(l => {
                    const statusBadge = l.status === 'approved'
                        ? '<span class="badge badge-success">✅ ПРИНЯТ</span>'
                        : l.status === 'rejected'
                            ? '<span class="badge badge-danger">❌ ОТКЛОНЁН</span>'
                            : l.status === 'new'
                                ? '<span class="badge badge-warning">🆕 НОВЫЙ</span>'
                                : `<span class="badge badge-info">${this._esc(l.status || 'new').toUpperCase()}</span>`;

                    const hasEmail = l.email && l.email.includes('@');
                    const isActionable = l.status === 'new' || l.status === 'contacted';

                    return `
                    <tr style="${l.status === 'approved' ? 'opacity:0.6;' : l.status === 'rejected' ? 'opacity:0.4;' : ''}">
                        <td>
                            <strong>${this._esc(l.name || '—')}</strong>
                            ${l.email ? `<br><span style="font-size:0.65rem;color:var(--text-tertiary);">${this._esc(l.email)}</span>` : ''}
                        </td>
                        <td>${this._esc(l.contact || '—')}</td>
                        <td><span class="badge badge-info">${this._esc(l.source || 'direct')}</span></td>
                        <td style="max-width:250px;font-size:0.7rem;line-height:1.3;">
                            ${l.source_detail ? `<div style="color:var(--tech-blue);margin-bottom:2px;">${this._esc(l.source_detail)}</div>` : ''}
                            ${this._esc(l.message || '—')}
                        </td>
                        <td>${statusBadge}</td>
                        <td style="font-size:0.7rem;">${this._formatDate(l.created_at)}</td>
                        <td style="white-space:nowrap;">
                            ${isActionable ? `
                                <button class="action-btn hover-trigger" onclick="CMS.approveLead('${l.id}')" title="Принять в резиденты" style="color:#00E5FF;font-size:1rem;">✅</button>
                                <button class="action-btn hover-trigger" onclick="CMS.rejectLead('${l.id}')" title="Отклонить заявку" style="color:#FF4444;font-size:1rem;">❌</button>
                            ` : ''}
                            <button class="action-btn hover-trigger" onclick="CMS.deleteLead('${l.id}')" title="Удалить" style="font-size:0.9rem;">🗑</button>
                        </td>
                    </tr>`;
                }).join('');

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
        _astraResidents: [], // cache for grant form

        async loadAstra() {
            try {
                // Load all residents
                const { data: residents, error: rErr } = await this.db
                    .from('residents')
                    .select('id, user_id, full_name, role, avatar_url')
                    .order('full_name');

                if (rErr) throw rErr;
                this._astraResidents = residents || [];

                // Load balances from astra_balances
                let balances = [];
                try {
                    const { data: balData } = await this.db
                        .from('astra_balances')
                        .select('resident_id, balance');
                    balances = balData || [];
                } catch (e) {
                    console.warn('[CMS] astra_balances table not found, showing 0');
                }

                // Create balance map: resident_id -> balance
                const balMap = {};
                balances.forEach(b => { balMap[b.resident_id] = parseFloat(b.balance || 0); });

                // Load transaction count
                let txCount = 0;
                try {
                    const { count } = await this.db
                        .from('astra_transactions')
                        .select('*', { count: 'exact', head: true });
                    txCount = count || 0;
                } catch (e) { /* table may not exist */ }

                const grid = document.getElementById('astraGrid');
                if (!grid) return;

                if (!residents || residents.length === 0) {
                    grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1;"><div class="empty-icon">💎</div><p>Нет резидентов.</p></div>';
                    return;
                }

                let totalAstra = 0;
                grid.innerHTML = residents.map(r => {
                    const bal = balMap[r.id] || 0;
                    totalAstra += bal;
                    const avatarHTML = r.avatar_url
                        ? `<img src="${r.avatar_url}" style="width:36px;height:36px;border-radius:50%;object-fit:cover;border:1px solid var(--border);">`
                        : `<div style="width:36px;height:36px;border-radius:50%;background:var(--surface);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:1rem;">👤</div>`;
                    return `
                        <div class="cms-card astra-resident-card" style="display:flex;align-items:center;gap:14px;padding:16px;" data-name="${this._esc(r.full_name).toLowerCase()}">
                            ${avatarHTML}
                            <div style="flex:1;min-width:0;">
                                <div style="font-weight:700;font-size:0.85rem;">${this._esc(r.full_name)}</div>
                                <div style="font-family:var(--font-code);font-size:0.6rem;color:var(--text-dim);">${this._esc(r.role || 'Resident')}</div>
                            </div>
                            <div style="text-align:right;">
                                <div style="font-family:var(--font-code);font-weight:800;font-size:1.1rem;color:var(--tech-blue);">${bal.toLocaleString('ru-RU')} ✦</div>
                                <div style="font-family:var(--font-code);font-size:0.55rem;color:var(--text-dim);">≈ $${(bal * 1.5).toFixed(2)}</div>
                            </div>
                        </div>
                    `;
                }).join('');

                this._setText('statTotalAstra', totalAstra.toLocaleString('ru-RU') + ' ✦');
                this._setText('statTotalTx', txCount.toLocaleString());

            } catch (err) {
                console.error('[CMS] Astra error:', err);
            }
        },

        // ─── ASTRA: GRANT TOKENS (Admin) ─────────────────
        async grantAstraTokens(recipientResidentId, amount, note) {
            try {
                const numAmount = parseFloat(amount);
                if (isNaN(numAmount) || numAmount <= 0) throw new Error('Некорректная сумма');

                // Check auth
                if (!this._user) {
                    throw new Error('Требуется авторизация. Войдите в систему через login.html');
                }

                // Try RPC first (SECURITY DEFINER — bypasses RLS)
                let rpcSuccess = false;
                try {
                    const { data: rpcResult, error: rpcError } = await this.db.rpc('admin_grant_astra', {
                        p_recipient_id: recipientResidentId,
                        p_amount: numAmount,
                        p_reason: note || 'Начисление администратором'
                    });
                    if (!rpcError) {
                        rpcSuccess = true;
                        console.log('[CMS] Grant via RPC successful');
                    }
                } catch (e) {
                    console.warn('[CMS] RPC admin_grant_astra not available, using direct queries');
                }

                // Fallback: direct insert/upsert
                if (!rpcSuccess) {
                    // 1. Upsert balance
                    const { data: existing, error: readErr } = await this.db
                        .from('astra_balances')
                        .select('balance')
                        .eq('resident_id', recipientResidentId)
                        .maybeSingle();

                    if (readErr && readErr.code !== 'PGRST116') {
                        throw new Error('Ошибка чтения баланса: ' + readErr.message);
                    }

                    if (existing) {
                        const newBal = parseFloat(existing.balance || 0) + numAmount;
                        const { error: updErr } = await this.db
                            .from('astra_balances')
                            .update({ balance: newBal, last_updated: new Date().toISOString() })
                            .eq('resident_id', recipientResidentId);
                        if (updErr) throw new Error('Ошибка обновления баланса: ' + updErr.message);
                    } else {
                        const { error: insErr } = await this.db
                            .from('astra_balances')
                            .insert({ resident_id: recipientResidentId, balance: numAmount, last_updated: new Date().toISOString() });
                        if (insErr) throw new Error('Ошибка создания баланса: ' + insErr.message);
                    }

                    // 2. Log transaction
                    const { error: txErr } = await this.db.from('astra_transactions').insert({
                        to_id: recipientResidentId,
                        from_id: null,
                        amount: numAmount,
                        type: 'admin_grant',
                        reason: note || 'Начисление администратором'
                    });
                    if (txErr) {
                        console.warn('[CMS] Transaction log error (non-critical):', txErr.message);
                    }
                }

                // 3. System log
                const resident = this._astraResidents.find(r => r.id === recipientResidentId);
                if (window.ALabCore?.log) {
                    window.ALabCore.log('astra_grant', `Granted ${numAmount} ASTRA to ${resident?.full_name || recipientResidentId}`);
                }

                return { success: true };
            } catch (err) {
                console.error('[CMS] Grant error:', err);
                return { error: err.message };
            }
        },

        // ─── PROJECTS ─────────────────────────────────────
        _projectsCache: [],
        _projectFilter: 'all',

        async loadProjects(filter) {
            if (filter !== undefined) this._projectFilter = filter;
            const f = this._projectFilter;

            try {
                let query = this.db.from('projects').select('*').order('order_index', { ascending: true });
                if (f && f !== 'all') query = query.eq('category', f);

                const { data, error } = await query;
                if (error && error.code !== '42P01') throw error;

                this._projectsCache = data || [];
                const tbody = document.getElementById('projectsBody');
                if (!tbody) return;

                if (!data || data.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="7" class="empty-state"><div class="empty-icon">🗂️</div><p>Нет проектов' + (f !== 'all' ? ' в категории ' + f.toUpperCase() : '') + '.</p></td></tr>';
                    return;
                }

                tbody.innerHTML = data.map(p => {
                    const imgSrc = p.image_url
                        ? (p.image_url.startsWith('http') ? p.image_url : 'assets/img/' + p.image_url)
                        : '';
                    const catBadge = p.category === 'design' ? 'badge-design'
                        : p.category === 'rd' ? 'badge-rd'
                        : p.category === 'marketing' ? 'badge-marketing'
                        : 'badge-info';

                    return `
                    <tr>
                        <td style="width:80px;">
                            ${imgSrc
                                ? `<img src="${imgSrc}" alt="" style="width:70px;height:44px;object-fit:cover;border-radius:6px;border:1px solid var(--border);"  onerror="this.style.display='none'">`
                                : '<div style="width:70px;height:44px;background:var(--surface);border-radius:6px;display:flex;align-items:center;justify-content:center;color:#333;font-size:0.6rem;">NO IMG</div>'}
                        </td>
                        <td>
                            <strong>${this._esc(p.title || '—')}</strong>
                            <div style="font-size:0.65rem;color:var(--text-dim);max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${this._esc(p.description || '')}</div>
                        </td>
                        <td><span class="badge ${catBadge}">${(p.category || '—').toUpperCase()}</span></td>
                        <td>
                            <span style="font-family:var(--font-code);font-size:0.75rem;color:var(--tech-blue);">${this._esc(p.result_value || '')}</span>
                            <span style="font-size:0.6rem;color:var(--text-dim);">${this._esc(p.result_label || '')}</span>
                        </td>
                        <td><span class="badge badge-info">${(p.lang || '—').toUpperCase()}</span></td>
                        <td style="text-align:center;font-family:var(--font-code);">${p.order_index ?? '—'}</td>
                        <td style="white-space:nowrap;">
                            <button class="action-btn hover-trigger" onclick="CMS.editProject('${p.id}')" title="Редактировать" style="font-size:0.9rem;">✏️</button>
                            <button class="action-btn hover-trigger" onclick="CMS.deleteProject('${p.id}')" title="Удалить" style="font-size:0.9rem;">🗑</button>
                        </td>
                    </tr>`;
                }).join('');

            } catch (err) {
                console.error('[CMS] Projects error:', err);
            }
        },

        async deleteProject(id) {
            if (!confirm('🗑 Удалить этот проект?')) return;
            try {
                const { error } = await this.db.from('projects').delete().eq('id', id);
                if (error) throw error;
                await this.loadProjects();
                await this.loadDashboardStats();
            } catch (err) {
                alert('Ошибка удаления: ' + err.message);
            }
        },

        editProject(id) {
            const proj = this._projectsCache.find(p => String(p.id) === String(id));
            if (!proj) return alert('Проект не найден');
            window._openProjectFormWithData(proj);
        },

        async saveProject(formData, existingId) {
            try {
                // If there's a file to upload, handle it first
                let imageUrl = formData.image_url;
                const fileInput = document.getElementById('projectImageFile');
                if (fileInput && fileInput.files && fileInput.files[0]) {
                    const file = fileInput.files[0];
                    const fileName = 'design_case_' + Date.now() + '_' + file.name.replace(/[^a-zA-Z0-9._-]/g, '');
                    
                    const { data: upData, error: upErr } = await this.db.storage
                        .from('portfolio')
                        .upload(fileName, file, {
                            contentType: file.type,
                            upsert: true
                        });

                    if (upErr) {
                        console.error('[CMS] Upload error:', upErr);
                        alert('⚠️ Загрузка файла в Storage не удалась: ' + upErr.message + '\nПопробуйте указать URL вручную.');
                    } else {
                        const { data: pubUrl } = this.db.storage
                            .from('portfolio')
                            .getPublicUrl(fileName);
                        imageUrl = pubUrl?.publicUrl || imageUrl;
                        console.log('[CMS] Image uploaded:', imageUrl);
                    }
                }

                const record = {
                    title: formData.title,
                    description: formData.description,
                    category: formData.category,
                    lang: formData.lang,
                    result_value: formData.result_value,
                    result_label: formData.result_label,
                    image_url: imageUrl,
                    link_url: formData.link_url || null,
                    order_index: parseInt(formData.order_index) || 0
                };

                if (existingId) {
                    const { error } = await this.db.from('projects').update(record).eq('id', existingId);
                    if (error) throw error;
                } else {
                    const { error } = await this.db.from('projects').insert(record);
                    if (error) throw error;
                }

                closeModal();
                await this.loadProjects();
                await this.loadDashboardStats();
                return { success: true };
            } catch (err) {
                console.error('[CMS] Save project error:', err);
                alert('❌ Ошибка сохранения: ' + err.message);
                return { error: err.message };
            }
        },

        // ─── SYSTEM LOGS ─────────────────────────────────
        async loadLogs(filter = 'all') {
            try {
                let query = this.db.from('system_logs').select('*').order('created_at', { ascending: false }).limit(50);
                if (filter !== 'all') query = query.eq('event_type', filter);

                const { data, error } = await query;
                if (error && error.code !== '42P01') throw error;

                const tbody = document.getElementById('logsBody');
                if (!tbody) return;

                if (!data || data.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="5" class="empty-state"><div class="empty-icon">📜</div><p>Нет логов.</p></td></tr>';
                    return;
                }

                tbody.innerHTML = data.map(l => {
                    // Map actual DB fields to display
                    const level = l.event_type || l.level || 'info';
                    const meta = l.metadata || {};
                    const action = meta.message || l.action || '—';
                    const userName = l.user_id ? l.user_id.substring(0, 8) + '...' : (l.user_name || '—');
                    const details = (typeof meta === 'object' && Object.keys(meta).length > 1)
                        ? Object.entries(meta).filter(([k]) => k !== 'message').map(([k,v]) => `${k}: ${v}`).join(', ')
                        : (l.details || '—');

                    const badgeClass = level === 'error' ? 'badge-error'
                        : level === 'warn' || level === 'warning' ? 'badge-warning'
                        : level === 'auth' ? 'badge-auth'
                        : 'badge-info';

                    return `
                    <tr>
                        <td><span class="badge ${badgeClass}">${level.toUpperCase()}</span></td>
                        <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${this._esc(action)}</td>
                        <td><span style="font-family:var(--font-code);font-size:0.7rem;">${this._esc(userName)}</span></td>
                        <td style="max-width:250px; overflow:hidden; text-overflow:ellipsis;white-space:nowrap;font-size:0.75rem;color:var(--text-dim);">${this._esc(details)}</td>
                        <td>${this._formatDate(l.created_at)}</td>
                    </tr>`;
                }).join('');

            } catch (err) {
                console.error('[CMS] Logs error:', err);
            }
        },

        // ─── MENU ITEMS ──────────────────────────────────
        _menuCache: [],

        async loadMenu() {
            try {
                const { data, error } = await this.db
                    .from('menu_items')
                    .select('*')
                    .order('order_index', { ascending: true });

                if (error && error.code !== '42P01') throw error;

                this._menuCache = data || [];
                const tbody = document.getElementById('menuBody');
                if (!tbody) return;

                if (!data || data.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="6" class="empty-state"><div class="empty-icon">🔗</div><p>Нет пунктов меню.</p></td></tr>';
                    return;
                }

                tbody.innerHTML = data.map(m => `
                    <tr style="opacity: ${m.is_visible ? 1 : 0.45};">
                        <td style="text-align:center;font-family:var(--font-code);font-weight:700;">${m.order_index ?? '—'}</td>
                        <td>
                            <strong>${this._esc(m.label_ru || '—')}</strong>
                            <div style="font-size:0.6rem;color:var(--tech-blue);font-family:var(--font-code);">${this._esc(m.code || '')}</div>
                        </td>
                        <td>${this._esc(m.label_en || '—')}</td>
                        <td><a href="${this._esc(m.url || '#')}" target="_blank" style="color:var(--tech-blue);font-family:var(--font-code);font-size:0.75rem;text-decoration:none;">${this._esc(m.url || '—')}</a></td>
                        <td style="text-align:center;">
                            <button class="action-btn hover-trigger" onclick="CMS.toggleMenuVisibility('${m.id}', ${!m.is_visible})" title="${m.is_visible ? 'Скрыть' : 'Показать'}" style="font-size:0.9rem;">
                                ${m.is_visible ? '👁' : '👁‍🗨'}
                            </button>
                        </td>
                        <td style="white-space:nowrap;">
                            <button class="action-btn hover-trigger" onclick="CMS.editMenuItem('${m.id}')" title="Редактировать" style="font-size:0.9rem;">✏️</button>
                            <button class="action-btn hover-trigger" onclick="CMS.deleteMenuItem('${m.id}')" title="Удалить" style="font-size:0.9rem;">🗑</button>
                        </td>
                    </tr>
                `).join('');

            } catch (err) {
                console.error('[CMS] Menu error:', err);
            }
        },

        async toggleMenuVisibility(id, visible) {
            try {
                const { error } = await this.db.from('menu_items').update({ is_visible: visible }).eq('id', id);
                if (error) throw error;
                await this.loadMenu();
            } catch (err) {
                alert('Ошибка: ' + err.message);
            }
        },

        async deleteMenuItem(id) {
            if (!confirm('🗑 Удалить пункт меню?')) return;
            try {
                const { error } = await this.db.from('menu_items').delete().eq('id', id);
                if (error) throw error;
                await this.loadMenu();
                await this.loadDashboardStats();
            } catch (err) {
                alert('Ошибка удаления: ' + err.message);
            }
        },

        editMenuItem(id) {
            const item = this._menuCache.find(m => String(m.id) === String(id));
            if (!item) return alert('Пункт не найден');
            window._openMenuFormWithData(item);
        },

        async saveMenuItem(formData, existingId) {
            try {
                const record = {
                    label_ru: formData.label_ru,
                    label_en: formData.label_en,
                    url: formData.url,
                    code: formData.code,
                    desc_ru: formData.desc_ru || '',
                    desc_en: formData.desc_en || '',
                    order_index: parseInt(formData.order_index) || 0,
                    is_visible: formData.is_visible,
                    requires_auth: formData.requires_auth || false
                };

                if (existingId) {
                    const { error } = await this.db.from('menu_items').update(record).eq('id', existingId);
                    if (error) throw error;
                } else {
                    const { error } = await this.db.from('menu_items').insert(record);
                    if (error) throw error;
                }

                closeModal();
                await this.loadMenu();
                await this.loadDashboardStats();
                return { success: true };
            } catch (err) {
                console.error('[CMS] Save menu error:', err);
                alert('❌ Ошибка сохранения: ' + err.message);
                return { error: err.message };
            }
        },

        // ─── SITE ANALYTICS ──────────────────────────────
        async loadAnalytics() {
            const container = document.getElementById('analyticsSection');
            if (!container) return;

            try {
                // Try to load from page_views table
                const now = new Date();
                const dayAgo = new Date(now - 24*60*60*1000).toISOString();
                const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()).toISOString();
                const quarterAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate()).toISOString();

                const [day, month, quarter, total] = await Promise.all([
                    this.db.from('page_views').select('*', {count:'exact', head:true}).gte('created_at', dayAgo),
                    this.db.from('page_views').select('*', {count:'exact', head:true}).gte('created_at', monthAgo),
                    this.db.from('page_views').select('*', {count:'exact', head:true}).gte('created_at', quarterAgo),
                    this.db.from('page_views').select('*', {count:'exact', head:true})
                ]);

                // Geo data - top countries
                const { data: geoData } = await this.db
                    .from('page_views')
                    .select('country')
                    .not('country', 'is', null)
                    .gte('created_at', monthAgo);

                const geoMap = {};
                (geoData || []).forEach(r => {
                    geoMap[r.country] = (geoMap[r.country] || 0) + 1;
                });
                const topCountries = Object.entries(geoMap)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 8);

                await this._renderAnalytics(container, {
                    day: day.count || 0,
                    month: month.count || 0,
                    quarter: quarter.count || 0,
                    total: total.count || 0,
                    topCountries
                });

            } catch (err) {
                // Table might not exist yet — show setup instructions
                console.warn('[CMS] Analytics not available:', err.message);
                this._renderAnalyticsFallback(container);
            }
        },

        async _renderAnalytics(container, data) {
            // Country coordinates [lon, lat] for dot placement
            const countryCoords = {
                'US': [-98, 39], 'CA': [-96, 56], 'MX': [-103, 23], 'BR': [-52, -10],
                'AR': [-64, -35], 'CL': [-71, -33], 'CO': [-74, 4],
                'GB': [-1, 54], 'FR': [-2, 48], 'DE': [10, 51], 'ES': [-4, 40],
                'IT': [12, 42], 'NL': [5, 52], 'PL': [20, 52], 'SE': [15, 63],
                'NO': [10, 60], 'FI': [26, 64], 'CH': [8, 47], 'AT': [14, 47],
                'PT': [-8, 39], 'BE': [4, 50], 'CZ': [15, 49], 'IE': [-8, 53],
                'RU': [56, 62], 'UA': [32, 50], 'BY': [27, 53],
                'TR': [28, 41], 'IL': [35, 32], 'AE': [54, 24], 'SA': [45, 25],
                'KZ': [67, 48], 'UZ': [64, 41],
                'CN': [105, 35], 'JP': [139, 36], 'KR': [127, 36], 'IN': [78, 21],
                'TH': [100, 15], 'VN': [107, 16], 'ID': [118, -2], 'PH': [121, 12],
                'SG': [103, 1], 'AU': [134, -25], 'NZ': [174, -40],
                'ZA': [25, -30], 'NG': [8, 10], 'EG': [30, 27], 'KE': [37, -1],
                'MA': [-7, 31], 'GH': [-1, 8]
            };

            const countryNames = {
                'RU': 'Россия', 'US': 'США', 'DE': 'Германия', 'GB': 'Великобритания',
                'FR': 'Франция', 'UA': 'Украина', 'KZ': 'Казахстан', 'TR': 'Турция',
                'AE': 'ОАЭ', 'IL': 'Израиль', 'CN': 'Китай', 'JP': 'Япония',
                'IN': 'Индия', 'BR': 'Бразилия', 'PL': 'Польша', 'NL': 'Нидерланды',
                'ES': 'Испания', 'IT': 'Италия', 'CA': 'Канада', 'AU': 'Австралия',
                'SE': 'Швеция', 'KR': 'Ю.Корея', 'TH': 'Таиланд', 'MX': 'Мексика'
            };

            const maxCount = data.topCountries.length > 0 ? data.topCountries[0][1] : 1;

            // D3-geo equirectangular projection: scale=152, translate=[480,230]
            const _proj = (lon, lat) => [480 + lon * 152 / 57.2958, 230 - lat * 152 / 57.2958];

            const mapDots = data.topCountries.map(([code, count]) => {
                const coords = countryCoords[code];
                if (!coords) return '';
                const [dx, dy] = _proj(coords[0], coords[1]);
                const size = Math.max(3, Math.min(12, 3 + (count / maxCount) * 9));
                const pulse = count / maxCount > 0.3 ? `<animate attributeName="r" values="${size};${size+4};${size}" dur="2s" repeatCount="indefinite"/>` : '';
                const name = countryNames[code] || code;
                return `
                    <g class="map-dot-group" style="cursor:pointer;">
                        <circle cx="${dx}" cy="${dy}" r="${size + 6}" fill="rgba(0,229,255,0.08)" stroke="none">${pulse}</circle>
                        <circle cx="${dx}" cy="${dy}" r="${size}" fill="rgba(0,229,255,0.5)" stroke="#00E5FF" stroke-width="1"/>
                        <text x="${dx}" y="${dy - 3 - size}" text-anchor="middle" fill="#00E5FF" font-family="'JetBrains Mono',monospace" font-size="9" font-weight="700">${count}</text>
                        <text x="${dx}" y="${dy + 7 + size}" text-anchor="middle" fill="rgba(255,255,255,0.4)" font-family="'JetBrains Mono',monospace" font-size="7">${name}</text>
                    </g>`;
            }).join('');

            // High-detail continent outlines - fetch Natural Earth TopoJSON and render
            let continentPaths = '';
            if (!window.__worldMapCache) {
                try {
                    const resp = await fetch('https://unpkg.com/world-atlas@2.0.2/land-110m.json');
                    const topo = await resp.json();
                    const tr = topo.transform;
                    // Decode a single arc index into [lon,lat] coordinates
                    const decodeArc = (arcIdx) => {
                        const reverse = arcIdx < 0;
                        const arc = topo.arcs[reverse ? ~arcIdx : arcIdx];
                        let x = 0, y = 0;
                        const pts = arc.map(([dx,dy]) => {
                            x += dx; y += dy;
                            return [x * tr.scale[0] + tr.translate[0], y * tr.scale[1] + tr.translate[1]];
                        });
                        return reverse ? pts.reverse() : pts;
                    };
                    // Project [lon,lat] → SVG [x,y] (equirectangular, scale=152, translate=[480,230])
                    const proj = (lon, lat) => [480 + lon * 2.6529, 230 - lat * 2.6529];
                    let pathD = '';
                    // Process a single ring (array of arc indices), skip extreme latitudes
                    const processRing = (ring) => {
                        let coords = [];
                        ring.forEach(idx => { coords = coords.concat(decodeArc(idx)); });
                        // Filter out Antarctica (lat < -60) and extreme Arctic (lat > 84)
                        coords = coords.filter(([lon, lat]) => lat > -60 && lat < 84);
                        if (coords.length < 3) return; // skip tiny remnants
                        coords.forEach(([lon, lat], i) => {
                            const [px, py] = proj(lon, lat);
                            pathD += (i === 0 ? 'M' : 'L') + Math.round(px) + ',' + Math.round(py);
                        });
                        pathD += 'Z';
                    };
                    // Get the land geometry object
                    const geo = topo.objects.land;
                    if (geo.type === 'MultiPolygon') {
                        // arcs = [polygon[ring[arcIndex]]]
                        geo.arcs.forEach(polygon => polygon.forEach(ring => processRing(ring)));
                    } else if (geo.type === 'Polygon') {
                        geo.arcs.forEach(ring => processRing(ring));
                    } else if (geo.type === 'GeometryCollection') {
                        geo.geometries.forEach(g => {
                            if (g.type === 'MultiPolygon') g.arcs.forEach(p => p.forEach(r => processRing(r)));
                            else if (g.type === 'Polygon') g.arcs.forEach(r => processRing(r));
                        });
                    }
                    window.__worldMapCache = pathD;
                } catch(e) { console.debug('[MAP] Could not load world map:', e.message); }
            }
            continentPaths = window.__worldMapCache
                ? `<path d="${window.__worldMapCache}" fill="rgba(0,229,255,0.03)" stroke="rgba(0,229,255,0.15)" stroke-width="0.5"/>`
                : '';

            // Country name labels
            const labelData = [
              [-98,39,'USA'],[56,62,'Russia'],[-96,56,'Canada'],[105,35,'China'],[-52,-10,'Brazil'],
              [134,-25,'Australia'],[78,21,'India'],[139,36,'Japan'],[127,36,'S.Korea'],
              [10,51,'Germany'],[-2,48,'France'],[12,42,'Italy'],[-4,40,'Spain'],[-1,54,'UK'],
              [20,52,'Poland'],[15,63,'Sweden'],[10,60,'Norway'],[26,64,'Finland'],
              [32,50,'Ukraine'],[67,48,'Kazakhstan'],[28,41,'Turkey'],[35,32,'Israel'],
              [54,24,'UAE'],[45,25,'S.Arabia'],[30,27,'Egypt'],[8,10,'Nigeria'],
              [37,-1,'Kenya'],[25,-30,'S.Africa'],[47,33,'Iraq'],[53,33,'Iran'],
              [100,15,'Thailand'],[107,16,'Vietnam'],[118,-2,'Indonesia'],
              [-103,23,'Mexico'],[-74,4,'Colombia'],[-76,-10,'Peru'],[-64,-17,'Bolivia'],
              [-64,-35,'Argentina'],[-71,-33,'Chile'],[-56,-33,'Uruguay'],
              [100,47,'Mongolia'],[69,29,'Pakistan'],[90,24,'Bangladesh'],
              [-45,72,'Greenland'],[25,46,'Romania']
            ];
            const countryLabels = labelData.map(([ln,lt,nm]) => {
              const [lx, ly] = _proj(ln, lt);
              return `<text x="${lx}" y="${ly}" text-anchor="middle" fill="rgba(0,229,255,0.18)" font-family="'JetBrains Mono',monospace" font-size="6" letter-spacing="0.5">${nm}</text>`;
            }).join('');

            // No grid lines — only equator dashed line (rendered in SVG below)

            container.innerHTML = `
                <div class="section-title" style="margin-bottom:16px;">// АНАЛИТИКА ВИЗИТОВ</div>
                <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px;">
                    <div class="stat-card hover-trigger" style="padding:20px;">
                        <div style="font-size:1.8rem;font-weight:800;color:var(--tech-blue);font-family:var(--font-code);">${data.day.toLocaleString()}</div>
                        <div style="font-size:0.7rem;color:var(--text-dim);font-family:var(--font-code);margin-top:4px;">СЕГОДНЯ (24ч)</div>
                    </div>
                    <div class="stat-card hover-trigger" style="padding:20px;">
                        <div style="font-size:1.8rem;font-weight:800;color:#00FF88;font-family:var(--font-code);">${data.month.toLocaleString()}</div>
                        <div style="font-size:0.7rem;color:var(--text-dim);font-family:var(--font-code);margin-top:4px;">ЗА МЕСЯЦ</div>
                    </div>
                    <div class="stat-card hover-trigger" style="padding:20px;">
                        <div style="font-size:1.8rem;font-weight:800;color:#FFB800;font-family:var(--font-code);">${data.quarter.toLocaleString()}</div>
                        <div style="font-size:0.7rem;color:var(--text-dim);font-family:var(--font-code);margin-top:4px;">ЗА КВАРТАЛ</div>
                    </div>
                    <div class="stat-card hover-trigger" style="padding:20px;">
                        <div style="font-size:1.8rem;font-weight:800;color:var(--accent);font-family:var(--font-code);">${data.total.toLocaleString()}</div>
                        <div style="font-size:0.7rem;color:var(--text-dim);font-family:var(--font-code);margin-top:4px;">ВСЕГО</div>
                    </div>
                </div>

                <div class="section-title" style="margin-bottom:12px;">// КАРТА ТРАФИКА</div>
                <div style="position:relative;background:linear-gradient(135deg, rgba(0,20,30,0.9) 0%, rgba(3,4,7,0.95) 100%);border-radius:16px;border:1px solid rgba(0,229,255,0.15);overflow:hidden;padding:10px;">
                    <!-- Blueprint corner marks -->
                    <div style="position:absolute;top:8px;left:8px;width:20px;height:20px;border-top:2px solid rgba(0,229,255,0.3);border-left:2px solid rgba(0,229,255,0.3);"></div>
                    <div style="position:absolute;top:8px;right:8px;width:20px;height:20px;border-top:2px solid rgba(0,229,255,0.3);border-right:2px solid rgba(0,229,255,0.3);"></div>
                    <div style="position:absolute;bottom:8px;left:8px;width:20px;height:20px;border-bottom:2px solid rgba(0,229,255,0.3);border-left:2px solid rgba(0,229,255,0.3);"></div>
                    <div style="position:absolute;bottom:8px;right:8px;width:20px;height:20px;border-bottom:2px solid rgba(0,229,255,0.3);border-right:2px solid rgba(0,229,255,0.3);"></div>
                    
                    <!-- Blueprint label -->
                    <div style="position:absolute;top:14px;left:36px;font-family:var(--font-code);font-size:0.6rem;color:rgba(0,229,255,0.35);letter-spacing:2px;">GLOBAL_TRAFFIC_MAP // A-LAB.TECH</div>
                    <div style="position:absolute;bottom:14px;right:36px;font-family:var(--font-code);font-size:0.55rem;color:rgba(0,229,255,0.25);">MERCATOR_PROJECTION // REAL-TIME</div>

                    <svg viewBox="0 0 960 400" style="width:100%;height:auto;display:block;" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                            <clipPath id="mapClip"><rect x="0" y="15" width="960" height="370"/></clipPath>
                        </defs>
                        <!-- Equator -->
                        <line x1="0" y1="50%" x2="100%" y2="50%" stroke="rgba(0,229,255,0.08)" stroke-width="1" stroke-dasharray="8,4"/>
                        
                        <!-- Continent outlines (clipped to hide Arctic/Antarctic edge artifacts) -->
                        <g clip-path="url(#mapClip)">
                        ${continentPaths}
                        </g>
                        
                        <!-- Country labels -->
                        ${countryLabels}
                        
                        <!-- Country dots with traffic -->
                        ${mapDots}
                        
                        <!-- No data message -->
                        ${data.topCountries.length === 0 ? '<text x="50%" y="50%" text-anchor="middle" fill="rgba(255,255,255,0.2)" font-family="\'JetBrains Mono\',monospace" font-size="14">AWAITING GEO DATA...</text>' : ''}
                    </svg>
                </div>

                ${data.topCountries.length > 0 ? `
                <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:16px;">
                    ${data.topCountries.slice(0, 8).map(([code, count]) => {
                        const name = countryNames[code] || code;
                        const pct = (count / data.month * 100).toFixed(1);
                        return `
                        <div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:var(--surface);border-radius:8px;border:1px solid var(--border);">
                            <span style="font-family:var(--font-code);font-size:0.75rem;font-weight:700;color:var(--tech-blue);min-width:24px;">${code}</span>
                            <div style="flex:1;">
                                <div style="font-size:0.7rem;color:var(--text-dim);">${name}</div>
                                <div style="height:3px;background:rgba(255,255,255,0.05);border-radius:2px;margin-top:3px;overflow:hidden;">
                                    <div style="width:${(count/maxCount*100).toFixed(0)}%;height:100%;background:var(--tech-blue);border-radius:2px;"></div>
                                </div>
                            </div>
                            <span style="font-family:var(--font-code);font-size:0.7rem;color:var(--text-dim);">${count}</span>
                        </div>`;
                    }).join('')}
                </div>` : ''}
            `;
        },

        _renderAnalyticsFallback(container) {
            container.innerHTML = `
                <div class="section-title" style="margin-bottom:16px;">// АНАЛИТИКА ВИЗИТОВ</div>
                <div style="padding:30px;background:var(--surface);border-radius:12px;border:1px solid var(--border);text-align:center;">
                    <div style="font-size:2rem;margin-bottom:12px;">📊</div>
                    <p style="color:var(--text-dim);font-size:0.85rem;margin-bottom:16px;">Для аналитики визитов добавьте таблицу <code style="color:var(--tech-blue);">page_views</code> в Supabase</p>
                    <div style="text-align:left;max-width:500px;margin:0 auto;background:rgba(0,0,0,0.3);padding:16px;border-radius:8px;font-family:var(--font-code);font-size:0.7rem;color:#aaa;white-space:pre;overflow-x:auto;">CREATE TABLE page_views (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  page text NOT NULL,
  referrer text,
  country text,
  city text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow insert for all"
  ON page_views FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow select for authenticated"
  ON page_views FOR SELECT TO authenticated USING (true);</div>
                </div>
            `;
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

        /* =========================================================
         * APPROVE LEAD — Create account + resident + 300 ASTRA
         * ========================================================= */
        async approveLead(leadId) {
            try {
                // 1. Fetch lead data
                const { data: lead, error: leadErr } = await this.db
                    .from('leads')
                    .select('*')
                    .eq('id', leadId)
                    .single();

                if (leadErr) throw leadErr;
                if (!lead) throw new Error('Лид не найден');

                // Find email: check email column first, then contact field
                let email = lead.email;
                if (!email || !email.includes('@')) {
                    // Fallback: check if contact contains an email
                    if (lead.contact && lead.contact.includes('@') && lead.contact.includes('.')) {
                        email = lead.contact;
                    }
                }

                if (!email || !email.includes('@')) {
                    // Last resort: prompt admin to enter email
                    email = prompt('⚠️ У лида нет email.\n\nВведите email для создания аккаунта:');
                    if (!email || !email.includes('@')) {
                        alert('❌ Email обязателен для создания аккаунта.');
                        return;
                    }
                }

                const leadName = lead.name || email.split('@')[0];

                // Confirm action
                if (!confirm(`✅ ПРИНЯТЬ ЗАЯВКУ?\n\nИмя: ${leadName}\nEmail: ${email}\nTelegram: ${lead.contact || '—'}\n\nБудет создан:\n• Аккаунт Supabase (${email})\n• Профиль резидента\n• Начислено 300 ASTRA\n• Отправлено письмо-приглашение`)) return;

                // 2. Generate random password
                const password = this._generatePassword(12);

                // 3. Try to create Supabase auth user via RPC (SECURITY DEFINER)
                let userId = null;

                try {
                    const { data: rpcResult, error: rpcErr } = await this.db.rpc('admin_create_user', {
                        p_email: email,
                        p_password: password,
                        p_full_name: leadName
                    });

                    if (!rpcErr && rpcResult) {
                        userId = rpcResult.user_id || rpcResult;
                        console.log('[CMS] User created via RPC:', userId);
                    } else {
                        throw rpcErr || new Error('RPC returned empty');
                    }
                } catch (rpcErr) {
                    console.warn('[CMS] RPC admin_create_user not available, trying signUp fallback:', rpcErr);

                    // Fallback: Use client-side auth.signUp
                    try {
                        const { data: signUpData, error: signUpErr } = await this.db.auth.signUp({
                            email: email,
                            password: password,
                            options: {
                                data: { full_name: leadName }
                            }
                        });

                        if (signUpErr) throw signUpErr;

                        userId = signUpData?.user?.id;
                        if (!userId) throw new Error('User ID not returned from signUp');

                        console.log('[CMS] User created via signUp:', userId);
                    } catch (signUpErr) {
                        console.error('[CMS] signUp failed:', signUpErr);
                        alert(`❌ Не удалось создать аккаунт:\n${signUpErr.message}\n\nВозможно, email уже зарегистрирован.`);
                        return;
                    }
                }

                // 4. Create resident profile
                try {
                    const { data: resident, error: resErr } = await this.db
                        .from('residents')
                        .insert({
                            user_id: userId,
                            full_name: leadName,
                            role: 'Resident',
                            bio: lead.message || '',
                            links: {
                                telegram: (lead.contact || '').replace('@', ''),
                                visibility: 'public'
                            }
                        })
                        .select()
                        .single();

                    if (resErr) {
                        console.error('[CMS] Resident profile creation error:', resErr);
                        // Continue anyway — user account is already created
                    } else {
                        console.log('[CMS] Resident profile created:', resident?.id);

                        // 5. Grant 300 ASTRA
                        if (resident?.id) {
                            try {
                                await this.db.from('astra_balances').upsert({
                                    resident_id: resident.id,
                                    balance: 300,
                                    last_updated: new Date().toISOString()
                                }, { onConflict: 'resident_id' });

                                await this.db.from('astra_transactions').insert({
                                    to_id: resident.id,
                                    from_id: null,
                                    amount: 300,
                                    type: 'welcome_bonus',
                                    reason: 'Приветственный бонус нового резидента'
                                });

                                console.log('[CMS] Granted 300 ASTRA to', leadName);
                            } catch (astraErr) {
                                console.error('[CMS] ASTRA grant error:', astraErr);
                            }
                        }
                    }
                } catch (profileErr) {
                    console.error('[CMS] Profile creation error:', profileErr);
                }

                // 6. Send welcome email via RPC
                try {
                    await this.db.rpc('send_welcome_email', {
                        p_email: email,
                        p_name: leadName,
                        p_password: password
                    });
                    console.log('[CMS] Welcome email sent to', email);
                } catch (emailErr) {
                    console.warn('[CMS] Welcome email RPC not available:', emailErr);
                    // Show password to admin as fallback
                    alert(`📧 Email не отправлен (RPC send_welcome_email не настроен).\n\n⚠️ ПЕРЕДАЙТЕ ДАННЫЕ ВРУЧНУЮ:\n\nEmail: ${email}\nПароль: ${password}\nАккаунт: https://www.a-lab.tech/residents/login.html\n\nРезидент должен сменить пароль после входа.`);
                }

                // 7. Update lead status
                await this.db.from('leads').update({ status: 'approved' }).eq('id', leadId);

                // 8. Refresh UI
                await this.loadLeads();
                await this.loadDashboardStats();
                await this.loadResidents();

                alert(`✅ Заявка одобрена!\n\n${leadName} теперь резидент A-LAB.\n• Аккаунт: ${email}\n• Начислено: 300 ASTRA\n• Пароль: ${password}`);

            } catch (err) {
                console.error('[CMS] Approve lead error:', err);
                alert('❌ Ошибка одобрения: ' + err.message);
            }
        },

        /* =========================================================
         * REJECT LEAD
         * ========================================================= */
        async rejectLead(leadId) {
            if (!confirm('❌ ОТКЛОНИТЬ ЗАЯВКУ?\n\nЛид будет отмечен как отклонённый.')) return;

            try {
                const { error } = await this.db
                    .from('leads')
                    .update({ status: 'rejected' })
                    .eq('id', leadId);

                if (error) throw error;

                await this.loadLeads();
                await this.loadDashboardStats();

            } catch (err) {
                console.error('[CMS] Reject lead error:', err);
                alert('Error: ' + err.message);
            }
        },

        /* =========================================================
         * GENERATE RANDOM PASSWORD
         * ========================================================= */
        _generatePassword(length = 12) {
            const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
            const lower = 'abcdefghjkmnpqrstuvwxyz';
            const digits = '23456789';
            const special = '!@#$%&*';
            const all = upper + lower + digits + special;

            // Ensure at least one of each type
            let pwd = '';
            pwd += upper[Math.floor(Math.random() * upper.length)];
            pwd += lower[Math.floor(Math.random() * lower.length)];
            pwd += digits[Math.floor(Math.random() * digits.length)];
            pwd += special[Math.floor(Math.random() * special.length)];

            for (let i = pwd.length; i < length; i++) {
                pwd += all[Math.floor(Math.random() * all.length)];
            }

            // Shuffle
            return pwd.split('').sort(() => Math.random() - 0.5).join('');
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
    window.filterProjects = (f) => CMS.loadProjects(f);

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

    // ─── OPEN GRANT FORM (Modal with resident selector) ──
    window.openGrantForm = function() {
        const residents = CMS._astraResidents || [];
        const options = residents.map(r =>
            `<option value="${r.id}">${r.full_name} (${r.role || 'Resident'})</option>`
        ).join('');

        openModal(`
            <h2 style="margin-bottom:20px;font-size:1.1rem;">💎 Начислить ASTRA Токены</h2>
            <div class="form-group" style="margin-bottom:16px;">
                <label style="display:block;font-size:0.7rem;font-family:var(--font-code);color:var(--tech-blue);margin-bottom:6px;">ПОЛУЧАТЕЛЬ</label>
                <select id="grantRecipient" class="form-input" style="width:100%;">
                    <option value="">— Выберите резидента —</option>
                    ${options}
                </select>
            </div>
            <div class="form-group" style="margin-bottom:16px;">
                <label style="display:block;font-size:0.7rem;font-family:var(--font-code);color:var(--tech-blue);margin-bottom:6px;">СУММА (ASTRA)</label>
                <input type="number" id="grantAmount" class="form-input" style="width:100%;" min="1" placeholder="100">
            </div>
            <div class="form-group" style="margin-bottom:20px;">
                <label style="display:block;font-size:0.7rem;font-family:var(--font-code);color:var(--tech-blue);margin-bottom:6px;">КОММЕНТАРИЙ</label>
                <input type="text" id="grantNote" class="form-input" style="width:100%;" placeholder="За вклад в проект, награда...">
            </div>
            <div class="modal-footer" style="display:flex;gap:12px;">
                <button class="btn btn-secondary hover-trigger" onclick="closeModal()">ОТМЕНА</button>
                <button class="btn btn-primary hover-trigger" onclick="submitGrant()" style="background:var(--tech-blue);color:var(--bg);">💎 НАЧИСЛИТЬ</button>
            </div>
        `);
    };

    window.submitGrant = async function() {
        const recipientId = document.getElementById('grantRecipient')?.value;
        const amount = document.getElementById('grantAmount')?.value;
        const note = document.getElementById('grantNote')?.value || '';

        if (!recipientId) return alert('Выберите получателя');
        if (!amount || parseFloat(amount) <= 0) return alert('Укажите сумму');

        const result = await CMS.grantAstraTokens(recipientId, amount, note);
        if (result.success) {
            closeModal();
            alert(`✅ Начислено ${amount} ASTRA`);
            await CMS.loadAstra();
        } else {
            alert('❌ Ошибка: ' + (result.error || 'Неизвестная'));
        }
    };

    // ─── SEARCH ASTRA CARDS ──────────────────────────
    window.searchAstra = function(q) {
        const cards = document.querySelectorAll('.astra-resident-card');
        const query = (q || '').toLowerCase();
        cards.forEach(card => {
            const name = card.getAttribute('data-name') || '';
            card.style.display = name.includes(query) || !query ? '' : 'none';
        });
    };

    // ─── PROJECT FORM (Create / Edit) ───────────────
    function _buildProjectFormHTML(p) {
        const isEdit = !!p;
        const d = p || { title: '', description: '', category: 'design', lang: 'ru', result_value: '', result_label: '', image_url: '', link_url: '', order_index: 1 };
        const imgSrc = d.image_url
            ? (d.image_url.startsWith('http') ? d.image_url : 'assets/img/' + d.image_url)
            : '';

        return `
            <h2 style="margin-bottom:20px;font-size:1.1rem;">${isEdit ? '✏️ Редактировать проект' : '🗂️ Новый проект'}</h2>
            
            <!-- Image preview & upload -->
            <div style="margin-bottom:20px;">
                <label class="form-label">ПРЕВЬЮ ИЗОБРАЖЕНИЯ</label>
                <div style="display:flex;gap:15px;align-items:flex-start;">
                    <div id="projectImgPreview" style="width:160px;height:100px;border-radius:10px;border:2px dashed var(--border);overflow:hidden;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.3);flex-shrink:0;">
                        ${imgSrc ? `<img src="${imgSrc}" style="width:100%;height:100%;object-fit:cover;" onerror="this.parentElement.innerHTML='NO IMG'">` : '<span style="color:#444;font-size:0.7rem;">NO IMAGE</span>'}
                    </div>
                    <div style="flex:1;">
                        <div style="margin-bottom:8px;">
                            <label class="form-label" style="margin-bottom:4px;">ЗАГРУЗИТЬ ФАЙЛ</label>
                            <input type="file" id="projectImageFile" accept="image/png,image/jpeg,image/webp" 
                                style="font-size:0.75rem;color:var(--text-dim);" onchange="_previewProjectImage(this)">
                        </div>
                        <div>
                            <label class="form-label" style="margin-bottom:4px;">ИЛИ URL ИЗОБРАЖЕНИЯ</label>
                            <input type="text" id="projectImageUrl" class="form-input" style="width:100%;font-size:0.8rem;" 
                                value="${CMS._esc(d.image_url || '')}" placeholder="https://... или design_case_name.png">
                        </div>
                    </div>
                </div>
            </div>

            <div class="form-row" style="display:grid;grid-template-columns:1fr 1fr;gap:15px;margin-bottom:15px;">
                <div class="form-group" style="margin-bottom:0;">
                    <label class="form-label">НАЗВАНИЕ</label>
                    <input type="text" id="projectTitle" class="form-input" value="${CMS._esc(d.title)}" placeholder="Nebula Digital Bank">
                </div>
                <div class="form-group" style="margin-bottom:0;">
                    <label class="form-label">КАТЕГОРИЯ</label>
                    <select id="projectCategory" class="form-input">
                        <option value="design" ${d.category === 'design' ? 'selected' : ''}>DESIGN</option>
                        <option value="marketing" ${d.category === 'marketing' ? 'selected' : ''}>MARKETING</option>
                        <option value="rd" ${d.category === 'rd' ? 'selected' : ''}>R&D</option>
                        <option value="digital" ${d.category === 'digital' ? 'selected' : ''}>DIGITAL</option>
                    </select>
                </div>
            </div>

            <div class="form-group" style="margin-bottom:15px;">
                <label class="form-label">ОПИСАНИЕ</label>
                <textarea id="projectDesc" class="form-input" rows="3" style="resize:vertical;min-height:60px;">${CMS._esc(d.description || '')}</textarea>
            </div>

            <div class="form-row" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:15px;margin-bottom:15px;">
                <div class="form-group" style="margin-bottom:0;">
                    <label class="form-label">RESULT VALUE</label>
                    <input type="text" id="projectResultVal" class="form-input" value="${CMS._esc(d.result_value || '')}" placeholder="BRANDING">
                </div>
                <div class="form-group" style="margin-bottom:0;">
                    <label class="form-label">RESULT LABEL</label>
                    <input type="text" id="projectResultLabel" class="form-input" value="${CMS._esc(d.result_label || '')}" placeholder="CRYPTO">
                </div>
                <div class="form-group" style="margin-bottom:0;">
                    <label class="form-label">ЯЗЫК</label>
                    <select id="projectLang" class="form-input">
                        <option value="ru" ${d.lang === 'ru' ? 'selected' : ''}>RU</option>
                        <option value="en" ${d.lang === 'en' ? 'selected' : ''}>EN</option>
                    </select>
                </div>
            </div>

            <div class="form-row" style="display:grid;grid-template-columns:1fr 1fr;gap:15px;margin-bottom:20px;">
                <div class="form-group" style="margin-bottom:0;">
                    <label class="form-label">ССЫЛКА (URL)</label>
                    <input type="text" id="projectLinkUrl" class="form-input" value="${CMS._esc(d.link_url || '')}" placeholder="project_page.html или #">
                </div>
                <div class="form-group" style="margin-bottom:0;">
                    <label class="form-label">ПОРЯДОК</label>
                    <input type="number" id="projectOrder" class="form-input" value="${d.order_index || 1}" min="0">
                </div>
            </div>

            <div class="modal-footer" style="display:flex;gap:12px;justify-content:flex-end;">
                <button class="btn btn-secondary hover-trigger" onclick="closeModal()">ОТМЕНА</button>
                <button class="btn btn-primary hover-trigger" onclick="_submitProjectForm('${isEdit ? p.id : ''}')">
                    ${isEdit ? '💾 СОХРАНИТЬ' : '➕ СОЗДАТЬ'}
                </button>
            </div>
        `;
    }

    window._previewProjectImage = function(input) {
        if (input.files && input.files[0]) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const preview = document.getElementById('projectImgPreview');
                if (preview) preview.innerHTML = `<img src="${e.target.result}" style="width:100%;height:100%;object-fit:cover;">`;
            };
            reader.readAsDataURL(input.files[0]);
        }
    };

    window._submitProjectForm = async function(existingId) {
        const formData = {
            title: document.getElementById('projectTitle')?.value || '',
            description: document.getElementById('projectDesc')?.value || '',
            category: document.getElementById('projectCategory')?.value || 'design',
            lang: document.getElementById('projectLang')?.value || 'ru',
            result_value: document.getElementById('projectResultVal')?.value || '',
            result_label: document.getElementById('projectResultLabel')?.value || '',
            image_url: document.getElementById('projectImageUrl')?.value || '',
            link_url: document.getElementById('projectLinkUrl')?.value || '',
            order_index: document.getElementById('projectOrder')?.value || 1
        };

        if (!formData.title) return alert('Укажите название проекта');

        await CMS.saveProject(formData, existingId || null);
    };

    window.openProjectForm = function() {
        openModal(_buildProjectFormHTML(null));
    };

    window._openProjectFormWithData = function(proj) {
        openModal(_buildProjectFormHTML(proj));
    };

    // Placeholder stubs for features in development
    // ─── MENU FORM (Create / Edit) ───────────────────
    function _buildMenuFormHTML(m) {
        const isEdit = !!m;
        const d = m || { label_ru: '', label_en: '', url: '', code: '', desc_ru: '', desc_en: '', order_index: 0, is_visible: true, requires_auth: false };

        return `
            <h2 style="margin-bottom:20px;font-size:1.1rem;">${isEdit ? '✏️ Редактировать пункт меню' : '🔗 Новый пункт меню'}</h2>
            
            <div class="form-row" style="display:grid;grid-template-columns:1fr 1fr;gap:15px;margin-bottom:15px;">
                <div class="form-group" style="margin-bottom:0;">
                    <label class="form-label">НАЗВАНИЕ (RU)</label>
                    <input type="text" id="menuLabelRu" class="form-input" value="${CMS._esc(d.label_ru)}" placeholder="Главная">
                </div>
                <div class="form-group" style="margin-bottom:0;">
                    <label class="form-label">НАЗВАНИЕ (EN)</label>
                    <input type="text" id="menuLabelEn" class="form-input" value="${CMS._esc(d.label_en || '')}" placeholder="Home">
                </div>
            </div>

            <div class="form-row" style="display:grid;grid-template-columns:2fr 1fr;gap:15px;margin-bottom:15px;">
                <div class="form-group" style="margin-bottom:0;">
                    <label class="form-label">URL СТРАНИЦЫ</label>
                    <input type="text" id="menuUrl" class="form-input" value="${CMS._esc(d.url || '')}" placeholder="index.html или https://...">
                </div>
                <div class="form-group" style="margin-bottom:0;">
                    <label class="form-label">КОД (системный)</label>
                    <input type="text" id="menuCode" class="form-input" value="${CMS._esc(d.code || '')}" placeholder="CORE_HUB" style="text-transform:uppercase;">
                </div>
            </div>

            <div class="form-row" style="display:grid;grid-template-columns:1fr 1fr;gap:15px;margin-bottom:15px;">
                <div class="form-group" style="margin-bottom:0;">
                    <label class="form-label">ОПИСАНИЕ (RU)</label>
                    <input type="text" id="menuDescRu" class="form-input" value="${CMS._esc(d.desc_ru || '')}" placeholder="Краткое описание для превью">
                </div>
                <div class="form-group" style="margin-bottom:0;">
                    <label class="form-label">ОПИСАНИЕ (EN)</label>
                    <input type="text" id="menuDescEn" class="form-input" value="${CMS._esc(d.desc_en || '')}" placeholder="Short description for preview">
                </div>
            </div>

            <div class="form-row" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:15px;margin-bottom:20px;">
                <div class="form-group" style="margin-bottom:0;">
                    <label class="form-label">ПОРЯДОК</label>
                    <input type="number" id="menuOrder" class="form-input" value="${d.order_index || 0}" min="0">
                </div>
                <div class="form-group" style="margin-bottom:0;display:flex;align-items:center;gap:10px;padding-top:22px;">
                    <input type="checkbox" id="menuVisible" ${d.is_visible !== false ? 'checked' : ''} style="width:18px;height:18px;accent-color:var(--tech-blue);">
                    <label for="menuVisible" style="font-family:var(--font-code);font-size:0.75rem;color:var(--text-dim);">ВИДИМОСТЬ</label>
                </div>
                <div class="form-group" style="margin-bottom:0;display:flex;align-items:center;gap:10px;padding-top:22px;">
                    <input type="checkbox" id="menuAuth" ${d.requires_auth ? 'checked' : ''} style="width:18px;height:18px;accent-color:var(--accent);">
                    <label for="menuAuth" style="font-family:var(--font-code);font-size:0.75rem;color:var(--text-dim);">ТОЛЬКО РЕЗИДЕНТЫ</label>
                </div>
            </div>

            <div class="modal-footer" style="display:flex;gap:12px;justify-content:flex-end;">
                <button class="btn btn-secondary hover-trigger" onclick="closeModal()">ОТМЕНА</button>
                <button class="btn btn-primary hover-trigger" onclick="_submitMenuForm('${isEdit ? m.id : ''}')">
                    ${isEdit ? '💾 СОХРАНИТЬ' : '➕ ДОБАВИТЬ'}
                </button>
            </div>
        `;
    }

    window._submitMenuForm = async function(existingId) {
        const formData = {
            label_ru: document.getElementById('menuLabelRu')?.value || '',
            label_en: document.getElementById('menuLabelEn')?.value || '',
            url: document.getElementById('menuUrl')?.value || '',
            code: document.getElementById('menuCode')?.value?.toUpperCase() || '',
            desc_ru: document.getElementById('menuDescRu')?.value || '',
            desc_en: document.getElementById('menuDescEn')?.value || '',
            order_index: document.getElementById('menuOrder')?.value || 0,
            is_visible: document.getElementById('menuVisible')?.checked ?? true,
            requires_auth: document.getElementById('menuAuth')?.checked || false
        };
        if (!formData.label_ru) return alert('Укажите название (RU)');
        if (!formData.url) return alert('Укажите URL страницы');
        await CMS.saveMenuItem(formData, existingId || null);
    };

    window.openMenuForm = function() {
        openModal(_buildMenuFormHTML(null));
    };

    window._openMenuFormWithData = function(item) {
        openModal(_buildMenuFormHTML(item));
    };

    // Placeholder stubs for features in development
    window.openBlockForm = window.openBlockForm || function() { alert('Функция в разработке'); };
    window.publishDaoVote = window.publishDaoVote || function() { alert('Функция в разработке'); };
    window.filterAdminChats = window.filterAdminChats || function(q) { /* placeholder */ };
    window.adminSendMsg = window.adminSendMsg || function() { alert('Функция в разработке'); };
    window.adminMsgKeyDown = window.adminMsgKeyDown || function(e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); adminSendMsg(); } };
    window.sendResidentNotify = window.sendResidentNotify || function(type) { alert('Функция в разработке'); };

    // Init on DOM ready
    document.addEventListener('DOMContentLoaded', () => CMS.init());

})();
