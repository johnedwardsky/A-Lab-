/**
 * A-LAB: GLOBAL SEARCH & COMMAND PALETTE
 * ========================================
 * Unified search interface for projects, 
 * residents, and system commands.
 */

const SearchManager = (() => {
    let isOpen = false;
    let projects = [];
    let residents = [];

    function init() {
        console.log('[SEARCH] Initialized');
        _injectUI();
        _setupListeners();
        _fetchIndex();
    }

    function _injectUI() {
        const html = `
            <div id="searchOverlay" class="search-overlay">
                <div class="search-modal">
                    <div class="search-header">
                        <span class="search-icon">🔍</span>
                        <input type="text" id="searchInput" placeholder="SEARCH_SYSTEM // TYPE_COMMAND..." autocomplete="off">
                        <span class="search-hint">ESC to close</span>
                    </div>
                    <div id="searchResults" class="search-results">
                        <div class="search-placeholder">START_TYPING_TO_QUERY_DATABASE...</div>
                    </div>
                </div>
            </div>

            <style>
                .search-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(3, 4, 7, 0.9);
                    backdrop-filter: blur(10px);
                    z-index: 10000;
                    display: none;
                    justify-content: center;
                    align-items: flex-start;
                    padding-top: 10vh;
                }
                .search-overlay.active { display: flex; }
                
                .search-modal {
                    width: 90%;
                    max-width: 600px;
                    background: var(--surface);
                    border: 1px solid var(--border);
                    border-radius: 12px;
                    overflow: hidden;
                    box-shadow: 0 20px 50px rgba(0,0,0,0.5), 0 0 20px rgba(0,229,255,0.1);
                }

                .search-header {
                    padding: 20px;
                    border-bottom: 1px solid var(--border);
                    display: flex;
                    align-items: center;
                    gap: 15px;
                }

                .search-icon { font-size: 1.2rem; opacity: 0.5; }

                #searchInput {
                    flex: 1;
                    background: transparent;
                    border: none;
                    color: white;
                    font-family: var(--font-code);
                    font-size: 1.1rem;
                    outline: none;
                }

                .search-hint { font-size: 0.6rem; color: #555; font-family: var(--font-code); text-transform: uppercase; }

                .search-results {
                    max-height: 400px;
                    overflow-y: auto;
                    padding: 10px;
                }

                .search-placeholder {
                    padding: 40px;
                    text-align: center;
                    font-family: var(--font-code);
                    font-size: 0.7rem;
                    color: #444;
                }

                .search-item {
                    padding: 12px 15px;
                    border-radius: 8px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    cursor: pointer;
                    transition: 0.2s;
                    margin-bottom: 5px;
                }

                .search-item:hover {
                    background: rgba(255, 255, 255, 0.05);
                    border-left: 3px solid var(--tech-blue);
                }

                .search-item .title { font-weight: 600; font-size: 0.9rem; }
                .search-item .type { font-family: var(--font-code); font-size: 0.6rem; color: #666; background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 4px; }
                
                .search-item.command { border-left-color: var(--accent); }
            </style>
        `;
        document.body.insertAdjacentHTML('beforeend', html);
    }

    function _setupListeners() {
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                toggle();
            }
            if (e.key === 'Escape' && isOpen) toggle();
        });

        const input = document.getElementById('searchInput');
        input.addEventListener('input', (e) => _handleQuery(e.target.value));

        document.getElementById('searchOverlay').addEventListener('click', (e) => {
            if (e.target.id === 'searchOverlay') toggle();
        });
    }

    async function _fetchIndex() {
        if (typeof SupabaseClient !== 'undefined' && SupabaseClient.isConfigured()) {
            const sb = SupabaseClient.getClient();
            const { data: p } = await sb.from('projects').select('id, title, category');
            const { data: r } = await sb.from('residents').select('user_id, full_name, role');
            projects = p || [];
            residents = r || [];
        }
    }

    function toggle() {
        isOpen = !isOpen;
        const overlay = document.getElementById('searchOverlay');
        overlay.classList.toggle('active', isOpen);
        if (isOpen) {
            document.getElementById('searchInput').focus();
            _handleQuery('');
        }
    }

    function _handleQuery(query) {
        const resultsEl = document.getElementById('searchResults');
        if (!query) {
            resultsEl.innerHTML = `
                <div style="font-size: 0.6rem; color: #444; font-family: var(--font-code); padding: 10px;">QUICK_COMMANDS</div>
                <div class="search-item command" onclick="window.location.href='index.html'">
                    <span class="title">Go to Home</span>
                    <span class="type">SYSTEM</span>
                </div>
                <div class="search-item command" onclick="window.location.href='profile.html'">
                    <span class="title">My Profile</span>
                    <span class="type">USER</span>
                </div>
                <div class="search-item command" onclick="window.location.href='rd.html'">
                    <span class="title">R&D Lab</span>
                    <span class="type">SPACE</span>
                </div>
            `;
            return;
        }

        const q = query.toLowerCase();
        const filteredProjects = projects.filter(p => p.title.toLowerCase().includes(q));
        const filteredResidents = residents.filter(r => r.full_name.toLowerCase().includes(q));

        let html = '';

        filteredProjects.slice(0, 5).forEach(p => {
            html += `
                <div class="search-item" onclick="window.location.href='projects.html'">
                    <span class="title">${p.title}</span>
                    <span class="type">PROJECT // ${p.category.toUpperCase()}</span>
                </div>
            `;
        });

        filteredResidents.slice(0, 5).forEach(r => {
            html += `
                <div class="search-item" onclick="window.location.href='residents.html'">
                    <span class="title">${r.full_name}</span>
                    <span class="type">RESIDENT // ${r.role}</span>
                </div>
            `;
        });

        resultsEl.innerHTML = html || '<div class="search-placeholder">NO_RESULTS_FOUND_IN_QUANTUM_INDEX</div>';
    }

    return { init, toggle };
})();

// Auto-init
SearchManager.init();
