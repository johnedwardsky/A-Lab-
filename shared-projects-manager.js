/**
 * A-LAB.TECH — Shared Projects Manager
 * ========================================
 * CRUD for shared projects between residents.
 * Tracks team members, Astra contributions, and share percentages.
 */

const ProjectsManager = (() => {
    let currentResidentId = null;

    /**
     * Initialize
     */
    function init(residentId) {
        currentResidentId = residentId;

        setupUI();

        window.addEventListener('alab:tab-changed', (e) => {
            if (e.detail.tab === 'projects') {
                loadProjects();
            }
        });

        // If tab is already active, load data now
        const tab = document.getElementById('projects-tab');
        if (tab && tab.classList.contains('active')) {
            loadProjects();
        }
    }

    /**
     * Setup projects tab UI
     */
    function setupUI() {
        const tab = document.getElementById('projects-tab');
        if (!tab) return;

        tab.innerHTML = `
            <div class="left-col">
                <section class="section-card">
                    <div class="section-title" data-i18n="projects.title">Совместные проекты</div>
                    <div id="projectsList" style="display: flex; flex-direction: column; gap: 15px;">
                        <div style="text-align: center; color: #555; font-size: 0.8rem; padding: 20px;">
                            ${typeof t === 'function' ? t('common.loading') : 'Загрузка...'}
                        </div>
                    </div>
                </section>
            </div>

            <div class="right-panel">
                <section class="section-card">
                    <div class="section-title" data-i18n="projects.create">Создать проект</div>
                    <div class="form-group">
                        <label class="form-label" data-i18n="projects.name">Название проекта</label>
                        <input type="text" class="form-input" id="projectName" placeholder="Название..." data-i18n-placeholder="projects.name">
                    </div>
                    <div class="form-group">
                        <label class="form-label" data-i18n="projects.description">Описание</label>
                        <textarea class="form-textarea" id="projectDescription" placeholder="Описание проекта..." data-i18n-placeholder="projects.description"></textarea>
                    </div>
                    <div class="form-group">
                        <label class="form-label" data-i18n="projects.budget">Бюджет (Astra Tokens)</label>
                        <input type="number" class="form-input" id="projectBudget" placeholder="1000" min="0">
                        <p style="font-size: 0.6rem; color: #555; margin-top: 4px;">Сумма, необходимая для реализации проекта</p>
                    </div>
                    <button class="btn-pulse hover-trigger" onclick="ProjectsManager.createProject()" data-i18n="projects.create">
                        Создать проект
                    </button>
                </section>

                <section class="section-card" id="projectDetailPanel" style="display: none;">
                    <div class="section-title">Детали проекта</div>
                    <div id="projectDetailContent"></div>
                </section>
            </div>
        `;
    }

    /**
     * Load all projects
     */
    async function loadProjects() {
        const container = document.getElementById('projectsList');
        if (!container) return;

        try {
            if (typeof SupabaseClient !== 'undefined' && SupabaseClient.isConfigured()) {
                const sb = SupabaseClient.getClient();
                const { data, error } = await sb
                    .from('shared_projects')
                    .select('*, project_members(*, resident:residents(display_name)), creator:residents!shared_projects_created_by_fkey(display_name)')
                    .order('created_at', { ascending: false });

                if (!error && data) {
                    renderProjects(container, data);
                    return;
                }
            }
        } catch (e) {
            console.warn('[Projects] Load failed:', e);
        }

        // Mock
        renderProjects(container, [
            {
                id: 'mock-1',
                title: 'Проект Alpha',
                description: 'Разработка AI-модуля для аналитики',
                status: 'active',
                total_astra: 1500,
                creator: { display_name: 'Maya Neural' },
                project_members: [
                    { resident: { display_name: 'Maya Neural' }, astra_contributed: 800, role: 'lead' },
                    { resident: { display_name: 'Alex River' }, astra_contributed: 700, role: 'member' }
                ],
                created_at: new Date().toISOString()
            }
        ]);
    }

    /**
     * Render projects list
     */
    function renderProjects(container, projects) {
        if (projects.length === 0) {
            container.innerHTML = '<div style="text-align: center; color: #555; font-size: 0.8rem; padding: 30px;">Нет проектов</div>';
            return;
        }

        container.innerHTML = projects.map(project => {
            const statusColors = { 'active': '#00FF41', 'completed': 'var(--tech-blue)', 'paused': '#FFB800' };
            const statusLabels = { 'active': 'Активный', 'completed': 'Завершён', 'paused': 'Приостановлен' };
            const memberCount = project.project_members?.length || 0;

            // Calculate progress bar
            const target = project.target_budget || 0;
            const collected = project.total_astra || 0;
            const progressWidth = target > 0 ? Math.min(100, (collected / target) * 100) : 0;

            return `
                <div style="background: rgba(0,0,0,0.1); border: 1px solid var(--border); border-radius: 15px; padding: 20px; cursor: pointer;"
                     class="hover-trigger" onclick="ProjectsManager.showDetail('${project.id}')">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <div style="font-weight: 800; font-size: 1rem;">${project.title}</div>
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <div style="width: 8px; height: 8px; background: ${statusColors[project.status]}; border-radius: 50%; box-shadow: 0 0 8px ${statusColors[project.status]};"></div>
                            <span style="font-family: var(--font-code); font-size: 0.65rem; color: ${statusColors[project.status]};">${statusLabels[project.status] || project.status}</span>
                        </div>
                    </div>
                    ${project.description ? `<p style="font-size: 0.8rem; color: #888; margin-bottom: 12px; line-height: 1.4;">${project.description.substring(0, 120)}${project.description.length > 120 ? '...' : ''}</p>` : ''}
                    
                    <div style="margin-bottom: 12px;">
                        <div style="display: flex; justify-content: space-between; font-family: var(--font-code); font-size: 0.6rem; color: #555; margin-bottom: 5px;">
                            <span>ФИНАНСИРОВАНИЕ</span>
                            <span style="color: var(--tech-blue);">${collected} / ${target || '∞'} ✦</span>
                        </div>
                        <div style="height: 4px; background: rgba(255,255,255,0.05); border-radius: 2px; overflow: hidden;">
                            <div style="height: 100%; width: ${progressWidth}%; background: linear-gradient(90deg, var(--tech-blue), #00FF41); border-radius: 2px; transition: width 0.5s;"></div>
                        </div>
                    </div>

                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div style="display: flex; gap: -5px;">
                            ${(project.project_members || []).slice(0, 4).map((m, i) => `
                                <div style="width: 28px; height: 28px; border-radius: 50%; background: rgba(0,229,255,0.1); border: 2px solid var(--bg, #030407); display: flex; align-items: center; justify-content: center; font-size: 0.6rem; font-weight: 800; color: var(--tech-blue); margin-left: ${i > 0 ? '-8px' : '0'}; position: relative; z-index: ${4 - i};">
                                    ${(m.resident?.display_name || '?').charAt(0)}
                                </div>
                            `).join('')}
                            ${memberCount > 4 ? `<div style="width: 28px; height: 28px; border-radius: 50%; background: rgba(255,255,255,0.05); border: 2px solid var(--bg); display: flex; align-items: center; justify-content: center; font-size: 0.55rem; color: #555; margin-left: -8px;">+${memberCount - 4}</div>` : ''}
                        </div>
                        <div style="font-family: var(--font-code); font-size: 0.6rem; color: #555;">${memberCount} УЧАСТН.</div>
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * Show project detail
     */
    async function showDetail(projectId) {
        const panel = document.getElementById('projectDetailPanel');
        const content = document.getElementById('projectDetailContent');
        if (!panel || !content) return;

        panel.style.display = 'block';

        try {
            if (typeof SupabaseClient !== 'undefined' && SupabaseClient.isConfigured()) {
                const sb = SupabaseClient.getClient();
                const { data, error } = await sb
                    .from('shared_projects')
                    .select('*, project_members(*, resident:residents(display_name, role))')
                    .eq('id', projectId)
                    .single();

                if (!error && data) {
                    renderDetail(content, data);
                    return;
                }
            }
        } catch (e) { /* fallback */ }

        // Mock
        content.innerHTML = '<div style="color: #555; font-size: 0.8rem;">Демо-режим: данные проекта</div>';
    }

    /**
     * Render project detail with member shares
     */
    function renderDetail(container, project) {
        const total = project.total_astra || 1;
        const members = project.project_members || [];

        container.innerHTML = `
            <div style="text-align: center; margin-bottom: 20px;">
                <div style="font-weight: 800; font-size: 1.1rem; margin-bottom: 5px;">${project.title}</div>
                <div style="font-family: var(--font-code); font-size: 0.7rem; color: var(--tech-blue);">${project.total_astra} ✦ ASTRA</div>
            </div>

            <div style="font-family: var(--font-code); font-size: 0.65rem; color: #555; margin-bottom: 10px;">ДОЛИ УЧАСТНИКОВ:</div>
            ${members.map(m => {
            const share = total > 0 ? ((m.astra_contributed / total) * 100).toFixed(1) : 0;
            return `
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                        <div style="flex: 1;">
                            <div style="font-size: 0.8rem; font-weight: 600;">${m.resident?.display_name || '—'}</div>
                            <div style="font-size: 0.6rem; color: #555;">${m.astra_contributed} ✦</div>
                        </div>
                        <div style="width: 80px; text-align: right;">
                            <div style="font-family: var(--font-code); font-size: 0.85rem; font-weight: 800; color: var(--tech-blue);">${share}%</div>
                        </div>
                    </div>
                    <div style="height: 3px; background: rgba(255,255,255,0.03); border-radius: 2px; overflow: hidden; margin-bottom: 12px;">
                        <div style="height: 100%; width: ${share}%; background: var(--tech-blue); border-radius: 2px;"></div>
                    </div>
                `;
        }).join('')}

            <div style="margin-top: 20px;">
                <div class="form-group">
                    <label class="form-label" data-i18n="projects.contribute">Внести Astra</label>
                    <div style="display: flex; gap: 10px;">
                        <input type="number" class="form-input" id="contributeAmount" min="1" placeholder="0" style="flex: 1;">
                        <button class="btn-pulse hover-trigger" onclick="ProjectsManager.contribute('${project.id}')" style="width: auto; padding: 0 20px;">✦</button>
                    </div>
                </div>
            </div>
        `;
    }

    async function createProject() {
        const name = document.getElementById('projectName')?.value?.trim();
        const desc = document.getElementById('projectDescription')?.value?.trim();
        const budget = parseFloat(document.getElementById('projectBudget')?.value) || 0;

        if (!name) {
            if (typeof ALABToast !== 'undefined') ALABToast.error('Укажите название проекта');
            return;
        }

        try {
            if (typeof SupabaseClient !== 'undefined' && SupabaseClient.isConfigured()) {
                const sb = SupabaseClient.getClient();
                const { data: project, error } = await sb
                    .from('shared_projects')
                    .insert({
                        title: name,
                        description: desc,
                        created_by: currentResidentId,
                        target_budget: budget
                    })
                    .select()
                    .single();

                if (error) throw error;

                // Auto-add creator as lead
                await sb.from('project_members').insert({
                    project_id: project.id,
                    resident_id: currentResidentId,
                    role: 'lead'
                });

                if (typeof ALABToast !== 'undefined') ALABToast.success('Проект создан!');
                document.getElementById('projectName').value = '';
                document.getElementById('projectDescription').value = '';
                loadProjects();
                return;
            }
        } catch (e) {
            if (typeof ALABToast !== 'undefined') ALABToast.error('Ошибка: ' + e.message);
            return;
        }

        // Mock
        if (typeof ALABToast !== 'undefined') ALABToast.info('Демо-режим: проект создан');
    }

    /**
     * Contribute Astra to a project
     */
    async function contribute(projectId) {
        const amount = parseFloat(document.getElementById('contributeAmount')?.value);
        if (!amount || amount <= 0) {
            if (typeof ALABToast !== 'undefined') ALABToast.error('Укажите сумму вклада');
            return;
        }

        try {
            if (typeof SupabaseClient !== 'undefined' && SupabaseClient.isConfigured()) {
                const sb = SupabaseClient.getClient();

                // Find or get the project owner to transfer to
                const { data: project } = await sb
                    .from('shared_projects')
                    .select('created_by')
                    .eq('id', projectId)
                    .single();

                if (!project) throw new Error('Проект не найден');

                // Transfer tokens via function
                const { data, error } = await sb.rpc('transfer_astra', {
                    p_from_id: currentResidentId,
                    p_to_id: project.created_by,
                    p_amount: amount,
                    p_note: 'Вклад в проект',
                    p_project_id: projectId
                });

                if (error) throw error;
                if (data && !data.success) throw new Error(data.error);

                if (typeof ALABToast !== 'undefined') ALABToast.success(`Внесено ${amount} Astra в проект`);
                showDetail(projectId);
                return;
            }
        } catch (e) {
            if (typeof ALABToast !== 'undefined') ALABToast.error('Ошибка: ' + e.message);
            return;
        }

        if (typeof ALABToast !== 'undefined') ALABToast.info('Демо-режим: вклад записан');
    }

    return { init, loadProjects, createProject, showDetail, contribute };
})();
