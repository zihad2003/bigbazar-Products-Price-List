
import { createClient } from '@supabase/supabase-js';
import * as tiktokUtils from '../src/utils/tiktok.js';
const { resolveTikTokUrl } = tiktokUtils;

// Load env vars (naive approach for script, better to use dotenv if available, but let's try direct args or hardcode since we know them)
// Actually, reading .env is safer.
import fs from 'fs';
import path from 'path';

const envPath = path.resolve('.env');
const envConfig = fs.readFileSync(envPath, 'utf8').split('\n').reduce((acc, line) => {
    const [key, val] = line.split('=');
    if (key && val) acc[key.trim()] = val.trim();
    return acc;
}, {});

const supabaseUrl = envConfig.VITE_SUPABASE_URL;
const supabaseKey = envConfig.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Could not find Supabase credentials in .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrate() {
    console.log("Starting migration of TikTok links...");

    // 1. Fetch all products with a video_url
    const { data: products, error } = await supabase
        .from('products')
        .select('id, video_url')
        .not('video_url', 'is', null);

    if (error) {
        console.error("Error fetching products:", error);
        return;
    }

    console.log(`Found ${products.length} products with video links.`);

    let updatedCount = 0;

    for (const p of products) {
        if (!p.video_url) continue;

        // Check if it looks like a short link or needs resolution
        // Our resolveTikTokUrl handles short links mainly.
        // If it's already an embed link or standard link, it returns original or standard.
        // We want to convert to standard https://www.tiktok.com/video/ID format if possible for best compatibility
        // or just let the resolver do its work.

        try {
            console.log(`Processing ${p.id}: ${p.video_url}`);
            const resolved = await resolveTikTokUrl(p.video_url);

            if (resolved && resolved !== p.video_url) {
                console.log(` -> Resolved to: ${resolved}`);

                // Update DB
                const { error: updateError } = await supabase
                    .from('products')
                    .update({ video_url: resolved })
                    .eq('id', p.id);

                if (updateError) console.error(`Failed to update ${p.id}:`, updateError);
                else updatedCount++;
            } else {
                console.log(" -> No change needed.");
            }
        } catch (err) {
            console.error(`Error processing ${p.id}:`, err);
        }
    }

    console.log(`Migration complete. Updated ${updatedCount} products.`);
}

migrate();
