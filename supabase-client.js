/**
 * A-LAB CORE: SUPABASE CLIENT CONFIGURATION
 * ============================================================
 * Replace URL and KEY with your actual Supabase project credentials.
 * See SETUP_GUIDE.md for instructions.
 */

const SUPABASE_URL = 'https://lvyfuljsvzczuwccktln.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2eWZ1bGpzdnpjenV3Y2NrdGxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5OTAwMzEsImV4cCI6MjA4NjU2NjAzMX0.juafzih9bbcIsntrAvku2O_77yz7mnIkOqbY8xencIo';

// ── Custom lock: replaces navigator.locks to avoid "Lock not released" AbortErrors
// Happens when multiple tabs or zombie sessions compete for the same auth lock.
// A simple promise-chain lock is safe for single-origin SPA usage.
let _lockQueue = Promise.resolve();
function _customLock(name, acquireTimeout, fn) {
    const run = () => { _lockQueue = _lockQueue.then(() => fn(), () => fn()); return _lockQueue; };
    return run();
}

// Initialize Supabase client (requires CDN script loaded first)
let _supabaseClient = null;

function getSupabase() {
    if (!_supabaseClient) {
        if (typeof supabase !== 'undefined' && supabase.createClient) {
            _supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
                auth: {
                    persistSession: true,
                    autoRefreshToken: true,
                    detectSessionInUrl: true,
                    lock: _customLock   // bypass navigator.locks conflicts
                }
            });
            // Expose globally for CMS and legacy compatibility
            window.supabase = _supabaseClient;
            console.log('[A-LAB] Supabase client ready (custom lock)');
        } else {
            console.warn('[A-LAB] Supabase library not loaded. Using mock mode.');
            return null;
        }
    }
    return _supabaseClient;
}

// Global accessor
window.ALabCore = {
    get db() {
        return getSupabase();
    },

    // Check if backend is connected (not placeholder)
    get isConnected() {
        return SUPABASE_URL !== 'https://your-project-url.supabase.co'
            && SUPABASE_ANON_KEY !== 'your-anon-key';
    },

    // Log system events
    async log(type, msg, metadata = {}) {
        console.log(`[${type}] ${msg}`);
        const db = getSupabase();
        if (!db || !this.isConnected) return;

        try {
            const { data: { user } } = await db.auth.getUser();
            await db.from('system_logs').insert({
                event_type: type,
                user_id: user?.id || null,
                metadata: { message: msg, ...metadata }
            });
        } catch (e) {
            // Silently fail logging
        }
    },

    // Submit a lead form
    async submitLead(data) {
        const db = getSupabase();
        if (!db || !this.isConnected) {
            console.error('[A-LAB] Backend not connected. Lead not saved.');
            return { error: 'Not connected' };
        }

        try {
            const { error } = await db.from('leads').insert({
                name: data.name,
                contact: data.contact || '',
                source: data.source || 'web',
                message: data.message || '',
                source_detail: data.source_detail || '',
                metadata: data.metadata || {}
            });

            if (!error) {
                // Send Telegram notification (non-blocking)
                this._notifyTelegram(data).catch(() => {});
            }

            return { success: !error, error };
        } catch (err) {
            return { error: err.message };
        }
    },

    // Send Telegram notification on new lead
    async _notifyTelegram(data) {
        const BOT_TOKEN = '8643085801:AAEAhaXgg-RWy3KuKYziNjuqAE87m0zLmaI';
        const CHAT_ID   = '7209334862';

        const now = new Date().toLocaleString('ru-RU', {
            timeZone: 'Europe/Moscow',
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });

        const sourceMap = {
            'digital': '💻 Digital Page',
            'design':  '🎨 Design Page',
            'contacts':'📞 Contacts Page',
            'web':     '🌐 Website'
        };
        const sourceName = sourceMap[data.source] || data.source || '🌐 Website';

        const text = [
            '🔔 Новая заявка с сайта A-LAB!',
            '',
            `Источник: ${sourceName}`,
            `Имя: ${data.name || '—'}`,
            `Контакт: ${data.contact || '—'}`,
            data.message ? `Сообщение: ${data.message}` : '',
            `Время: ${now} (МСК)`
        ].filter(Boolean).join('\n');

        try {
            const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: CHAT_ID,
                    text: text
                })
            });
            const json = await res.json();
            if (json.ok) {
                console.log('[A-LAB] Telegram notification sent ✓');
            } else {
                console.warn('[A-LAB] Telegram error:', json.description);
            }
        } catch (err) {
            console.warn('[A-LAB] Telegram fetch failed:', err.message);
        }
    },

    // Record a donation transaction
    async recordDonation(projectId, amount, txHash, asset = 'ETH', comment = '') {
        const db = getSupabase();
        if (!db || !this.isConnected) return;

        await this.log('donation', `Project ${projectId} funded with ${amount} ${asset}`, { txHash, projectId, amount, asset, comment });

        try {
            await db.from('donations').insert({
                project_id: projectId,
                amount: amount,
                transaction_hash: txHash,
                asset_type: asset,
                comment: comment,
                timestamp: new Date()
            });
        } catch (e) {
            console.warn('[A-LAB] Could not save donation record to DB');
        }
    }
};
