export const extractTikTokId = (url) => {
    if (!url) return null;
    // Handle direct ID
    if (/^\d{15,25}$/.test(url)) return url;

    try {
        const urlObj = new URL(url.includes('http') ? url : `https://${url}`);
        const pathname = urlObj.pathname;

        // Standard link: /@user/video/ID
        const videoMatch = pathname.match(/\/video\/(\d+)/);
        if (videoMatch) return videoMatch[1];

        // Alternative embed link: /embed/v2/ID
        const embedMatch = pathname.match(/\/embed\/v2\/(\d+)/) || pathname.match(/\/embed\/(\d+)/);
        if (embedMatch) return embedMatch[1];

        // Another variant: /v/ID
        const vMatch = pathname.match(/\/v\/(\d+)/);
        if (vMatch) return vMatch[1];
    } catch (e) {
        return null;
    }
    return null;
};

// Robust fetcher that tries multiple strategies
export const fetchTikTokData = async (url) => {
    if (!url) return null;

    // Strategy 1: TikTok OEmbed via AllOrigins Proxy (Official & Reliable for short links)
    try {
        console.log("Fetching TikTok data via OEmbed (proxied):", url);
        const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`;
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(oembedUrl)}`;

        const res = await fetch(proxyUrl);
        const data = await res.json();

        if (data.contents) {
            const oembed = JSON.parse(data.contents);
            if (oembed.thumbnail_url) {
                // Try to find ID in html
                // html usually contains: data-video-id="123..."
                let id = null;
                const idMatch = oembed.html && oembed.html.match(/data-video-id="(\d+)"/);
                if (idMatch) id = idMatch[1];
                else {
                    // Try extracting form the cite url or similar
                    const urlMatch = oembed.html && oembed.html.match(/video\/(\d+)/);
                    if (urlMatch) id = urlMatch[1];
                }

                return {
                    id: id,
                    thumbnail: oembed.thumbnail_url,
                    title: oembed.title,
                    video: null
                };
            }
        }
    } catch (e) {
        console.warn("OEmbed proxy failed:", e);
    }

    // Strategy 2: TikWM via AllOrigins Proxy (Backup)
    try {
        console.log("Fetching TikTok data via TikWM (allorigins):", url);
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
                    video: data.data.play
                };
            }
        }
    } catch (e) {
        console.warn("TikWM allorigins failed:", e);
    }

    // Strategy 3: TikWM via Corsproxy.io (Backup 2)
    try {
        const targetUrl = `https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`;
        const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;
        const res = await fetch(proxyUrl);
        const data = await res.json();
        if (data && data.code === 0 && data.data) {
            return {
                id: data.data.id,
                thumbnail: data.data.cover,
                title: data.data.title,
                video: data.data.play
            };
        }
    } catch (e) { }

    return null;
};

export const resolveTikTokUrl = async (url) => {
    if (!url) return null;

    const isShortLink = url.includes('vt.tiktok.com') ||
        url.includes('vm.tiktok.com') ||
        url.includes('t.tiktok.com') ||
        url.includes('v.tiktok.com');

    if (!isShortLink) return url;

    // Use usage data to resolve ID -> URL
    const data = await fetchTikTokData(url);
    if (data && data.id) {
        return `https://www.tiktok.com/@user/video/${data.id}`;
    }

    // Last resort: Proxy HEAD request to follow redirect
    try {
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
        const res = await fetch(proxyUrl);
        const json = await res.json();
        if (json.status && json.status.url) {
            const resolved = json.status.url;
            if (resolved.includes('tiktok.com/video')) return resolved;
        }
    } catch (e) { }

    return url;
};

export const getEmbedUrl = async (url, isAutoPlay = true) => {
    if (!url) return null;
    const auto = isAutoPlay ? "1" : "0";

    if (url.includes('facebook.com') || url.includes('fb.watch')) {
        return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=0&t=0&autoplay=${auto}&mute=0`;
    }

    // 1. Try quick extraction
    let tiktokId = extractTikTokId(url);

    // 2. If short link or no ID, fetch robust data
    if (!tiktokId) {
        const data = await fetchTikTokData(url);
        if (data && data.id) {
            tiktokId = data.id;
        }
    }

    if (tiktokId) {
        return `https://www.tiktok.com/embed/v2/${tiktokId}?autoplay=${auto}&mute=0&controls=1&playsinline=1&music_info_bar_enabled=1`;
    }

    return null;
};
