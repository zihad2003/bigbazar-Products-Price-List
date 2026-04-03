/**
 * media.js - Optimized Image Loading Utility
 * Used to reduce Supabase Storage Egress by leveraging CDN proxies and Browser Caching.
 * 
 * Strategy:
 * 1. Use 'images.weserv.nl' as a free global CDN proxy.
 * 2. Force 'Cache-Control' headers for the proxy to keep images for 1 year.
 * 3. Resize images dynamically (thumbnails vs banners) to save bandwidth.
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

/**
 * Transforms a Supabase Storage URL into an optimized, cached proxy URL.
 * @param {string} originalUrl - The direct Supabase public URL.
 * @param {object} options - Optimization options (w: width, h: height, q: quality).
 */
export const getOptimizedUrl = (originalUrl, options = {}) => {
    if (!originalUrl) return '';
    if (originalUrl.startsWith('data:') || originalUrl.includes('images.weserv.nl')) return originalUrl;

    // Normalize protocol
    let url = originalUrl;
    if (!url.startsWith('http') && !url.startsWith('//')) {
        url = 'https://' + url;
    } else if (url.startsWith('//')) {
        url = 'https:' + url;
    }

    const { w, h, q = 80, fit = 'cover' } = options;

    /**
     * Using 'images.weserv.nl' (Free Open Source Image Proxy & CDN)
     * We use this for ALL images to ensure consistent loading, 
     * bypass hotlinking restrictions (like Instagram), and optimize assets.
     */
    let proxyUrl = `https://images.weserv.nl/?url=${encodeURIComponent(url)}`;

    if (w) proxyUrl += `&w=${w}`;
    if (h) proxyUrl += `&h=${h}`;
    proxyUrl += `&q=${q}&fit=${fit}&output=webp&il`;

    return proxyUrl;
};

/**
 * Reusable helper for common sizes
 */
export const mediaSizes = {
    thumbnail: { w: 300, h: 450 }, // For product grid cards
    banner: { w: 1200, q: 85 },    // For home banners
    gallery: { w: 800, q: 80 }      // For product modal gallery
};
