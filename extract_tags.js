import fs from 'fs';
const content = fs.readFileSync('d:/big-bazar-sheet/src/pages/Admin.jsx', 'utf8');
const matches = content.match(/<([A-Z][A-Za-z0-9]*)/g);
if (matches) {
    const tags = Array.from(new Set(matches.map(m => m.slice(1))));
    console.log(tags.sort().join(', '));
}
