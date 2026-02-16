/**
 * A-LAB.TECH — Astra Token Manager
 * ====================================
 * Manages Astra token balance display, transfers,
 * and transaction history for residents.
 * Admin functions: grant/adjust tokens.
 */

const AstraManager = (() => {
    let currentResidentId = null;
    let balance = 0;
    let isAdmin = false;

    /**
     * Initialize
     */
    function init(residentId, admin = false) {
        currentResidentId = residentId;
        isAdmin = admin;

        // Listen for tab activation
        window.addEventListener('alab:tab-changed', (e) => {
            if (e.detail.tab === 'astra') {
                loadBalance();
                loadTransactions();
                loadMarketStats();
            }
        });

        setupUI();
        updateWeb3UI();

        // If tab is already active, load data now
        const tab = document.getElementById('astra-tab');
        if (tab && tab.classList.contains('active')) {
            loadBalance();
            loadTransactions();
            loadMarketStats();
        }
    }

    /**
     * Setup Astra tab UI
     */
    function setupUI() {
        const tab = document.getElementById('astra-tab');
        if (!tab) return;

        tab.innerHTML = `
            <div class="left-col">
                <section class="section-card" style="text-align: center; padding: 40px;">
                    <div class="section-title" data-i18n="astra.balance">Баланс</div>
                    <div id="astraBalance" style="font-size: 3rem; font-weight: 800; color: var(--tech-blue); font-family: var(--font-code); margin: 20px 0;">
                        <span id="astraBalanceValue">---</span>
                    </div>
                    <div style="font-family: var(--font-code); font-size: 0.7rem; color: #555; text-transform: uppercase;">ASTRA TOKENS</div>
                </section>

                <section class="section-card">
                    <div class="section-title" data-i18n="astra.send">Отправить</div>
                    <div class="form-group">
                        <label class="form-label" data-i18n="astra.send_to">Получатель</label>
                        <input type="text" class="form-input" id="astraSendTo" placeholder="Имя резидента..." data-i18n-placeholder="astra.send_to">
                        <div id="astraRecipientSuggestions" style="display:none; background: var(--surface); border: 1px solid var(--border); border-radius: 8px; margin-top: 5px; max-height: 200px; overflow-y: auto;"></div>
                    </div>
                    <div class="form-group">
                        <label class="form-label" data-i18n="astra.amount">Сумма</label>
                        <input type="number" class="form-input" id="astraSendAmount" min="1" placeholder="0">
                    </div>
                    <div class="form-group">
                        <label class="form-label" data-i18n="astra.note">Комментарий</label>
                        <input type="text" class="form-input" id="astraSendNote" placeholder="За что..." data-i18n-placeholder="astra.note">
                    </div>
                    <button class="btn-pulse hover-trigger" id="astraSendBtn" onclick="AstraManager.sendTokens()" data-i18n="astra.confirm_send">
                        Подтвердить перевод
                    </button>
                </section>

                ${isAdmin ? `
                <section class="section-card">
                    <div class="section-title" data-i18n="admin.grant_tokens">Начислить токены</div>
                    <div class="form-group">
                        <label class="form-label">Резидент</label>
                        <input type="text" class="form-input" id="astraGrantTo" placeholder="Имя резидента...">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Сумма</label>
                        <input type="number" class="form-input" id="astraGrantAmount" min="1" placeholder="0">
                    </div>
                    <button class="btn-pulse hover-trigger" onclick="AstraManager.adminGrant()" style="background: var(--accent);">
                        Начислить (Админ)
                    </button>
                </section>
                ` : ''}
            </div>

            <div class="right-panel">
                <section class="section-card">
                    <div class="section-title">🗳️ Active Proposals</div>
                    <div id="daoProposalsList" style="display: flex; flex-direction: column; gap: 15px;">
                        <!-- Updated via DaoManager -->
                        <div style="font-family: var(--font-code); font-size: 0.7rem; color: #444;">SYNCING_DAO_GOVERNANCE...</div>
                    </div>
                </section>

                <section class="section-card">
                    <div class="section-title" data-i18n="astra.history">История транзакций</div>
                    <div id="astraTransactionsList" style="display: flex; flex-direction: column; gap: 10px;">
                        <div style="text-align: center; color: #555; font-size: 0.8rem; padding: 20px;">
                            ${typeof t === 'function' ? t('common.loading') : 'Загрузка...'}
                        </div>
                    </div>
                </section>

                <section class="section-card" id="astraWeb3Section" style="border: 1px solid rgba(0, 229, 255, 0.2); background: linear-gradient(135deg, rgba(0,229,255,0.05), transparent);">
                    <div class="section-title">
                        <span style="font-size: 1.2rem; margin-right: 10px;">🌐</span> 
                        Web3 Bridge
                    </div>
                    <p style="font-size: 0.75rem; color: #888; margin-bottom: 20px;">Конвертируйте свои Astra токены в ончейн-активы в сети Polygon/Base.</p>
                    
                    <div id="astraWeb3Status" style="margin-bottom: 20px;">
                        <!-- Updated via JS -->
                    </div>

                    <button class="btn-pulse hover-trigger" id="astraClaimBtn" onclick="AstraManager.claimToWallet()" style="width: 100%; opacity: 0.5;" disabled>
                        CLAIM TO WALLET
                    </button>
                </section>
            </div>
        `;

        // Setup recipient search
        const searchInput = document.getElementById('astraSendTo');
        if (searchInput) {
            searchInput.addEventListener('input', debounce(searchRecipients, 300));
        }
    }

    /**
     * Load balance
     */
    async function loadBalance() {
        const el = document.getElementById('astraBalanceValue');
        if (!el) return;

        try {
            if (typeof SupabaseClient !== 'undefined' && SupabaseClient.isConfigured()) {
                const sb = SupabaseClient.getClient();
                const { data, error } = await sb
                    .from('astra_balances')
                    .select('balance')
                    .eq('resident_id', currentResidentId)
                    .single();

                if (!error && data) {
                    balance = data.balance;
                    el.textContent = formatNumber(balance);
                    return;
                }
            }
        } catch (e) {
            console.warn('[Astra] Load failed:', e);
        }

        // Mock mode
        balance = 300;
        el.textContent = '300';
    }

    async function loadTransactions() {
        const container = document.getElementById('astraTransactionsList');
        if (!container) return;

        try {
            if (typeof SupabaseClient !== 'undefined' && SupabaseClient.isConfigured()) {
                const sb = SupabaseClient.getClient();
                const { data, error } = await sb
                    .from('astra_transactions')
                    .select('*, from:residents!astra_transactions_from_id_fkey(display_name), to:residents!astra_transactions_to_id_fkey(display_name)')
                    .or(`from_id.eq.${currentResidentId},to_id.eq.${currentResidentId}`)
                    .order('created_at', { ascending: false })
                    .limit(20);

                if (!error && data) {
                    renderTransactions(container, data);
                    return;
                }
            }
        } catch (e) {
            console.warn('[Astra] Transactions load failed:', e);
        }

        // Mock mode
        renderTransactions(container, [
            { amount: 300, type: 'admin_grant', from: null, to: { display_name: 'You' }, created_at: new Date().toISOString(), note: 'Стартовый баланс' },
        ]);
    }

    /**
     * Load Market Stats (For Admin/Analytics)
     */
    async function loadMarketStats() {
        try {
            if (typeof SupabaseClient !== 'undefined' && SupabaseClient.isConfigured()) {
                const sb = SupabaseClient.getClient();
                const { data, error } = await sb.rpc('get_astra_market_stats');

                if (!error && data) {
                    // Update Admin Panel "Market Health" if present
                    const supplyEl = document.querySelector('[label="Общая Эмиссия (Supply)"] + input');
                    if (supplyEl) supplyEl.value = formatNumber(data.total_supply) + ' ASTR';

                    const volumeEl = document.querySelector('.stats .stat-item:nth-child(2) .stat-value');
                    if (volumeEl) volumeEl.innerText = formatNumber(data.tx_count_24h);

                    // Update health chart or other stats
                }
            }
        } catch (e) {
            console.warn('[Astra] Market stats failed:', e);
        }
    }

    /**
     * Render transaction list
     */
    function renderTransactions(container, transactions) {
        if (transactions.length === 0) {
            container.innerHTML = '<div style="text-align: center; color: #555; font-size: 0.8rem; padding: 20px;">Нет транзакций</div>';
            return;
        }

        container.innerHTML = transactions.map(tx => {
            const isIncoming = tx.to_id === currentResidentId || tx.type === 'admin_grant';
            const sign = isIncoming ? '+' : '-';
            const color = isIncoming ? '#00FF41' : 'var(--accent)';
            const typeLabels = {
                'transfer': '↔ Перевод',
                'project_contribution': '📋 Вклад в проект',
                'admin_grant': '🛡️ Начисление',
                'reward': '⭐ Награда'
            };
            const fromName = tx.from?.display_name || 'Система';
            const toName = tx.to?.display_name || 'Система';
            const date = new Date(tx.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

            return `
                <div style="display: flex; align-items: center; gap: 15px; padding: 12px; background: rgba(0,0,0,0.1); border: 1px solid var(--border); border-radius: 10px;">
                    <div style="flex: 1;">
                        <div style="font-size: 0.75rem; font-weight: 600;">${typeLabels[tx.type] || tx.type}</div>
                        <div style="font-size: 0.65rem; color: #555; margin-top: 3px;">${isIncoming ? 'от ' + fromName : 'для ' + toName}</div>
                        ${tx.note ? `<div style="font-size: 0.6rem; color: #888; margin-top: 2px; font-style: italic;">${tx.note}</div>` : ''}
                    </div>
                    <div style="text-align: right;">
                        <div style="font-family: var(--font-code); font-weight: 800; color: ${color};">${sign}${tx.amount}</div>
                        <div style="font-size: 0.55rem; color: #555; font-family: var(--font-code);">${date}</div>
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * Search recipients
     */
    async function searchRecipients() {
        const input = document.getElementById('astraSendTo');
        const suggestions = document.getElementById('astraRecipientSuggestions');
        if (!input || !suggestions) return;

        const query = input.value.trim();
        if (query.length < 2) {
            suggestions.style.display = 'none';
            return;
        }

        try {
            if (typeof SupabaseClient !== 'undefined' && SupabaseClient.isConfigured()) {
                const sb = SupabaseClient.getClient();
                const { data } = await sb
                    .from('residents')
                    .select('id, display_name, role')
                    .ilike('display_name', `%${query}%`)
                    .neq('id', currentResidentId)
                    .limit(5);

                if (data && data.length > 0) {
                    suggestions.style.display = 'block';
                    suggestions.innerHTML = data.map(r => `
                        <div style="padding: 10px; cursor: pointer; border-bottom: 1px solid var(--border); font-size: 0.85rem;"
                             onclick="AstraManager.selectRecipient('${r.id}', '${r.display_name}')">
                            <strong>${r.display_name}</strong>
                            <span style="color: #555; font-size: 0.7rem; margin-left: 8px;">${r.role || ''}</span>
                        </div>
                    `).join('');
                    return;
                }
            }
        } catch (e) { /* fallback */ }
        suggestions.style.display = 'none';
    }

    let selectedRecipientId = null;

    function selectRecipient(id, name) {
        selectedRecipientId = id;
        document.getElementById('astraSendTo').value = name;
        document.getElementById('astraRecipientSuggestions').style.display = 'none';
    }

    /**
     * Send tokens
     */
    async function sendTokens() {
        const amount = parseFloat(document.getElementById('astraSendAmount')?.value);
        const note = document.getElementById('astraSendNote')?.value || '';

        if (!selectedRecipientId) {
            if (typeof ALABToast !== 'undefined') ALABToast.error('Выберите получателя');
            return;
        }
        if (!amount || amount <= 0) {
            if (typeof ALABToast !== 'undefined') ALABToast.error('Укажите сумму');
            return;
        }
        if (amount > balance) {
            if (typeof ALABToast !== 'undefined') ALABToast.error(typeof t === 'function' ? t('astra.insufficient') : 'Недостаточно токенов');
            return;
        }

        try {
            if (typeof SupabaseClient !== 'undefined' && SupabaseClient.isConfigured()) {
                const sb = SupabaseClient.getClient();
                const { data, error } = await sb.rpc('transfer_astra', {
                    p_from_id: currentResidentId,
                    p_to_id: selectedRecipientId,
                    p_amount: amount,
                    p_note: note
                });

                if (error) throw error;
                if (data && !data.success) throw new Error(data.error);

                if (typeof ALABToast !== 'undefined') ALABToast.success(`Отправлено ${amount} Astra`);
                loadBalance();
                loadTransactions();

                // Reset form
                document.getElementById('astraSendTo').value = '';
                document.getElementById('astraSendAmount').value = '';
                document.getElementById('astraSendNote').value = '';
                selectedRecipientId = null;
                return;
            }
        } catch (e) {
            if (typeof ALABToast !== 'undefined') ALABToast.error('Ошибка: ' + e.message);
            return;
        }

        // Mock
        if (typeof ALABToast !== 'undefined') ALABToast.info('Демо-режим: перевод записан');
    }

    /**
     * Admin: grant tokens
     */
    async function adminGrant() {
        if (!isAdmin) return;
        const recipientName = document.getElementById('astraGrantTo')?.value;
        const amount = parseFloat(document.getElementById('astraGrantAmount')?.value);

        if (!recipientName || !amount || amount <= 0) {
            if (typeof ALABToast !== 'undefined') ALABToast.error('Заполните все поля');
            return;
        }

        try {
            if (typeof SupabaseClient !== 'undefined' && SupabaseClient.isConfigured()) {
                const sb = SupabaseClient.getClient();
                // Find resident
                const { data: residents } = await sb
                    .from('residents')
                    .select('id')
                    .ilike('display_name', `%${recipientName}%`)
                    .limit(1);

                if (!residents || residents.length === 0) {
                    if (typeof ALABToast !== 'undefined') ALABToast.error('Резидент не найден');
                    return;
                }

                const recipientId = residents[0].id;

                // Update balance
                await sb.from('astra_balances')
                    .update({ balance: sb.rpc('', {}), last_updated: new Date().toISOString() })
                    .eq('resident_id', recipientId);

                // Use raw SQL via RPC for atomic increment
                await sb.rpc('transfer_astra', {
                    p_from_id: currentResidentId,
                    p_to_id: recipientId,
                    p_amount: amount,
                    p_note: 'Начисление администратором'
                });

                if (typeof ALABToast !== 'undefined') ALABToast.success(`Начислено ${amount} Astra для ${recipientName}`);
                document.getElementById('astraGrantTo').value = '';
                document.getElementById('astraGrantAmount').value = '';
            }
        } catch (e) {
            if (typeof ALABToast !== 'undefined') ALABToast.error('Ошибка: ' + e.message);
        }
    }

    /**
     * Claim tokens to On-chain wallet
     */
    async function claimToWallet() {
        if (balance <= 0) {
            if (typeof ALABToast !== 'undefined') ALABToast.error('Нечего забирать');
            return;
        }

        const wallet = typeof Web3Manager !== 'undefined' ? Web3Manager.getAccount() : null;
        if (!wallet) {
            if (typeof ALABToast !== 'undefined') ALABToast.info('Сначала подключите кошелек в профиле');
            return;
        }

        try {
            const amountToClaim = balance;
            if (typeof ALABToast !== 'undefined') ALABToast.info(`Инициация минта ${amountToClaim} ASTR...`);

            // Simulating contract interaction through Web3Manager
            // In real scenario: await Web3Manager.claimAstra(amountToClaim);

            const btn = document.getElementById('astraClaimBtn');
            if (btn) {
                btn.disabled = true;
                btn.innerText = 'PROCESSING...';
            }

            // Simulate delay
            await new Promise(r => setTimeout(r, 2000));

            // Log the claim to Supabase
            if (window.ALabCore) {
                window.ALabCore.log('astra_claimed', `Claimed ${amountToClaim} ASTR to ${wallet}`, { wallet, amount: amountToClaim });
            }

            // Update balance in DB via RPC (resetting off-chain balance)
            if (typeof SupabaseClient !== 'undefined' && SupabaseClient.isConfigured()) {
                const sb = SupabaseClient.getClient();
                await sb.rpc('claim_astra_to_wallet', {
                    p_resident_id: currentResidentId,
                    p_wallet: wallet,
                    p_amount: amountToClaim
                });
            }

            if (typeof ALABToast !== 'undefined') ALABToast.success('Токены успешно переведены в On-chain!');
            loadBalance();
            updateWeb3UI();

        } catch (e) {
            console.error('[Astra] Claim failed:', e);
            if (typeof ALABToast !== 'undefined') ALABToast.error('Ошибка клейма: ' + e.message);
        }
    }

    /**
     * Update Web3 Bridge UI based on connection
     */
    function updateWeb3UI() {
        const statusEl = document.getElementById('astraWeb3Status');
        const btn = document.getElementById('astraClaimBtn');
        if (!statusEl || !btn) return;

        const wallet = typeof Web3Manager !== 'undefined' ? Web3Manager.getAccount() : null;

        if (wallet) {
            statusEl.innerHTML = `
                <div style="font-family: var(--font-code); font-size: 0.7rem; color: #00FF41; display: flex; align-items: center; gap: 8px;">
                    <span class="pulse-dot"></span> WALLET_CONNECTED
                </div>
                <div style="font-family: var(--font-code); font-size: 0.6rem; color: #555; margin-top: 5px; word-break: break-all;">
                    ADDR: ${wallet}
                </div>
            `;
            btn.disabled = false;
            btn.style.opacity = '1';
            btn.innerText = 'CLAIM TO WALLET';
        } else {
            statusEl.innerHTML = `
                <div style="font-family: var(--font-code); font-size: 0.7rem; color: var(--accent); display: flex; align-items: center; gap: 8px;">
                    <span style="width: 8px; height: 8px; background: var(--accent); border-radius: 50%;"></span> WALLET_UNBOUND
                </div>
                <div style="font-size: 0.65rem; color: #555; margin-top: 5px;">
                    Подключите кошелек в разделе "Profile" для активации бриджа.
                </div>
            `;
            btn.disabled = true;
            btn.style.opacity = '0.5';
        }
    }

    // Listen for wallet changes
    document.addEventListener('web3:account_changed', updateWeb3UI);

    /**
     * System Reward for social activity
     */
    async function rewardActivity(type, amount, metadata = {}) {
        if (!currentResidentId) return;

        console.log(`[Astra] System reward: ${amount} ASTR for ${type}`);

        try {
            if (typeof SupabaseClient !== 'undefined' && SupabaseClient.isConfigured()) {
                const sb = SupabaseClient.getClient();
                // Atomic increment via RPC
                await sb.rpc('reward_astra_activity', {
                    p_resident_id: currentResidentId,
                    p_amount: amount,
                    p_type: type,
                    p_metadata: metadata
                });
            }

            // Visual feedback
            if (typeof ALABToast !== 'undefined') {
                ALABToast.success(`+${amount} Astra: ${type.toUpperCase().replace('_', ' ')}`);
            }

            // Log locally
            window.ALabCore?.log('astra_reward', `Earned ${amount} ASTR for ${type}`, metadata);

            // Refresh balance if social feed is active
            loadBalance();

        } catch (e) {
            console.warn('[Astra] Reward failed:', e);
        }
    }

    function getBalance() { return balance; }

    return { init, loadBalance, loadTransactions, sendTokens, adminGrant, selectRecipient, claimToWallet, updateWeb3UI, getBalance, rewardActivity };
})();
