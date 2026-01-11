import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

const checkTable = async () => {
    const { data, error } = await supabase.from('site_settings').select('*').limit(1);
    if (error) {
        console.log("Error accessing site_settings:", error.message);
    } else {
        console.log("site_settings exists. Data:", data);
    }
};

checkTable();
