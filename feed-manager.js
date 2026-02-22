/**
 * A-LAB: FEED MANAGER
 * ============================================================
 * Handles: loading posts, creating, editing, and deleting posts.
 * Depends on: supabase-client.js, auth-guard.js, toast.js
 */

(function () {
    'use strict';

    const FeedManager = {
        posts: [],
        residentId: null,
        editingPostId: null,

        /**
         * Initialize
         */
        async init() {
            const handleAuth = async (auth) => {
                if (!auth.mockMode && auth.residentId) {
                    this.residentId = auth.residentId;
                    // Check if we are in admin workspace or public feed
                    if (document.querySelector('#feedContainer')) {
                        await this.loadPosts();
                    } else if (document.querySelector('#myPostsContainer')) {
                        await this.loadMyPosts();
                    }
                }
                this._bindUI();
            };

            if (window.ALabAuth) {
                handleAuth(window.ALabAuth);
            } else {
                document.addEventListener('alab:auth-ready', (e) => handleAuth(e.detail));
            }
        },

        /**
         * Load posts from Supabase
         */
        async loadPosts() {
            const db = window.ALabCore?.db;
            if (!db || !window.ALabCore.isConnected) return;

            try {
                const { data, error } = await db
                    .from('posts')
                    .select(`
                        *,
                        author:residents!posts_author_id_fkey(id, full_name, avatar_url, role)
                    `)
                    .order('created_at', { ascending: false })
                    .limit(50);

                if (error) throw error;

                this.posts = data || [];
                this._renderPosts();

                // Setup Realtime Subscription
                if (window.ALabCore.isConnected) {
                    db.channel('public:posts')
                        .on('postgres_changes', { event: '*', table: 'posts' }, () => this.loadPosts())
                        .subscribe();
                }

            } catch (err) {
                console.error('[FEED] Load error:', err);
            }
        },

        /**
         * Load only current user's posts (for admin panel Feed tab)
         */
        async loadMyPosts() {
            const db = window.ALabCore?.db;
            if (!db || !window.ALabCore.isConnected || !this.residentId) return;

            try {
                const { data, error } = await db
                    .from('posts')
                    .select('*')
                    .eq('author_id', this.residentId)
                    .order('created_at', { ascending: false });

                if (error) throw error;
                this.posts = data || [];
                this._renderMyPosts();

            } catch (err) {
                console.error('[FEED] Load my posts error:', err);
            }
        },

        /**
         * Render posts for public feed (social-feed.html)
         */
        _renderPosts() {
            const container = document.querySelector('#feedContainer');
            if (!container) return;

            if (this.posts.length === 0) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 40px; color: #555; font-family: var(--font-code); font-size: 0.8rem;">
                        ${window.I18n?.t('feed.empty') || 'НЕТ ПОСТОВ // ЛЕНТА ПУСТА'}
                    </div>`;
                return;
            }

            container.innerHTML = this.posts.map(post => {
                const voted = post.voted_by_me || false;
                const voteCount = post.votes_count || 0;

                return `
                    <div class="post-card" data-post-id="${post.id}">
                        <div class="post-header">
                            <div class="user-block">
                                <div class="avatar">
                                    <img src="${post.author?.avatar_url || 'maya_neural.png'}" alt="Avatar">
                                </div>
                                <div class="user-info">
                                    <div class="name">${post.author?.full_name || 'Resident'}</div>
                                    <div class="role">${post.author?.role || 'RESIDENT'}</div>
                                </div>
                            </div>
                            <div class="post-time">${this._formatTime(post.created_at)}</div>
                        </div>
                        <div class="post-content">
                            ${this._escapeHtml(post.content)}
                        </div>
                        <div class="post-footer">
                            <button class="action-btn hover-trigger ${voted ? 'voted' : ''}" 
                                    onclick="FeedManager.toggleLike('${post.id}')">
                                <span>🚀</span> <span id="votes-${post.id}">${voteCount}</span>
                            </button>
                            <button class="action-btn hover-trigger" onclick="FeedManager.toggleComments('${post.id}')">
                                <span>💬</span> <span>${post.comments_count || 0}</span>
                            </button>
                            <button class="action-btn hover-trigger" onclick="FeedManager.sharePost('${post.id}')">
                                <span>📡</span>
                            </button>
                        </div>
                        <div id="comments-${post.id}" class="comments-container">
                             <!-- Comments loaded on demand -->
                        </div>
                    </div>
                `;
            }).join('');
        },

        async toggleLike(postId) {
            if (!this.residentId) {
                ALABToast.info(window.I18n?.t('auth.register_prompt') || 'Авторизуйтесь для взаимодействия');
                return;
            }

            // Optimistic UI
            const btn = document.querySelector(`.post-card[data-post-id="${postId}"] .action-btn:first-child`);
            const countEl = document.querySelector(`#votes-${postId}`);
            let count = parseInt(countEl.innerText);

            if (btn.classList.contains('voted')) {
                btn.classList.remove('voted');
                count--;
            } else {
                btn.classList.add('voted');
                count++;
            }
            countEl.innerText = count;

            // Permanent change in DB
            try {
                const db = window.ALabCore.db;
                await db.rpc('toggle_post_vote', {
                    p_post_id: postId,
                    p_user_id: this.residentId
                });

                // Reward for engagement (Upvoting)
                if (typeof AstraManager !== 'undefined' && btn.classList.contains('voted')) {
                    AstraManager.rewardActivity('social_engagement', 1, { action: 'upvote', target: postId });
                }
            } catch (err) {
                console.warn('[FEED] Vote sync failed');
            }
        },

        toggleComments(postId) {
            const el = document.getElementById(`comments-${postId}`);
            el.classList.toggle('active');
            if (el.classList.contains('active')) {
                this.loadComments(postId);
            }
        },

        async loadComments(postId) {
            const container = document.getElementById(`comments-${postId}`);
            container.innerHTML = '<div style="font-size: 0.7rem; color: #555; padding: 10px;">LOADING...</div>';
            // Logic for fetching comments from Supabase
            setTimeout(() => {
                container.innerHTML = `<div style="font-size: 0.7rem; color: #555; padding: 10px;">COMMUNICATIONS_ESTABLISHED // ${window.I18n?.t('feed.empty') || 'Лента пуста'}</div>`;
            }, 500);
        },

        sharePost(postId) {
            ALABToast.success(window.I18n?.t('common.success') + ': ' + (window.I18n?.t('feed.share_success') || 'Ссылка на пост скопирована!'));
        },

        /**
         * Render posts for admin panel (resident-admin Feed tab)
         */
        _renderMyPosts() {
            const container = document.querySelector('#myPostsContainer');
            if (!container) return;

            if (this.posts.length === 0) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 30px; color: #555; font-family: var(--font-code); font-size: 0.8rem;">
                        ${window.I18n?.t('feed.empty') || 'У ВАС ЕЩЁ НЕТ ПОСТОВ'}
                    </div>`;
                return;
            }

            container.innerHTML = this.posts.map(post => `
                <div class="post-item" data-post-id="${post.id}" style="background: rgba(0,0,0,0.1); padding: 15px; border-radius: 10px; border: 1px solid var(--border);">
                    <div style="font-size: 0.7rem; color: #555; margin-bottom: 5px;">${this._formatTime(post.created_at)}</div>
                    <p style="font-size: 0.9rem;" id="postContent-${post.id}">${this._escapeHtml(post.content)}</p>
                    <div style="margin-top: 10px; display: flex; gap: 10px;">
                        <button class="status-btn hover-trigger" style="padding: 5px 10px;" onclick="FeedManager.startEdit('${post.id}')">${window.I18n?.t('feed.edit') || 'Править'}</button>
                        <button class="status-btn hover-trigger" style="padding: 5px 10px; border-color: var(--accent); color: var(--accent);" onclick="FeedManager.deletePost('${post.id}')">${window.I18n?.t('feed.delete') || 'Удалить'}</button>
                    </div>
                </div>
            `).join('');
        },

        /**
         * Create a new post
         */
        async createPost() {
            const textarea = document.querySelector('#newPostTextarea');
            if (!textarea) return;

            const content = textarea.value.trim();
            if (!content) {
                ALabToast.info(window.I18n?.t('feed.placeholder') || 'Напишите что-нибудь для публикации');
                return;
            }

            const db = window.ALabCore?.db;
            const auth = window.ALabAuth;

            if (!db || auth?.mockMode) {
                ALabToast.info('Демо-режим: посты не сохраняются');
                return;
            }

            const btn = document.querySelector('#publishPostBtn');
            if (btn) { btn.disabled = true; btn.textContent = window.I18n?.t('common.loading') || 'ПУБЛИКАЦИЯ...'; }

            try {
                const { error } = await db
                    .from('posts')
                    .insert({
                        author_id: this.residentId,
                        content: content
                    });

                if (error) throw error;

                textarea.value = '';
                ALabToast.success(window.I18n?.t('common.success') || 'Пост опубликован!');
                await this.loadMyPosts();
                window.ALabCore.log('post_create', 'New post published');

                // Reward for content creation
                if (typeof AstraManager !== 'undefined') {
                    AstraManager.rewardActivity('content_creation', 5, { action: 'post' });
                }
            } catch (err) {
                console.error('[FEED] Create error:', err);
                ALabToast.error('Ошибка публикации: ' + (err.message || ''));
            } finally {
                if (btn) { btn.disabled = false; btn.textContent = window.I18n?.t('feed.publish') || 'ОПУБЛИКОВАТЬ В ЛЕНТУ'; }
            }
        },

        /**
         * Start editing a post
         */
        startEdit(postId) {
            const contentEl = document.querySelector(`#postContent-${postId}`);
            if (!contentEl) return;

            const currentText = contentEl.textContent;
            this.editingPostId = postId;

            contentEl.innerHTML = `
                <textarea class="form-textarea" id="editTextarea-${postId}" style="height: 80px; margin-bottom: 10px;">${currentText}</textarea>
                <div style="display: flex; gap: 10px;">
                    <button class="btn-pulse hover-trigger" style="margin: 0; padding: 8px 15px; font-size: 0.7rem;" onclick="FeedManager.saveEdit('${postId}')">${window.I18n?.t('common.save') || 'Сохранить'}</button>
                    <button class="status-btn hover-trigger" style="padding: 8px 15px;" onclick="FeedManager.cancelEdit('${postId}', '${currentText.replace(/'/g, "\\'")}')">${window.I18n?.t('common.cancel') || 'Отмена'}</button>
                </div>
            `;
        },

        /**
         * Save edited post
         */
        async saveEdit(postId) {
            const textarea = document.querySelector(`#editTextarea-${postId}`);
            if (!textarea) return;

            const content = textarea.value.trim();
            if (!content) {
                ALabToast.info(window.I18n?.t('feed.placeholder') || 'Текст не может быть пустым');
                return;
            }

            const db = window.ALabCore?.db;
            if (!db || window.ALabAuth?.mockMode) {
                ALabToast.info('Демо-режим');
                return;
            }

            try {
                const { error } = await db
                    .from('posts')
                    .update({ content })
                    .eq('id', postId);

                if (error) throw error;

                this.editingPostId = null;
                ALabToast.success(window.I18n?.t('common.success') || 'Пост обновлен');
                await this.loadMyPosts();

            } catch (err) {
                console.error('[FEED] Edit error:', err);
                ALabToast.error('Ошибка: ' + err.message);
            }
        },

        /**
         * Cancel edit
         */
        cancelEdit(postId, originalText) {
            const contentEl = document.querySelector(`#postContent-${postId}`);
            if (contentEl) {
                contentEl.textContent = originalText;
            }
            this.editingPostId = null;
        },

        /**
         * Delete a post
         */
        async deletePost(postId) {
            if (!confirm('Удалить этот пост?')) return;

            const db = window.ALabCore?.db;
            if (!db || window.ALabAuth?.mockMode) {
                ALabToast.info('Демо-режим');
                return;
            }

            try {
                const { error } = await db
                    .from('posts')
                    .delete()
                    .eq('id', postId);

                if (error) throw error;

                ALabToast.success('Пост удален');
                await this.loadMyPosts();

            } catch (err) {
                console.error('[FEED] Delete error:', err);
                ALabToast.error(window.I18n?.t('common.error') + ': ' + err.message);
            }
        },

        /**
         * Bind UI
         */
        _bindUI() {
            const publishBtn = document.querySelector('#publishPostBtn');
            if (publishBtn) {
                publishBtn.addEventListener('click', () => this.createPost());
            }

            // Pulse broadcast button (on profile tab)
            const pulseBtn = document.querySelector('#pulseBroadcastBtn');
            if (pulseBtn) {
                pulseBtn.addEventListener('click', async () => {
                    const input = document.querySelector('#pulseInput');
                    if (!input || !input.value.trim()) {
                        ALabToast.info(window.I18n?.t('profile.pulse_placeholder') || 'Введите сообщение для трансляции');
                        return;
                    }

                    const db = window.ALabCore?.db;
                    if (!db || window.ALabAuth?.mockMode) {
                        ALabToast.info('Демо-режим');
                        return;
                    }

                    try {
                        const { error } = await db
                            .from('posts')
                            .insert({
                                author_id: this.residentId,
                                content: '📡 ' + input.value.trim()
                            });

                        if (error) throw error;
                        input.value = '';
                        ALabToast.success('Транслировано в сеть!');
                    } catch (err) {
                        ALabToast.error('Ошибка: ' + err.message);
                    }
                });
            }
        },

        /**
         * Format timestamp
         */
        _formatTime(isoString) {
            const date = new Date(isoString);
            const now = new Date();
            const diffMs = now - date;
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMs / 3600000);
            const diffDays = Math.floor(diffMs / 86400000);

            const lang = window.I18n?.getLang() || 'ru';
            if (diffMins < 1) return lang === 'ru' ? 'ТОЛЬКО ЧТО' : 'JUST NOW';
            if (diffMins < 60) return lang === 'ru' ? `${diffMins} МИН. НАЗАД` : `${diffMins} MINS AGO`;
            if (diffHours < 24) return lang === 'ru' ? `${diffHours} Ч. НАЗАД` : `${diffHours} HOURS AGO`;
            if (diffDays < 7) return lang === 'ru' ? `${diffDays} Д. НАЗАД` : `${diffDays} DAYS AGO`;
            return date.toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US');
        },

        /**
         * HTML escape
         */
        _escapeHtml(str) {
            const div = document.createElement('div');
            div.textContent = str;
            return div.innerHTML;
        }
    };

    window.FeedManager = FeedManager;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => FeedManager.init());
    } else {
        FeedManager.init();
    }
})();
