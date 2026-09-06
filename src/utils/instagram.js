export const extractInstagramId = (url) => {
    if (!url) return null;
    // Handle various Instagram URL formats including reels, posts, and short URLs
    const regex = /\/(?:reels|reel|p|tv)\/([a-zA-Z0-9_-]+)/i;
    const match = url.match(regex);
    if (match && match[1]) return match[1];
    
    // Fallback for very simple short URLs if they exist
    const shortRegex = /instagr\.am\/p\/([a-zA-Z0-9_-]+)/i;
    const shortMatch = url.match(shortRegex);
    return shortMatch ? shortMatch[1] : null;
};

export const getInstagramEmbedUrl = (url) => {
    const id = extractInstagramId(url);
    if (!id) return null;
    
    // Instagram's embed URL works standardly with /p/ shortcode, even for reels
    // Using __a=1 or other params can sometimes break the embed, so we keep it clean
    return `https://www.instagram.com/p/${id}/embed/`;
};

/**
 * Attempts to fetch basic public data for an Instagram post/reel.
 * @deprecated Do not use for product images — Instagram URLs are video embeds only.
 */
export const fetchInstagramData = async (url) => {
    const shortcode = extractInstagramId(url);
    if (!shortcode) return null;
    return {
        platform_id: shortcode,
        canonical_url: `https://www.instagram.com/p/${shortcode}/`,
        video_url: null,
        thumbnail: null,
        caption: 'Instagram Content'
    };
};
