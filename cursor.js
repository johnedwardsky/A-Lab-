/**
 * A-LAB.TECH Ultra-Speed Cursor — Extreme Performance
 * Optimized for minimal latency and maximum smoothness on high-refresh-rate displays.
 */
(function () {
    // 1. Core checks
    const isMobile = window.matchMedia('(max-width: 1024px)').matches || ('ontouchstart' in window && !window.matchMedia('(pointer: fine)').matches);
    if (isMobile) return;

    // 2. Element setup
    let cursor = document.querySelector('.cursor');
    if (!cursor) {
        cursor = document.createElement('div');
        cursor.className = 'cursor';
        document.body.appendChild(cursor);
    }

    // 3. State - using discrete variables for speed
    let mouseX = -100, mouseY = -100;
    let curX = -100, curY = -100;
    let curScale = 1, targetScale = 1;
    let curOpacity = 0, targetOpacity = 0;
    let rafId = null;

    // --- Extreme-Speed Easing ---
    // 0.55 means it reaches 55% of the distance every frame (~16ms).
    // This results in a very snappy, "attached" feel.
    const EASE_POS = 0.55; 
    const EASE_SCALE = 0.3;

    function tick() {
        // Linear Interpolation (LERP)
        curX += (mouseX - curX) * EASE_POS;
        curY += (mouseY - curY) * EASE_POS;
        curScale += (targetScale - curScale) * EASE_SCALE;
        curOpacity += (targetOpacity - curOpacity) * EASE_SCALE;

        // Apply styles (transform is GPU-accelerated)
        cursor.style.transform = `translate3d(${curX}px, ${curY}px, 0) translate(-50%, -50%) scale(${curScale})`;
        cursor.style.opacity = curOpacity;

        // Auto-stop threshold for CPU efficiency
        const dPos = Math.abs(mouseX - curX) + Math.abs(mouseY - curY);
        const dScale = Math.abs(targetScale - curScale);
        if (dPos < 0.1 && dScale < 0.005 && Math.abs(targetOpacity - curOpacity) < 0.005) {
            // Precise finish
            cursor.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0) translate(-50%, -50%) scale(${targetScale})`;
            cursor.style.opacity = targetOpacity;
            rafId = null;
            return;
        }

        rafId = requestAnimationFrame(tick);
    }

    function startLoop() {
        if (!rafId) rafId = requestAnimationFrame(tick);
    }

    // Event Handling
    window.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        targetOpacity = 1;
        startLoop();
    }, { passive: true });

    // Efficient delegation
    const HOVER_SEL = 'a, button, input, textarea, select, [role="button"], label, .hover-trigger, .card, .case-card, .resident-card';
    
    window.addEventListener('mouseover', (e) => {
        if (e.target.closest(HOVER_SEL)) targetScale = 2.2;
    }, { passive: true });

    window.addEventListener('mouseout', (e) => {
        const target = e.target.closest(HOVER_SEL);
        if (target && (!e.relatedTarget || !e.relatedTarget.closest(HOVER_SEL))) {
            targetScale = 1;
        }
    }, { passive: true });

    window.addEventListener('mousedown', () => targetScale = 0.8, { passive: true });
    window.addEventListener('mouseup', () => targetScale = 1, { passive: true });

    document.addEventListener('mouseleave', () => { targetOpacity = 0; startLoop(); }, { passive: true });
    document.addEventListener('mouseenter', () => { targetOpacity = 1; startLoop(); }, { passive: true });
    
    // API
    document.addEventListener('alab:cursor-hide', () => { targetOpacity = 0; startLoop(); });
    document.addEventListener('alab:cursor-show', () => { targetOpacity = 1; startLoop(); });
    document.addEventListener('alab:cursor-hover-on', () => { targetScale = 2.2; startLoop(); });
    document.addEventListener('alab:cursor-hover-off', () => { targetScale = 1.0; startLoop(); });
})();
