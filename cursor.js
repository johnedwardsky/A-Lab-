/**
 * A-LAB.TECH X-Ray Cursor — High-Performance Build
 * Optimizations:
 *  - rAF only runs while mouse is moving (idle cancellation)
 *  - Dead-zone snapping to stop micro-updates
 *  - Scale-based hover instead of width/height (single composite layer)
 *  - Event-delegation with pointer capture avoidance
 *  - Passive listeners throughout
 *  - Zero layout thrash (no offsetWidth/getBoundingClientRect in loop)
 */
(function () {
    // Skip on mobile/touch devices
    if (window.matchMedia('(max-width: 768px)').matches) return;
    if ('ontouchstart' in window && !window.matchMedia('(pointer: fine)').matches) return;

    // --- Element ---
    let cursor = document.querySelector('.cursor');
    if (!cursor) {
        cursor = document.createElement('div');
        cursor.className = 'cursor';
        document.body.appendChild(cursor);
    }

    // --- State ---
    let mouseX = -200, mouseY = -200;
    let curX = -200, curY = -200;
    let rafId = null;
    let isHovered = false;
    let isDown = false;

    // Snapping threshold: stop animating when delta is tiny
    const SNAP = 0.15;

    // --- Render Loop (only while active) ---
    function tick() {
        const dx = mouseX - curX;
        const dy = mouseY - curY;

        if (Math.abs(dx) < SNAP && Math.abs(dy) < SNAP) {
            // Close enough — snap exactly and stop loop
            curX = mouseX;
            curY = mouseY;
            cursor.style.transform = buildTransform(curX, curY);
            rafId = null;
            return;
        }

        // Ease toward target (0.35 = snappy but smooth)
        curX += dx * 0.35;
        curY += dy * 0.35;
        cursor.style.transform = buildTransform(curX, curY);
        rafId = requestAnimationFrame(tick);
    }

    function buildTransform(x, y) {
        return `translate3d(${x}px,${y}px,0) translate(-50%,-50%)`;
    }

    function scheduleTick() {
        if (!rafId) rafId = requestAnimationFrame(tick);
    }

    // --- Mouse Events (passive) ---
    window.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        scheduleTick();

        if (cursor.classList.contains('hidden')) {
            cursor.classList.remove('hidden');
        }
    }, { passive: true });

    // --- Hover Detection via Event Delegation ---
    const HOVER_SELECTOR = 'a, button, input, textarea, select, [role="button"], label, .hover-trigger';

    window.addEventListener('mouseover', (e) => {
        if (e.target.closest(HOVER_SELECTOR)) {
            if (!isHovered) {
                isHovered = true;
                cursor.classList.add('hovered');
            }
        }
    }, { passive: true });

    window.addEventListener('mouseout', (e) => {
        if (e.target.closest(HOVER_SELECTOR)) {
            // Only remove if we're not entering another trigger immediately
            // relatedTarget check avoids flicker between nested elements
            if (!e.relatedTarget || !e.relatedTarget.closest(HOVER_SELECTOR)) {
                isHovered = false;
                cursor.classList.remove('hovered');
            }
        }
    }, { passive: true });

    // --- Click Pulse ---
    window.addEventListener('mousedown', () => {
        if (!isDown) { isDown = true; cursor.classList.add('click'); }
    }, { passive: true });

    window.addEventListener('mouseup', () => {
        if (isDown) { isDown = false; cursor.classList.remove('click'); }
    }, { passive: true });

    // --- Visibility ---
    document.addEventListener('mouseleave', () => cursor.classList.add('hidden'), { passive: true });
    document.addEventListener('mouseenter', () => cursor.classList.remove('hidden'), { passive: true });

    // --- Custom Events (for other scripts) ---
    document.addEventListener('alab:cursor-hide', () => cursor.classList.add('hidden'));
    document.addEventListener('alab:cursor-show', () => cursor.classList.remove('hidden'));
    document.addEventListener('alab:cursor-hover-on', () => { isHovered = true; cursor.classList.add('hovered'); });
    document.addEventListener('alab:cursor-hover-off', () => { isHovered = false; cursor.classList.remove('hovered'); });
})();
