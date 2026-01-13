import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Load env vars manually without dotenv
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../.env.local');

if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split(/\r?\n/).forEach(line => {
        // Handle KEY=VALUE
        const parts = line.split('=');
        if (parts.length >= 2) {
            const key = parts[0].trim();
            const val = parts.slice(1).join('=').trim();
            process.env[key] = val;
        }
    });
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials. Ensure .env.local exists and has VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// --- TikTok Utils ---

const extractTikTokId = (url) => {
    if (!url) return null;
    if (/^\d{15,25}$/.test(url)) return url;
    try {
        const urlObj = new URL(url.includes('http') ? url : `https://${url}`);
        const pathname = urlObj.pathname;
        const videoMatch = pathname.match(/\/video\/(\d+)/);
        if (videoMatch) return videoMatch[1];
    } catch (e) {
        const match = url.match(/\/video\/(\d+)/);
        return match ? match[1] : null;
    }
    return null;
};

const expandShortLink = async (url) => {
    if (url.includes('tiktok.com/@') && url.includes('/video/')) return url;
    try {
        console.log("Expanding:", url);
        // Using allorigins to simulate browser request
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
        const res = await fetch(proxyUrl);
        const data = await res.json();
        if (data.status && data.status.url) return data.status.url;
    } catch (e) { console.warn("Expand failed", e.message); }
    return url;
};

const fetchTikTokData = async (url) => {
    if (!url) return null;
    let longUrl = await expandShortLink(url);

    // TikWM Direct via Proxy
    try {
        const targetUrl = `https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`;
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;

        const res = await fetch(proxyUrl);
        const proxyData = await res.json();

        if (proxyData.contents) {
            const data = JSON.parse(proxyData.contents);
            if (data && data.code === 0 && data.data) {
                return {
                    id: data.data.id,
                    thumbnail: data.data.cover,
                    title: data.data.title,
                    canonical_url: `https://www.tiktok.com/@${data.data.author.unique_id}/video/${data.data.id}`
                };
            }
        }
    } catch (e) { console.log("TikWM failed", e.message); }

    // Backup: OEmbed via Proxy
    try {
        const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(longUrl)}`;
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(oembedUrl)}`;
        const res = await fetch(proxyUrl);
        const data = await res.json();

        if (data.contents) {
            const oembed = JSON.parse(data.contents);
            if (oembed.thumbnail_url) {
                return {
                    thumbnail: oembed.thumbnail_url,
                    canonical_url: longUrl
                };
            }
        }
    } catch (e) { console.log("OEmbed failed", e.message); }

    return null;
};

// --- Main Script ---

async function migrate() {
    console.log("Starting thumbnail backfill...");

    const { data: products, error } = await supabase
        .from('products')
        .select('*')
        .not('video_url', 'is', null);

    if (error) {
        console.error("Error fetching products:", error);
        return;
    }

    console.log(`Checking ${products.length} products with video URLs...`);
    let count = 0;

    for (const p of products) {
        // Check if it needs a thumbnail
        const hasImages = (p.images && p.images.length > 0) || (p.image_url && p.image_url.length > 5);

        if (hasImages) {
            continue;
        }

        console.log(`Processing [${p.id}] ${p.name}...`);
        console.log(`  Source: ${p.video_url}`);

        const data = await fetchTikTokData(p.video_url);

        if (data && data.thumbnail) {
            console.log(`  > Found thumbnail! Saving...`);

            const updates = {
                images: [data.thumbnail],
                image_url: data.thumbnail
            };

            if (data.canonical_url) {
                updates.video_url = data.canonical_url;
            }

            const { error: updateError } = await supabase
                .from('products')
                .update(updates)
                .eq('id', p.id);

            if (updateError) console.error("  > Update Failed:", updateError.message);
            else {
                console.log("  > Success.");
                count++;
            }

        } else {
            console.log("  > Could not resolve thumbnail.");
        }

        // Rate limit help
        await new Promise(r => setTimeout(r, 1500));
    }

    console.log(`Migration complete. Updated ${count} products.`);
}

migrate();
