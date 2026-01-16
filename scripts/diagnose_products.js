import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env
const envContent = fs.readFileSync(path.join(__dirname, '../.env'), 'utf8');
const env = {};
envContent.split('\n').filter(l => l.includes('=')).forEach(l => {
    const [k, v] = l.split('=');
    env[k.trim()] = v.trim();
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function diagnose() {
    console.log('Fetching all products...');
    const { data: products, error } = await supabase.from('products').select('id, name, status');

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log(`Total Products in DB: ${products.length}`);

    const counts = {};
    const unseen = [];

    products.forEach(p => {
        const s = p.status || 'NULL/UNDEFINED';
        counts[s] = (counts[s] || 0) + 1;

        if (s !== 'pending' && s !== 'published') {
            unseen.push({ id: p.id, name: p.name, status: s });
        }
    });

    console.log('\n--- STATUS COUNTS ---');
    let total = 0;
    for (const [status, count] of Object.entries(counts)) {
        console.log(`Status: "${status}" - Count: ${count}`);
        total += count;
    }
    console.log(`Total Counted: ${total}`);

    if (unseen.length > 0) {
        console.log('\n--- WEIRD STATUSES ---');
        unseen.forEach(p => console.log(`${p.id}: ${p.status} (${p.name})`));
    }
}

diagnose();
