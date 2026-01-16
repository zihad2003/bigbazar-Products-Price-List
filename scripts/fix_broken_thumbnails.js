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

async function fixThumbnails() {
    console.log('Fetching products...');
    const { data: products, error } = await supabase.from('products').select('*');

    if (error) {
        console.error('Error fetching:', error);
        return;
    }

    console.log(`Checking ${products.length} products...`);

    for (const p of products) {
        let needsUpdate = false;
        let newImage = p.image_url;

        const extractId = (url) => {
            const match = url?.match(/\/(reels|reel|p|tv)\/([a-zA-Z0-9_-]+)/);
            return match ? match[2] : null;
        };

        const id = p.platform_id || extractId(p.image_url) || extractId(p.video_url);

        // We want to force update to the weserv URL if it's not already correct
        // weserv URL format: https://images.weserv.nl/?url=instagram.com/p/{id}/media/?size=l

        if (id) {
            // Check if we need to update to the new robust format
            const robustUrl = `https://images.weserv.nl/?url=instagram.com/p/${id}/media/?size=l`;

            // Update if it's not the robust URL
            if (p.image_url !== robustUrl) {
                newImage = robustUrl;
                needsUpdate = true;
            }
        }

        if (needsUpdate) {
            console.log(`Fixing product ${p.id} -> ${newImage}`);
            const { error: updateError } = await supabase
                .from('products')
                .update({
                    image_url: newImage,
                    images: [newImage]
                })
                .eq('id', p.id);

            if (updateError) console.error(`Failed to update ${p.id}:`, updateError);
        }
    }
    console.log('Done!');
}

fixThumbnails();
