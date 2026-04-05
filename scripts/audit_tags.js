import fs from 'fs';
const content = fs.readFileSync('d:/big-bazar-sheet/src/pages/Admin.jsx', 'utf8');
const used = Array.from(new Set(content.match(/<([A-Z][A-Za-z0-9]*)/g).map(m => m.slice(1))));
const lucideImportMatch = content.match(/import \{([^}]+)\} from 'lucide-react'/s);
const lucideImports = [];
if (lucideImportMatch) {
    lucideImportMatch[1].split(',').forEach(line => {
        const parts = line.trim().split(/\s+as\s+/);
        lucideImports.push(parts[parts.length - 1]);
    });
}
const otherImports = Array.from(content.matchAll(/import (?:(\w+)|\{([^}]+)\}) from '([^']+)'/g)).flatMap(m => {
    if (m[1]) return [m[1]];
    if (m[2]) return m[2].split(',').map(s => s.trim().split(/\s+as\s+/).pop());
    return [];
});
const allImports = [...lucideImports, ...otherImports, 'React', 'Fragment'];
const missing = used.filter(u => !allImports.includes(u) && !u.startsWith('HTML'));
console.log('Missing:', missing);
