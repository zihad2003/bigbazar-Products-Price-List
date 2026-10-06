/**
 * media.js - Smart Image Loading Utility
 *
 * Strategy:
 * - Local uploads (/api/img, /img) with size options → resize via images.weserv.nl
 *   so product cards don't download full 900–1350px files for ~170px slots
 * - Trusted CDNs → serve directly
 * - Unknown external URLs → proxy via images.weserv.nl
 * - Localhost / no window → same-origin path (no proxy)
 */

import { API_URL as API_BASE } from '../api/client';

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
    return TRUSTED_DOMAINS.some((d) => hostname === d || hostname.endsWith('.' + d));
  } catch {
    return false;
  }
}

function isLocalDevHost() {
  if (typeof window === 'undefined') return true;
  const h = window.location.hostname;
  return h === 'localhost' || h === '127.0.0.1' || h === '0.0.0.0';
}

function siteOrigin() {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin.replace(/\/$/, '');
  }
  return 'https://onlinebigbazar.com';
}

function buildWeservUrl(absoluteUrl, { w, h, q = 84, fit = 'cover' } = {}) {
  let proxyUrl = `https://images.weserv.nl/?url=${encodeURIComponent(absoluteUrl)}`;
  if (w) proxyUrl += `&w=${w}`;
  if (h) proxyUrl += `&h=${h}`;
  proxyUrl += `&q=${q}&fit=${fit}&output=webp&il&we`;
  return proxyUrl;
}

function isCloudinaryUrl(url) {
  try {
    const host = new URL(url).hostname;
    return host === 'res.cloudinary.com' || host.endsWith('.cloudinary.com');
  } catch {
    return false;
  }
}

/** One high-quality resize from Cloudinary itself — skip weserv so photos are not compressed twice. */
function buildCloudinaryUrl(url, { w, h, q = 84, fit = 'cover' } = {}) {
  const marker = '/image/upload/';
  const i = url.indexOf(marker);
  if (i < 0) return url;
  const rest = url.slice(i + marker.length);
  const parts = rest.split('/').filter(Boolean);
  const isTransform = (seg) =>
    /^(q_|f_|w_|h_|c_|e_|dpr_|fl_|g_)/.test(seg) || (seg.includes(',') && !seg.includes('.'));
  const cleaned = parts[0] && isTransform(parts[0]) ? parts.slice(1) : parts;
  const t = ['f_auto', `q_${q}`];
  if (w) t.push(`w_${w}`);
  if (h) t.push(`h_${h}`);
  t.push(fit === 'cover' ? 'c_fill,g_auto' : 'c_limit');
  return `${url.slice(0, i + marker.length)}${t.join(',')}/${cleaned.join('/')}`;
}

function toAbsoluteLocal(path) {
  const clean = path.startsWith('/') ? path : `/${path}`;
  const base = (API_BASE || '').replace(/\/$/, '');
  if (base && base !== '/' && /^https?:\/\//i.test(base)) {
    return `${base}${clean}`;
  }
  return `${siteOrigin()}${clean}`;
}

function shouldResizeLocal(path, options) {
  if (!options?.w && !options?.h) return false;
  return (
    path.startsWith('/api/img/') ||
    path.startsWith('/img/') ||
    path.startsWith('/api/settings-img/') ||
    path.startsWith('/uploads/')
  );
}

/**
 * Returns an optimized image URL.
 * @param {string} originalUrl
 * @param {object} options - { w, h, q, fit }
 */
export const getOptimizedUrl = (originalUrl, options = {}) => {
  if (!originalUrl) return '';

  if (
    originalUrl.startsWith('data:') ||
    originalUrl.startsWith('blob:') ||
    originalUrl.includes('images.weserv.nl')
  ) {
    return originalUrl;
  }

  // Root-relative / local API paths
  if (
    originalUrl.startsWith('/') ||
    originalUrl.startsWith('./') ||
    originalUrl.startsWith('img/') ||
    originalUrl.startsWith('api/') ||
    originalUrl.startsWith('uploads/') ||
    originalUrl.includes('localhost:')
  ) {
    if (originalUrl.includes('localhost:')) return originalUrl;
    const cleanPath = originalUrl.startsWith('/') ? originalUrl : `/${originalUrl}`;
    const base = (API_BASE || '').replace(/\/$/, '');
    const localUrl = !base || base === '/' ? cleanPath : `${base}${cleanPath}`;

    // Production: resize local product/subcat images instead of shipping full files
    if (shouldResizeLocal(cleanPath, options) && !isLocalDevHost()) {
      return buildWeservUrl(toAbsoluteLocal(cleanPath), options);
    }
    return localUrl;
  }

  let url = originalUrl;
  if (url.startsWith('//')) {
    url = 'https:' + url;
  } else if (!url.startsWith('http')) {
    url = 'https://' + url;
  }

  if (isTrustedDomain(url)) {
    if ((options.w || options.h) && isCloudinaryUrl(url)) {
      return buildCloudinaryUrl(url, options);
    }
    // Still resize when dimensions requested (Unsplash supports w= natively; others via weserv)
    if ((options.w || options.h) && !url.includes('images.unsplash.com')) {
      if (!isLocalDevHost()) return buildWeservUrl(url, options);
    }
    if (url.includes('images.unsplash.com') && (options.w || options.h)) {
      try {
        const u = new URL(url);
        if (options.w) u.searchParams.set('w', String(options.w));
        if (options.h) u.searchParams.set('h', String(options.h));
        u.searchParams.set('q', String(options.q || 80));
        u.searchParams.set('fit', 'crop');
        u.searchParams.set('auto', 'format');
        return u.toString();
      } catch {
        return url;
      }
    }
    return url;
  }

  if (url.includes('instagram.com') || url.includes('instagr.am')) {
    return originalUrl;
  }

  return buildWeservUrl(url, { q: 80, fit: 'cover', ...options });
};

export const mediaSizes = {
  thumbnail: { w: 400, h: 533, q: 82 },
  subcat: { w: 560, h: 720, q: 84 },
  subcatThumb: { w: 240, h: 240, q: 82 },
  banner: { w: 1920, q: 85 },
  bannerMobile: { w: 1080, q: 84 },
  gallery: { w: 1200, q: 84 },
};
