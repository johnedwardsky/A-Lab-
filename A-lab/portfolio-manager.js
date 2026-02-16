/**
 * A-LAB: PORTFOLIO MANAGER
 * ============================================================
 * Handles: loading gallery, uploading images, deleting items.
 * Depends on: supabase-client.js, auth-guard.js, toast.js
 */

(function () {
    'use strict';

    const PortfolioManager = {
        items: [],
        residentId: null,

        async init() {
            const handleAuth = async (auth) => {
                if (!auth.mockMode && auth.residentId) {
                    this.residentId = auth.residentId;
                    await this.loadPortfolio();
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
         * Load portfolio items
         */
        async loadPortfolio() {
            const db = window.ALabCore?.db;
            if (!db || !window.ALabCore.isConnected || !this.residentId) return;

            try {
                const { data, error } = await db
                    .from('portfolio_items')
                    .select('*')
                    .eq('resident_id', this.residentId)
                    .order('created_at', { ascending: false });

                if (error) throw error;
                this.items = data || [];
                this._renderGallery();

            } catch (err) {
                console.error('[PORTFOLIO] Load error:', err);
            }
        },

        /**
         * Render gallery grid
         */
        _renderGallery() {
            const container = document.querySelector('#portfolioGallery');
            if (!container) return;

            const itemsHtml = this.items.map(item => `
                <div style="position: relative; border-radius: 15px; overflow: hidden;" class="hover-trigger" data-id="${item.id}">
                    <img src="${item.image_url}" alt="${item.title || ''}" style="width: 100%; height: 100%; object-fit: cover; aspect-ratio: 16/9;">
                    ${item.title ? `<div style="position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(transparent, rgba(0,0,0,0.7)); padding: 10px; font-size: 0.75rem;">${item.title}</div>` : ''}
                    <button onclick="PortfolioManager.deleteItem('${item.id}')"
                        style="position: absolute; top: 10px; right: 10px; background: rgba(0,0,0,0.6); border: none; color: white; width: 30px; height: 30px; border-radius: 50%; cursor: pointer; font-size: 1rem; display: flex; align-items: center; justify-content: center;">×</button>
                </div>
            `).join('');

            const addSlot = `
                <div style="border: 2px dashed var(--border); border-radius: 15px; aspect-ratio: 16/9; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: 0.3s;"
                     class="hover-trigger"
                     onclick="document.querySelector('#portfolioFileInput').click()"
                     onmouseenter="this.style.borderColor='var(--tech-blue)'"
                     onmouseleave="this.style.borderColor='var(--border)'">
                    <span style="font-size: 2rem; color: #333;">+</span>
                </div>
            `;

            container.innerHTML = addSlot + itemsHtml;
        },

        /**
         * Upload a portfolio item
         */
        async uploadItem(file) {
            const db = window.ALabCore?.db;
            const auth = window.ALabAuth;

            if (!db || auth?.mockMode) {
                ALabToast.info('Демо-режим: загрузка недоступна');
                return;
            }

            // Validate
            if (file.size > 10 * 1024 * 1024) {
                ALabToast.error('Файл слишком большой (макс. 10MB)');
                return;
            }
            if (!file.type.startsWith('image/')) {
                ALabToast.error('Допустимы только изображения');
                return;
            }

            ALabToast.info('Загрузка...');

            try {
                const ext = file.name.split('.').pop();
                const fileName = `${this.residentId}/${Date.now()}-${Math.random().toString(36).substr(2, 8)}.${ext}`;

                const { error: uploadError } = await db.storage
                    .from('portfolio')
                    .upload(fileName, file);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = db.storage
                    .from('portfolio')
                    .getPublicUrl(fileName);

                // Optional: ask for title
                const title = prompt('Название работы (необязательно):') || '';

                const { error: dbError } = await db
                    .from('portfolio_items')
                    .insert({
                        resident_id: this.residentId,
                        title: title,
                        image_url: publicUrl,
                        visibility: document.querySelector('#portfolioVisibility')?.value || 'public'
                    });

                if (dbError) throw dbError;

                ALabToast.success('Работа добавлена!');
                await this.loadPortfolio();

            } catch (err) {
                console.error('[PORTFOLIO] Upload error:', err);
                ALabToast.error('Ошибка: ' + (err.message || ''));
            }
        },

        /**
         * Delete a portfolio item
         */
        async deleteItem(itemId) {
            if (!confirm('Удалить эту работу?')) return;

            const db = window.ALabCore?.db;
            if (!db || window.ALabAuth?.mockMode) return;

            try {
                const { error } = await db
                    .from('portfolio_items')
                    .delete()
                    .eq('id', itemId);

                if (error) throw error;

                ALabToast.success('Работа удалена');
                await this.loadPortfolio();

            } catch (err) {
                console.error('[PORTFOLIO] Delete error:', err);
                ALabToast.error('Ошибка: ' + err.message);
            }
        },

        /**
         * Bind UI events
         */
        _bindUI() {
            const fileInput = document.querySelector('#portfolioFileInput');
            if (fileInput) {
                fileInput.addEventListener('change', (e) => {
                    if (e.target.files[0]) {
                        this.uploadItem(e.target.files[0]);
                        e.target.value = ''; // Reset input
                    }
                });
            }
        }
    };

    window.PortfolioManager = PortfolioManager;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => PortfolioManager.init());
    } else {
        PortfolioManager.init();
    }
})();
