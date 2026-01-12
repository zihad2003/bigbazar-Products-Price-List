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
    } catch (e) {
        const match = url.match(/\/video\/(\d+)/);
        return match ? match[1] : null;
    }
    return null;
};

// HELPER: Resolve short links (vt.tiktok.com) to long canonical URLs
// This is critical because OEmbed often fails on short links
const expandShortLink = async (url) => {
    // If it already looks like a long link, return it
    if (url.includes('tiktok.com/@') && url.includes('/video/')) return url;

    try {
        console.log("Expanding short link:", url);
        // Use allorigins to follow redirects
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
        const res = await fetch(proxyUrl);
        const data = await res.json();

        if (data.status && data.status.url) {
            return data.status.url;
        }
    } catch (e) {
        console.warn("Link expansion failed:", e);
    }
    return url;
};

export const fetchTikTokData = async (url) => {
    if (!url) return null;

    // 1. Expand the URL first (Crucial step)
    const longUrl = await expandShortLink(url);
    console.log("Using Long URL:", longUrl);

    // 2. Try OEmbed with Long URL (Primary Official Method)
    try {
        const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(longUrl)}`;
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(oembedUrl)}`;
        const res = await fetch(proxyUrl);
        const data = await res.json();

        if (data.contents) {
            const oembed = JSON.parse(data.contents);
            if (oembed.thumbnail_url) {
                return {
                    id: extractTikTokId(longUrl),
                    thumbnail: oembed.thumbnail_url,
                    title: oembed.title,
                    video: null
                };
            }
        }
    } catch (e) {
        console.warn("OEmbed failed:", e);
    }

    // 3. Try TikWM (Backup Method)
    try {
        const targetUrl = `https://www.tikwm.com/api/?url=${encodeURIComponent(longUrl)}`;
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
        console.warn("TikWM failed:", e);
    }

    return null;
};

export const resolveTikTokUrl = async (url) => {
    return expandShortLink(url);
};

export const getEmbedUrl = async (url, isAutoPlay = true) => {
    if (!url) return null;
    const auto = isAutoPlay ? "1" : "0";

    // Expand link first
    const longUrl = await expandShortLink(url);
    const tiktokId = extractTikTokId(longUrl);

    if (tiktokId) {
        return `https://www.tiktok.com/embed/v2/${tiktokId}?autoplay=${auto}&mute=0&controls=1&playsinline=1&music_info_bar_enabled=1`;
    }
    return null;
};
