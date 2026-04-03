const fs = require('fs');
const filePath = 'd:/big-bazar-sheet/src/pages/Admin.jsx';
const lines = fs.readFileSync(filePath, 'utf8').split('\n');
// We want to delete lines index 1876..1884 (1-indexed 1877..1885)
// Check if they look like the duplicated block
if (lines[1877].includes('button') && lines[1880].includes('</div>') && lines[1884].includes('</div>')) {
    lines.splice(1876, 9); // Remove 9 lines starting from 1877 (index 1876)
    fs.writeFileSync(filePath, lines.join('\n'));
    console.log('Successfully fixed duplication.');
} else {
    console.log('Duplication not found at expected lines. Checking nearby...');
    console.log('Line 1877:', lines[1877]);
    console.log('Line 1881:', lines[1881]);
    console.log('Line 1885:', lines[1885]);
}
