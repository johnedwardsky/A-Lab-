/**
 * A-LAB Web3 Manager
 * ==========================================
 * Handles Ethereum wallet connection (MetaMask, etc.)
 * and integrates with A-LAB resident identity.
 */

const Web3Manager = (() => {
    let currentAccount = null;
    let isMetaMaskInstalled = typeof window.ethereum !== 'undefined';

    async function init() {
        console.log('[Web3] Initializing Manager...');
        setupListeners();
        checkPersistentConnection();
    }

    function setupListeners() {
        if (!isMetaMaskInstalled) return;

        window.ethereum.on('accountsChanged', (accounts) => {
            handleAccountsChanged(accounts);
        });

        window.ethereum.on('chainChanged', () => {
            window.location.reload();
        });
    }

    async function checkPersistentConnection() {
        if (!isMetaMaskInstalled) return;

        try {
            const accounts = await window.ethereum.request({ method: 'eth_accounts' });
            if (accounts.length > 0) {
                handleAccountsChanged(accounts);
            }
        } catch (err) {
            console.error('[Web3] Error checking connection:', err);
        }
    }

    async function connectWallet() {
        if (!isMetaMaskInstalled) {
            if (typeof ALABToast !== 'undefined') {
                ALABToast.info('MetaMask not found. Please install a Web3 wallet.');
            } else {
                alert('Web3 wallet not found.');
            }
            return;
        }

        try {
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            handleAccountsChanged(accounts);
        } catch (err) {
            if (err.code === 4001) {
                console.log('[Web3] User rejected request');
            } else {
                console.error('[Web3] Connection error:', err);
            }
        }
    }

    function handleAccountsChanged(accounts) {
        if (accounts.length === 0) {
            currentAccount = null;
            updateUI(false);
            console.log('[Web3] Disconnected');
        } else if (accounts[0] !== currentAccount) {
            currentAccount = accounts[0];
            updateUI(true);
            console.log('[Web3] Connected:', currentAccount);
            // Future: Link this address to Supabase Profile via ALabCore
            linkWalletToProfile(currentAccount);
        }
    }

    async function linkWalletToProfile(address) {
        if (window.ALabCore && window.ALabCore.isConnected && window.ALabAuth) {
            const user = await window.ALabAuth.getUser();
            if (user) {
                // Concept: Save address to Supabase profile
                console.log('[Web3] Mapping address to user:', user.id);
                /*
                await window.ALabCore.db
                    .from('residents')
                    .update({ wallet_address: address })
                    .eq('user_id', user.id);
                */
            }
        }
    }

    function updateUI(connected) {
        const btn = document.getElementById('walletConnectBtn');
        const display = document.getElementById('walletAddressDisplay');

        if (btn) {
            btn.innerText = connected ? 'CONNECTED' : 'CONNECT WALLET';
            btn.classList.toggle('is-connected', connected);
        }

        if (display) {
            display.innerText = connected ?
                `${currentAccount.substring(0, 6)}...${currentAccount.substring(currentAccount.length - 4)}` :
                'NOT CONNECTED';
        }

        // Trigger global event
        const event = new CustomEvent('alab:web3-status', {
            detail: { connected, account: currentAccount }
        });
        document.dispatchEvent(event);
    }

    async function sendFunding(amountEth, projectId) {
        if (!currentAccount || !isMetaMaskInstalled) {
            connectWallet();
            return;
        }

        const recipient = '0x1234567890123456789012345678901234567890'; // A-LAB Treasury Plan
        const amountWei = (parseFloat(amountEth) * 1e18).toString(16);

        try {
            if (typeof ALABToast !== 'undefined') ALABToast.info('Initiating transaction...');

            const txHash = await window.ethereum.request({
                method: 'eth_sendTransaction',
                params: [{
                    from: currentAccount,
                    to: recipient,
                    value: '0x' + amountWei,
                    gas: '0x5208' // 21000 GWEI
                }]
            });

            console.log('[Web3] Transaction sent:', txHash);
            if (typeof ALABToast !== 'undefined') ALABToast.success('Funding successful! TX: ' + txHash.substring(0, 10));

            // Log to Supabase
            if (window.ALabCore) {
                window.ALabCore.log('project_funded', `Project ${projectId} funded with ${amountEth} ETH`, { txHash });
            }

            return txHash;

        } catch (err) {
            console.error('[Web3] Transaction failed:', err);
            if (typeof ALABToast !== 'undefined') ALABToast.error('Transaction failed: ' + err.message);
        }
    }

    function getAccount() { return currentAccount; }

    return { init, connectWallet, getAccount, sendFunding };
})();

// Auto-init
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => Web3Manager.init());
} else {
    Web3Manager.init();
}
