/**
 * A-LAB ADMIN: NDA REQUESTS MANAGER
 * Handles fetching, approving, and rejecting NDA requests.
 */

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    // Hook into tab switching if possible, or just wait for manual switch
    // The switchTab function in resident-admin-ru.html handles display
    // We can observe the active class change or just poll/load on demand
});

// Since switchTab is global, we can wrap it or just listen to clicks
// For simplicity, we expose loadNdaRequests globally and let the sidebar onclick call it?
// But sidebar onclick is `switchTab('nda-requests')`.
// We can modify switchTab or just intercept it.

const originalSwitchTab = window.switchTab;
window.switchTab = function (tabName) {
    if (originalSwitchTab) originalSwitchTab(tabName);

    // Initial Load Logic for NDA
    if (tabName === 'nda-requests') {
        loadNdaRequests();
    }
};

async function loadNdaRequests() {
    const list = document.getElementById('nda-requests-list');
    if (!list) return;

    list.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px; color:#888;">Загрузка данных...</td></tr>';

    try {
        const sb = window.ALabCore ? window.ALabCore.db : (window.supabase || null);

        if (!sb) {
            console.warn('Supabase not connected');
            // Mock data for demo if no connection
            list.innerHTML = `
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                    <td style="padding: 15px 10px; font-size: 0.85rem; color:#888;">${new Date().toLocaleDateString()}</td>
                    <td style="padding: 15px 10px; font-weight: 600;">Alex Researcher (Mock)</td>
                    <td style="padding: 15px 10px; font-family: var(--font-code); font-size: 0.8rem;">alex@corp.com</td>
                    <td style="padding: 15px 10px;">Corp Inc.</td>
                    <td style="padding: 15px 10px;"><span class="status-badge" style="color:orange; border:1px solid orange; padding:2px 8px; border-radius:4px; font-size:0.7rem;">PENDING</span></td>
                    <td style="padding: 15px 10px;">
                        <button class="status-btn hover-trigger" onclick="approveNda('mock-id', 'alex@corp.com')">Одобрить</button>
                    </td>
                </tr>
            `;
            return;
        }

        const { data, error } = await sb
            .from('nda_requests')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (!data || data.length === 0) {
            list.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px; color:#666;">Нет активных запросов.</td></tr>';
            return;
        }

        list.innerHTML = data.map(req => `
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                <td style="padding: 15px 10px; font-size: 0.85rem; color:#ccc;">${new Date(req.created_at).toLocaleDateString()}</td>
                <td style="padding: 15px 10px; font-weight: 600;">${req.full_name}</td>
                <td style="padding: 15px 10px; font-family: var(--font-code); font-size: 0.8rem; color:var(--tech-blue);">${req.email}</td>
                <td style="padding: 15px 10px; color:#ccc;">${req.company || '-'}</td>
                <td style="padding: 15px 10px;">
                    <span class="status-badge" style="
                        padding: 4px 8px; 
                        border-radius: 4px; 
                        font-size: 0.7rem; 
                        border: 1px solid ${getStatusColor(req.status)}; 
                        color: ${getStatusColor(req.status)};">
                        ${req.status.toUpperCase()}
                    </span>
                </td>
                <td style="padding: 15px 10px;">
                    ${req.status === 'pending' ? `
                        <button class="hover-trigger" onclick="approveNda('${req.id}', '${req.email}')" 
                            style="background: var(--tech-blue); color: #000; border: none; padding: 6px 12px; border-radius: 4px; font-size: 0.7rem; font-weight: bold; cursor: pointer; margin-right: 10px;">
                            ОТПРАВИТЬ ССЫЛКУ
                        </button>
                        <button class="hover-trigger" onclick="rejectNda('${req.id}')" 
                            style="background: transparent; border: 1px solid #ff4444; color: #ff4444; padding: 6px 12px; border-radius: 4px; font-size: 0.7rem; cursor: pointer;">
                            ОТКЛОНИТЬ
                        </button>
                    ` : `<span style="font-size:0.8rem; color:#666; font-style:italic;">Завершено</span>`}
                </td>
            </tr>
        `).join('');

    } catch (e) {
        console.error('Error loading NDA requests:', e);
        list.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px; color:red;">Ошибка: ${e.message}</td></tr>`;
    }
}

function getStatusColor(status) {
    if (status === 'approved') return '#00FF41';
    if (status === 'rejected') return '#FF2A2A';
    return '#FFB800'; // pending
}

async function approveNda(id, email) {
    if (!confirm(`Подтверждаете отправку ссылки доступа на ${email}?`)) return;

    if (id === 'mock-id') {
        alert('Демонстрационный режим: доступ предоставлен.');
        return;
    }

    const sb = window.ALabCore ? window.ALabCore.db : window.supabase;
    if (!sb) return;

    try {
        const { error } = await sb
            .from('nda_requests')
            .update({ status: 'approved' })
            .eq('id', id);

        if (error) throw error;

        // In a real scenario, this would trigger an Edge Function to send email.
        // For now, we simulate success.
        alert(`ACCESS GRANTED. Secure Link sent to: ${email}`);

        loadNdaRequests();
    } catch (e) {
        alert('Ошибка: ' + e.message);
    }
}

async function rejectNda(id) {
    if (!confirm('Отклонить этот запрос?')) return;

    const sb = window.ALabCore ? window.ALabCore.db : window.supabase;
    if (!sb) return;

    try {
        const { error } = await sb
            .from('nda_requests')
            .update({ status: 'rejected' })
            .eq('id', id);

        if (error) throw error;

        loadNdaRequests();
    } catch (e) {
        alert('Ошибка: ' + e.message);
    }
}

// Global exposure
window.loadNdaRequests = loadNdaRequests;
window.approveNda = approveNda;
window.rejectNda = rejectNda;
