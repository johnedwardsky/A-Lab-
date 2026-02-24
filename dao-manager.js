/**
 * A-LAB.TECH: DAO GOVERNANCE MANAGER
 * ========================================
 * Handles real-time loading of proposals, 
 * weighted voting via Astra tokens, and 
 * creation of new initiatives.
 */

const DaoManager = (() => {
    let currentResidentId = null;
    let proposalsData = [];

    /**
     * Initialize with resident context
     */
    function init(residentId) {
        currentResidentId = residentId;
        console.log('[DAO] Initialized for resident:', residentId);

        // Listen for tab activation to refresh data
        window.addEventListener('alab:tab-changed', (e) => {
            if (e.detail.tab === 'astra') {
                loadProposals();
            }
        });

        // Initial load if tab is active
        const tab = document.getElementById('astra-tab');
        if (tab && tab.classList.contains('active')) {
            loadProposals();
        }
    }

    /**
     * Fetch proposals and stats from Supabase
     */
    async function loadProposals() {
        const container = document.getElementById('daoProposalsList');
        if (!container) return;

        try {
            if (typeof SupabaseClient !== 'undefined' && SupabaseClient.isConfigured()) {
                const sb = SupabaseClient.getClient();

                // Fetch proposals with their stats
                const { data, error } = await sb
                    .from('dao_proposals')
                    .select('*, stats:dao_proposal_stats(*)')
                    .order('created_at', { ascending: false });

                if (error) throw error;
                proposalsData = data || [];
                renderProposals(container);
            } else {
                throw new Error('Supabase not configured');
            }
        } catch (e) {
            console.warn('[DAO] Load failed:', e);
            renderMockProposals(container);
        }
    }

    /**
     * Render the list of proposals
     */
    function renderProposals(container) {
        if (proposalsData.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; color: #555; font-size: 0.8rem; padding: 20px;">
                    Нет активных предложений.
                </div>
            `;
            return;
        }

        const weight = typeof AstraManager !== 'undefined' ? AstraManager.getBalance() : 0;

        container.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; padding: 10px; background: rgba(0, 229, 255, 0.05); border: 1px dashed rgba(0, 229, 255, 0.2); border-radius: 8px;">
                <div style="font-size: 0.7rem; color: #888;">YOUR_VOTING_POWER:</div>
                <div style="font-family: var(--font-code); font-weight: 800; color: var(--tech-blue);">${formatWeight(weight)} ASTR</div>
            </div>
        ` + proposalsData.map(p => {
            const stats = p.stats?.[0] || { votes_for: 0, votes_against: 0 };
            const vFor = parseFloat(stats.votes_for);
            const vAgainst = parseFloat(stats.votes_against);
            const total = vFor + vAgainst;
            const percentFor = total > 0 ? Math.round((vFor / total) * 100) : 50;
            const daysLeft = Math.ceil((new Date(p.ends_at) - new Date()) / (1000 * 60 * 60 * 24));

            return `
                <div style="padding: 20px; background: rgba(0,0,0,0.25); border: 1px solid var(--border); border-radius: 12px; position: relative; overflow: hidden;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                        <div style="font-family: var(--font-code); font-size: 0.85rem; font-weight: 700; color: var(--tech-blue);">${p.title}</div>
                        <div style="font-family: var(--font-code); font-size: 0.6rem; color: #555;">#${p.id.substring(0, 6)}</div>
                    </div>
                    
                    <div style="font-size: 0.75rem; color: #bbb; line-height: 1.5; margin-bottom: 20px;">${p.description}</div>
                    
                    <div style="margin-bottom: 20px;">
                        <div style="display: flex; justify-content: space-between; font-size: 0.65rem; color: #888; margin-bottom: 6px;">
                            <span>YES: ${formatWeight(vFor)}</span>
                            <span>NO: ${formatWeight(vAgainst)}</span>
                        </div>
                        <div style="height: 6px; background: #111; border-radius: 3px; overflow: hidden; display: flex; border: 1px solid rgba(255,255,255,0.05);">
                            <div style="width: ${percentFor}%; background: #00FF41; height: 100%; box-shadow: 0 0 10px rgba(0,255,65,0.3);"></div>
                            <div style="width: ${100 - percentFor}%; background: var(--accent); height: 100%;"></div>
                        </div>
                    </div>

                    <div style="display: flex; align-items: center; justify-content: space-between;">
                        <div style="display: flex; gap: 10px; flex: 1;">
                            <button class="spec-item hover-trigger" onclick="DaoManager.vote('${p.id}', true)" 
                                    style="flex: 1; padding: 10px; border-radius: 6px; justify-content: center; font-size: 0.7rem; font-weight: 800; background: rgba(0,255,65,0.1); border-color: rgba(0,255,65,0.3); color: #00FF41;">
                                VOTE_YES
                            </button>
                            <button class="spec-item hover-trigger" onclick="DaoManager.vote('${p.id}', false)" 
                                    style="flex: 1; padding: 10px; border-radius: 6px; border-color: rgba(255,42,42,0.3); color: var(--accent); background: rgba(255,42,42,0.1); justify-content: center; font-size: 0.7rem; font-weight: 800;">
                                VOTE_NO
                            </button>
                        </div>
                        <div style="margin-left: 15px; text-align: right;">
                            <div style="font-size: 0.6rem; color: #555; text-transform: uppercase;">Time Left</div>
                            <div style="font-family: var(--font-code); font-size: 0.75rem; color: ${daysLeft > 0 ? '#888' : 'var(--accent)'};">${daysLeft > 0 ? daysLeft + 'd' : 'EXPIRED'}</div>
                        </div>
                    </div>
                </div>
            `;
        }).join('') + `
            <button class="btn-pulse hover-trigger" onclick="DaoManager.showProposalModal()" style="margin-top: 10px; background: transparent; border: 1px dashed var(--tech-blue); color: var(--tech-blue);">
                + CREATE NEW PROPOSAL
            </button>
        `;
    }

    /**
     * Submit a vote
     */
    async function vote(proposalId, support) {
        if (!currentResidentId) {
            if (typeof ALABToast !== 'undefined') ALABToast.error('Требуется авторизация');
            return;
        }

        try {
            if (typeof ALABToast !== 'undefined') ALABToast.info('Шифрование голоса...');

            const sb = SupabaseClient.getClient();
            const { error } = await sb.rpc('submit_dao_vote', {
                p_proposal_id: proposalId,
                p_support: support
            });

            if (error) throw error;

            if (typeof ALABToast !== 'undefined') ALABToast.success('Голос учтен в DAO!');
            loadProposals(); // Refresh UI

        } catch (e) {
            console.error('[DAO] Voting failed:', e);
            if (typeof ALABToast !== 'undefined') {
                const msg = e.message.includes('Astra tokens') ? 'Для голосования нужны Astra токены' : 'Ошибка: ' + e.message;
                ALABToast.error(msg);
            }
        }
    }

    /**
     * UI: Show modal to create proposal
     */
    function showProposalModal() {
        // We can use a simple alert/prompt for now or a custom modal
        // For premium feel, let's inject a quick overlay
        const overlay = document.createElement('div');
        overlay.id = 'daoProposalOverlay';
        overlay.style = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.9); z-index:10000; display:flex; align-items:center; justify-content:center; backdrop-filter:blur(10px);';

        overlay.innerHTML = `
            <div class="section-card" style="width: 500px; max-width: 90vw; background: var(--surface); border: 2px solid var(--tech-blue); position: relative;">
                <span style="position:absolute; top:20px; right:20px; cursor:none; color: #555;" onclick="document.body.removeChild(this.parentElement.parentElement)" class="hover-trigger">&times; CLOSE</span>
                <div class="section-title">NEW GOVERNANCE PROPOSAL</div>
                <div class="form-group">
                    <label class="form-label">Заголовок</label>
                    <input type="text" id="newPropTitle" class="form-input" placeholder="Коротко и ясно...">
                </div>
                <div class="form-group">
                    <label class="form-label">Описание</label>
                    <textarea id="newPropDesc" class="form-textarea" placeholder="Детальное объяснение идеи..."></textarea>
                </div>
                <div style="font-size: 0.6rem; color: #555; margin-bottom: 15px;">Создание предложения стоит 100 Astra (будут заблокированы до конца голосования).</div>
                <button class="btn-pulse hover-trigger" onclick="DaoManager.submitProposal()">SUBMIT TO DAO</button>
            </div>
        `;
        document.body.appendChild(overlay);
        if (typeof bindHover === 'function') bindHover();
    }

    async function submitProposal() {
        const title = document.getElementById('newPropTitle').value.trim();
        const desc = document.getElementById('newPropDesc').value.trim();

        if (!title || !desc) {
            if (typeof ALABToast !== 'undefined') ALABToast.error('Заполните все поля');
            return;
        }

        try {
            const sb = SupabaseClient.getClient();
            const { error } = await sb
                .from('dao_proposals')
                .insert({
                    creator_id: currentResidentId,
                    title: title,
                    description: desc
                });

            if (error) throw error;

            if (typeof ALABToast !== 'undefined') ALABToast.success('Предложение опубликовано!');
            document.body.removeChild(document.getElementById('daoProposalOverlay'));
            loadProposals();

        } catch (e) {
            console.error('[DAO] Creation failed:', e);
            if (typeof ALABToast !== 'undefined') ALABToast.error('Ошибка: ' + e.message);
        }
    }

    function formatWeight(n) {
        if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
        if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
        return n.toFixed(0);
    }

    function renderMockProposals(container) {
        container.innerHTML = `
            <div style="padding: 15px; background: rgba(0,0,0,0.2); border: 1px solid var(--border); border-radius: 12px; opacity: 0.5;">
                <div style="font-family: var(--font-code); font-size: 0.85rem; color: var(--tech-blue);">OFFLINE_PROPOSAL</div>
                <div style="font-size: 0.7rem; color: #888; margin: 10px 0;">Подключение к блокчейн-узлу A-LAB прервано. Повтор через 5с...</div>
            </div>
        `;
    }

    return { init, loadProposals, vote, showProposalModal, submitProposal };
})();

// Note: Initialization is handled in resident-workspace-ru.html via initManagers()
