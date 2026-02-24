/**
 * A-LAB Funding & Donation Manager
 * ==========================================
 * Handles project-specific crypto donations.
 * Supports Ethereum (via Web3Manager) and static addresses (BTC, SOL, USDT).
 */

const FundingManager = (() => {
    let currentProjectId = null;
    let currentProjectName = '';

    // Treasury Addresses (Placeholders - User should replace these)
    const WALLETS = {
        ETH: '0xf0BfE88fe0e0E7aaf8AEa24266EEe0344847b27C', // A-LAB ETH Treasury
        BTC: 'bc1qwvgrxx8nngkwkmgtjkrpfev0829fsn6xmcltez',
        SOL: '3oY6ZnKVSG4rMVSKj4gnntaJxYpYaJ3pnH7bxqSW5EJF',
        USDT_TRC20: 'THJirt1n6QftN5bwuhLEKTptKfxHdkUWF8'
    };

    function init() {
        console.log('[Funding] Initializing Manager...');
        injectStyles();
    }

    /**
     * Open the funding modal
     * @param {string} projectId 
     * @param {string} projectName 
     */
    function open(projectId, projectName) {
        currentProjectId = projectId;
        currentProjectName = projectName || projectId.toUpperCase();

        if (document.getElementById('funding-modal')) {
            showModal();
            return;
        }

        const modal = document.createElement('div');
        modal.id = 'funding-modal';
        modal.className = 'funding-modal';

        modal.innerHTML = `
            <div class="funding-backdrop" onclick="FundingManager.close()"></div>
            <div class="funding-dialog">
                <button class="funding-close" onclick="FundingManager.close()">✕</button>
                
                <div class="funding-header">
                    <span class="funding-tag">> FUNDING_PROTOCOL_INITIATED</span>
                    <h2>SUPPORT ${currentProjectName}</h2>
                    <p>Ваш вклад ускоряет R&D разработки. Все средства управляются через A-LAB DAO.</p>
                </div>

                <div class="funding-tabs">
                    <button class="tab-btn active" onclick="FundingManager.setTab('eth')">ETH / WEB3</button>
                    <button class="tab-btn" onclick="FundingManager.setTab('other')">OTHER ASSETS</button>
                </div>

                <div id="funding-tab-eth" class="funding-tab-content active">
                    <div class="amount-selector">
                        <button onclick="FundingManager.setAmount(0.01)">0.01</button>
                        <button onclick="FundingManager.setAmount(0.1)">0.1</button>
                        <button onclick="FundingManager.setAmount(1.0)">1.0</button>
                    </div>
                    <div class="input-group">
                        <label>AMOUNT (ETH)</label>
                        <input type="number" id="fundingAmountEth" step="0.01" value="0.1" placeholder="0.00">
                    </div>
                    <div class="input-group">
                        <label>MESSAGE / COMMENT (OPTIONAL)</label>
                        <textarea id="fundingComment" placeholder="Your message or 'Anonymous'..." style="width: 100%; height: 80px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; color: white; padding: 12px; font-family: inherit; font-size: 0.85rem; resize: none; margin-bottom: 20px;"></textarea>
                    </div>
                    <button class="btn-primary funding-btn" id="ethFundingBtn" onclick="FundingManager.sendEth()">
                        ОТПРАВИТЬ ETH
                    </button>
                    <p class="funding-note">* Требуется MetaMask или Web3 кошелек.</p>
                </div>

                <div id="funding-tab-other" class="funding-tab-content">
                    <div class="asset-list">
                        <div class="asset-item" onclick="FundingManager.copyAddress('BTC')">
                            <div class="asset-info">
                                <strong>Bitcoin (BTC)</strong>
                                <span id="addr-BTC">${WALLETS.BTC}</span>
                            </div>
                            <span class="copy-icon">📋</span>
                        </div>
                        <div class="asset-item" onclick="FundingManager.copyAddress('SOL')">
                            <div class="asset-info">
                                <strong>Solana (SOL)</strong>
                                <span id="addr-SOL">${WALLETS.SOL}</span>
                            </div>
                            <span class="copy-icon">📋</span>
                        </div>
                        <div class="asset-item" onclick="FundingManager.copyAddress('USDT_TRC20')">
                            <div class="asset-info">
                                <strong>USDT (TRC20)</strong>
                                <span id="addr-USDT_TRC20">${WALLETS.USDT_TRC20}</span>
                            </div>
                            <span class="copy-icon">📋</span>
                        </div>
                    </div>
                    <p class="funding-note" style="margin-top: 15px;">Нажмите на адрес, чтобы скопировать.</p>
                </div>

                <div class="funding-footer">
                    <div class="status-indicator">
                        <div class="pulse-dot"></div> SECURE_CHANNEL_READY
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        setTimeout(() => modal.classList.add('active'), 10);
    }

    function showModal() {
        const modal = document.getElementById('funding-modal');
        modal.querySelector('h2').innerText = `SUPPORT ${currentProjectName}`;
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function close() {
        const modal = document.getElementById('funding-modal');
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    function setTab(tab) {
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.funding-tab-content').forEach(c => c.classList.remove('active'));

        event.target.classList.add('active');
        document.getElementById(`funding-tab-${tab}`).classList.add('active');
    }

    function setAmount(amount) {
        document.getElementById('fundingAmountEth').value = amount;
    }

    async function sendEth() {
        const amount = document.getElementById('fundingAmountEth').value;
        if (!amount || amount <= 0) {
            if (window.ALABToast) ALABToast.info('Введите сумму');
            return;
        }

        const btn = document.getElementById('ethFundingBtn');
        const originalText = btn.innerText;

        btn.innerText = 'PROCESSING...';
        btn.disabled = true;

        try {
            if (window.Web3Manager) {
                const comment = document.getElementById('fundingComment')?.value || '';
                const txHash = await window.Web3Manager.sendFunding(amount, currentProjectId);
                if (txHash && window.ALabCore) {
                    await window.ALabCore.recordDonation(currentProjectId, amount, txHash, 'ETH', comment);
                }
                close();
            } else {
                throw new Error('Web3Manager not loaded');
            }
        } catch (err) {
            console.error('[Funding] Error:', err);
            if (window.ALABToast) ALABToast.error('Ошибка транзакции');
        } finally {
            btn.innerText = originalText;
            btn.disabled = false;
        }
    }

    function copyAddress(asset) {
        const addr = WALLETS[asset];
        navigator.clipboard.writeText(addr).then(() => {
            if (window.ALABToast) {
                ALABToast.success(`${asset} адрес скопирован!`);
            } else {
                alert('Скопировано!');
            }
        });
    }

    function injectStyles() {
        const style = document.createElement('style');
        style.innerHTML = `
            .funding-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                z-index: 10000;
                display: none;
                align-items: center;
                justify-content: center;
                opacity: 0;
                transition: 0.3s;
                pointer-events: none;
            }
            .funding-modal.active {
                display: flex;
                opacity: 1;
                pointer-events: all;
                backdrop-filter: blur(15px);
            }
            .funding-backdrop {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.85);
            }
            .funding-dialog {
                position: relative;
                background: rgba(11, 13, 20, 0.95);
                border: 1px solid rgba(255, 42, 42, 0.3);
                border-radius: 24px;
                width: 450px;
                max-width: 90%;
                padding: 40px;
                box-shadow: 0 0 50px rgba(255, 42, 42, 0.1);
                color: white;
                transform: scale(0.9);
                transition: 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            }
            .funding-modal.active .funding-dialog {
                transform: scale(1);
            }
            .funding-close {
                position: absolute;
                top: 20px;
                right: 20px;
                background: none;
                border: none;
                color: #555;
                font-size: 1.2rem;
                cursor: pointer;
                transition: 0.3s;
            }
            .funding-close:hover {
                color: var(--accent, #FF2A2A);
                transform: rotate(90deg);
            }
            .funding-tag {
                font-family: 'JetBrains Mono', monospace;
                color: var(--accent, #FF2A2A);
                font-size: 0.7rem;
                letter-spacing: 1px;
                display: block;
                margin-bottom: 5px;
            }
            .funding-header h2 {
                font-size: 1.8rem;
                font-weight: 800;
                margin-bottom: 10px;
                text-transform: uppercase;
            }
            .funding-header p {
                color: #888;
                font-size: 0.85rem;
                line-height: 1.4;
                margin-bottom: 25px;
            }
            .funding-tabs {
                display: flex;
                gap: 10px;
                margin-bottom: 25px;
                padding: 4px;
                background: rgba(255,255,255,0.03);
                border-radius: 12px;
            }
            .tab-btn {
                flex: 1;
                padding: 10px;
                border: none;
                background: none;
                color: #666;
                font-family: 'JetBrains Mono', monospace;
                font-size: 0.75rem;
                cursor: pointer;
                border-radius: 8px;
                transition: 0.3s;
            }
            .tab-btn.active {
                background: rgba(255, 255, 255, 0.07);
                color: white;
            }
            .funding-tab-content {
                display: none;
            }
            .funding-tab-content.active {
                display: block;
            }
            .amount-selector {
                display: flex;
                gap: 10px;
                margin-bottom: 20px;
            }
            .amount-selector button {
                flex: 1;
                background: rgba(255,255,255,0.03);
                border: 1px solid rgba(255,255,255,0.08);
                padding: 10px;
                color: white;
                border-radius: 8px;
                cursor: pointer;
                transition: 0.2s;
            }
            .amount-selector button:hover {
                border-color: var(--accent, #FF2A2A);
                background: rgba(255, 42, 42, 0.05);
            }
            .input-group label {
                display: block;
                font-family: 'JetBrains Mono', monospace;
                font-size: 0.7rem;
                color: #555;
                margin-bottom: 8px;
            }
            .input-group input {
                width: 100%;
                background: rgba(0,0,0,0.3);
                border: 1px solid rgba(255,255,255,0.1);
                border-radius: 12px;
                padding: 12px 15px;
                color: white;
                font-size: 1.1rem;
                margin-bottom: 20px;
            }
            .btn-primary {
                width: 100%;
                background: var(--accent, #FF2A2A);
                color: black;
                border: none;
                border-radius: 12px;
                padding: 16px;
                font-weight: 800;
                font-family: 'JetBrains Mono', monospace;
                cursor: pointer;
                box-shadow: 0 4px 15px rgba(255, 42, 42, 0.3);
                transition: 0.3s;
            }
            .btn-primary:hover:not(:disabled) {
                transform: translateY(-2px);
                box-shadow: 0 8px 25px rgba(255, 42, 42, 0.5);
            }
            .asset-list {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }
            .asset-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                background: rgba(255,255,255,0.03);
                border: 1px solid rgba(255,255,255,0.05);
                padding: 12px 18px;
                border-radius: 12px;
                cursor: pointer;
                transition: 0.2s;
            }
            .asset-item:hover {
                border-color: rgba(255, 42, 42, 0.3);
                background: rgba(255, 42, 42, 0.03);
            }
            .asset-info strong {
                display: block;
                font-size: 0.8rem;
                margin-bottom: 4px;
            }
            .asset-info span {
                font-family: 'JetBrains Mono', monospace;
                font-size: 0.7rem;
                color: #666;
                word-break: break-all;
            }
            .copy-icon {
                font-size: 1.2rem;
                opacity: 0.3;
            }
            .funding-note {
                font-size: 0.75rem;
                color: #555;
                margin-top: 10px;
            }
            .funding-footer {
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid rgba(255,255,255,0.05);
            }
            .status-indicator {
                display: flex;
                align-items: center;
                gap: 10px;
                font-family: 'JetBrains Mono', monospace;
                font-size: 0.65rem;
                color: #555;
            }
            .pulse-dot {
                width: 6px;
                height: 6px;
                background: #00FF41;
                border-radius: 50%;
                box-shadow: 0 0 10px #00FF41;
                animation: pulse 2s infinite;
            }
            @keyframes pulse {
                0% { opacity: 0.4; }
                50% { opacity: 1; }
                100% { opacity: 0.4; }
            }
        `;
        document.head.appendChild(style);
    }

    return { init, open, close, setTab, setAmount, sendEth, copyAddress };
})();

// Expose to window
window.FundingManager = FundingManager;

// Auto-init
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => FundingManager.init());
} else {
    FundingManager.init();
}
