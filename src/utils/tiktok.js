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

// New function to fetch robust data using TikWM public API (handles short links & CORS usually)
export const fetchTikTokData = async (url) => {
    if (!url) return null;

    try {
        console.log("Fetching TikTok data via TikWM:", url);
        const res = await fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`);
        const data = await res.json();

        if (data && data.code === 0 && data.data) {
            return {
                id: data.data.id,
                thumbnail: data.data.cover,
                title: data.data.title,
                video: data.data.play
            };
        }
    } catch (e) {
        console.warn("TikWM fetch failed:", e);
    }
    return null;
};

export const resolveTikTokUrl = async (url) => {
    if (!url) return null;

    // Check if it's a short link
    const isShortLink = url.includes('vt.tiktok.com') ||
        url.includes('vm.tiktok.com') ||
        url.includes('t.tiktok.com') ||
        url.includes('v.tiktok.com');

    // If not short, return as is
    if (!isShortLink) return url;

    // Try fetching data from TikWM first as it resolves internally
    const tikData = await fetchTikTokData(url);
    if (tikData && tikData.id) {
        // Reconstruct a standard long URL from the ID
        return `https://www.tiktok.com/@user/video/${tikData.id}`;
    }

    // Fallback: Browser environment proxy strategies
    // 1. Try allorigins
    try {
        const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
        const data = await response.json();
        if (data.status && data.status.url) {
            const resolved = data.status.url;
            if (resolved.includes('tiktok.com/video') || resolved.includes('tiktok.com/@')) {
                return resolved;
            }
        }
    } catch (e) { }

    // 2. Try corsproxy
    try {
        const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
        const response = await fetch(proxyUrl);
        if (response.url && (response.url.includes('tiktok.com/video') || response.url.includes('tiktok.com/@'))) {
            return response.url;
        }
    } catch (e) { }

    // 3. Fallback: Return original URL. 
    return url;
};

export const getEmbedUrl = async (url, isAutoPlay = true) => {
    if (!url) return null;
    const auto = isAutoPlay ? "1" : "0";

    if (url.includes('facebook.com') || url.includes('fb.watch')) {
        return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=0&t=0&autoplay=${auto}&mute=0`;
    }

    // Try to extract ID directly first (fastest)
    let tiktokId = extractTikTokId(url);

    // If no ID found (likely short link), try robust fetch
    if (!tiktokId) {
        // This handles short links effectively
        const data = await fetchTikTokData(url);
        if (data && data.id) {
            tiktokId = data.id;
        } else {
            // Fallback to resolving URL traditionally
            const resolved = await resolveTikTokUrl(url);
            if (resolved) {
                tiktokId = extractTikTokId(resolved);
            }
        }
    }

    if (tiktokId) {
        return `https://www.tiktok.com/embed/v2/${tiktokId}?autoplay=${auto}&mute=0&controls=1&playsinline=1&music_info_bar_enabled=1`;
    }

    return null;
};
