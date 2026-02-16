/**
 * A-LAB CORE: SUPABASE CLIENT CONFIGURATION
 * ============================================================
 * Replace URL and KEY with your actual Supabase project credentials.
 * See SETUP_GUIDE.md for instructions.
 */

const SUPABASE_URL = 'https://lvyfuljsvzczuwccktln.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2eWZ1bGpzdnpjenV3Y2NrdGxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5OTAwMzEsImV4cCI6MjA4NjU2NjAzMX0.juafzih9bbcIsntrAvku2O_77yz7mnIkOqbY8xencIo';

// Initialize Supabase client (requires CDN script loaded first)
let _supabaseClient = null;

function getSupabase() {
    if (!_supabaseClient) {
        if (typeof supabase !== 'undefined' && supabase.createClient) {
            _supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            // Expose globally for CMS and legacy compatibility
            window.supabase = _supabaseClient;
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
            return { success: !error, error };
        } catch (err) {
            return { error: err.message };
        }
    }
};
