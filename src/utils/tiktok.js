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

    // Check if running in Node.js (migration script)
    if (typeof process !== 'undefined' && process.versions && process.versions.node) {
        const res = await fetch(url, { method: 'HEAD', redirect: 'follow' });
        if (res.url && !res.url.includes('vt.tiktok') && !res.url.includes('vm.tiktok')) {
            return res.url;
        }
        const getRes = await fetch(url);
        if (getRes.url) return getRes.url;
    }

    // Browser environment: 
    // We cannot reliably resolve short links (HTTP 301) from the browser due to CORS.
    // Public proxies like allorigins are unreliable and a security risk.
    // Strategy: 
    // 1. If we can't resolve it, we return the original URL.
    // 2. The Admin panel upload process should catch this and ask the user to resolve it manually if needed.
    // 3. We attempt a basic fetch just in case it's not CORS blocked (unlikely for shorteners) but catch errors silently.

    try {
        // Some shorteners might support HEAD requests or return a redirect we can catch if same-origin (not the case here usually).
        // Since we removed the proxy, we simply return the URL.
        // The Embed logic will try to parse it, and if it fails, it will fail gracefully or show a generic link.
        console.warn("Client-side short link resolution skipped for stability. Reliance on Admin-saved resolved URLs.");
        return url;
    } catch (e) {
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
        return `https://www.tiktok.com/embed/v2/${tiktokId}?autoplay=${auto}&mute=0&controls=1&playsinline=1&music_info_bar_enabled=1`;
    }

    return null;
};
