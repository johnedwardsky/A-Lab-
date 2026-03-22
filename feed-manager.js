/**
 * A-LAB: FEED MANAGER v3.0
 * ============================================================
 * Full-featured social feed engine.
 * Features: load posts with infinite scroll, create with image,
 *           emoji reactions, comments, edit/delete (author + admin),
 *           share modal, realtime subscriptions, online residents.
 * Depends on: supabase-client.js, auth-guard.js, toast.js
 */

(function () {
    'use strict';

    const EMOJI_REACTIONS = ['🚀', '❤️', '🔥', '🤖', '💡', '👏'];

    const POSTS_PER_PAGE = 15;

    const FeedManager = {
        posts: [],
        residentId: null,
        residentData: null,
        isAdmin: false,
        editingPostId: null,
        _realtimeChannel: null,
        _pendingImageFile: null,
        _page: 0,
        _hasMore: true,
        _loading: false,
        _scrollBound: false,

        /* ── Init ─────────────────────────────────────────────── */
        async init() {
            const handleAuth = async (auth) => {
                if (!auth.mockMode && auth.residentId) {
                    this.residentId = auth.residentId;
                    this.residentData = auth.residentData || null;
                    // Check if user is admin (Founder / Admin role)
                    const role = (auth.residentData?.role || '').toLowerCase();
                    this.isAdmin = ['founder', 'admin', 'co-founder', 'moderator'].includes(role);
                }
                if (document.querySelector('#feedContainer')) {
                    await this.loadPosts();
                    await this.loadOnlineResidents();
                    this._initRealtimeSubscription();
                }
                if (document.querySelector('#myPostsContainer')) {
                    await this.loadMyPosts();
                }
                this._bindUI();
            };

            if (window.ALabAuth && window.ALabAuth.residentId !== undefined) {
                await handleAuth(window.ALabAuth);
            } else {
                document.addEventListener('alab:auth-ready', (e) => handleAuth(e.detail));
            }
        },

        /* ── Realtime ─────────────────────────────────────────── */
        _initRealtimeSubscription() {
            const db = window.ALabCore?.db;
            if (!db || !window.ALabCore.isConnected) return;
            if (this._realtimeChannel) {
                this._realtimeChannel.unsubscribe();
            }
            this._realtimeChannel = db
                .channel('feed:posts-realtime')
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, (payload) => {
                    // Prepend new post without full reload
                    this.posts.unshift(payload.new);
                    this._renderPosts();
                })
                .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'posts' }, (payload) => {
                    this.posts = this.posts.filter(p => p.id !== payload.old.id);
                    this._renderPosts();
                })
                .subscribe();
        },

        /* ── Online Residents ─────────────────────────────────── */
        async loadOnlineResidents() {
            const container = document.getElementById('onlineResidentsList');
            if (!container) return;

            const db = window.ALabCore?.db;
            if (!db || !window.ALabCore.isConnected) {
                container.innerHTML = '<div style="color:#555;font-size:0.75rem;padding:8px;font-family:var(--font-code);">OFFLINE_MODE</div>';
                return;
            }

            try {
                const { data } = await db
                    .from('residents')
                    .select('id, full_name, avatar_url, role, last_seen')
                    .gte('last_seen', new Date(Date.now() - 15 * 60 * 1000).toISOString())
                    .order('last_seen', { ascending: false })
                    .limit(8);

                if (!data || data.length === 0) {
                    container.innerHTML = '<div style="color:#555;font-size:0.75rem;padding:8px;font-family:var(--font-code);">НЕТ АКТИВНЫХ РЕЗИДЕНТОВ</div>';
                    return;
                }

                container.innerHTML = data.map(r => `
                    <div class="feed-resident-item">
                        <div class="feed-resident-meta">
                            <div class="feed-avatar" style="width:34px;height:34px;flex-shrink:0;">
                                ${r.avatar_url
                        ? `<img src="${r.avatar_url}" alt="${r.full_name}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`
                        : `<span style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;font-size:1rem;">👤</span>`
                    }
                            </div>
                            <div>
                                <div style="font-size:0.82rem;font-weight:600;line-height:1.2;">${this._escapeHtml(r.full_name)}</div>
                                ${r.role ? `<div style="font-family:var(--font-code);font-size:0.58rem;color:var(--tech-blue);">${r.role.toUpperCase()}</div>` : ''}
                            </div>
                        </div>
                        <a href="messages.html?recipient=${r.id}" style="background:transparent;border:1px solid var(--border);color:#888;font-family:var(--font-code);font-size:0.6rem;padding:5px 10px;border-radius:6px;cursor:pointer;transition:0.3s;text-decoration:none;" onmouseover="this.style.borderColor='var(--tech-blue)';this.style.color='var(--tech-blue)'" onmouseout="this.style.borderColor='var(--border)';this.style.color='#888'">💬</a>
                    </div>
                `).join('');
            } catch (e) {
                console.error('[FEED] Online residents error:', e);
            }
        },

        /* ── Load Posts (with pagination) ────────────────────── */
        async loadPosts(reset = true) {
            const container = document.querySelector('#feedContainer');
            if (!container) return;

            const db = window.ALabCore?.db;
            if (!db || !window.ALabCore.isConnected) {
                container.innerHTML = '<div style="text-align:center;padding:40px;color:#555;font-family:var(--font-code);font-size:0.75rem;">OFFLINE // Supabase не подключён</div>';
                return;
            }

            if (this._loading) return;
            this._loading = true;

            if (reset) {
                this._page = 0;
                this._hasMore = true;
                this.posts = [];
                container.innerHTML = '<div style="text-align:center;padding:30px;color:#555;font-family:var(--font-code);font-size:0.7rem;">LOADING_FEED...</div>';
            }

            const from = this._page * POSTS_PER_PAGE;
            const to = from + POSTS_PER_PAGE - 1;

            try {
                const { data, error } = await db
                    .from('posts')
                    .select(`
                        *,
                        author:residents!posts_author_id_fkey(id, full_name, avatar_url, role)
                    `)
                    .order('created_at', { ascending: false })
                    .range(from, to);

                if (error) throw error;

                // Check if more posts available
                if (!data || data.length < POSTS_PER_PAGE) {
                    this._hasMore = false;
                }

                // Fetch my reactions if logged in
                let myReactions = {};
                if (this.residentId && data?.length) {
                    try {
                        const postIds = data.map(p => p.id);
                        const { data: rxData } = await db
                            .from('post_reactions')
                            .select('post_id, emoji')
                            .eq('resident_id', this.residentId)
                            .in('post_id', postIds);
                        if (rxData) {
                            rxData.forEach(r => { myReactions[r.post_id] = r.emoji; });
                        }
                    } catch (_) { }
                }

                const newPosts = (data || []).map(p => ({ ...p, _myReaction: myReactions[p.id] || null }));
                this.posts = reset ? newPosts : [...this.posts, ...newPosts];
                this._page++;
                this._renderPosts();
                this._initInfiniteScroll();
            } catch (err) {
                console.error('[FEED] Load error:', err);
                if (reset) {
                    container.innerHTML = `<div style="text-align:center;padding:40px;color:#555;font-family:var(--font-code);font-size:0.75rem;">FEED_ERROR: ${err.message}</div>`;
                }
            } finally {
                this._loading = false;
            }
        },

        /* ── Load More (infinite scroll trigger) ─────────────── */
        async _loadMore() {
            if (!this._hasMore || this._loading) return;
            await this.loadPosts(false);
        },

        _initInfiniteScroll() {
            if (this._scrollBound) return;
            this._scrollBound = true;

            const scrollArea = document.querySelector('.feed-scroll-area');
            if (!scrollArea) return;

            scrollArea.addEventListener('scroll', () => {
                if (!this._hasMore || this._loading) return;
                const { scrollTop, scrollHeight, clientHeight } = scrollArea;
                if (scrollTop + clientHeight >= scrollHeight - 200) {
                    this._loadMore();
                }
            });
        },

        /* ── Render Posts ─────────────────────────────────────── */
        _renderPosts() {
            const container = document.querySelector('#feedContainer');
            if (!container) return;

            if (this.posts.length === 0) {
                container.innerHTML = `
                    <div style="text-align:center;padding:60px 40px;color:#555;font-family:var(--font-code);font-size:0.8rem;border:1px dashed rgba(255,255,255,0.05);border-radius:20px;">
                        <div style="font-size:2rem;margin-bottom:12px;">📡</div>
                        НЕТ ПОСТОВ // ЛЕНТА ПУСТА<br>
                        <span style="font-size:0.65rem;color:#333;margin-top:8px;display:block;">Будьте первым — опубликуйте пост выше</span>
                    </div>`;
                return;
            }

            let html = this.posts.map(post => this._renderPostCard(post)).join('');

            // Load More / End indicator
            if (this._hasMore) {
                html += `
                    <div id="feedLoadMore" style="text-align:center;padding:25px;">
                        <button onclick="FeedManager._loadMore()" style="background:rgba(0,229,255,0.08);border:1px solid rgba(0,229,255,0.2);color:var(--tech-blue);padding:10px 30px;border-radius:10px;cursor:pointer;font-family:var(--font-code);font-size:0.75rem;transition:all 0.3s;" onmouseover="this.style.background='rgba(0,229,255,0.15)'" onmouseout="this.style.background='rgba(0,229,255,0.08)'">ЗАГРУЗИТЬ ЕЩЁ ↓</button>
                    </div>`;
            } else if (this.posts.length > POSTS_PER_PAGE - 1) {
                html += `
                    <div style="text-align:center;padding:20px;color:#333;font-family:var(--font-code);font-size:0.65rem;">
                        ── END_OF_FEED ──
                    </div>`;
            }

            container.innerHTML = html;
        },

        _renderPostCard(post) {
            const voteCount = post.votes_count || 0;
            const commentCount = post.comments_count || 0;
            const myReaction = post._myReaction || null;
            const hasImage = post.image_url;
            const tags = Array.isArray(post.tags) ? post.tags : [];

            return `
                <div class="feed-post-card" id="post-card-${post.id}" data-post-id="${post.id}">
                    <div class="feed-post-header">
                        <div class="feed-user-block">
                            <div class="feed-avatar">
                                ${post.author?.avatar_url
                    ? `<img src="${post.author.avatar_url}" alt="${post.author?.full_name}">`
                    : `<span style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;font-size:1.2rem;">👤</span>`
                }
                            </div>
                            <div>
                                <div class="feed-user-name">
                                    <a href="profile.html?id=${post.author_id}" style="color:inherit;text-decoration:none;">${this._escapeHtml(post.author?.full_name || 'Resident')}</a>
                                </div>
                                <div class="feed-user-role">${post.author?.role ? post.author.role.toUpperCase() : 'RESIDENT'}</div>
                            </div>
                        </div>
                        <div style="display:flex;align-items:center;gap:12px;">
                            <div class="feed-post-time">${this._formatTime(post.created_at)}${post.updated_at && post.updated_at !== post.created_at ? ' <span style="font-size:0.55rem;color:#555;">(ред.)</span>' : ''}</div>
                            ${(post.author_id === this.residentId || this.isAdmin) ? `
                                <div style="position:relative;" id="post-menu-wrap-${post.id}">
                                    <button class="post-menu-btn" onclick="event.stopPropagation();FeedManager._togglePostMenu('${post.id}')" title="Действия">⋯</button>
                                    <div class="post-dropdown-menu" id="post-menu-${post.id}">
                                        <button class="post-dropdown-item" onclick="FeedManager._startEditPost('${post.id}')">
                                            <span>✏️</span> Редактировать
                                        </button>
                                        <button class="post-dropdown-item" onclick="FeedManager._quotePost('${post.id}')">
                                            <span>💬</span> Цитировать
                                        </button>
                                        <button class="post-dropdown-item danger" onclick="FeedManager._deletePost('${post.id}')">
                                            <span>🗑</span> Удалить
                                        </button>
                                    </div>
                                </div>` : `
                                <div style="position:relative;" id="post-menu-wrap-${post.id}">
                                    <button class="post-menu-btn" onclick="event.stopPropagation();FeedManager._togglePostMenu('${post.id}')" title="Действия">⋯</button>
                                    <div class="post-dropdown-menu" id="post-menu-${post.id}">
                                        <button class="post-dropdown-item" onclick="FeedManager._quotePost('${post.id}')">
                                            <span>💬</span> Цитировать
                                        </button>
                                    </div>
                                </div>`}
                        </div>
                    </div>

                    ${tags.length > 0 ? `
                        <div style="margin-bottom:12px;display:flex;flex-wrap:wrap;gap:6px;">
                            ${tags.map(t => `<span style="font-family:var(--font-code);font-size:0.6rem;background:rgba(0,229,255,0.06);border:1px solid rgba(0,229,255,0.15);color:var(--tech-blue);padding:3px 8px;border-radius:4px;">${this._escapeHtml(t)}</span>`).join('')}
                        </div>` : ''}

                    <div class="feed-post-content" id="post-content-${post.id}">${this._linkify(this._escapeHtml(post.content))}</div>

                    <!-- Inline Edit Area (hidden by default) -->
                    <div id="post-edit-${post.id}" style="display:none;margin-bottom:15px;">
                        <textarea id="post-edit-textarea-${post.id}" style="width:100%;min-height:80px;background:rgba(0,0,0,0.3);border:1px solid var(--tech-blue);border-radius:12px;padding:12px 16px;color:white;font-family:var(--font-main);font-size:0.9rem;resize:vertical;outline:none;"></textarea>
                        <div style="display:flex;gap:10px;margin-top:10px;justify-content:flex-end;">
                            <button onclick="FeedManager._cancelEditPost('${post.id}')" style="background:transparent;border:1px solid var(--border);color:#888;padding:6px 16px;border-radius:8px;cursor:pointer;font-family:var(--font-code);font-size:0.7rem;">ОТМЕНА</button>
                            <button onclick="FeedManager._saveEditPost('${post.id}')" style="background:var(--tech-blue);border:none;color:black;padding:6px 20px;border-radius:8px;cursor:pointer;font-family:var(--font-code);font-size:0.7rem;font-weight:700;">СОХРАНИТЬ</button>
                        </div>
                    </div>

                    ${hasImage ? `<img src="${post.image_url}" alt="Post image" style="width:100%;border-radius:14px;margin-bottom:15px;border:1px solid var(--border);object-fit:cover;max-height:400px;" loading="lazy">` : ''}

                    <div class="feed-post-footer" style="flex-wrap:wrap;gap:8px;">
                        <!-- Reactions -->
                        <div style="position:relative;display:inline-flex;align-items:center;">
                            <button class="feed-action-btn ${myReaction ? 'voted' : ''}" 
                                    id="reaction-btn-${post.id}"
                                    onclick="FeedManager._toggleReactionPicker('${post.id}')"
                                    title="Реакция">
                                ${myReaction || '🚀'} <span id="votes-${post.id}">${voteCount}</span>
                            </button>
                            <!-- Emoji Picker -->
                            <div id="emoji-picker-${post.id}" style="display:none;position:absolute;bottom:100%;left:0;background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:10px;z-index:200;display:none;flex-direction:row;gap:6px;box-shadow:0 10px 30px rgba(0,0,0,0.6);">
                                ${EMOJI_REACTIONS.map(emo => `
                                    <button onclick="FeedManager.reactToPost('${post.id}', '${emo}')" 
                                            style="font-size:1.3rem;background:transparent;border:none;cursor:pointer;padding:4px;border-radius:8px;transition:transform 0.2s;" 
                                            onmouseover="this.style.transform='scale(1.3)'" onmouseout="this.style.transform='scale(1)'">${emo}</button>
                                `).join('')}
                            </div>
                        </div>

                        <!-- Comments -->
                        <button class="feed-action-btn" onclick="FeedManager.toggleComments('${post.id}')">
                            💬 <span id="comments-count-${post.id}">${commentCount}</span>
                        </button>

                        <!-- Share -->
                        <button class="feed-action-btn" onclick="FeedManager.sharePost('${post.id}')">
                            📡
                        </button>
                    </div>

                    <!-- Comments section -->
                    <div id="comments-${post.id}" class="comments-container" style="display:none;flex-direction:column;gap:12px;margin-top:16px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.04);">
                        <div id="comments-list-${post.id}" style="display:flex;flex-direction:column;gap:10px;"></div>
                        ${this.residentId ? `
                        <div style="display:flex;gap:10px;margin-top:6px;">
                            <div class="feed-avatar" style="width:32px;height:32px;flex-shrink:0;">${this.residentData?.avatar_url ? `<img src="${this.residentData.avatar_url}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">` : '👤'}</div>
                            <div style="flex:1;display:flex;gap:8px;">
                                <input type="text" id="comment-input-${post.id}" placeholder="Написать комментарий..." style="flex:1;background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:8px;padding:8px 14px;color:white;font-family:var(--font-main);font-size:0.85rem;outline:none;" onkeydown="if(event.key==='Enter')FeedManager.submitComment('${post.id}')">
                                <button onclick="FeedManager.submitComment('${post.id}')" style="background:var(--tech-blue);border:none;color:black;width:34px;height:34px;border-radius:8px;cursor:pointer;font-size:0.9rem;flex-shrink:0;">➤</button>
                            </div>
                        </div>` : ''}
                    </div>
                </div>
            `;
        },

        /* ── Reaction Picker ──────────────────────────────────── */
        _toggleReactionPicker(postId) {
            const picker = document.getElementById(`emoji-picker-${postId}`);
            if (!picker) return;
            const isVisible = picker.style.display === 'flex';
            // Close all pickers
            document.querySelectorAll('[id^="emoji-picker-"]').forEach(p => p.style.display = 'none');
            if (!isVisible) picker.style.display = 'flex';
        },

        async reactToPost(postId, emoji) {
            // Close picker
            const picker = document.getElementById(`emoji-picker-${postId}`);
            if (picker) picker.style.display = 'none';

            if (!this.residentId) {
                this._toast('Войдите чтобы оставить реакцию');
                return;
            }

            const post = this.posts.find(p => p.id === postId);
            if (!post) return;

            const sameReaction = post._myReaction === emoji;
            const db = window.ALabCore?.db;

            // Optimistic UI
            const prevReaction = post._myReaction;
            const prevCount = post.votes_count || 0;

            if (sameReaction) {
                // Remove reaction
                post._myReaction = null;
                post.votes_count = Math.max(0, prevCount - 1);
            } else {
                post._myReaction = emoji;
                post.votes_count = prevCount + (prevReaction ? 0 : 1);
            }

            const btnEl = document.getElementById(`reaction-btn-${postId}`);
            const countEl = document.getElementById(`votes-${postId}`);
            if (btnEl) {
                btnEl.innerHTML = `${post._myReaction || '🚀'} <span id="votes-${postId}">${post.votes_count}</span>`;
                btnEl.classList.toggle('voted', !!post._myReaction);
            } else if (countEl) {
                countEl.innerText = post.votes_count;
            }

            if (!db || !window.ALabCore.isConnected) return;

            try {
                if (sameReaction) {
                    await db.from('post_reactions').delete()
                        .eq('post_id', postId)
                        .eq('resident_id', this.residentId);
                } else {
                    await db.from('post_reactions').upsert({
                        post_id: postId,
                        resident_id: this.residentId,
                        emoji
                    }, { onConflict: 'post_id,resident_id' });
                }
                // Update votes_count in posts table
                await db.from('posts').update({ votes_count: post.votes_count }).eq('id', postId);
            } catch (err) {
                console.warn('[FEED] Reaction error:', err);
                // Rollback
                post._myReaction = prevReaction;
                post.votes_count = prevCount;
            }
        },

        /* ── Comments ─────────────────────────────────────────── */
        toggleComments(postId) {
            const container = document.getElementById(`comments-${postId}`);
            if (!container) return;
            const isOpen = container.style.display !== 'none' && container.style.display !== '';
            container.style.display = isOpen ? 'none' : 'flex';
            if (!isOpen) this.loadComments(postId);
        },

        async loadComments(postId) {
            const listEl = document.getElementById(`comments-list-${postId}`);
            if (!listEl) return;

            listEl.innerHTML = '<div style="font-size:0.7rem;color:#555;padding:8px;font-family:var(--font-code);">LOADING...</div>';

            const db = window.ALabCore?.db;
            if (!db || !window.ALabCore.isConnected) {
                listEl.innerHTML = '<div style="font-size:0.7rem;color:#555;padding:8px;font-family:var(--font-code);">OFFLINE_MODE</div>';
                return;
            }

            try {
                const { data, error } = await db
                    .from('post_comments')
                    .select(`
                        id, content, created_at,
                        author:residents!post_comments_author_id_fkey(full_name, avatar_url)
                    `)
                    .eq('post_id', postId)
                    .order('created_at', { ascending: true })
                    .limit(30);

                if (error) throw error;

                if (!data || data.length === 0) {
                    listEl.innerHTML = '<div style="font-size:0.7rem;color:#555;padding:8px;font-family:var(--font-code);">КОММЕНТАРИЕВ НЕТ // Будьте первым</div>';
                    return;
                }

                listEl.innerHTML = data.map(c => `
                    <div style="display:flex;gap:10px;">
                        <div class="feed-avatar" style="width:30px;height:30px;flex-shrink:0;">
                            ${c.author?.avatar_url
                        ? `<img src="${c.author.avatar_url}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`
                        : `<span style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;font-size:0.9rem;">👤</span>`
                    }
                        </div>
                        <div style="background:rgba(255,255,255,0.03);padding:8px 14px;border-radius:12px;flex:1;">
                            <div style="display:flex;justify-content:space-between;margin-bottom:3px;">
                                <span style="font-weight:700;font-size:0.75rem;">${this._escapeHtml(c.author?.full_name || 'Резидент')}</span>
                                <span style="font-size:0.6rem;color:#555;font-family:var(--font-code);">${this._formatTime(c.created_at)}</span>
                            </div>
                            <div style="font-size:0.85rem;color:#ccc;line-height:1.4;">${this._linkify(this._escapeHtml(c.content))}</div>
                        </div>
                    </div>
                `).join('');
            } catch (err) {
                listEl.innerHTML = `<div style="font-size:0.7rem;color:#555;padding:8px;font-family:var(--font-code);">COMMENT_ERROR: ${err.message}</div>`;
            }
        },

        async submitComment(postId) {
            const inputEl = document.getElementById(`comment-input-${postId}`);
            if (!inputEl) return;

            const content = inputEl.value.trim();
            if (!content) return;

            if (!this.residentId) { this._toast('Войдите чтобы комментировать'); return; }

            const db = window.ALabCore?.db;
            if (!db || !window.ALabCore.isConnected) { this._toast('OFFLINE MODE'); return; }

            inputEl.disabled = true;
            try {
                const { error } = await db.from('post_comments').insert({
                    post_id: postId,
                    author_id: this.residentId,
                    content
                });
                if (error) throw error;

                inputEl.value = '';
                // Increment comment count optimistically
                const post = this.posts.find(p => p.id === postId);
                if (post) {
                    post.comments_count = (post.comments_count || 0) + 1;
                    const countEl = document.getElementById(`comments-count-${postId}`);
                    if (countEl) countEl.innerText = post.comments_count;
                }
                await this.loadComments(postId);
            } catch (err) {
                this._toast('Ошибка отправки: ' + err.message);
            } finally {
                inputEl.disabled = false;
                inputEl.focus();
            }
        },

        /* ── Create / Publish Post ────────────────────────────── */
        async publishPost(content, tags, imageFile) {
            if (!content?.trim()) { this._toast('⚠️ Введите текст'); return false; }
            if (!tags?.length) { this._toast('⚠️ Выберите тему'); return false; }
            if (!this.residentId) { this._toast('⚠️ Войдите в систему'); return false; }

            const db = window.ALabCore?.db;
            if (!db || !window.ALabCore.isConnected) { this._toast('OFFLINE MODE — пост не сохранён'); return false; }

            let imageUrl = null;

            // Upload image if provided
            if (imageFile) {
                try {
                    const ext = imageFile.name.split('.').pop();
                    const path = `posts/${this.residentId}/${Date.now()}.${ext}`;
                    const { data: uploadData, error: upErr } = await db.storage
                        .from('post-images')
                        .upload(path, imageFile, { contentType: imageFile.type, upsert: false });
                    if (upErr) throw upErr;
                    const { data: urlData } = db.storage.from('post-images').getPublicUrl(path);
                    imageUrl = urlData?.publicUrl || null;
                } catch (err) {
                    console.warn('[FEED] Image upload failed, posting without image:', err);
                }
            }

            try {
                const { data, error } = await db.from('posts').insert({
                    author_id: this.residentId,
                    content: content.trim(),
                    tags,
                    image_url: imageUrl,
                    votes_count: 0,
                    comments_count: 0
                }).select('*, author:residents!posts_author_id_fkey(id, full_name, avatar_url, role)').single();

                if (error) throw error;

                this._toast('✅ Пост опубликован!');
                // Prepend to posts array
                if (data) {
                    this.posts.unshift({ ...data, _myReaction: null });
                    this._renderPosts();
                } else {
                    await this.loadPosts();
                }
                return true;
            } catch (err) {
                console.error('[FEED] Publish error:', err);
                this._toast('❌ Ошибка: ' + (err.message || 'неизвестная ошибка'));
                return false;
            }
        },

        /* ── Delete Post (author or admin) ──────────────────────*/
        async _deletePost(postId) {
            if (!confirm('Удалить этот пост?')) return;
            const db = window.ALabCore?.db;
            if (!db) return;

            const post = this.posts.find(p => p.id === postId);
            const isOwner = post?.author_id === this.residentId;

            try {
                let query = db.from('posts').delete().eq('id', postId);
                // If not admin, restrict to own posts only
                if (!this.isAdmin) {
                    query = query.eq('author_id', this.residentId);
                }
                const { error } = await query;
                if (error) throw error;
                this.posts = this.posts.filter(p => p.id !== postId);
                this._renderPosts();
                this._toast(isOwner ? '🗑 Пост удалён' : '🗑 Пост удалён (админ)');
            } catch (err) {
                this._toast('Ошибка удаления: ' + err.message);
            }
        },

        /* ── Edit Post (inline) ──────────────────────────────────*/
        _startEditPost(postId) {
            // Close all menus
            document.querySelectorAll('.post-dropdown-menu').forEach(m => m.classList.remove('active'));

            const post = this.posts.find(p => p.id === postId);
            if (!post) return;

            // Show edit area, hide content
            const contentEl = document.getElementById(`post-content-${postId}`);
            const editEl = document.getElementById(`post-edit-${postId}`);
            const textareaEl = document.getElementById(`post-edit-textarea-${postId}`);

            if (contentEl) contentEl.style.display = 'none';
            if (editEl) editEl.style.display = 'block';
            if (textareaEl) {
                textareaEl.value = post.content;
                textareaEl.focus();
                // Auto-resize
                textareaEl.style.height = 'auto';
                textareaEl.style.height = textareaEl.scrollHeight + 'px';
            }

            this.editingPostId = postId;
        },

        _cancelEditPost(postId) {
            const contentEl = document.getElementById(`post-content-${postId}`);
            const editEl = document.getElementById(`post-edit-${postId}`);

            if (contentEl) contentEl.style.display = '';
            if (editEl) editEl.style.display = 'none';

            this.editingPostId = null;
        },

        async _saveEditPost(postId) {
            const textareaEl = document.getElementById(`post-edit-textarea-${postId}`);
            if (!textareaEl) return;

            const newContent = textareaEl.value.trim();
            if (!newContent) { this._toast('⚠️ Текст не может быть пустым'); return; }

            const db = window.ALabCore?.db;
            if (!db) return;

            try {
                // Try with updated_at first, fall back without it
                let updateData = { content: newContent };
                let query = db.from('posts').update(updateData).eq('id', postId);

                // If not admin, restrict to own posts
                if (!this.isAdmin) {
                    query = query.eq('author_id', this.residentId);
                }

                let { error } = await query;

                // If updated_at column exists, update it separately
                if (!error) {
                    try {
                        await db.from('posts').update({ updated_at: new Date().toISOString() }).eq('id', postId);
                    } catch (_) { /* updated_at column may not exist yet */ }
                }
                if (error) throw error;

                // Update local data
                const post = this.posts.find(p => p.id === postId);
                if (post) {
                    post.content = newContent;
                    post.updated_at = new Date().toISOString();
                }

                // Update DOM
                const contentEl = document.getElementById(`post-content-${postId}`);
                const editEl = document.getElementById(`post-edit-${postId}`);

                if (contentEl) {
                    contentEl.innerHTML = this._linkify(this._escapeHtml(newContent));
                    contentEl.style.display = '';
                }
                if (editEl) editEl.style.display = 'none';

                this.editingPostId = null;
                this._toast('✅ Пост обновлён');
            } catch (err) {
                this._toast('Ошибка сохранения: ' + err.message);
            }
        },

        /* ── Post menu toggle ────────────────────────────────────*/
        _togglePostMenu(postId) {
            const menuEl = document.getElementById(`post-menu-${postId}`);
            if (!menuEl) return;
            const isActive = menuEl.classList.contains('active');
            // Close all menus first
            document.querySelectorAll('.post-dropdown-menu').forEach(m => m.classList.remove('active'));
            if (!isActive) menuEl.classList.add('active');
        },

        /* ── Quote Post ──────────────────────────────────────────*/
        _quotePost(postId) {
            // Close menu
            document.querySelectorAll('.post-dropdown-menu').forEach(m => m.classList.remove('active'));

            const post = this.posts.find(p => p.id === postId);
            if (!post) return;

            const authorName = post.author?.full_name || 'Resident';
            const shortContent = post.content.length > 120 ? post.content.substring(0, 120) + '...' : post.content;
            const quoteText = `> ${authorName}: «${shortContent}»\n\n`;

            // Insert into post creation textarea
            const textarea = document.getElementById('postContent');
            if (textarea) {
                textarea.value = quoteText;
                textarea.focus();
                textarea.style.height = 'auto';
                textarea.style.height = textarea.scrollHeight + 'px';
                // Scroll to top to show the create form
                const scrollArea = document.querySelector('.feed-scroll-area');
                if (scrollArea) scrollArea.scrollTo({ top: 0, behavior: 'smooth' });
                this._toast('💬 Цитата добавлена — дополните ответ');
            }
        },

        /* ── Share ───────────────────────────────────────────────*/
        sharePost(postId) {
            // Try to call the workspace share modal if available
            if (typeof openFeedShareModal === 'function') {
                openFeedShareModal(postId);
            } else {
                const url = `${window.location.origin}/post/${postId}`;
                if (navigator.share) {
                    navigator.share({ title: 'A-LAB Post', url }).catch(() => { });
                } else {
                    navigator.clipboard.writeText(url).then(() => {
                        this._toast('🔗 Ссылка скопирована');
                    });
                }
            }
        },

        /* ── My Posts (workspace admin tab) ─────────────────────*/
        async loadMyPosts() {
            const db = window.ALabCore?.db;
            if (!db || !window.ALabCore.isConnected || !this.residentId) return;

            const container = document.querySelector('#myPostsContainer');
            if (!container) return;

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

        _renderMyPosts() {
            const container = document.querySelector('#myPostsContainer');
            if (!container) return;

            if (this.posts.length === 0) {
                container.innerHTML = '<div style="text-align:center;padding:30px;color:#555;font-family:var(--font-code);font-size:0.8rem;">У ВАС ЕЩЁ НЕТ ПОСТОВ</div>';
                return;
            }

            container.innerHTML = this.posts.map(post => `
                <div class="post-item" data-post-id="${post.id}" style="background:rgba(0,0,0,0.1);padding:15px;border-radius:10px;border:1px solid var(--border);">
                    <div style="font-size:0.7rem;color:#555;margin-bottom:5px;font-family:var(--font-code);">${this._formatTime(post.created_at)}</div>
                    <p style="font-size:0.9rem;" id="postContent-${post.id}">${this._escapeHtml(post.content)}</p>
                    <div style="margin-top:10px;display:flex;gap:10px;">
                        <button class="status-btn hover-trigger" style="padding:5px 10px;" onclick="FeedManager._deletePost('${post.id}')">🗑 Удалить</button>
                    </div>
                </div>
            `).join('');
        },

        /* ── Bind UI ──────────────────────────────────────────── */
        _bindUI() {
            // Legacy admin post button
            const publishBtn = document.querySelector('#publishPostBtn');
            if (publishBtn) {
                publishBtn.addEventListener('click', () => this.createPost());
            }

            // Close menus/pickers on outside click
            document.addEventListener('click', (e) => {
                if (!e.target.closest('[id^="post-menu-wrap-"]') && !e.target.closest('.post-menu-btn')) {
                    document.querySelectorAll('.post-dropdown-menu').forEach(m => m.classList.remove('active'));
                }
                if (!e.target.closest('[id^="emoji-picker-"]') && !e.target.closest('[id^="reaction-btn-"]')) {
                    document.querySelectorAll('[id^="emoji-picker-"]').forEach(p => p.style.display = 'none');
                }
            });
        },

        /* ── Legacy createPost (admin workspace) ─────────────── */
        async createPost() {
            const textarea = document.querySelector('#newPostTextarea');
            if (!textarea) return;
            const content = textarea.value.trim();
            if (!content) { this._toast('Напишите что-нибудь'); return; }
            const ok = await this.publishPost(content, ['Community'], null);
            if (ok) textarea.value = '';
        },

        /* ── Helpers ──────────────────────────────────────────── */
        _formatTime(isoString) {
            if (!isoString) return '';
            const date = new Date(isoString);
            const now = new Date();
            const diffMs = now - date;
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMs / 3600000);
            const diffDays = Math.floor(diffMs / 86400000);

            if (diffMins < 1) return 'ТОЛЬКО ЧТО';
            if (diffMins < 60) return `${diffMins} МИН. НАЗАД`;
            if (diffHours < 24) return `${diffHours} Ч. НАЗАД`;
            if (diffDays < 7) return `${diffDays} Д. НАЗАД`;
            return date.toLocaleDateString('ru-RU');
        },

        _escapeHtml(str) {
            if (!str) return '';
            const div = document.createElement('div');
            div.textContent = str;
            return div.innerHTML;
        },

        _linkify(text) {
            return text.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener" style="color:var(--tech-blue);text-decoration:none;">$1</a>');
        },

        _toast(msg) {
            if (typeof showToast === 'function') showToast(msg);
            else if (window.ALABToast?.info) ALABToast.info(msg);
            else console.info('[FEED]', msg);
        }
    };

    window.FeedManager = FeedManager;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => FeedManager.init());
    } else {
        FeedManager.init();
    }
})();
