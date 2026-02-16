/**
 * A-LAB: TOAST NOTIFICATION SYSTEM
 * ============================================================
 * Call: ALabToast.success('Message'), ALabToast.error('Error'), ALabToast.info('Info')
 */

(function () {
    'use strict';

    // Inject CSS
    const style = document.createElement('style');
    style.textContent = `
        .alab-toast-container {
            position: fixed;
            bottom: 30px;
            right: 30px;
            z-index: 100000;
            display: flex;
            flex-direction: column-reverse;
            gap: 10px;
            pointer-events: none;
        }
        .alab-toast {
            background: rgba(11, 13, 20, 0.95);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(255,255,255,0.08);
            padding: 14px 24px;
            border-radius: 12px;
            color: #fff;
            font-family: 'Inter', sans-serif;
            font-size: 0.85rem;
            display: flex;
            align-items: center;
            gap: 10px;
            opacity: 0;
            transform: translateY(20px) scale(0.95);
            transition: all 0.35s cubic-bezier(0.165, 0.84, 0.44, 1);
            pointer-events: auto;
            max-width: 400px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.4);
        }
        .alab-toast.show {
            opacity: 1;
            transform: translateY(0) scale(1);
        }
        .alab-toast.removing {
            opacity: 0;
            transform: translateY(-10px) scale(0.95);
        }
        .alab-toast-success {
            border-color: rgba(0, 255, 65, 0.3);
        }
        .alab-toast-success .alab-toast-icon {
            color: #00FF41;
        }
        .alab-toast-error {
            border-color: rgba(255, 42, 42, 0.3);
        }
        .alab-toast-error .alab-toast-icon {
            color: #FF2A2A;
        }
        .alab-toast-info {
            border-color: rgba(0, 229, 255, 0.3);
        }
        .alab-toast-info .alab-toast-icon {
            color: #00E5FF;
        }
        .alab-toast-icon {
            font-size: 1.1rem;
            flex-shrink: 0;
        }
        .alab-toast-progress {
            position: absolute;
            bottom: 0;
            left: 0;
            height: 2px;
            border-radius: 0 0 12px 12px;
            animation: alab-toast-progress 3s linear forwards;
        }
        .alab-toast-success .alab-toast-progress { background: #00FF41; }
        .alab-toast-error .alab-toast-progress { background: #FF2A2A; }
        .alab-toast-info .alab-toast-progress { background: #00E5FF; }
        @keyframes alab-toast-progress {
            from { width: 100%; }
            to { width: 0%; }
        }

        body.light-theme .alab-toast {
            background: rgba(255, 255, 255, 0.95);
            border-color: rgba(0, 0, 0, 0.08);
            color: #1d1d1f;
            box-shadow: 0 10px 40px rgba(0,0,0,0.1);
        }
    `;
    document.head.appendChild(style);

    // Create container
    let container = null;
    function getContainer() {
        if (!container) {
            container = document.createElement('div');
            container.className = 'alab-toast-container';
            document.body.appendChild(container);
        }
        return container;
    }

    function show(message, type = 'info', duration = 3000) {
        const icons = { success: '✓', error: '✕', info: 'ℹ' };

        const toast = document.createElement('div');
        toast.className = `alab-toast alab-toast-${type}`;
        toast.style.position = 'relative';
        toast.innerHTML = `
            <span class="alab-toast-icon">${icons[type] || '●'}</span>
            <span>${message}</span>
            <div class="alab-toast-progress"></div>
        `;

        getContainer().appendChild(toast);

        // Trigger animation
        requestAnimationFrame(() => {
            requestAnimationFrame(() => toast.classList.add('show'));
        });

        // Auto-remove
        setTimeout(() => {
            toast.classList.add('removing');
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 350);
        }, duration);

        // Click to dismiss
        toast.addEventListener('click', () => {
            toast.classList.add('removing');
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 350);
        });
    }

    window.ALabToast = {
        success: (msg, dur) => show(msg, 'success', dur),
        error: (msg, dur) => show(msg, 'error', dur),
        info: (msg, dur) => show(msg, 'info', dur),
        show
    };
})();
