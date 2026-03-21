/**
 * A-LAB: RESIDENT PROFILE MANAGER v3
 * ============================================================
 * Single source of truth for all resident data in workspace.html.
 * Handles: profile CRUD, avatar upload, Astra wallet,
 *          private project management, password change.
 * Depends on: supabase-client.js, auth-guard.js, toast.js
 */

(function () {
    'use strict';

    const ResidentProfileManager = {
        profile: null,
        wallet: null,
        residentId: null,
        userId: null,

        /* =========================================================
         * INIT
         * ========================================================= */
        async init(auth) {
            if (!auth || !auth.userId) {
                console.warn('[RPM] No auth — skipping init');
                return;
            }
            this.userId = auth.userId;
            this.residentId = auth.residentId || null;
            this.profile = auth.profile || null;

            await this.loadProfile();
            await this.loadWallet();
        },

        /* =========================================================
         * PROFILE — LOAD
         * ========================================================= */
        async loadProfile() {
            const db = window.ALabCore?.db;
            if (!db || !this.userId) return;

            try {
                const { data, error } = await db
                    .from('residents')
                    .select('*')
                    .eq('user_id', this.userId)
                    .maybeSingle();

                if (error) throw error;

                if (data) {
                    this.profile = data;
                    this.residentId = data.id;
                    document.dispatchEvent(new CustomEvent('rpm:profile-loaded', { detail: data }));
                    return data;
                } else {
                    console.warn('[RPM] No resident profile found for user:', this.userId);
                    document.dispatchEvent(new CustomEvent('rpm:profile-missing', { detail: { userId: this.userId } }));
                    return null;
                }
            } catch (err) {
                console.error('[RPM] loadProfile error:', err);
            }
        },

        /* =========================================================
         * PROFILE — SAVE (identity + bio + visibility)
         * Creates new record if profile doesn't exist yet.
         * ========================================================= */
        async saveProfile({ fullName, role, bio, visible }) {
            const db = window.ALabCore?.db;
            if (!db) return { error: 'not_connected' };

            const links = { ...(this.profile?.links || {}), visibility: visible ? 'public' : 'hidden' };

            try {
                let data, error;

                if (this.residentId) {
                    // UPDATE existing profile
                    ({ data, error } = await db
                        .from('residents')
                        .update({ full_name: fullName, role, bio, links })
                        .eq('id', this.residentId)
                        .select()
                        .single());
                } else {
                    // INSERT new profile (first save)
                    ({ data, error } = await db
                        .from('residents')
                        .insert({
                            user_id: this.userId,
                            full_name: fullName || 'Новый Резидент',
                            role: role || 'Resident',
                            bio: bio || '',
                            links
                        })
                        .select()
                        .single());

                    if (!error && data) {
                        this.residentId = data.id;
                        console.log('[RPM] Created new resident profile:', data.id);
                    }
                }

                if (error) throw error;
                this.profile = data;
                document.dispatchEvent(new CustomEvent('rpm:profile-saved', { detail: data }));
                document.dispatchEvent(new CustomEvent('rpm:profile-loaded', { detail: data }));
                return { data };
            } catch (err) {
                console.error('[RPM] saveProfile error:', err);
                return { error: err.message };
            }
        },

        /* =========================================================
         * PROFILE — SAVE SKILLS
         * ========================================================= */
        async saveSkills(skillsArray) {
            const db = window.ALabCore?.db;
            if (!db || !this.residentId) return { error: 'not_ready' };

            try {
                const { data, error } = await db
                    .from('residents')
                    .update({ skills: skillsArray })
                    .eq('id', this.residentId)
                    .select()
                    .single();

                if (error) throw error;
                this.profile = data;
                return { data };
            } catch (err) {
                console.error('[RPM] saveSkills error:', err);
                return { error: err.message };
            }
        },

        /* =========================================================
         * PROFILE — SAVE LINKS
         * ========================================================= */
        async saveLinks({ website, telegram, github, behance, linkedin }) {
            const db = window.ALabCore?.db;
            if (!db || !this.residentId) return { error: 'not_ready' };

            const existingLinks = this.profile?.links || {};
            const links = {
                ...existingLinks,
                portfolio: website || existingLinks.portfolio || null,
                telegram: telegram || existingLinks.telegram || null,
                github: github || existingLinks.github || null,
                behance: behance || existingLinks.behance || null,
                linkedin: linkedin || existingLinks.linkedin || null,
            };

            try {
                const { data, error } = await db
                    .from('residents')
                    .update({ links })
                    .eq('id', this.residentId)
                    .select()
                    .single();

                if (error) throw error;
                this.profile = data;
                return { data };
            } catch (err) {
                console.error('[RPM] saveLinks error:', err);
                return { error: err.message };
            }
        },

        /* =========================================================
         * AVATAR — UPLOAD via Supabase Storage
         * ========================================================= */
        async uploadAvatar(file) {
            const db = window.ALabCore?.db;
            if (!db || !this.userId) return { error: 'not_ready' };

            const ext = file.name.split('.').pop();
            const fileName = `${this.userId}/avatar.${ext}`;

            try {
                const { error: uploadError } = await db.storage
                    .from('avatars')
                    .upload(fileName, file, { upsert: true, contentType: file.type });

                if (uploadError) throw uploadError;

                const { data: urlData } = db.storage
                    .from('avatars')
                    .getPublicUrl(fileName);

                const avatarUrl = urlData.publicUrl + '?t=' + Date.now();

                const { data, error: updateError } = await db
                    .from('residents')
                    .update({ avatar_url: avatarUrl })
                    .eq('id', this.residentId)
                    .select()
                    .single();

                if (updateError) throw updateError;
                this.profile = data;
                return { url: avatarUrl };

            } catch (err) {
                console.error('[RPM] uploadAvatar error:', err);
                return { error: err.message };
            }
        },

        /* =========================================================
         * STATUS — UPDATE (online / busy / away)
         * ========================================================= */
        async setStatus(status) {
            const db = window.ALabCore?.db;
            if (!db || !this.residentId) return;

            try {
                await db
                    .from('residents')
                    .update({ status })
                    .eq('id', this.residentId);

                if (this.profile) this.profile.status = status;
            } catch (err) {
                console.error('[RPM] setStatus error:', err);
            }
        },

        /* =========================================================
         * PASSWORD — CHANGE (Supabase Auth — fully secure)
         * ========================================================= */
        async changePassword(currentPassword, newPassword) {
            const db = window.ALabCore?.db;
            if (!db) return { error: 'not_connected' };

            // Verify current password by re-authenticating
            const { data: { user } } = await db.auth.getUser();
            if (!user?.email) return { error: 'no_user' };

            // Re-sign-in to validate current password
            const { error: signInError } = await db.auth.signInWithPassword({
                email: user.email,
                password: currentPassword
            });

            if (signInError) {
                return { error: 'wrong_current_password' };
            }

            // Update to new password
            const { error: updateError } = await db.auth.updateUser({
                password: newPassword
            });

            if (updateError) {
                return { error: updateError.message };
            }

            return { success: true };
        },

        /* =========================================================
         * ASTRA WALLET — LOAD balance + recent transactions
         * ========================================================= */
        async loadWallet() {
            const db = window.ALabCore?.db;
            if (!db || !this.residentId) return;

            try {
                const { data: walletData, error: walletError } = await db
                    .from('astra_balances')
                    .select('*')
                    .eq('resident_id', this.residentId)
                    .single();

                if (walletError) throw walletError;
                this.wallet = walletData;

                // Load last 20 transactions using real column names: from_id / to_id
                const { data: txData, error: txError } = await db
                    .from('astra_transactions')
                    .select('*')
                    .or(`from_id.eq.${this.residentId},to_id.eq.${this.residentId}`)
                    .order('created_at', { ascending: false })
                    .limit(20);

                if (txError) console.warn('[RPM] tx load warn:', txError);

                document.dispatchEvent(new CustomEvent('rpm:wallet-loaded', {
                    detail: { wallet: walletData, transactions: txData || [] }
                }));

                return { wallet: walletData, transactions: txData || [] };
            } catch (err) {
                console.error('[RPM] loadWallet error:', err);
            }
        },

        /* =========================================================
         * ASTRA WALLET — SEND tokens to another resident
         * ========================================================= */
        async sendAstra(recipientUserId, amount, description = '') {
            const db = window.ALabCore?.db;
            if (!db || !this.residentId) return { error: 'not_ready' };

            const numAmount = parseFloat(amount);
            if (isNaN(numAmount) || numAmount <= 0) return { error: 'invalid_amount' };

            // Read fresh balance to avoid stale cache
            const { data: freshWallet } = await db
                .from('astra_balances')
                .select('balance')
                .eq('resident_id', this.residentId)
                .single();

            const currentBalance = parseFloat(freshWallet?.balance || 0);
            if (currentBalance < numAmount) return { error: 'insufficient_funds' };

            try {
                // Get recipient resident record
                const { data: recipientData, error: recipientError } = await db
                    .from('residents')
                    .select('id')
                    .eq('user_id', recipientUserId)
                    .single();

                if (recipientError || !recipientData) return { error: 'recipient_not_found' };
                const recipientResidentId = recipientData.id;

                // SECURE SERVER-SIDE TRANSFER
                const { data: rpcResult, error: rpcError } = await db.rpc('transfer_astra', {
                    p_receiver_id: recipientResidentId,
                    p_amount: numAmount
                });

                if (rpcError) throw rpcError;
                if (!rpcResult.success) throw new Error(rpcResult.error || 'Transfer failed');

                // Log transaction — real columns: from_id, to_id, type, reason
                await db.from('astra_transactions').insert({
                    from_id: this.residentId,
                    to_id: recipientResidentId,
                    amount: numAmount,
                    type: 'transfer',
                    reason: description || 'Перевод Astra'
                });

                await this.loadWallet();
                return { success: true };

            } catch (err) {
                console.error('[RPM] sendAstra error:', err);
                return { error: err.message };
            }
        },

        /* =========================================================
         * PROJECTS — LOAD (my projects)
         * ========================================================= */
        async loadMyProjects() {
            const db = window.ALabCore?.db;
            if (!db || !this.residentId) return [];

            try {
                const { data, error } = await db
                    .from('resident_projects')
                    .select('*')
                    .eq('owner_id', this.residentId)
                    .order('created_at', { ascending: false });

                if (error) throw error;
                return data || [];
            } catch (err) {
                console.error('[RPM] loadMyProjects error:', err);
                return [];
            }
        },

        /* =========================================================
         * PROJECTS — CREATE
         * ========================================================= */
        async createProject({ title, description, category, budget, status = 'active' }) {
            const db = window.ALabCore?.db;
            if (!db || !this.residentId) return { error: 'not_ready' };

            try {
                const { data, error } = await db
                    .from('resident_projects')
                    .insert({
                        owner_id: this.residentId,
                        title,
                        description,
                        category: category || 'other',
                        astra_budget: parseFloat(budget) || 0,
                        status
                    })
                    .select()
                    .single();

                if (error) throw error;
                document.dispatchEvent(new CustomEvent('rpm:project-created', { detail: data }));
                return { data };
            } catch (err) {
                console.error('[RPM] createProject error:', err);
                return { error: err.message };
            }
        },

        /* =========================================================
         * PROJECTS — DELETE
         * ========================================================= */
        async deleteProject(projectId) {
            const db = window.ALabCore?.db;
            if (!db || !this.residentId) return { error: 'not_ready' };

            try {
                const { error } = await db
                    .from('resident_projects')
                    .delete()
                    .eq('id', projectId)
                    .eq('owner_id', this.residentId); // safety: only owner can delete

                if (error) throw error;
                return { success: true };
            } catch (err) {
                console.error('[RPM] deleteProject error:', err);
                return { error: err.message };
            }
        },

        /* =========================================================
         * PUBLIC PROFILE — fetch any resident by user_id or slug
         * ========================================================= */
        async fetchPublicProfile(identifier) {
            const db = window.ALabCore?.db;
            if (!db) return null;

            try {
                // Try user_id (UUID) first
                const isUUID = /^[0-9a-f-]{36}$/.test(identifier);
                let query = db.from('residents').select('*');

                if (isUUID) {
                    query = query.eq('user_id', identifier);
                } else {
                    // Fallback: match by full_name slug (legacy static pages)
                    const name = identifier.replace(/-/g, ' ');
                    query = query.ilike('full_name', name);
                }

                const { data, error } = await query.single();
                if (error) throw error;
                return data;
            } catch (err) {
                console.error('[RPM] fetchPublicProfile error:', err);
                return null;
            }
        },

        /* =========================================================
         * FEED — load resident activity feed
         * ========================================================= */
        async loadFeed() {
            const db = window.ALabCore?.db;
            if (!db) return [];

            try {
                // Table is 'posts' (not feed_posts)
                const { data, error } = await db
                    .from('posts')
                    .select(`
                        *,
                        author:residents!author_id(full_name, avatar_url, role)
                    `)
                    .order('created_at', { ascending: false })
                    .limit(30);

                if (error) throw error;
                // Normalize: support both 'content' and 'body' columns
                return (data || []).map(p => ({
                    ...p,
                    content: p.content || p.body || p.text || ''
                }));
            } catch (err) {
                console.error('[RPM] loadFeed error:', err);
                return [];
            }
        },

        /* =========================================================
         * FEED — post a new update
         * ========================================================= */
        async postFeedItem(content) {
            const db = window.ALabCore?.db;
            if (!db || !this.residentId) return { error: 'not_ready' };

            try {
                // Table is 'posts' (matches existing schema)
                const { data, error } = await db
                    .from('posts')
                    .insert({ author_id: this.residentId, content })
                    .select()
                    .single();

                if (error) throw error;
                return { data };
            } catch (err) {
                console.error('[RPM] postFeedItem error:', err);
                return { error: err.message };
            }
        },

        /* =========================================================
         * RESIDENTS — list all visible (for send-to / message-to)
         * ========================================================= */
        async fetchAllResidents() {
            const db = window.ALabCore?.db;
            if (!db) return [];

            try {
                const { data, error } = await db
                    .from('residents')
                    .select('id, user_id, full_name, avatar_url, role, status')
                    .neq('links->>visibility', 'hidden')
                    .order('full_name');

                if (error) throw error;
                return data || [];
            } catch (err) {
                console.error('[RPM] fetchAllResidents error:', err);
                return [];
            }
        }
    };

    window.ResidentProfileManager = ResidentProfileManager;

    // Auto-init when auth is ready
    document.addEventListener('alab:auth-ready', async (e) => {
        const auth = e.detail;
        if (auth && !auth.mockMode) {
            await ResidentProfileManager.init(auth);
        }
    });

    // If auth already fired before this script loaded
    if (window.ALabAuth && !window.ALabAuth.mockMode) {
        ResidentProfileManager.init(window.ALabAuth);
    }

})();
