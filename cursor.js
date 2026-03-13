/**
 * A-LAB.TECH X-Ray Cursor — Ultra-Smooth Pro Build
 * Position, Scale and Opacity are synced in a single rAF loop.
 */
(function () {
    if (window.matchMedia('(max-width: 768px)').matches) return;
    if ('ontouchstart' in window && !window.matchMedia('(pointer: fine)').matches) return;

    let cursor = document.querySelector('.cursor');
    if (!cursor) {
        cursor = document.createElement('div');
        cursor.className = 'cursor';
        document.body.appendChild(cursor);
    }

    // State
    let mouseX = -100, mouseY = -100;
    let curX = -100, curY = -100;
    let curScale = 1, targetScale = 1;
    let curOpacity = 0, targetOpacity = 0;
    let rafId = null;

    // Snapping & Easing
    const EASE_POS = 0.3; 
    const EASE_SCALE = 0.2;

    function tick() {
        // Position easing
        curX += (mouseX - curX) * EASE_POS;
        curY += (mouseY - curY) * EASE_POS;
        
        // Scale & Opacity easing
        curScale += (targetScale - curScale) * EASE_SCALE;
        curOpacity += (targetOpacity - curOpacity) * EASE_SCALE;

        cursor.style.transform = `translate3d(${curX}px, ${curY}px, 0) translate(-50%, -50%) scale(${curScale})`;
        cursor.style.opacity = curOpacity;

        // Auto-stop loop if everything is settled
        const dPos = Math.abs(mouseX - curX) + Math.abs(mouseY - curY);
        const dScale = Math.abs(targetScale - curScale);
        if (dPos < 0.1 && dScale < 0.001 && curOpacity === targetOpacity) {
            rafId = null;
            return;
        }

        rafId = requestAnimationFrame(tick);
    }

    function startLoop() {
        if (!rafId) rafId = requestAnimationFrame(tick);
    }

    window.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        targetOpacity = 1;
        startLoop();
    }, { passive: true });

    // Hover delegation
    const HOVER_SEL = 'a, button, input, textarea, select, [role="button"], label, .hover-trigger';
    window.addEventListener('mouseover', (e) => {
        if (e.target.closest(HOVER_SEL)) targetScale = 2.5;
    }, { passive: true });

    window.addEventListener('mouseout', (e) => {
        if (e.target.closest(HOVER_SEL)) {
            if (!e.relatedTarget || !e.relatedTarget.closest(HOVER_SEL)) targetScale = 1;
        }
    }, { passive: true });

    window.addEventListener('mousedown', () => targetScale = 0.8, { passive: true });
    window.addEventListener('mouseup', () => targetScale = 1, { passive: true });

    document.addEventListener('mouseleave', () => { targetOpacity = 0; startLoop(); }, { passive: true });
    document.addEventListener('mouseenter', () => { targetOpacity = 1; startLoop(); }, { passive: true });
    
    // Custom Events
    document.addEventListener('alab:cursor-hide', () => { targetOpacity = 0; startLoop(); });
    document.addEventListener('alab:cursor-show', () => { targetOpacity = 1; startLoop(); });
})();
