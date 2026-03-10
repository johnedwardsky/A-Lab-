const fs = require('fs');
const path = require('path');

const rootDir = '/Users/johnsky/Documents/A-lab.tech';

function getFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        if (['BUILD_FOR_CLOUDFLARE', 'node_modules', '.git', 'prototype', '.gemini', 'python', 'api'].includes(file)) continue;

        const filePath = path.join(dir, file);
        try {
            if (fs.statSync(filePath).isDirectory()) {
                getFiles(filePath, fileList);
            } else if (filePath.endsWith('.html')) {
                fileList.push(filePath);
            }
        } catch (e) { }
    }
    return fileList;
}

const htmlFiles = getFiles(rootDir);

for (const file of htmlFiles) {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    // Remove old cursor HTML div
    content = content.replace(/<div class="cursor(?:.*?)"><\/div>\s*/g, '');

    // Safely stub out the inline cursor logic (since cursor.js handles it now)
    // If we delete the physical div, the querySelector returns null and breaks the rest of the inline script.
    // By providing a dummy object with stubbed methods, the old script runs without error and without effecting anything!
    const safeCursorStub = `(document.querySelector('.cursor-dummy') || { style: {}, classList: { add: ()=>{}, remove: ()=>{}, contains: ()=>false, toggle: ()=>{} } })`;
    content = content.replace(/document\.querySelector\(['"]\.cursor['"]\)/g, safeCursorStub);

    // Remove old CSS & JS linkages to cursor
    content = content.replace(/<link rel="stylesheet" href="[^"]*cursor\.css">\s*/g, '');
    content = content.replace(/<link rel="stylesheet" href="[^"]*fix_cursor\.css">\s*/g, '');
    content = content.replace(/<script\s+[^>]*src="[^"]*fix_cursor\.js"[^>]*><\/script>\s*/g, '');
    content = content.replace(/<script\s+[^>]*src="[^"]*cursor\.js"[^>]*><\/script>\s*/g, '');

    // Inject cursor.css before </head>
    const relativePath = path.relative(path.dirname(file), rootDir);
    const prefix = relativePath ? relativePath + '/' : '';

    // Some pages might already have it properly (just to make sure no duplicates)
    const cssPath = `${prefix}cursor.css`;
    content = content.replace(/<\/head>/i, `    <link rel="stylesheet" href="${cssPath}">\n</head>`);

    // Inject cursor.js before </body>
    const jsPath = `${prefix}cursor.js`;
    content = content.replace(/<\/body>/i, `    <script defer src="${jsPath}"></script>\n</body>`);

    if (content !== original) {
        fs.writeFileSync(file, content);
        console.log('Fixed', path.relative(rootDir, file));
    }
}
