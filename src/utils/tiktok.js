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
        // Fallback regex if URL parsing fails
        const match = url.match(/\/video\/(\d+)/) || url.match(/\/v\/(\d+)/) || url.match(/v2\/(\d+)/);
        return match ? match[1] : null;
    }
    return null;
};

export const resolveTikTokUrl = async (url) => {
    if (!url) return null;
    const isShortLink = url.includes('vt.tiktok.com') ||
        url.includes('vm.tiktok.com') ||
        url.includes('t.tiktok.com') ||
        url.includes('v.tiktok.com');

    if (!isShortLink) return url;

    // Check if running in Node.js
    if (typeof process !== 'undefined' && process.versions && process.versions.node) {
        try {
            const res = await fetch(url, { method: 'HEAD', redirect: 'follow' });
            if (res.url && !res.url.includes('vt.tiktok') && !res.url.includes('vm.tiktok')) {
                return res.url;
            }
            const getRes = await fetch(url);
            if (getRes.url) return getRes.url;
        } catch (e) { return url; }
    }

    // Browser environment: 
    // Strategy: Try allorigins first, then fallback to corsproxy.io, then return original.

    // 1. Try allorigins (returns JSON with final URL)
    try {
        console.log("Resolving TikTok link via allorigins:", url);
        const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
        const data = await response.json();

        if (data.status && data.status.url) {
            const resolved = data.status.url;
            // Ensure we actually got a long link back
            if (resolved.includes('tiktok.com/video') || resolved.includes('tiktok.com/@')) {
                return resolved;
            }
        }
    } catch (e) {
        console.warn("allorigins resolution failed:", e);
    }

    // 2. Try corsproxy.io (returns the HTML/Response of the final page)
    try {
        console.log("Resolving TikTok link via corsproxy.io:", url);
        const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
        const response = await fetch(proxyUrl);
        // If the browser followed redirects through the proxy, response.url might be the final one
        if (response.url && (response.url.includes('tiktok.com/video') || response.url.includes('tiktok.com/@'))) {
            return response.url;
        }
    } catch (e) {
        console.warn("corsproxy resolution failed:", e);
    }

    // 3. Fallback: Return original URL. 
    return url;
};

export const getEmbedUrl = async (url, isAutoPlay = true) => {
    if (!url) return null;
    const auto = isAutoPlay ? "1" : "0";

    if (url.includes('facebook.com') || url.includes('fb.watch')) {
        return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=0&t=0&autoplay=${auto}&mute=0`;
    }

    // Resolve short link first if needed
    let resolvedUrl = url;
    if (url.includes('tiktok.com') && (url.includes('/t/') || url.includes('vt.') || url.includes('vm.'))) {
        const resolved = await resolveTikTokUrl(url);
        if (resolved) resolvedUrl = resolved;
    }

    const tiktokId = extractTikTokId(resolvedUrl);
    if (tiktokId) {
        return `https://www.tiktok.com/embed/v2/${tiktokId}?autoplay=${auto}&mute=0&controls=1&playsinline=1&music_info_bar_enabled=1`;
    }

    return null;
};
