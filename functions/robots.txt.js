/**
 * Cloudflare Pages Function — AI & Search Engine Crawling Rules (robots.txt).
 * Origin-aware Sitemap; allows search + AI bots; blocks thin/private paths.
 */

function siteOrigin(env, requestUrl) {
  try {
    const preferred = String(env?.PUBLIC_SITE_ORIGIN || '').trim().replace(/\/$/, '');
    if (preferred) return new URL(preferred).origin;
  } catch (_) {}
  return new URL(requestUrl).origin;
}

export async function onRequest(context) {
  const { request, env } = context;
  const domain = siteOrigin(env, request.url);

  const robots = `# Big Bazar Baraiyarhat — https://onlinebigbazar.com
# AI discovery: ${domain}/llms.txt

User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/auth/
Disallow: /checkout
Disallow: /account

User-agent: Googlebot
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: Bingbot
Allow: /

User-agent: GPTBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: anthropic-ai
Allow: /

User-agent: PerplexityBot
Allow: /

Sitemap: ${domain}/sitemap.xml
`;

  return new Response(robots, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  });
}
