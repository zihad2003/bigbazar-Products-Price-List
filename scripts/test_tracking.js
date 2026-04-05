
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://pivubscasxatxkxqxzqx.supabase.co'; // I'll check the .env
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Missing env vars");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testTrack() {
    console.log("Testing tracking query...");
    const searchPattern = '%017%';
    const conditions = [
        `customer_phone.ilike.${searchPattern}`,
        `customer_name.ilike.${searchPattern}`
    ];

    const { data, error } = await supabase
        .from('orders')
        .select('*')
        .or(conditions.join(','))
        .limit(5);

    if (error) {
        console.error("Error:", error);
    } else {
        console.log("Success! Found", data.length, "orders");
        if (data.length > 0) {
            console.log("Sample ID:", data[0].id);
        }
    }
}

testTrack();
