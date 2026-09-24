/**
 * Cloudflare Pages Function — Dynamic Cached XML Sitemap.
 */
import { buildSitemapXml } from './sitemap-builder.js';

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const cacheKey = new Request(url.toString(), request);
  const cache = caches.default;

  let response = await cache.match(cacheKey);
  if (response) return response;

  let domain = url.origin;
  try {
    const preferred = String(env?.PUBLIC_SITE_ORIGIN || '').trim().replace(/\/$/, '');
    if (preferred) domain = new URL(preferred).origin;
  } catch (_) {}

  const xml = await buildSitemapXml(domain);
  response = new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    },
  });

  try {
    context.waitUntil(cache.put(cacheKey, response.clone()));
  } catch (_) {}

  return response;
}
