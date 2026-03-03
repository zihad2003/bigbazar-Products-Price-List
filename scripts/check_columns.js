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

async function checkSchema() {
    // Try to insert a dummy order to see what columns exist if we can't find any
    const { data: columns, error } = await supabase.rpc('get_column_names', { table_name: 'orders' });

    // If that fails (which it might if RPC isn't set up), let's just try to fetch 100 orders to find any data
    const { data: orders, error: fetchError } = await supabase.from('orders').select('*').limit(10);

    if (fetchError) {
        console.error('Fetch Error:', fetchError);
        return;
    }

    if (orders && orders.length > 0) {
        console.log('--- Orders Schema (from existing data) ---');
        console.log('Available Columns:', Object.keys(orders[0]));
        console.log('Sample Data:', orders[0]);
    } else {
        console.log('No orders found to inspect.');
        // Try to check if we can at least see the table structure via a dummy update or select
        const { error: probeError } = await supabase.from('orders').select('is_advance_paid').limit(1);
        if (probeError) {
            console.log('Column "is_advance_paid" does NOT appear to exist:', probeError.message);
        } else {
            console.log('Column "is_advance_paid" exists!');
        }
    }
}

checkSchema();
