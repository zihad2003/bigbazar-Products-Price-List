export const extractInstagramId = (url) => {
    if (!url) return null;
    const match = url.match(/\/(reels|reel|p|tv)\/([a-zA-Z0-9_-]+)/);
    return match ? match[2] : null;
};

export const getInstagramEmbedUrl = (url) => {
    const id = extractInstagramId(url);
    if (!id) return null;
    // Switch to the /p/ endpoint with specific parameters used by AMP for better stability
    return `https://www.instagram.com/p/${id}/embed/?cr=1&v=14&wp=540&rd=${encodeURIComponent(window.location.origin)}&rp=${encodeURIComponent(window.location.pathname)}`;
};

export const fetchInstagramData = async (url) => {
    const shortcode = extractInstagramId(url);
    if (!shortcode) return null;

    // Use Weserv proxy for thumbnails to avoid referrer blocking
    return {
        platform_id: shortcode,
        canonical_url: `https://www.instagram.com/reels/${shortcode}/`,
        video_url: null,
        thumbnail: `https://images.weserv.nl/?url=instagram.com/p/${shortcode}/media/?size=l`,
        caption: 'Instagram Reel'
    };
};
