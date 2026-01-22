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

async function checkCreatedAt() {
    const { data: products, error } = await supabase.from('products').select('id, created_at').order('created_at', { ascending: false }).limit(5);
    if (error) {
        console.log('created_at does not exist or error:', error.message);
        return;
    }
    console.log('Products ordered by created_at:');
    products.forEach(p => console.log(p));
}

checkCreatedAt();
