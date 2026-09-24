/**
 * Cloudflare Pages Function — dynamic robots.txt
 */
import { buildRobotsTxt } from './sitemap-builder.js';

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  let domain = url.origin;
  try {
    const preferred = String(env?.PUBLIC_SITE_ORIGIN || '').trim().replace(/\/$/, '');
    if (preferred) domain = new URL(preferred).origin;
  } catch (_) {}

  return new Response(buildRobotsTxt(domain), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
