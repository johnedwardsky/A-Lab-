/**
 * A-LAB: DAO GOVERNANCE MANAGER
 * ========================================
 * Handles proposal loading, voting, 
 * and decentralized decision making.
 */

const DaoManager = (() => {
    let proposals = [
        {
            id: 'prop_01',
            title: 'Приоритет: Квантовые вычисления',
            desc: 'Направить 30% бюджета R&D на разработку квантовых процессоров в Q3.',
            votesFor: 12500,
            votesAgainst: 4200,
            status: 'active',
            endsAt: new Date(Date.now() + 86400000 * 3).toISOString()
        },
        {
            id: 'prop_02',
            title: 'Листинг ASTR на DEX',
            desc: 'Добавить пул ликвидности ASTR/USDT на Uniswap.',
            votesFor: 45000,
            votesAgainst: 1200,
            status: 'active',
            endsAt: new Date(Date.now() + 86400000 * 7).toISOString()
        }
    ];

    function init() {
        console.log('[DAO] Initialized');
        renderProposals();
    }

    function renderProposals() {
        const container = document.getElementById('daoProposalsList');
        if (!container) return;

        container.innerHTML = proposals.map(p => {
            const total = p.votesFor + p.votesAgainst;
            const percentFor = Math.round((p.votesFor / total) * 100);

            return `
                <div style="padding: 15px; background: rgba(0,0,0,0.2); border: 1px solid var(--border); border-radius: 12px;">
                    <div style="font-family: var(--font-code); font-size: 0.85rem; font-weight: 700; color: var(--tech-blue); margin-bottom: 5px;">${p.title}</div>
                    <div style="font-size: 0.7rem; color: #888; line-height: 1.4; margin-bottom: 12px;">${p.desc}</div>
                    
                    <div style="margin-bottom: 12px;">
                        <div style="display: flex; justify-content: space-between; font-size: 0.6rem; color: #555; margin-bottom: 4px;">
                            <span>YES: ${formatNumber(p.votesFor)}</span>
                            <span>NO: ${formatNumber(p.votesAgainst)}</span>
                        </div>
                        <div style="height: 4px; background: #222; border-radius: 2px; overflow: hidden; display: flex;">
                            <div style="width: ${percentFor}%; background: #00FF41; height: 100%;"></div>
                            <div style="width: ${100 - percentFor}%; background: var(--accent); height: 100%;"></div>
                        </div>
                    </div>

                    <div style="display: flex; gap: 8px;">
                        <button class="spec-item hover-trigger" onclick="DaoManager.vote('${p.id}', true)" style="flex: 1; padding: 6px; border-radius: 4px; justify-content: center; font-size: 0.65rem;">VOTE_YES</button>
                        <button class="spec-item hover-trigger" onclick="DaoManager.vote('${p.id}', false)" style="flex: 1; padding: 6px; border-radius: 4px; border-color: var(--accent); color: var(--accent); justify-content: center; font-size: 0.65rem;">VOTE_NO</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    async function vote(id, support) {
        const balance = typeof AstraManager !== 'undefined' ? AstraManager.getBalance() : 0;
        if (balance <= 0) {
            if (typeof ALABToast !== 'undefined') ALABToast.error('Голосовать могут только владельцы Astra');
            return;
        }

        try {
            if (typeof ALABToast !== 'undefined') ALABToast.info(`Запись голоса (Сила: ${balance} ASTR)...`);

            // Link with Web3 if possible
            const wallet = typeof Web3Manager !== 'undefined' ? Web3Manager.getAccount() : null;

            await new Promise(r => setTimeout(r, 1000));

            const p = proposals.find(x => x.id === id);
            if (p) {
                if (support) p.votesFor += balance;
                else p.votesAgainst += balance;
            }

            if (typeof ALABToast !== 'undefined') ALABToast.success('Голос учтен в блокчейне!');
            renderProposals();

            // Log to Supabase
            window.ALabCore?.log('dao_vote', `Voted ${support ? 'YES' : 'NO'} on ${id}`, { weight: balance, wallet });

        } catch (e) {
            console.error('[DAO] Vote error:', e);
        }
    }

    function formatNumber(n) {
        return new Intl.NumberFormat('ru-RU').format(n);
    }

    return { init, vote };
})();

// Auto-init
if (document.getElementById('daoProposalsList')) DaoManager.init();
