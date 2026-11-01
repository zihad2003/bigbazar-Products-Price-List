/**
 * Shared SSRF / path-traversal helpers for admin image fetch (product-copy / assist).
 */

const SAFE_IMG_NAME_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,120}$/;

const BLOCKED_HOST_RE =
  /^(localhost|metadata\.google\.internal|.*\.internal|.*\.local)$/i;

function isPrivateOrMetadataIp(hostname) {
  const host = String(hostname || '')
    .trim()
    .toLowerCase()
    .replace(/^\[|\]$/g, '');
  if (!host) return true;
  if (host === '::1' || host === '0:0:0:0:0:0:0:1') return true;
  if (host === '169.254.169.254') return true;
  if (/^127\./.test(host)) return true;
  if (/^10\./.test(host)) return true;
  if (/^192\.168\./.test(host)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return true;
  if (/^169\.254\./.test(host)) return true;
  if (/^0\./.test(host)) return true;
  return false;
}

function siteOrigins(env) {
  const raw = [
    env?.PUBLIC_SITE_ORIGIN,
    env?.PUBLIC_SITE_URL,
    env?.SITE_URL,
    typeof process !== 'undefined' && process.env?.PUBLIC_SITE_ORIGIN,
    typeof process !== 'undefined' && process.env?.PUBLIC_SITE_URL,
    typeof process !== 'undefined' && process.env?.SITE_URL,
    'https://onlinebigbazar.com',
    'https://www.onlinebigbazar.com',
  ];
  const hosts = new Set();
  for (const value of raw) {
    if (!value) continue;
    try {
      const u = new URL(String(value).includes('://') ? String(value) : `https://${value}`);
      if (u.hostname) hosts.add(u.hostname.toLowerCase());
    } catch (_) {
      /* ignore */
    }
  }
  return hosts;
}

function isCloudinaryHost(hostname) {
  const h = String(hostname || '').toLowerCase();
  return h === 'res.cloudinary.com' || h.endsWith('.cloudinary.com');
}

/** True when URL host is allowlisted (own site / Cloudinary) and not a private IP. */
export function isAllowedImageFetchUrl(urlString, env) {
  let u;
  try {
    u = new URL(String(urlString || ''));
  } catch {
    return false;
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return false;
  const host = u.hostname.toLowerCase();
  if (!host || BLOCKED_HOST_RE.test(host) || isPrivateOrMetadataIp(host)) return false;
  if (isCloudinaryHost(host)) return true;
  const allowed = siteOrigins(env);
  return allowed.has(host);
}

/** Resolve fileName under baseDir; null on traversal / unsafe names. */
export function safePathUnder(pathMod, baseDir, fileName) {
  const name = String(fileName || '');
  if (!SAFE_IMG_NAME_RE.test(name)) return null;
  if (name.includes('..') || /%2e/i.test(name) || name.includes('/') || name.includes('\\')) return null;
  const resolved = pathMod.resolve(baseDir, name);
  const rel = pathMod.relative(pathMod.resolve(baseDir), resolved);
  if (!rel || rel.startsWith('..') || pathMod.isAbsolute(rel)) return null;
  return resolved;
}

export { SAFE_IMG_NAME_RE };
