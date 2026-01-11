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

    // Browser environment: Use allorigins proxy
    try {
        console.log("Resolving TikTok link via allorigins:", url);
        // allorigins follows redirects server-side and returns the final status
        const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
        const data = await response.json();

        if (data.status && data.status.url) {
            const resolved = data.status.url;
            if (resolved.includes('tiktok.com/video') || resolved.includes('tiktok.com/@')) {
                return resolved;
            }
        }
        return url;
    } catch (e) {
        console.warn("Proxy resolution failed:", e);
        return url;
    }
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
        // Updated embed URL format that is more reliable
        return `https://www.tiktok.com/embed/v2/${tiktokId}?autoplay=${auto}&mute=0&controls=1&playsinline=1&music_info_bar_enabled=1`;
    }

    return null;
};
