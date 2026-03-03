const fs = require('fs');
const path = require('path');

const dirs = [
    '/Users/johnsky/Documents/A-lab.tech',
    '/Users/johnsky/Documents/A-lab.tech/residents'
];

dirs.forEach(dir => {
    fs.readdirSync(dir).forEach(file => {
        if (!file.endsWith('.html')) return;
        const filepath = path.join(dir, file);
        let content = fs.readFileSync(filepath, 'utf8');

        // Fix CSS: reduce transition time
        content = content.replace(
            /(transition:\s*(?:transform|[a-z-]+)\s*[0-9.]+s.*?);/g,
            (match) => {
                if (match.includes('width') && match.includes('height')) {
                    // It's the cursor transition
                    return 'transition: width 0.1s, height 0.1s, background 0.1s;';
                }
                return match;
            }
        );

        // Add hidden state to CSS
        if (content.includes('.cursor.hovered') && !content.includes('.cursor.hidden')) {
            content = content.replace('.cursor.hovered {', '.cursor.hidden { opacity: 0 !important; }\n        .cursor.hovered {');
        }

        // Add CSS to force pointer cursor on interactive elements
        if (content.includes('* {') && !content.includes('a, button, input')) {
            content = content.replace('* {', 'a, button, input, select, textarea { cursor: pointer; }\n        * {');
        }

        // Fix JS: hide cursor on interactive elements
        if (content.includes('const cursor = document.querySelector(\'.cursor\');') && !content.includes("cursor?.classList.add('hidden')")) {
            const jsInjection = `
        document.querySelectorAll('a, button, input, textarea, select, .hover-trigger').forEach(el => {
            el.addEventListener('mouseenter', () => cursor?.classList.add('hidden'));
            el.addEventListener('mouseleave', () => cursor?.classList.remove('hidden'));
        });
            `;
            // insert before closing script tag roughly where the cursor is defined
            content = content.replace(/const cursor = document\.querySelector\('\.cursor'\);/g, "const cursor = document.querySelector('.cursor');" + jsInjection);
        }

        fs.writeFileSync(filepath, content, 'utf8');
    });
});
console.log('Cursor fixes applied to all HTML files.');
