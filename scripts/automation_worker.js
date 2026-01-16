/**
 * Cloudflare Worker for Instagram Reels Webhook & Video Proxy
 * 1. Handles Instagram Webhooks to auto-import reels as 'pending'
 * 2. Acts as a Video Proxy to ensure proper CDN headers (Accept-Ranges)
 */

export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        // --- 1. IG Webhook Challenge (Setup) ---
        if (request.method === 'GET' && url.searchParams.get('hub.challenge')) {
            return new Response(url.searchParams.get('hub.challenge'));
        }

        // --- 2. IG Webhook POST (Real-time Import) ---
        if (request.method === 'POST' && url.pathname === '/webhook/instagram') {
            try {
                const body = await request.json();
                // Extract Media ID from Instagram notification
                const mediaId = body.entry?.[0]?.changes?.[0]?.value?.id;

                if (mediaId) {
                    // Log the incoming webhook
                    await logToSupabase(env, 'webhook', `Received IG Reel: ${mediaId}`, { body });

                    // Trigger the import process
                    // NOTE: Usually you'd call the FB Graph API here with a Long-Lived Token
                    // to get the direct video_url and caption.
                    await importReelToSupabase(env, mediaId);
                }

                return new Response('OK', { status: 200 });
            } catch (err) {
                await logToSupabase(env, 'error', `Webhook Failure: ${err.message}`, { method: 'POST' });
                return new Response('Error', { status: 500 });
            }
        }

        // --- 3. Video Proxy (Native <video> Optimization) ---
        // Usage: /proxy-video?url=INSTAGRAM_VIDEO_URL
        if (url.pathname === '/proxy-video') {
            const videoUrl = url.searchParams.get('url');
            if (!videoUrl) return new Response('Missing URL', { status: 400 });

            const igResponse = await fetch(videoUrl, {
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });

            const newHeaders = new Headers(igResponse.headers);
            newHeaders.set('Access-Control-Allow-Origin', '*');
            newHeaders.set('Cache-Control', 'public, max-age=31536000');
            newHeaders.set('Accept-Ranges', 'bytes');

            return new Response(igResponse.body, {
                status: igResponse.status,
                headers: newHeaders
            });
        }

        return new Response('BigBazar Automation Worker Active', { status: 200 });
    }
};

async function logToSupabase(env, type, message, details) {
    await fetch(`${env.SUPABASE_URL}/rest/v1/system_logs`, {
        method: 'POST',
        headers: {
            'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ type, message, details })
    });
}

async function importReelToSupabase(env, mediaId) {
    // 1. Fetch from IG Graph API
    // We need the permalink to store as video_url so our frontend can embed it
    const token = env.IG_ACCESS_TOKEN;
    if (!token) {
        throw new Error('Missing IG_ACCESS_TOKEN');
    }

    const fields = 'permalink,thumbnail_url,media_url,caption,media_type';
    const graphUrl = `https://graph.facebook.com/v18.0/${mediaId}?fields=${fields}&access_token=${token}`;

    const igResp = await fetch(graphUrl);
    if (!igResp.ok) {
        const errText = await igResp.text();
        throw new Error(`IG API Error: ${errText}`);
    }

    const igData = await igResp.json();

    // 2. Upsert to Supabase
    // We use mediaId as platform_id for uniqueness
    // Use permalink for video_url so the frontend works with it
    const payload = {
        platform_id: mediaId,
        status: 'pending',
        video_url: igData.permalink,
        images: [igData.thumbnail_url || igData.media_url], // thumbnail_url is only for video; media_url is fallback
        description: igData.caption || '',
        name: `New Drop ${mediaId.substring(0, 6)}`,
        price: 0, // Default price, admin needs to set it
        is_new: true
    };

    const supabaseResp = await fetch(`${env.SUPABASE_URL}/rest/v1/products`, {
        method: 'POST',
        headers: {
            'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=ignore-duplicates'
        },
        body: JSON.stringify(payload)
    });

    if (!supabaseResp.ok) {
        const sbErr = await supabaseResp.text();
        throw new Error(`Supabase Error: ${sbErr}`);
    }
}
