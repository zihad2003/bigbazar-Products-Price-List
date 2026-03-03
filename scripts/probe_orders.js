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

async function probe() {
    const cols = ['customer_note', 'is_advance_paid'];
    for (const col of cols) {
        const { error } = await supabase.from('orders').select(col).limit(1);
        if (error) {
            console.log(`Column "${col}": Missing (Reason: ${error.message})`);
        } else {
            console.log(`Column "${col}": Exists`);
        }
    }
}

probe();
