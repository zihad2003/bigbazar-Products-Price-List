/**
 * media.js - Smart Image Loading Utility
 *
 * Strategy:
 * - Local uploads (localhost API) → serve directly, no proxy needed
 * - Trusted CDNs (Unsplash, Cloudinary, etc.) → serve directly
 * - Instagram / unknown external URLs → proxy via images.weserv.nl
 * - Supabase storage URLs → proxy via images.weserv.nl (handles CORS & ORB)
 */

import { API_URL as API_BASE } from '../api/client';

// Domains that serve images fine without a proxy
const TRUSTED_DOMAINS = [
    'images.unsplash.com',
    'unsplash.com',
    'res.cloudinary.com',
    'cloudinary.com',
    'cdn.shopify.com',
    'lh3.googleusercontent.com',
    'googleusercontent.com',
    'ik.imagekit.io',
    'cdninstagram.com',
    'fbcdn.net',
    'facebook.com',
    'fna.fbcdn.net',
    'supabase.co',
    'i.imgur.com',
    'imgur.com',
];

function isTrustedDomain(url) {
    try {
        const hostname = new URL(url).hostname;
        return TRUSTED_DOMAINS.some(d => hostname === d || hostname.endsWith('.' + d));
    } catch {
        return false;
    }
}

/**
 * Returns an optimized image URL.
 * @param {string} originalUrl - The image URL (local path, absolute URL, etc.)
 * @param {object} options - { w, h, q, fit }
 */
export const getOptimizedUrl = (originalUrl, options = {}) => {
    if (!originalUrl) return '';

    // Already optimized, data URI, or blob URL → return as-is
    if (originalUrl.startsWith('data:') || originalUrl.startsWith('blob:') || originalUrl.includes('images.weserv.nl')) return originalUrl;

    // Local server uploads, static assets, and API image CDN -> serve directly
    if (
        originalUrl.startsWith('/img/') ||
        originalUrl.startsWith('img/') ||
        originalUrl.startsWith('/api/') ||
        originalUrl.startsWith('api/') ||
        originalUrl.startsWith('/uploads/') ||
        originalUrl.startsWith('uploads/') ||
        originalUrl.includes('localhost:')
    ) {
        const cleanPath = originalUrl.startsWith('/') ? originalUrl : `/${originalUrl}`;
        return originalUrl.includes('localhost:') ? originalUrl : `${API_BASE}${cleanPath}`;
    }

    // Normalize protocol for relative-protocol URLs
    let url = originalUrl;
    if (url.startsWith('//')) {
        url = 'https:' + url;
    } else if (!url.startsWith('http')) {
        url = 'https://' + url;
    }

    // Trusted CDN domains → serve directly (no proxy needed, avoids ORB blocks)
    if (isTrustedDomain(url)) {
        return url;
    }

    // Special handling for Instagram thumbnails (convert Reels/Posts to images)
    if (url.includes('instagram.com') || url.includes('instagr.am')) {
        const idMatch = url.match(/\/(?:reels|reel|p|tv)\/([a-zA-Z0-9_-]+)/i);
        const id = idMatch ? idMatch[1] : null;
        if (id) {
            const igUrl = `https://www.instagram.com/p/${id}/media/?size=l`;
            // Route through weserv.nl to bypass CORS/hotlinking blocks
            return `https://images.weserv.nl/?url=${encodeURIComponent(igUrl)}&n=-1`;
        }
    }

    // All other external URLs (Supabase storage, etc.)
    // → route through images.weserv.nl for reliability and CORS handling
    const { w, h, q = 80, fit = 'cover' } = options;
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
    thumbnail: { w: 300, h: 450, q: 75 }, // For product grid cards
    banner: { w: 1080, q: 75 },            // For home hero banners (fast load)
    gallery: { w: 800, q: 75 }              // For product modal gallery
};
