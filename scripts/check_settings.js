
import { supabase } from './src/supabaseClient.js';

async function checkSettings() {
    const { data, error } = await supabase
        .from('site_settings')
        .select('*');

    if (error) {
        console.error('Error fetching site_settings:', error);
    } else {
        console.log('Site Settings:', JSON.stringify(data, null, 2));
    }
}

checkSettings();
