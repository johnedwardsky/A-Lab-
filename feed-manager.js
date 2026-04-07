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

    // ── Image Optimization Config ────────────────────────────
    const IMG_MAX_WIDTH = 1200;   // max px width
    const IMG_MAX_HEIGHT = 1200;  // max px height
    const IMG_QUALITY = 0.8;      // WebP quality (0-1)
    const IMG_QUALITY_LARGE = 0.6; // quality for files >1MB
    const IMG_OUTPUT_TYPE = 'image/webp'; // output format


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
                        <a href="workspace.html?tab=messages&recipient=${r.id}" style="background:transparent;border:1px solid var(--border);color:#888;font-family:var(--font-code);font-size:0.6rem;padding:5px 10px;border-radius:6px;cursor:pointer;transition:0.3s;text-decoration:none;" onmouseover="this.style.borderColor='var(--tech-blue)';this.style.color='var(--tech-blue)'" onmouseout="this.style.borderColor='var(--border)';this.style.color='#888'">💬</a>
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

            // Compute SHA hashes lazily for all visible posts
            this._computePostHashes();
        },

        _renderPostCard(post) {
            const voteCount = post.votes_count || 0;
            const commentCount = post.comments_count || 0;
            const myReaction = post._myReaction || null;
            const hasImage = post.image_url;
            const tags = Array.isArray(post.tags) ? post.tags : [];
            const projectId = post.project_id || null;
            // Pre-compute SHA hash input
            const shaInput = `${post.content || ''}|${post.author_id || ''}|${post.created_at || ''}`;
            const shaPlaceholder = post.content_hash || '';

            // Project map for badges
            const PROJECT_MAP = {
                'M01': { name: 'M01', icon: '🏗️', url: '../m01-internal.html' },
                'ARACHNID': { name: 'ARACHNID', icon: '🕷️', url: '../project_arachnid.html' },
                'AIR_BRIDGES': { name: 'AIR BRIDGES', icon: '🌉', url: '../project_air_bridges.html' },
                'VTEMNOTE': { name: 'В ТЁМНОТЕ', icon: '🌑', url: '../project_vtemnote.html' },
                'RD_OS': { name: 'R&D OS', icon: '⚙️', url: '../rd-os.html' },
                'MATRIX_CORE': { name: 'MATRIX CORE', icon: '🧩', url: '../projects.html' },
                'NEURAL_UI': { name: 'NEURAL UI', icon: '🧠', url: '../projects.html' }
            };
            const project = projectId ? PROJECT_MAP[projectId] : null;

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

                    ${project ? `
                        <div style="margin-bottom:12px;">
                            <a href="${project.url}" target="_blank" style="display:inline-flex;align-items:center;gap:6px;background:rgba(255,42,42,0.06);border:1px solid rgba(255,42,42,0.2);color:var(--accent);padding:5px 12px;border-radius:8px;font-family:var(--font-code);font-size:0.65rem;font-weight:700;text-decoration:none;transition:all 0.3s;letter-spacing:0.5px;" onmouseover="this.style.background='rgba(255,42,42,0.12)';this.style.borderColor='rgba(255,42,42,0.4)'" onmouseout="this.style.background='rgba(255,42,42,0.06)';this.style.borderColor='rgba(255,42,42,0.2)'">
                                <span>${project.icon}</span> ${project.name}
                            </a>
                        </div>
                    ` : ''}

                    ${tags.length > 0 ? `
                        <div style="margin-bottom:12px;display:flex;flex-wrap:wrap;gap:6px;">
                            ${tags.map(t => `<span style="font-family:var(--font-code);font-size:0.6rem;background:rgba(0,229,255,0.06);border:1px solid rgba(0,229,255,0.15);color:var(--tech-blue);padding:3px 8px;border-radius:4px;">${this._escapeHtml(t)}</span>`).join('')}
                        </div>` : ''}

                    <div class="feed-post-content" id="post-content-${post.id}">${this._formatContent(post.content)}</div>

                    <!-- Inline Edit Area (hidden by default) -->
                    <div id="post-edit-${post.id}" style="display:none;margin-bottom:15px;">
                        <textarea id="post-edit-textarea-${post.id}" style="width:100%;min-height:80px;background:rgba(0,0,0,0.3);border:1px solid var(--tech-blue);border-radius:12px;padding:12px 16px;color:white;font-family:var(--font-main);font-size:0.9rem;resize:vertical;outline:none;"></textarea>
                        <div style="display:flex;gap:10px;margin-top:10px;justify-content:flex-end;">
                            <button onclick="FeedManager._cancelEditPost('${post.id}')" style="background:transparent;border:1px solid var(--border);color:#888;padding:6px 16px;border-radius:8px;cursor:pointer;font-family:var(--font-code);font-size:0.7rem;">ОТМЕНА</button>
                            <button onclick="FeedManager._saveEditPost('${post.id}')" style="background:var(--tech-blue);border:none;color:black;padding:6px 20px;border-radius:8px;cursor:pointer;font-family:var(--font-code);font-size:0.7rem;font-weight:700;">СОХРАНИТЬ</button>
                        </div>
                    </div>

                    ${hasImage ? `<div class="feed-post-image-wrap"><img src="${post.image_url}" alt="Post image" class="feed-post-image" loading="lazy" onclick="FeedManager._openLightbox('${post.image_url}', '${post.id}')"></div>` : ''}

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

                    <!-- SHA-256 Digital Fingerprint -->
                    <div class="feed-post-sha" id="post-sha-${post.id}" data-sha-input="${this._escapeHtml(shaInput)}">
                        🔐 SHA-256: <span class="sha-value">${shaPlaceholder || 'вычисляется...'}</span>
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
        async publishPost(content, tags, imageFile, projectId) {
            if (!content?.trim()) { this._toast('⚠️ Введите текст'); return false; }
            if (!tags?.length) { this._toast('⚠️ Выберите тему'); return false; }
            if (!this.residentId) { this._toast('⚠️ Войдите в систему'); return false; }

            const db = window.ALabCore?.db;
            if (!db || !window.ALabCore.isConnected) { this._toast('OFFLINE MODE — пост не сохранён'); return false; }

            let imageUrl = null;

            // Upload image if provided
            if (imageFile) {
                try {
                    // ── Optimize image before upload ──
                    const optimized = await this._optimizeImage(imageFile);
                    const path = `posts/${this.residentId}/${Date.now()}.webp`;
                    const { data: uploadData, error: upErr } = await db.storage
                        .from('post-images')
                        .upload(path, optimized, { contentType: 'image/webp', upsert: false });
                    if (upErr) throw upErr;
                    const { data: urlData } = db.storage.from('post-images').getPublicUrl(path);
                    imageUrl = urlData?.publicUrl || null;
                    console.log(`[FEED] Image optimized: ${(imageFile.size/1024).toFixed(0)}KB → ${(optimized.size/1024).toFixed(0)}KB`);
                } catch (err) {
                    console.warn('[FEED] Image upload failed, posting without image:', err);
                }
            }

            try {
                const insertData = {
                    author_id: this.residentId,
                    content: content.trim(),
                    tags,
                    image_url: imageUrl,
                    votes_count: 0,
                    comments_count: 0
                };
                // Only include project_id if a project was selected
                if (projectId) {
                    insertData.project_id = projectId;
                }

                const { data, error } = await db.from('posts').insert(insertData)
                    .select('*, author:residents!posts_author_id_fkey(id, full_name, avatar_url, role)').single();

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
                    contentEl.innerHTML = this._formatContent(newContent);
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
        _getPostShareUrl(postId) {
            return `${window.location.origin}/residents/post.html?id=${postId}`;
        },

        _getShareText() {
            const isRu = (navigator.language || '').startsWith('ru');
            return isRu 
                ? 'Резиденты A-Lab — сообщество инженеров будущего'
                : 'A-Lab Residents — Community of Future Engineers';
        },

        sharePost(postId) {
            const url = this._getPostShareUrl(postId);
            const text = this._getShareText();

            if (typeof openFeedShareModal === 'function') {
                openFeedShareModal(postId);
                return;
            }

            // Show share picker
            const old = document.getElementById('feedSharePicker');
            if (old) old.remove();

            const picker = document.createElement('div');
            picker.id = 'feedSharePicker';
            picker.className = 'feed-lightbox-overlay';
            picker.onclick = (e) => { if (e.target === picker) picker.remove(); };
            picker.innerHTML = `
                <div class="feed-lightbox-container" style="max-width:400px;">
                    <button class="feed-lightbox-close" onclick="document.getElementById('feedSharePicker').remove()">&times;</button>
                    <div style="text-align:center;margin-bottom:16px;">
                        <svg width="48" height="42" viewBox="0 0 421 370" xmlns="http://www.w3.org/2000/svg">
                            <g stroke="none" fill="none" stroke-linecap="round">
                                <g transform="translate(119.875,77.770)" stroke="#CE3333">
                                    <path d="M52.87,143.98 L88.72,52.74 C89.33,51.2 91.07,50.44 92.61,51.04 C93.35,51.33 93.95,51.91 94.26,52.64 L133.87,143.98" stroke-width="20"/>
                                    <path d="M54.62,144.98 C105.29,94.65 140.21,80.06 159.37,101.23 C186.03,130.66 175.37,160.98 156.62,180.23 C137.87,199.48 112.12,207.48 86.62,205.23 C61.12,202.98 38.87,194.98 21.37,173.73 C3.87,152.48 -3.88,113.48 1.87,86.48 C7.62,59.48 18.62,31.73 52.87,11.48" stroke-width="16"/>
                                </g>
                            </g>
                        </svg>
                        <div style="font-family:var(--font-code);font-size:0.75rem;color:var(--accent);font-weight:700;margin-top:8px;">${this._getShareText()}</div>
                    </div>
                    <div class="feed-lightbox-actions">
                        <button class="feed-lightbox-btn" onclick="FeedManager._shareToSocial('${postId}', 'telegram')">
                            <span>✈️</span> Telegram
                        </button>
                        <button class="feed-lightbox-btn" onclick="FeedManager._shareToSocial('${postId}', 'whatsapp')">
                            <span>💬</span> WhatsApp
                        </button>
                        <button class="feed-lightbox-btn" onclick="FeedManager._shareToSocial('${postId}', 'twitter')">
                            <span>🐦</span> Twitter
                        </button>
                        <button class="feed-lightbox-btn" onclick="FeedManager._copyPostLink('${postId}')">
                            <span>🔗</span> Копировать
                        </button>
                    </div>
                </div>
            `;
            document.body.appendChild(picker);
        },

        _shareToSocial(postId, platform) {
            const url = this._getPostShareUrl(postId);
            const text = this._getShareText();
            let shareUrl = '';
            switch (platform) {
                case 'telegram':
                    shareUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
                    break;
                case 'whatsapp':
                    shareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text + '\n' + url)}`;
                    break;
                case 'twitter':
                    shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
                    break;
            }
            if (shareUrl) window.open(shareUrl, '_blank', 'width=600,height=400');
            document.getElementById('feedSharePicker')?.remove();
        },

        _copyPostLink(postId) {
            const url = this._getPostShareUrl(postId);
            navigator.clipboard.writeText(url).then(() => {
                this._toast('🔗 Ссылка скопирована');
            });
            document.getElementById('feedSharePicker')?.remove();
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

        /* ── SHA-256 Hash Generation ────────────────────────── */
        async _generateSHA256(text) {
            const encoder = new TextEncoder();
            const data = encoder.encode(text);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        },

        async _computePostHashes() {
            const shaElements = document.querySelectorAll('.feed-post-sha[data-sha-input]');
            for (const el of shaElements) {
                const input = el.getAttribute('data-sha-input');
                if (!input) continue;
                const valueEl = el.querySelector('.sha-value');
                if (valueEl && valueEl.textContent !== 'вычисляется...') continue; // already computed
                try {
                    const hash = await this._generateSHA256(input);
                    const shortHash = hash.substring(0, 16);
                    if (valueEl) valueEl.textContent = shortHash;
                    el.title = `Full SHA-256: ${hash}`;
                } catch (_) {
                    if (valueEl) valueEl.textContent = 'N/A';
                }
            }
        },

        _formatContent(text) {
            if (!text) return '';
            const escaped = this._escapeHtml(text);
            // Process line by line for quote detection
            const lines = escaped.split('\n');
            let inQuote = false;
            let quoteLines = [];
            let result = [];

            const flushQuote = () => {
                if (quoteLines.length > 0) {
                    result.push(`<div class="feed-quote-block">${quoteLines.join('<br>')}</div>`);
                    quoteLines = [];
                }
                inQuote = false;
            };

            for (const line of lines) {
                if (line.startsWith('&gt; ') || line.startsWith('&gt;')) {
                    inQuote = true;
                    const content = line.replace(/^&gt;\s?/, '');
                    quoteLines.push(content);
                } else {
                    if (inQuote) flushQuote();
                    result.push(line);
                }
            }
            if (inQuote) flushQuote();

            return this._linkify(result.join('<br>'));
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

        /* ── Image Lightbox ────────────────────────────────────── */
        _openLightbox(imageUrl, postId) {
            // Remove existing lightbox
            const old = document.getElementById('feedLightbox');
            if (old) old.remove();

            const overlay = document.createElement('div');
            overlay.id = 'feedLightbox';
            overlay.className = 'feed-lightbox-overlay';
            overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

            overlay.innerHTML = `
                <div class="feed-lightbox-container">
                    <button class="feed-lightbox-close" onclick="document.getElementById('feedLightbox').remove()">&times;</button>
                    <img src="${imageUrl}" alt="Image" class="feed-lightbox-img">
                    <div class="feed-lightbox-actions">
                        <a href="${imageUrl}" download class="feed-lightbox-btn">
                            <span>⬇️</span> Скачать
                        </a>
                        <button class="feed-lightbox-btn" onclick="FeedManager._quoteLightboxImage('${imageUrl}', '${postId}')">
                            <span>💬</span> Цитировать
                        </button>
                        <button class="feed-lightbox-btn" onclick="FeedManager._shareLightbox('${imageUrl}', 'telegram')">
                            <span>✈️</span> Telegram
                        </button>
                        <button class="feed-lightbox-btn" onclick="FeedManager._shareLightbox('${imageUrl}', 'whatsapp')">
                            <span>💬</span> WhatsApp
                        </button>
                        <button class="feed-lightbox-btn" onclick="FeedManager._shareLightbox('${imageUrl}', 'twitter')">
                            <span>🐦</span> Twitter
                        </button>
                    </div>
                </div>
            `;

            document.body.appendChild(overlay);
            // ESC to close
            const escHandler = (e) => {
                if (e.key === 'Escape') {
                    overlay.remove();
                    document.removeEventListener('keydown', escHandler);
                }
            };
            document.addEventListener('keydown', escHandler);
        },

        _quoteLightboxImage(imageUrl, postId) {
            document.getElementById('feedLightbox')?.remove();
            const post = this.posts.find(p => p.id === postId);
            const authorName = post?.author?.full_name || 'Resident';
            const quoteText = `> ${authorName}: [изображение]\n\n`;
            const textarea = document.getElementById('postContent');
            if (textarea) {
                textarea.value = quoteText;
                textarea.focus();
                const scrollArea = document.querySelector('.feed-scroll-area');
                if (scrollArea) scrollArea.scrollTo({ top: 0, behavior: 'smooth' });
                this._toast('💬 Цитата с изображением добавлена');
            }
        },

        _shareLightbox(imageUrl, platform) {
            // Find the postId from the lightbox context
            const postId = imageUrl; // postId is passed as 2nd param from lightbox buttons
            const text = this._getShareText();
            // If imageUrl looks like a URL, try to find the post with this image
            let sharePostUrl = imageUrl;
            if (imageUrl.startsWith('http')) {
                // Find post by image
                const post = this.posts.find(p => p.image_url === imageUrl);
                if (post) sharePostUrl = this._getPostShareUrl(post.id);
            }
            let shareUrl = '';
            switch (platform) {
                case 'telegram':
                    shareUrl = `https://t.me/share/url?url=${encodeURIComponent(sharePostUrl)}&text=${encodeURIComponent(text)}`;
                    break;
                case 'whatsapp':
                    shareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text + '\n' + sharePostUrl)}`;
                    break;
                case 'twitter':
                    shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(sharePostUrl)}&text=${encodeURIComponent(text)}`;
                    break;
            }
            if (shareUrl) window.open(shareUrl, '_blank', 'width=600,height=400');
            document.getElementById('feedLightbox')?.remove();
        },

        /* ── Client-side image optimization ──────────────────────── */
        async _optimizeImage(file) {
            // Skip non-image files
            if (!file.type.startsWith('image/')) return file;

            // Skip small images (<100KB), already optimized
            if (file.size < 100 * 1024) return file;

            return new Promise((resolve, reject) => {
                const img = new Image();
                const url = URL.createObjectURL(file);

                img.onload = () => {
                    URL.revokeObjectURL(url);

                    let { width, height } = img;

                    // Calculate new dimensions (maintain aspect ratio)
                    if (width > IMG_MAX_WIDTH || height > IMG_MAX_HEIGHT) {
                        const ratio = Math.min(IMG_MAX_WIDTH / width, IMG_MAX_HEIGHT / height);
                        width = Math.round(width * ratio);
                        height = Math.round(height * ratio);
                    }

                    // Draw to canvas
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');

                    // Smooth scaling
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';
                    ctx.drawImage(img, 0, 0, width, height);

                    // Choose quality based on original size
                    const quality = file.size > 1024 * 1024 ? IMG_QUALITY_LARGE : IMG_QUALITY;

                    canvas.toBlob(
                        (blob) => {
                            if (!blob) { resolve(file); return; }
                            // If optimized is somehow bigger, use original
                            if (blob.size >= file.size) { resolve(file); return; }
                            const optimizedFile = new File([blob], file.name.replace(/\.\w+$/, '.webp'), {
                                type: IMG_OUTPUT_TYPE,
                                lastModified: Date.now()
                            });
                            resolve(optimizedFile);
                        },
                        IMG_OUTPUT_TYPE,
                        quality
                    );
                };

                img.onerror = () => {
                    URL.revokeObjectURL(url);
                    resolve(file); // fallback to original
                };

                img.src = url;
            });
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
