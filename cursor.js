/**
 * A-LAB.TECH Standard X-Ray Cursor JS (Optimized)
 */
(function () {
    // Only run on non-mobile devices
    if (window.matchMedia("(max-width: 768px)").matches) return;

    let cursor = document.querySelector('.cursor');
    if (!cursor) {
        cursor = document.createElement('div');
        cursor.className = 'cursor';
        document.body.appendChild(cursor);
    }

    let mouseX = -100, mouseY = -100;
    let currentX = -100, currentY = -100;
    let isMoving = false;
    let scale = 1;

    // Movement tracking - very high efficiency
    window.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;

        if (!isMoving) {
            isMoving = true;
            cursor.classList.remove('hidden');
        }
    }, { passive: true });

    // Performance-optimized animation loop
    function updateCursor() {
        const ease = 0.4;
        currentX += (mouseX - currentX) * ease;
        currentY += (mouseY - currentY) * ease;

        const targetScale = cursor.classList.contains('click') ? 0.8 : 1;
        scale += (targetScale - scale) * 0.3;

        cursor.style.transform = `translate3d(${currentX}px, ${currentY}px, 0) translate(-50%, -50%) scale(${scale})`;
        requestAnimationFrame(updateCursor);
    }
    updateCursor();

    // PERFORMANCE OPTIMIZATION: Event delegation instead of MutationObserver
    // This avoids heavy querySelectorAll/looping every time the DOM changes.
    window.addEventListener('mouseover', (e) => {
        const target = e.target.closest('a, button, input, textarea, select, .hover-trigger');
        if (target) {
            cursor.classList.add('hovered');
        }
    });

    window.addEventListener('mouseout', (e) => {
        const target = e.target.closest('a, button, input, textarea, select, .hover-trigger');
        if (target) {
            cursor.classList.remove('hovered');
        }
    });

    // Handle clicks with CSS for performance
    window.addEventListener('mousedown', () => cursor.classList.add('click'));
    window.addEventListener('mouseup', () => cursor.classList.remove('click'));

    // Window visibility
    document.addEventListener('mouseleave', () => cursor.classList.add('hidden'));
    document.addEventListener('mouseenter', () => cursor.classList.remove('hidden'));

    // Custom events
    document.addEventListener('alab:cursor-hide', () => cursor.classList.add('hidden'));
    document.addEventListener('alab:cursor-show', () => cursor.classList.remove('hidden'));
})();
