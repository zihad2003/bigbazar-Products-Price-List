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
    // We try to resolve using a stable CORS proxy to follow the redirect.
    try {
        console.log("Attempting to resolve TikTok short link via proxy...", url);
        const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
        const response = await fetch(proxyUrl);
        // The proxy usually returns the final page content, but wait, we just need the URL.
        // corsproxy.io follows redirects. The final response.url might be the proxy URL or the destination depending on implementation.
        // Actually corsproxy.io simply tunnels the request.
        // If we do a fetch, the browser follows redirects automatically.
        // So response.url should be the final resolved URL (if the proxy handles headers correctly).

        // However, standard `fetch` in browser follows redirects.
        // If corsproxy tunnels headers, we might land on tiktok.com/...

        if (response.url && (response.url.includes('tiktok.com/video') || response.url.includes('tiktok.com/@'))) {
            return response.url;
        }

        // Fallback: sometimes we might get the HTML and need to parse navigation, but let's trust response.url first.
        // If that fails, we can't do much.
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
        return `https://www.tiktok.com/embed/v2/${tiktokId}?autoplay=${auto}&mute=0&controls=1&playsinline=1&music_info_bar_enabled=1`;
    }

    return null;
};
