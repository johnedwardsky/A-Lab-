const fs = require('fs');
const path = require('path');

const dirs = [
    '/Users/johnsky/Documents/A-lab.tech',
    '/Users/johnsky/Documents/A-lab.tech/residents'
];

dirs.forEach(dir => {
    if (!fs.existsSync(dir)) return;
    fs.readdirSync(dir).forEach(file => {
        if (!file.endsWith('.html')) return;
        const filepath = path.join(dir, file);
        let content = fs.readFileSync(filepath, 'utf8');

        // 1. Remove old CSS cursor block
        content = content.replace(/\/\* --- CUSTOM CURSOR --- \*\/[\s\S]*?\.cursor\.hovered[\s\S]*?}/g, '');
        content = content.replace(/\/\* --- CURSOR --- \*\/[\s\S]*?\.cursor\.hovered[\s\S]*?}/g, '');
        content = content.replace(/\.cursor {[\s\S]*?\.cursor\.hovered[\s\S]*?}/g, '');
        content = content.replace(/\.cursor {[\s\S]*?\.cursor\.hidden[\s\S]*?}/g, '');

        // 2. Remove pointer/none cursor overrides in style tag
        content = content.replace(/a, button, input, select, textarea { cursor: pointer; }/g, '');
        content = content.replace(/\* {[\s\S]*?cursor: none;[\s\S]*?}/g, '');

        // 3. Remove old cursor script block
        content = content.replace(/<script>[\s\S]*?const cursor = document\.querySelector\('\.cursor'\);[\s\S]*?<\/script>/g, '');
        content = content.replace(/<script>[\s\S]*?document\.addEventListener\('mousemove'[\s\S]*?cursor\.style\.left[\s\S]*?<\/script>/g, '');

        // 4. Inject new cursor.css link in <head>
        if (!content.includes('href="cursor.css"') && content.includes('</head>')) {
            content = content.replace('</head>', '    <link rel="stylesheet" href="cursor.css">\n</head>');
        }

        // 5. Inject new cursor element and script
        if (content.includes('</body>')) {
            // First remove any existing <div class="cursor"></div> to avoid duplicates
            content = content.replace('<div class="cursor"></div>', '');

            // Add script if missing
            if (!content.includes('src="cursor.js"')) {
                content = content.replace('</body>', '    <script defer src="cursor.js"></script>\n</body>');
            }
        }

        fs.writeFileSync(filepath, content, 'utf8');
    });
});
console.log('Standardized X-Ray cursor applied to all HTML files.');
