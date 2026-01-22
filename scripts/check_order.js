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
    const { data: products, error } = await supabase.from('products').select('*').limit(5);
    if (error) {
        console.error('Error:', error);
        return;
    }
    if (products && products.length > 0) {
        products.forEach(p => {
            console.log(`ID: ${p.id} | Serial: ${p.serial_no} | Name: ${p.name}`);
        });
    } else {
        console.log('No products found.');
    }
}

checkSchema();
