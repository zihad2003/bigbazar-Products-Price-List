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
    const [k, ...vParts] = l.split('=');
    env[k.trim()] = vParts.join('=').trim();
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function checkOrdersSchema() {
    const { data: data, error } = await supabase.from('orders').select('*').limit(1);
    if (error) {
        console.error('Error fetching orders:', error);
        return;
    }
    if (data && data.length > 0) {
        console.log('Sample Order Keys:', Object.keys(data[0]));
        console.log('Sample Order:', JSON.stringify(data[0], null, 2));
    } else {
        console.log('No orders found.');
    }
}

checkOrdersSchema();
