/**
 * A-LAB: RESIDENT PROFILE MANAGER
 * ============================================================
 * Handles: loading profile, saving changes, avatar upload, skill tags.
 * Depends on: supabase-client.js, auth-guard.js, toast.js
 */

(function () {
    'use strict';

    const ProfileManager = {
        profile: null,
        residentId: null,
        isDirty: false,

        /**
         * Initialize — call after auth is ready
         */
        async init() {
            document.addEventListener('alab:auth-ready', async (e) => {
                const auth = e.detail;
                if (auth.mockMode) {
                    console.log('[PROFILE] Running in mock mode — no data loading.');
                    this._bindUI();
                    return;
                }
                if (auth.profile) {
                    this.profile = auth.profile;
                    this.residentId = auth.profile.id;
                    this._populateForm(auth.profile);
                }
                this._bindUI();
            });
        },

        /**
         * Populate form fields from profile data
         */
        _populateForm(p) {
            // Name & Role
            const nameInput = document.querySelector('#profileName');
            const roleInput = document.querySelector('#profileRole');
            const bioTextarea = document.querySelector('#profileBio');

            if (nameInput) nameInput.value = p.full_name || '';
            if (roleInput) roleInput.value = p.role || '';
            if (bioTextarea) bioTextarea.value = p.bio || '';

            // Avatar
            const avatarImg = document.querySelector('#avatarPreview');
            if (avatarImg && p.avatar_url) {
                avatarImg.src = p.avatar_url;
            }

            // Links
            const links = p.links || {};
            const portfolioInput = document.querySelector('#profilePortfolio');
            const githubInput = document.querySelector('#profileGithub');
            const telegramInput = document.querySelector('#profileTelegram');
            const twitterInput = document.querySelector('#profileTwitter');

            if (portfolioInput) portfolioInput.value = links.portfolio || '';
            if (githubInput) githubInput.value = links.github || '';
            if (telegramInput) telegramInput.value = links.telegram || '';
            if (twitterInput) twitterInput.value = links.twitter || '';

            // Skills/tags
            const skills = p.skills || [];
            this._renderSkillTags(skills);

            // Status
            const status = p.status || 'open';
            document.querySelectorAll('.status-btn').forEach(btn => {
                btn.classList.remove('active');
                if (btn.classList.contains(status)) {
                    btn.classList.add('active');
                }
            });

            // Preview card
            this._updatePreview(p);

            // Settings tab (Detailed)
            const s = p.settings || {};
            const langSelect = document.querySelector('#settingLang');
            const visibilitySelect = document.querySelector('#settingVisibility');
            const onlineCheck = document.querySelector('#settingOnlineStatus');
            const emailCheck = document.querySelector('#settingEmailNotifs');
            const pushCheck = document.querySelector('#settingPushNotifs');
            const weeklyCheck = document.querySelector('#settingWeeklyDigest');
            const notifsBtn = document.querySelector('#settingNotifs');

            if (langSelect) langSelect.value = s.language || 'ru';
            if (visibilitySelect) visibilitySelect.value = s.visibility || 'public';
            if (onlineCheck) onlineCheck.checked = s.online_status !== 'hide';

            if (s.notifications) {
                if (emailCheck) emailCheck.checked = s.notifications.email !== false;
                if (pushCheck) pushCheck.checked = s.notifications.push !== false;
                if (weeklyCheck) weeklyCheck.checked = s.notifications.weekly_digest === true;
            }

            if (notifsBtn) {
                const areNotifsEnabled = s.notifications?.push !== false;
                notifsBtn.innerText = areNotifsEnabled ? 'ВКЛЮЧЕНЫ' : 'ВЫКЛЮЧЕНЫ';
                notifsBtn.classList.toggle('active', areNotifsEnabled);
                notifsBtn.classList.toggle('open', areNotifsEnabled);
            }
            // Achievements/Badges
            const badges = p.achievements || [
                { id: 'early_adopter', icon: '🚀', title: 'Early Adopter', on_chain: false },
                { id: 'top_contributor', icon: '💎', title: 'Top Contributor', on_chain: true },
                { id: 'beta_tester', icon: '🛠️', title: 'Beta Tester', on_chain: false }
            ];
            this._renderBadges(badges);
        },

        /**
         * Render achievement badges
         */
        _renderBadges(badges) {
            const container = document.querySelector('#achievementList');
            if (!container) return;

            container.innerHTML = badges.map(b => `
                <div class="badge hover-trigger ${b.on_chain ? 'verified' : ''}" data-title="${b.title}">
                    ${b.icon}
                    ${!b.on_chain ? `<button class="badge-mint-btn" onclick="ProfileManager.mintBadge('${b.id}')">MINT_NFT</button>` : ''}
                </div>
            `).join('');
        },

        /**
         * Mint Badge as NFT
         */
        async mintBadge(id) {
            const wallet = typeof Web3Manager !== 'undefined' ? Web3Manager.getAccount() : null;
            if (!wallet) {
                if (typeof ALABToast !== 'undefined') ALABToast.info('Подключите кошелек для минта NFT');
                return;
            }

            try {
                if (typeof ALABToast !== 'undefined') ALABToast.info('Подготовка транзакции минта...');

                // Simulate minting delay
                await new Promise(r => setTimeout(r, 1500));

                if (typeof ALABToast !== 'undefined') ALABToast.success('Achievement minted as NFT! 🎉');

                // Mock local update (in real app, this would refresh from DB after event)
                const badges = this._getCurrentBadges();
                const b = badges.find(x => x.id === id);
                if (b) b.on_chain = true;
                this._renderBadges(badges);

                // Log to Supabase
                window.ALabCore?.log('nft_mint', `Badge ${id} minted as NFT`, { wallet, badge_id: id });

            } catch (err) {
                console.error('[PROFILE] Mint error:', err);
                ALabToast.error('Ошибка минта: ' + err.message);
            }
        },

        _getCurrentBadges() {
            // Mocking retrieval since we don't have a full schema yet
            return [
                { id: 'early_adopter', icon: '🚀', title: 'Early Adopter', on_chain: false },
                { id: 'top_contributor', icon: '💎', title: 'Top Contributor', on_chain: true },
                { id: 'beta_tester', icon: '🛠️', title: 'Beta Tester', on_chain: false }
            ];
        },

        /**
         * Render skill tags
         */
        _renderSkillTags(skills) {
            const container = document.querySelector('#skillTagsContainer');
            if (!container) return;

            container.innerHTML = '';
            skills.forEach(skill => {
                const tag = document.createElement('span');
                tag.className = 'interactive-tag hover-trigger';
                tag.style.cssText = 'background: var(--tech-blue); color: black; padding: 4px 10px; border-radius: 4px; font-size: 0.7rem; font-family: var(--font-code);';
                tag.innerHTML = `${skill} <span style="cursor: pointer; opacity: 0.5;" onclick="ProfileManager.removeSkill('${skill}')">×</span>`;
                container.appendChild(tag);
            });

            // Add button
            const addBtn = document.createElement('span');
            addBtn.className = 'interactive-tag hover-trigger';
            addBtn.style.cssText = 'border: 1px dashed var(--tech-blue); color: var(--tech-blue); padding: 4px 10px; border-radius: 4px; font-size: 0.7rem; font-family: var(--font-code); cursor: pointer;';
            addBtn.textContent = '+ ДОБАВИТЬ';
            addBtn.onclick = () => this.addSkillPrompt();
            container.appendChild(addBtn);
        },

        /**
         * Add a new skill tag
         */
        addSkillPrompt() {
            const skill = prompt('Введите навык (например: AI_ENGINEERING):');
            if (!skill || !skill.trim()) return;

            const skills = this._getCurrentSkills();
            const normalized = skill.trim().toUpperCase().replace(/\s+/g, '_');
            if (skills.includes(normalized)) {
                ALabToast.info('Навык уже добавлен');
                return;
            }
            skills.push(normalized);
            this._renderSkillTags(skills);
            this.isDirty = true;
        },

        /**
         * Remove a skill tag
         */
        removeSkill(skill) {
            const skills = this._getCurrentSkills().filter(s => s !== skill);
            this._renderSkillTags(skills);
            this.isDirty = true;
        },

        /**
         * Get skills from DOM
         */
        _getCurrentSkills() {
            const container = document.querySelector('#skillTagsContainer');
            if (!container) return [];
            return Array.from(container.querySelectorAll('.interactive-tag'))
                .map(tag => tag.textContent.replace('×', '').trim())
                .filter(t => t && t !== '+ ДОБАВИТЬ');
        },

        /**
         * Update the preview card
         */
        _updatePreview(p) {
            const previewName = document.querySelector('.preview-mini .chat-name');
            const previewRole = document.querySelector('.preview-mini [style*="font-size: 0.5rem"]');
            if (previewName) previewName.textContent = p.full_name || 'Имя';
            if (previewRole) previewRole.textContent = (p.role || 'РОЛЬ').toUpperCase();
        },

        /**
         * Bind UI events
         */
        _bindUI() {
            // Status buttons
            document.querySelectorAll('.status-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    document.querySelectorAll('.status-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    this.isDirty = true;
                });
            });

            // Track changes in inputs
            document.querySelectorAll('#profileName, #profileRole, #profileBio, #profilePortfolio, #profileGithub, #profileTelegram, #profileTwitter, #settingLang, #settingVisibility').forEach(input => {
                if (input) {
                    input.addEventListener('input', () => {
                        this.isDirty = true;
                        // Live preview update
                        const name = document.querySelector('#profileName')?.value;
                        const role = document.querySelector('#profileRole')?.value;
                        if (name || role) this._updatePreview({ full_name: name, role: role });
                    });
                }
            });

            // Checkboxes
            document.querySelectorAll('#settingOnlineStatus, #settingEmailNotifs, #settingPushNotifs, #settingWeeklyDigest').forEach(check => {
                if (check) {
                    check.addEventListener('change', () => { this.isDirty = true; });
                }
            });

            // Notification button toggle (admin panel)
            const notifsBtn = document.querySelector('#settingNotifs');
            if (notifsBtn) {
                notifsBtn.addEventListener('click', () => {
                    const active = notifsBtn.classList.toggle('active');
                    notifsBtn.classList.toggle('open', active);
                    notifsBtn.innerText = active ? 'ВКЛЮЧЕНЫ' : 'ВЫКЛЮЧЕНЫ';
                    this.isDirty = true;
                });
            }

            // Save button
            const saveBtn = document.querySelector('#saveProfileBtn');
            if (saveBtn) {
                saveBtn.addEventListener('click', () => this.save());
            }

            // Avatar upload
            const avatarUploadBtn = document.querySelector('#avatarUploadBtn');
            const avatarFileInput = document.querySelector('#avatarFileInput');
            if (avatarUploadBtn && avatarFileInput) {
                avatarUploadBtn.addEventListener('click', () => avatarFileInput.click());
                avatarFileInput.addEventListener('change', (e) => {
                    if (e.target.files[0]) this.uploadAvatar(e.target.files[0]);
                });
            }

            // Also make the "СМЕНИТЬ" overlay clickable
            const changeOverlay = document.querySelector('.avatar-upload-box .hover-trigger');
            if (changeOverlay && avatarFileInput) {
                changeOverlay.addEventListener('click', () => avatarFileInput.click());
            }
        },

        /**
         * Get selected status
         */
        _getSelectedStatus() {
            const active = document.querySelector('.status-btn.active');
            if (!active) return 'open';
            if (active.classList.contains('open')) return 'open';
            if (active.classList.contains('busy')) return 'busy';
            if (active.classList.contains('away')) return 'away';
            return 'open';
        },

        /**
         * Save profile to Supabase
         */
        async save() {
            const db = window.ALabCore?.db;
            const auth = window.ALabAuth;

            if (!db || auth?.mockMode) {
                ALabToast.info('Работает в режиме демо — данные не сохраняются.');
                return;
            }

            const saveBtn = document.querySelector('#saveProfileBtn');
            if (saveBtn) {
                saveBtn.disabled = true;
                saveBtn.textContent = 'СОХРАНЕНИЕ...';
            }

            try {
                const updates = {
                    full_name: document.querySelector('#profileName')?.value || '',
                    role: document.querySelector('#profileRole')?.value || '',
                    bio: document.querySelector('#profileBio')?.value || '',
                    status: this._getSelectedStatus(),
                    links: {
                        portfolio: document.querySelector('#profilePortfolio')?.value || '',
                        github: document.querySelector('#profileGithub')?.value || '',
                        telegram: document.querySelector('#profileTelegram')?.value || '',
                        twitter: document.querySelector('#profileTwitter')?.value || ''
                    },
                    skills: this._getCurrentSkills(),
                    settings: {
                        language: document.querySelector('#settingLang')?.value || 'ru',
                        visibility: document.querySelector('#settingVisibility')?.value || 'public',
                        online_status: document.querySelector('#settingOnlineStatus')?.checked ? 'show' : 'hide',
                        notifications: {
                            email: document.querySelector('#settingEmailNotifs')?.checked ?? true,
                            push: document.querySelector('#settingPushNotifs')?.checked ?? (document.querySelector('#settingNotifs')?.classList.contains('active') ?? true),
                            weekly_digest: document.querySelector('#settingWeeklyDigest')?.checked ?? false
                        }
                    }
                };

                const { error } = await db
                    .from('residents')
                    .update(updates)
                    .eq('user_id', auth.userId);

                if (error) throw error;

                this.isDirty = false;
                ALabToast.success('Профиль обновлен!');
                window.ALabCore.log('profile_update', 'Profile saved', { fields: Object.keys(updates) });

            } catch (err) {
                console.error('[PROFILE] Save error:', err);
                ALabToast.error('Ошибка сохранения: ' + (err.message || 'Неизвестная ошибка'));
            } finally {
                if (saveBtn) {
                    saveBtn.disabled = false;
                    saveBtn.textContent = 'СОХРАНИТЬ ИЗМЕНЕНИЯ // SYNC';
                }
            }
        },

        /**
         * Upload avatar to Supabase Storage
         */
        async uploadAvatar(file) {
            const db = window.ALabCore?.db;
            const auth = window.ALabAuth;

            if (!db || auth?.mockMode) {
                // Just show local preview
                const reader = new FileReader();
                reader.onload = (e) => {
                    const img = document.querySelector('#avatarPreview');
                    if (img) img.src = e.target.result;
                };
                reader.readAsDataURL(file);
                ALabToast.info('Демо-режим: аватар отображается локально');
                return;
            }

            // Validate file
            if (file.size > 5 * 1024 * 1024) {
                ALabToast.error('Файл слишком большой (макс. 5MB)');
                return;
            }
            if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
                ALabToast.error('Допустимые форматы: JPG, PNG, WebP');
                return;
            }

            ALabToast.info('Загрузка аватара...');

            try {
                const ext = file.name.split('.').pop();
                const fileName = `${auth.userId}-${Date.now()}.${ext}`;

                // Upload to storage
                const { data: uploadData, error: uploadError } = await db.storage
                    .from('avatars')
                    .upload(fileName, file, { upsert: true });

                if (uploadError) throw uploadError;

                // Get public URL
                const { data: { publicUrl } } = db.storage
                    .from('avatars')
                    .getPublicUrl(fileName);

                // Update profile in DB
                const { error: updateError } = await db
                    .from('residents')
                    .update({ avatar_url: publicUrl })
                    .eq('user_id', auth.userId);

                if (updateError) throw updateError;

                // Update UI
                const img = document.querySelector('#avatarPreview');
                if (img) img.src = publicUrl;

                // Also update preview card
                const previewImg = document.querySelector('.preview-mini img');
                if (previewImg) previewImg.src = publicUrl;

                ALabToast.success('Аватар обновлен!');

            } catch (err) {
                console.error('[PROFILE] Avatar upload error:', err);
                ALabToast.error('Ошибка загрузки: ' + (err.message || 'Неизвестная ошибка'));
            }
        }
    };

    // Make globally accessible
    window.ProfileManager = ProfileManager;

    // Auto-init when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => ProfileManager.init());
    } else {
        ProfileManager.init();
    }
})();
