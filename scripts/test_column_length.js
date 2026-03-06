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

async function checkColumnLength() {
    const longName = "A".repeat(1000);
    const { error } = await supabase.from('orders').insert([{
        product_id: null,
        product_name: longName,
        product_price: 0,
        customer_name: 'TEST_DELETE_ME',
        customer_phone: '00000000000',
        customer_address: 'TEST_ADDRESS',
        delivery_area: 'inside',
        delivery_charge: 0,
        total_amount: 0,
        status: 'Deleted'
    }]);

    if (error) {
        console.error('Insert failed:', error.message);
        if (error.message.includes('too long')) {
            console.log('Confirmed: 1000 chars is too long.');
        }
    } else {
        console.log('Insert succeeded! product_name supports at least 1000 chars.');
        await supabase.from('orders').delete().eq('customer_name', 'TEST_DELETE_ME');
    }
}

checkColumnLength();
