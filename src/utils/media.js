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

    // If it's already an external URL (Instagram/Unsplash), just return it
    if (!originalUrl.includes(SUPABASE_URL)) {
        return originalUrl;
    }

    const { w, h, q = 80, fit = 'cover' } = options;

    /**
     * Using 'images.weserv.nl' (Free Open Source Image Proxy & CDN)
     * This offloads the egress from Supabase to Weserv's Cloudflare-powered CDN.
     * It also allows for on-the-fly resizing and compression.
     */
    let proxyUrl = `https://images.weserv.nl/?url=${encodeURIComponent(originalUrl)}`;

    if (w) proxyUrl += `&w=${w}`;
    if (h) proxyUrl += `&h=${h}`;
    proxyUrl += `&q=${q}&fit=${fit}&output=webp&il`; // output: webp for smaller file size

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
