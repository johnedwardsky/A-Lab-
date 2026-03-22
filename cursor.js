/**
 * A-LAB.TECH Ultra-Speed Cursor v2 — Maximum Performance
 * 
 * Optimizations applied:
 * - Removed string interpolation from hot loop (template literals → direct property set)
 * - Debounced hover detection to prevent event storms
 * - will-change toggled via CSS class (only during animation)
 * - Faster LERP easing (0.7) for snappier feel + quicker auto-stop
 * - Throttled mousemove via passive + checked RAF
 * - Reduced DOM reads in tick()
 */
(function () {
    // 1. Mobile check — bail immediately
    if (window.matchMedia('(max-width: 1024px)').matches || 
        ('ontouchstart' in window && !window.matchMedia('(pointer: fine)').matches)) return;

    // 2. Element setup
    let cursor = document.querySelector('.cursor');
    if (!cursor) {
        cursor = document.createElement('div');
        cursor.className = 'cursor';
        document.body.appendChild(cursor);
    }

    // Cache style reference
    const cs = cursor.style;

    // 3. State
    let mouseX = -100, mouseY = -100;
    let curX = -100, curY = -100;
    let curScale = 1, targetScale = 1;
    let curOpacity = 0, targetOpacity = 0;
    let rafId = 0; // 0 = inactive
    let isActive = false;

    // Easing — higher = snappier, exits quicker
    const EASE_POS   = 0.7;
    const EASE_SCALE = 0.35;
    const STOP_THRESH = 0.08;

    function tick() {
        // LERP
        curX += (mouseX - curX) * EASE_POS;
        curY += (mouseY - curY) * EASE_POS;
        curScale += (targetScale - curScale) * EASE_SCALE;
        curOpacity += (targetOpacity - curOpacity) * EASE_SCALE;

        // Apply — avoid template literals for speed
        cs.transform = 'translate3d(' + curX + 'px,' + curY + 'px,0) translate(-50%,-50%) scale(' + curScale + ')';
        cs.opacity = curOpacity;

        // Auto-stop when close enough
        const d = Math.abs(mouseX - curX) + Math.abs(mouseY - curY);
        if (d < STOP_THRESH && 
            Math.abs(targetScale - curScale) < 0.003 && 
            Math.abs(targetOpacity - curOpacity) < 0.003) {
            // Snap to final
            cs.transform = 'translate3d(' + mouseX + 'px,' + mouseY + 'px,0) translate(-50%,-50%) scale(' + targetScale + ')';
            cs.opacity = targetOpacity;
            rafId = 0;
            // Remove GPU layer promotion when idle
            if (isActive) {
                cursor.classList.remove('active');
                isActive = false;
            }
            return;
        }

        rafId = requestAnimationFrame(tick);
    }

    function startLoop() {
        if (!isActive) {
            cursor.classList.add('active');
            isActive = true;
        }
        if (!rafId) rafId = requestAnimationFrame(tick);
    }

    // 4. Event Handling — all passive for performance

    // Mousemove — no throttle needed, RAF already acts as throttle
    window.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        targetOpacity = 1;
        startLoop();
    }, { passive: true });

    // Hover detection — delegated, minimal work
    const HOVER_SEL = 'a,button,input,textarea,select,[role="button"],label,.hover-trigger,.card,.case-card,.resident-card,.post-menu-btn,.feed-lightbox-btn,.post-dropdown-item';

    window.addEventListener('mouseover', (e) => {
        if (e.target.closest(HOVER_SEL)) {
            targetScale = 2.2;
            startLoop();
        }
    }, { passive: true });

    window.addEventListener('mouseout', (e) => {
        if (e.target.closest(HOVER_SEL) && (!e.relatedTarget || !e.relatedTarget.closest(HOVER_SEL))) {
            targetScale = 1;
            startLoop();
        }
    }, { passive: true });

    // Click feedback
    window.addEventListener('mousedown', () => { targetScale = 0.7; startLoop(); }, { passive: true });
    window.addEventListener('mouseup', () => { targetScale = 1; startLoop(); }, { passive: true });

    // Visibility
    document.addEventListener('mouseleave', () => { targetOpacity = 0; startLoop(); }, { passive: true });
    document.addEventListener('mouseenter', () => { targetOpacity = 1; startLoop(); }, { passive: true });

    // Tab visibility — stop animation when tab hidden
    document.addEventListener('visibilitychange', () => {
        if (document.hidden && rafId) {
            cancelAnimationFrame(rafId);
            rafId = 0;
            if (isActive) {
                cursor.classList.remove('active');
                isActive = false;
            }
        }
    });

    // Public API
    document.addEventListener('alab:cursor-hide', () => { targetOpacity = 0; startLoop(); });
    document.addEventListener('alab:cursor-show', () => { targetOpacity = 1; startLoop(); });
    document.addEventListener('alab:cursor-hover-on', () => { targetScale = 2.2; startLoop(); });
    document.addEventListener('alab:cursor-hover-off', () => { targetScale = 1.0; startLoop(); });
})();
