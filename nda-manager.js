/**
 * A-LAB.TECH — NDA Manager
 * ==========================
 * Handles NDA verification flow for locked R&D projects.
 * - Guests: show NDA modal → sign → grant access
 * - Registered residents: auto-access (NDA signed at registration)
 * - Admin: view/revoke NDA signatures
 */

const NDAManager = (() => {
    // Authorized Access Codes
    const VALID_CODES = [
        'ALAB-SPRUT-77', 'ALAB-DEEP-24', 'ALAB-HULL-91', 'ALAB-ROBO-15',
        'ALAB-AQUA-33', 'ALAB-TECH-50', 'ALAB-NODE-08', 'ALAB-CORE-12',
        'ALAB-FLOW-66', 'ALAB-LINK-99'
    ];

    /**
     * Check if user has access to a locked project
     * @param {string} projectId - ID of the R&D project
     * @param {boolean} isAuthenticated - Is the user logged in?
     * @returns {Promise<boolean>}
     */
    async function checkAccess(projectId, isAuthenticated = false) {
        // Registered residents auto-access ALL locked projects
        if (isAuthenticated) return true;

        // Check for 7-day session cookie
        const hasSessionCookie = document.cookie.split('; ').some(row => row.startsWith('alab_nda_session='));
        if (hasSessionCookie) return true;

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
            <div class="nda-dialog" style="padding: 50px; max-width: 500px; border-radius: 24px; position: relative;">
                <button class="nda-close hover-trigger" onclick="NDAManager.closeModal()" style="top: 20px; right: 20px;">✕</button>
                
                <div id="nda-main-view">
                    <h2 style="color:var(--text); margin-bottom:10px; font-size: 1.3rem; font-weight: 800; text-transform: uppercase; letter-spacing: 2px;">NDA ACCESS REQUEST</h2>
                    <p style="color:#aaa; font-size:0.9rem; margin-bottom:20px;">Подпишите электронное соглашение о неразглашении для доступа к закрытым материалам.</p>

                    <div class="nda-text-block">
                        <p>Подписывая данное соглашение, вы обязуетесь:</p>
                        <ul>
                            <li>Не раскрывать информацию о проектах R&D Lab третьим лицам</li>
                            <li>Использовать полученную информацию исключительно для сотрудничества с A-LAB</li>
                            <li>Не копировать и не распространять материалы без разрешения</li>
                        </ul>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Полное имя</label>
                        <input type="text" class="form-input" id="ndaFullName" placeholder="Имя Фамилия" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Email</label>
                        <input type="email" class="form-input" id="ndaEmail" placeholder="your@email.com" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Телефон</label>
                        <input type="tel" class="form-input" id="ndaPhone" placeholder="Номер контактного телефона" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Компания</label>
                        <input type="text" class="form-input" id="ndaCompany" placeholder="Название компании" required>
                    </div>

                    <div style="display: flex; align-items: flex-start; gap: 15px; margin: 25px 0;">
                        <input type="checkbox" id="ndaAcceptCheckbox" style="width: 20px; height: 20px; accent-color: var(--accent); cursor: pointer;">
                        <label for="ndaAcceptCheckbox" style="font-size: 0.85rem; cursor: pointer; color: #888; line-height: 1.4;">
                            Я соглашаюсь с условиями электронного NDA и обязуюсь не разглашать полученную информацию.
                        </label>
                    </div>

                    <button class="btn-pulse hover-trigger" id="ndaSubmitBtn" onclick="NDAManager.submit('${projectId}', '${redirectUrl}')" disabled style="opacity: 0.5;">
                        <span>ПОДПИСАТЬ & ОТПРАВИТЬ</span>
                    </button>

                    <div style="text-align: center; margin-top: 30px;">
                        <a href="#" onclick="event.preventDefault(); NDAManager.toggleView('code')" style="color: #666; font-size: 0.8rem; text-decoration: none; border-bottom: 1px dashed rgba(255,255,255,0.2);">Есть код доступа?</a>
                    </div>
                </div>

                <div id="nda-code-view" style="display: none;">
                    <h2 style="color:var(--text); margin-bottom:10px; font-size: 1.3rem; font-weight: 800; text-transform: uppercase; letter-spacing: 2px;">Ввод кода доступа</h2>
                    <p style="color:#aaa; font-size:0.9rem; margin-bottom:20px;">Вставьте ваш код доступа.</p>

                    <div class="nda-text-block">
                        <p>Подписывая данное соглашение, вы обязуетесь:</p>
                        <ul>
                            <li>Не раскрывать информацию о проектах R&D Lab третьим лицам</li>
                            <li>Использовать полученную информацию исключительно для сотрудничества с A-LAB</li>
                            <li>Не копировать и не распространять материалы без разрешения</li>
                        </ul>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Полное имя</label>
                        <input type="text" class="form-input" id="ndaCodeName" placeholder="Имя Фамилия" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label" style="color: var(--accent);">Код доступа</label>
                        <input type="text" class="form-input" id="ndaAccessCode" placeholder="ALAB-XXXX" style="letter-spacing: 2px;">
                    </div>

                    <div style="display: flex; align-items: flex-start; gap: 15px; margin: 25px 0;">
                        <input type="checkbox" id="ndaCodeAcceptCheckbox" style="width: 20px; height: 20px; accent-color: var(--accent); cursor: pointer;">
                        <label for="ndaCodeAcceptCheckbox" style="font-size: 0.85rem; cursor: pointer; color: #888; line-height: 1.4;">
                            Я соглашаюсь с условиями электронного NDA и обязуюсь не разглашать полученную информацию.
                        </label>
                    </div>

                    <button class="btn-pulse hover-trigger" id="ndaCodeSubmitBtn" onclick="NDAManager.submitCode('${projectId}', '${redirectUrl}')" disabled style="opacity: 0.5;">
                        <span>АКТИВИРОВАТЬ ДОСТУП</span>
                    </button>

                    <div style="text-align: center; margin-top: 30px;">
                        <a href="#" onclick="event.preventDefault(); NDAManager.toggleView('main')" style="color: #666; font-size: 0.8rem; text-decoration: none; border-bottom: 1px dashed rgba(255,255,255,0.2);">&larr; Вернуться к анкете</a>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        injectStyles();

        // Enable submit only when checkbox is checked
        const checkbox = document.getElementById('ndaAcceptCheckbox');
        const submitBtn = document.getElementById('ndaSubmitBtn');
        if (checkbox && submitBtn) {
            checkbox.addEventListener('change', () => {
                submitBtn.disabled = !checkbox.checked;
                submitBtn.style.opacity = checkbox.checked ? '1' : '0.5';
            });
        }

        const codeCheckbox = document.getElementById('ndaCodeAcceptCheckbox');
        const codeSubmitBtn = document.getElementById('ndaCodeSubmitBtn');
        if (codeCheckbox && codeSubmitBtn) {
            codeCheckbox.addEventListener('change', () => {
                codeSubmitBtn.disabled = !codeCheckbox.checked;
                codeSubmitBtn.style.opacity = codeCheckbox.checked ? '1' : '0.5';
            });
        }
    }

    /**
     * Helper to set cookie and grant access
     */
    function grantSevenDayAccess(email, redirectUrl) {
        // Create a 7-day session cookie
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + 7);
        document.cookie = `alab_nda_session=true; expires=${expiry.toUTCString()}; path=/; SameSite=Lax`;

        // Save locally for future checks
        localStorage.setItem('alab_nda_email', email);
        localStorage.setItem('alab_nda_signed', 'true');

        if (typeof ALABToast !== 'undefined') ALABToast.success('Доступ предоставлен на 7 дней');

        closeModal();

        // Redirect
        if (redirectUrl) {
            setTimeout(() => { window.location.href = redirectUrl; }, 1000);
        }
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
            alert('Пожалуйста, заполните Имя, Email и Телефон');
            return;
        }

        if (!accepted) {
            alert('Необходимо принять условия NDA');
            return;
        }

        // Basic email validation
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            alert('Укажите корректный email');
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

        grantSevenDayAccess(email, redirectUrl);
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
                background: rgba(11, 13, 20, 0.9);
                border: 1px solid rgba(255, 42, 42, 0.3);
                border-radius: 24px;
                max-width: 500px;
                width: 90%;
                max-height: 95vh;
                overflow-y: auto;
                padding: 50px;
                box-shadow: 0 0 50px rgba(255, 42, 42, 0.1);
                backdrop-filter: blur(20px);
                animation: ndaScaleUp 0.3s forwards;
            }

            @keyframes ndaScaleUp {
                from { transform: scale(0.95); opacity: 0; }
                to { transform: scale(1); opacity: 1; }
            }

            .nda-close {
                position: absolute;
                top: 25px;
                right: 25px;
                background: none;
                border: none;
                color: #666;
                width: 30px;
                height: 30px;
                border-radius: 50%;
                cursor: pointer;
                font-size: 1.5rem;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: 0.3s;
            }

            .nda-close:hover {
                color: white;
                background: rgba(255, 255, 255, 0.1);
                transform: rotate(90deg);
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
                background: rgba(255, 42, 42, 0.05);
                border: 1px solid rgba(255, 42, 42, 0.1);
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

            .form-group {
                margin-bottom: 15px;
                text-align: left;
            }

            .form-label {
                display: block;
                font-size: 0.75rem;
                text-transform: uppercase;
                letter-spacing: 1px;
                color: #555;
                margin-bottom: 6px;
                font-family: var(--font-code);
            }

            .form-input {
                width: 100%;
                background: rgba(255, 255, 255, 0.03);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 12px;
                padding: 16px 20px;
                color: #fff;
                font-size: 1rem;
                transition: 0.3s;
                font-family: var(--font-main);
            }

            .form-input:focus {
                outline: none;
                border-color: var(--accent, #FF2A2A);
                background: rgba(255, 42, 42, 0.05);
                box-shadow: 0 0 20px rgba(255, 42, 42, 0.1);
            }

            .btn-pulse {
                width: 100%;
                background: var(--accent, #FF2A2A);
                color: #000;
                border: none;
                border-radius: 12px;
                padding: 20px;
                font-weight: 800;
                font-family: var(--font-code);
                text-transform: uppercase;
                letter-spacing: 1px;
                cursor: pointer;
                transition: 0.3s;
                margin-top: 10px;
                box-shadow: 0 5px 20px rgba(255, 42, 42, 0.2);
            }

            .btn-pulse:hover:not(:disabled) {
                transform: translateY(-2px);
                box-shadow: 0 10px 40px rgba(255, 42, 42, 0.5);
            }

            .btn-pulse:disabled {
                opacity: 0.5;
                cursor: not-allowed;
                filter: grayscale(1);
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

    function toggleView(view) {
        const main = document.getElementById('nda-main-view');
        const code = document.getElementById('nda-code-view');
        if (view === 'code') {
            if (main) main.style.display = 'none';
            if (code) code.style.display = 'block';
        } else {
            if (main) main.style.display = 'block';
            if (code) code.style.display = 'none';
        }
    }

    async function submitCode(projectId, redirectUrl) {
        const fullName = document.getElementById('ndaCodeName')?.value?.trim();
        const accessCode = document.getElementById('ndaAccessCode')?.value?.trim()?.toUpperCase();
        const accepted = document.getElementById('ndaCodeAcceptCheckbox')?.checked;

        if (!fullName || !accessCode) {
            alert('Пожалуйста, введите имя и код доступа');
            return;
        }

        if (!accepted) {
            alert('Необходимо принять условия NDA');
            return;
        }

        if (VALID_CODES.includes(accessCode)) {
            grantSevenDayAccess('code_authorized@a-lab.tech', redirectUrl);
        } else {
            alert('Неверный код доступа');
        }
    }

    return { checkAccess, showModal, submit, closeModal, gate, toggleView, submitCode };
})();
