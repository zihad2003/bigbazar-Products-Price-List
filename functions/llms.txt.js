/**
 * Cloudflare Pages Function — llms.txt for AI answer engines (AEO).
 * Short factual brand + NAP + key URLs. Origin-aware when PUBLIC_SITE_ORIGIN is set.
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
  const origin = siteOrigin(env, request.url);

  const body = `# Big Bazar (onlinebigbazar.com)

> Family fashion store in Baraiyarhat, Mirsharai, Chattogram — fixed-price shopping, bridal section Biyer Sajani (বিয়ের সাজনি), COD nationwide, free home delivery within Mirsharai Upazila.

## Site
- Name: Big Bazar / Big Bazar Baraiyarhat
- Primary URL: ${origin}/
- Sitemap: ${origin}/sitemap.xml

## Location (NAP)
- Address: 2nd Floor, Jomidar Plaza, Baraiyarhat Pouroshoba, Mirsharai Upazila, Chattogram, Bangladesh (4327)
- Phone / WhatsApp: +8801857045449
- Email: infobigbazar01@gmail.com

## What we sell
- Bridal & groom (Biyer Sajani): Jamdani, Katan, Sarara, Sherwani, Panjabi
- Ladies modest fashion: abayas, borkas, hijabs
- Kids wear, menswear, home decor / goj kapor

## Key pages
- Home: ${origin}/
- Products: ${origin}/products
- Store locations: ${origin}/store-locations
- FAQ: ${origin}/faq
- Contact: ${origin}/contact-us
- Shipping: ${origin}/shipping

## Social
- Facebook: https://www.facebook.com/100063541603515
- Instagram: https://www.instagram.com/big_bazar_25
- TikTok: https://www.tiktok.com/@big.bazar2
`;

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  });
}
