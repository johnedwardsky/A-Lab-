/**
 * A-LAB.TECH Standard X-Ray Cursor JS
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

    // Movement tracking
    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;

        // Ensure cursor is visible when moving
        if (cursor.classList.contains('hidden')) {
            cursor.classList.remove('hidden');
        }
    });

    // Performance-optimized animation loop
    function updateCursor() {
        // Smoothing (optional, but requested for premium feel)
        const ease = 0.2;
        currentX += (mouseX - currentX) * ease;
        currentY += (mouseY - currentY) * ease;

        cursor.style.transform = `translate3d(${currentX}px, ${currentY}px, 0) translate(-50%, -50%)`;
        requestAnimationFrame(updateCursor);
    }
    updateCursor();

    // Hover states for ALL interactive elements
    function addHoverListeners() {
        const triggers = document.querySelectorAll('a, button, input, textarea, select, .hover-trigger');

        triggers.forEach(el => {
            el.addEventListener('mouseenter', () => {
                cursor.classList.add('hovered');
            });
            el.addEventListener('mouseleave', () => {
                cursor.classList.remove('hovered');
            });
        });
    }

    // Run on init
    addHoverListeners();

    // Re-run when DOM changes (e.g. dynamic content)
    const observer = new MutationObserver(addHoverListeners);
    observer.observe(document.body, { childList: true, subtree: true });

    // Handle clicks
    document.addEventListener('mousedown', () => cursor.style.transform += ' scale(0.9)');
    document.addEventListener('mouseup', () => cursor.style.transform = cursor.style.transform.replace(' scale(0.9)', ''));

    // Window leave/enter
    document.addEventListener('mouseleave', () => cursor.classList.add('hidden'));
    document.addEventListener('mouseenter', () => cursor.classList.remove('hidden'));

    // For i18n compatibility: hide if specifically requested
    document.addEventListener('alab:cursor-hide', () => cursor.classList.add('hidden'));
    document.addEventListener('alab:cursor-show', () => cursor.classList.remove('hidden'));
})();
