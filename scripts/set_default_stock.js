import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envContent = fs.readFileSync(path.join(__dirname, '../.env'), 'utf8');
const env = {};
envContent.split('\n').filter(l => l.includes('=')).forEach(l => {
    const [k, ...vParts] = l.split('=');
    env[k.trim()] = vParts.join('=').trim();
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function setDefaultStock() {
    // Fetch all products where stock_count is null OR 0, and not deleted
    const { data: products, error } = await supabase
        .from('products')
        .select('id, name, stock_count, is_sold_out, status')
        .or('stock_count.is.null,stock_count.eq.0')
        .neq('status', 'deleted');

    if (error) { console.error('Fetch error:', error); return; }
    console.log(`Found ${products.length} products with no/zero stock.`);

    let updated = 0;
    for (const p of products) {
        const { error: upErr } = await supabase
            .from('products')
            .update({ stock_count: 3, is_sold_out: false })
            .eq('id', p.id);

        if (upErr) {
            console.error(`  ❌ Failed to update "${p.name}":`, upErr.message);
        } else {
            console.log(`  ✅ ${p.name} → stock_count=3, is_sold_out=false`);
            updated++;
        }
    }
    console.log(`\nDone. Updated ${updated}/${products.length} products.`);
}

setDefaultStock();
