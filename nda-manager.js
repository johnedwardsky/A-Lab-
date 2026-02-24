/**
 * A-LAB.TECH — NDA Manager
 * ==========================
 * Handles NDA verification flow for locked R&D projects.
 * - Guests: show NDA modal → sign → grant access
 * - Registered residents: auto-access (NDA signed at registration)
 * - Admin: view/revoke NDA signatures
 */

const NDAManager = (() => {
    /**
     * Check if user has access to a locked project
     * @param {string} projectId - ID of the R&D project
     * @param {boolean} isAuthenticated - Is the user logged in?
     * @returns {Promise<boolean>}
     */
    async function checkAccess(projectId, isAuthenticated = false) {
        // Registered residents auto-access ALL locked projects
        if (isAuthenticated) return true;

        // Check if guest has signed NDA for this project
        const signedEmail = localStorage.getItem('alab_nda_email');
        if (!signedEmail) return false;

        try {
            if (typeof SupabaseClient !== 'undefined' && SupabaseClient.isConfigured()) {
                const sb = SupabaseClient.getClient();
                const { data } = await sb
                    .from('nda_agreements')
                    .select('id')
                    .eq('user_email', signedEmail)
                    .eq('revoked', false)
                    .limit(1);

                return data && data.length > 0;
            }
        } catch (e) {
            console.warn('[NDA] Check failed:', e);
        }

        return false;
    }

    /**
     * Show NDA modal for locked R&D content
     * @param {string} projectId - Project to grant access to
     * @param {string} redirectUrl - URL to redirect after signing
     */
    function showModal(projectId, redirectUrl) {
        // Remove existing modal
        const existing = document.getElementById('nda-modal');
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.id = 'nda-modal';
        modal.innerHTML = `
            <div class="nda-backdrop" onclick="NDAManager.closeModal()"></div>
            <div class="nda-dialog" style="padding:0; overflow:hidden;">
                <button class="nda-close hover-trigger" onclick="NDAManager.closeModal()" style="z-index: 10;">✕</button>
                
                <div id="nda-form-section" style="padding: 40px;">
                    <div class="nda-header">
                        <div style="font-size: 2.2rem; margin-bottom: 5px;">🔒</div>
                        <h2 data-i18n="nda.title">NDA Верификация</h2>
                        <p style="color: #888; font-size: 0.85rem; margin-top: 8px;">
                            Для доступа к проекту необходимо подтвердить личность.
                        </p>
                    </div>

                    <div class="nda-body">
                        <div class="form-group" style="margin-bottom: 12px;">
                            <label class="form-label" style="font-size: 0.7rem; color: #555; text-transform: uppercase; letter-spacing: 1px;">Полное имя</label>
                            <input type="text" class="form-input" id="ndaFullName" placeholder="Имя Фамилия" style="background: rgba(255,255,255,0.02); height: 45px;">
                        </div>
                        <div class="form-group" style="margin-bottom: 12px;">
                            <label class="form-label" style="font-size: 0.7rem; color: #555; text-transform: uppercase; letter-spacing: 1px;">Email</label>
                            <input type="email" class="form-input" id="ndaEmail" placeholder="email@corp.com" style="background: rgba(255,255,255,0.02); height: 45px;">
                        </div>
                        <div class="form-group" style="margin-bottom: 12px;">
                            <label class="form-label" style="font-size: 0.7rem; color: #555; text-transform: uppercase; letter-spacing: 1px;">Телефон</label>
                            <input type="tel" class="form-input" id="ndaPhone" placeholder="+7 (___) ___-__-__" style="background: rgba(255,255,255,0.02); height: 45px;">
                        </div>
                        <div class="form-group" style="margin-bottom: 20px;">
                            <label class="form-label" style="font-size: 0.7rem; color: #555; text-transform: uppercase; letter-spacing: 1px;">Компания</label>
                            <input type="text" class="form-input" id="ndaCompany" placeholder="Организация" style="background: rgba(255,255,255,0.02); height: 45px;">
                        </div>

                        <div style="display: flex; align-items: flex-start; gap: 10px; margin-bottom: 25px;">
                            <input type="checkbox" id="ndaAcceptCheckbox" style="width: 18px; height: 18px; margin-top: 2px;">
                            <label for="ndaAcceptCheckbox" style="font-size: 0.75rem; color: #888; line-height: 1.4;">
                                Я принимаю условия соглашения о неразглашении конфиденциальной информации.
                            </label>
                        </div>

                        <button class="btn-pulse hover-trigger" id="ndaSubmitBtn" onclick="NDAManager.submit('${projectId}', '${redirectUrl}')" disabled 
                            style="opacity: 0.5; width: 100%; height: 50px; background: white; color: black; border: none; font-weight: 700; letter-spacing: 1px;">
                            ПОДПИСАТЬ СОГЛАШЕНИЕ
                        </button>
                        
                        <div style="text-align: center; margin-top: 30px; border-top: 1px dashed rgba(255,255,255,0.1); padding-top: 20px;">
                            <a href="javascript:void(0)" onclick="NDAManager.toggleView('code')" style="color: #666; font-size: 0.7rem; text-decoration: none; font-family: 'JetBrains Mono';">ЕСТЬ КОД ДОСТУПА?</a>
                        </div>
                    </div>
                </div>

                <div id="nda-code-section" style="display: none; padding: 40px;">
                    <div class="nda-header">
                        <div style="font-size: 2.2rem; margin-bottom: 5px;">🔑</div>
                        <h2>ACCESS CODE</h2>
                        <p style="color: #888; font-size: 0.85rem; margin-top: 8px;">Введите персональный код доступа.</p>
                    </div>
                    <div class="nda-body">
                         <div class="form-group" style="margin-bottom: 12px;">
                            <label class="form-label" style="font-size: 0.7rem; color: #555; text-transform: uppercase; letter-spacing: 1px;">Имя Фамилия</label>
                            <input type="text" class="form-input" id="ndaCodeName" placeholder="Иван Иванов" style="background: rgba(255,255,255,0.02); height: 45px;">
                        </div>
                        <div class="form-group" style="margin-bottom: 25px;">
                            <label class="form-label" style="font-size: 0.7rem; color: #555; text-transform: uppercase; letter-spacing: 1px;">Код доступа</label>
                            <input type="text" class="form-input" id="ndaAccessCode" placeholder="ALAB-XXXX" 
                                style="background: rgba(0, 229, 255, 0.02); height: 55px; border-color: #00E5FF; color: #00E5FF; text-align: center; font-size: 1.2rem; font-family: 'JetBrains Mono'; letter-spacing: 3px;">
                        </div>
                        <button class="btn-pulse hover-trigger" onclick="NDAManager.submitCode('${projectId}', '${redirectUrl}')" 
                            style="width: 100%; height: 50px; background: #00E5FF; color: black; border: none; font-weight: 700; letter-spacing: 1px;">
                            АКТИВИРОВАТЬ ДОСТУП
                        </button>
                        <div style="text-align: center; margin-top: 30px;">
                            <a href="javascript:void(0)" onclick="NDAManager.toggleView('form')" style="color: #666; font-size: 0.7rem; text-decoration: none; font-family: 'JetBrains Mono';">ВЕРНУТЬСЯ К ЗАЯВКЕ</a>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        injectStyles();

        // Enable submit only when checkbox is checked
        const checkbox = document.getElementById('ndaAcceptCheckbox');
        const submitBtn = document.getElementById('ndaSubmitBtn');
        checkbox.addEventListener('change', () => {
            submitBtn.disabled = !checkbox.checked;
            submitBtn.style.opacity = checkbox.checked ? '1' : '0.5';
        });
    }

    /**
     * Submit NDA
     */
    async function submit(projectId, redirectUrl) {
        const fullName = document.getElementById('ndaFullName')?.value?.trim();
        const email = document.getElementById('ndaEmail')?.value?.trim();
        const phone = document.getElementById('ndaPhone')?.value?.trim();
        const company = document.getElementById('ndaCompany')?.value?.trim();
        const accepted = document.getElementById('ndaAcceptCheckbox')?.checked;

        if (!fullName || !email || !phone) {
            if (typeof ALABToast !== 'undefined') ALABToast.error('Заполните обязательные поля (Имя, Email, Телефон)');
            alert('Пожалуйста, заполните Имя, Email и Телефон');
            return;
        }

        if (!accepted) {
            if (typeof ALABToast !== 'undefined') ALABToast.error('Необходимо принять условия NDA');
            return;
        }

        // Basic email validation
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            if (typeof ALABToast !== 'undefined') ALABToast.error('Укажите корректный email');
            return;
        }

        try {
            if (typeof SupabaseClient !== 'undefined' && SupabaseClient.isConfigured()) {
                const sb = SupabaseClient.getClient();
                const { error } = await sb.from('nda_agreements').insert({
                    user_email: email,
                    full_name: fullName,
                    phone: phone,
                    company: company || null,
                    project_id: projectId || null,
                    ip_address: null
                });

                if (error) throw error;
            }
        } catch (e) {
            console.warn('[NDA] Save to DB failed, continuing locally:', e);
        }

        // Save locally for future checks
        localStorage.setItem('alab_nda_email', email);
        localStorage.setItem('alab_nda_signed', 'true');

        if (typeof ALABToast !== 'undefined') ALABToast.success(typeof t === 'function' ? t('nda.access_granted') : 'Доступ предоставлен');

        closeModal();

        // Redirect
        if (redirectUrl) {
            setTimeout(() => { window.location.href = redirectUrl; }, 1000);
        }
    }

    /**
     * Close modal
     */
    function closeModal() {
        const modal = document.getElementById('nda-modal');
        if (modal) modal.remove();
    }

    /**
     * Gate a link — use on R&D project cards
     * Usage: onclick="NDAManager.gate('project_id', 'target-url.html')"
     */
    async function gate(projectId, targetUrl) {
        const isAuth = typeof AuthGuard !== 'undefined' && AuthGuard.isAuthenticated();
        const hasAccess = await checkAccess(projectId, isAuth);

        if (hasAccess) {
            window.location.href = targetUrl;
        } else {
            showModal(projectId, targetUrl);
        }
    }

    /**
     * Enforce NDA on page load
     * @param {string} projectId 
     */
    async function enforce(projectId) {
        const isAuth = typeof AuthGuard !== 'undefined' && AuthGuard.isAuthenticated();
        const hasAccess = await checkAccess(projectId, isAuth);

        if (!hasAccess) {
            document.body.classList.add('nda-locked-page');
            showModal(projectId, window.location.href);

            // Re-check every few seconds in case they signed in another tab
            const interval = setInterval(async () => {
                if (await checkAccess(projectId, isAuth)) {
                    document.body.classList.remove('nda-locked-page');
                    closeModal();
                    clearInterval(interval);
                }
            }, 3000);
        }
    }

    /**
     * Inject styles
     */
    function injectStyles() {
        if (document.getElementById('nda-modal-styles')) return;

        const style = document.createElement('style');
        style.id = 'nda-modal-styles';
        style.textContent = `
            #nda-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .nda-backdrop {
                position: absolute;
                top: 0; left: 0;
                width: 100%; height: 100%;
                background: rgba(0, 0, 0, 0.85);
                backdrop-filter: blur(20px);
                -webkit-backdrop-filter: blur(20px);
            }

            .nda-dialog {
                position: relative;
                background: var(--surface, #0b0d14);
                border: 1px solid var(--border, rgba(255,255,255,0.06));
                border-radius: 24px;
                max-width: 500px;
                width: 90%;
                max-height: 90vh;
                overflow-y: auto;
                padding: 40px;
                box-shadow: 0 30px 80px rgba(0, 0, 0, 0.5);
                animation: ndaSlideIn 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
            }

            @keyframes ndaSlideIn {
                from { transform: translateY(30px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }

            .nda-close {
                position: absolute;
                top: 15px;
                right: 15px;
                background: none;
                border: 1px solid var(--border);
                color: #888;
                width: 36px;
                height: 36px;
                border-radius: 10px;
                cursor: pointer;
                font-size: 1.1rem;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: 0.3s;
            }

            .nda-close:hover {
                border-color: var(--accent);
                color: var(--accent);
            }

            .nda-header {
                text-align: center;
                margin-bottom: 25px;
            }

            .nda-header h2 {
                font-size: 1.3rem;
                font-weight: 800;
                text-transform: uppercase;
                letter-spacing: 2px;
            }

            .nda-text-block {
                background: rgba(0, 229, 255, 0.03);
                border: 1px solid rgba(0, 229, 255, 0.1);
                border-radius: 12px;
                padding: 20px;
                margin-bottom: 25px;
                font-size: 0.82rem;
                line-height: 1.6;
                color: #ccc;
            }

            .nda-text-block ul {
                margin: 10px 0 0 20px;
                padding: 0;
            }

            .nda-text-block li {
                margin-bottom: 6px;
            }

            /* Light theme */
            body.light-theme .nda-dialog {
                background: #fff;
                border-color: rgba(0,0,0,0.08);
            }

            body.light-theme .nda-text-block {
                background: #f5fafe;
                border-color: rgba(0, 143, 164, 0.15);
                color: #444;
            }

            /* Mobile */
            @media (max-width: 768px) {
                .nda-dialog {
                    padding: 25px;
                    border-radius: 20px 20px 0 0;
                    max-width: 100%;
                    width: 100%;
                    position: absolute;
                    bottom: 0;
                    max-height: 85vh;
                    animation: ndaSlideUp 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
                }

                @keyframes ndaSlideUp {
                    from { transform: translateY(100%); }
                    to { transform: translateY(0); }
                }
            }

            /* Page Lock Blur */
            body.nda-locked-page > *:not(#nda-modal):not(.cursor) {
                filter: blur(25px) grayscale(1);
                pointer-events: none;
                user-select: none;
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Submit access code
     */
    async function submitCode(projectId, redirectUrl) {
        const name = document.getElementById('ndaCodeName')?.value?.trim();
        const code = document.getElementById('ndaAccessCode')?.value?.trim();

        if (!name || !code) {
            alert('Введите имя и код');
            return;
        }

        // Simulate verification
        if (code.toUpperCase().includes('ALAB')) {
            localStorage.setItem('alab_nda_signed', 'true');
            localStorage.setItem('alab_nda_email', 'code_authorized@a-lab.tech');

            if (typeof ALABToast !== 'undefined') ALABToast.success('Доступ активирован!');
            closeModal();
            if (redirectUrl) window.location.href = redirectUrl;
        } else {
            alert('Неверный код доступа');
        }
    }

    /**
     * Toggle modal views
     */
    function toggleView(view) {
        const formSec = document.getElementById('nda-form-section');
        const codeSec = document.getElementById('nda-code-section');
        if (!formSec || !codeSec) return;

        if (view === 'code') {
            formSec.style.display = 'none';
            codeSec.style.display = 'block';
        } else {
            formSec.style.display = 'block';
            codeSec.style.display = 'none';
        }
    }

    return { checkAccess, showModal, submit, submitCode, toggleView, closeModal, gate, enforce };
})();
