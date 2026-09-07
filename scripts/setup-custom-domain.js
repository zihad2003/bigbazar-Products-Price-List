#!/usr/bin/env node
/**
 * Custom-domain branding checklist for Big Bazar.
 * Usage:
 *   node scripts/setup-custom-domain.js https://www.your-domain.com
 *
 * This prints the exact Cloudflare / Google OAuth / Search Console steps
 * required to stop Google labeling the site as "Cloudflare".
 */

const raw = (process.argv[2] || process.env.PUBLIC_SITE_ORIGIN || '').trim();

function fail(msg) {
  console.error(`\nERROR: ${msg}\n`);
  console.error('Example: node scripts/setup-custom-domain.js https://www.bigbazarbariarhat.com\n');
  process.exit(1);
}

if (!raw) {
  fail('Pass your custom site origin (https://...). No domain is configured yet.');
}

let origin;
try {
  const u = new URL(raw.includes('://') ? raw : `https://${raw}`);
  if (u.protocol !== 'https:') fail('Use https:// for the public site origin.');
  if (u.hostname.endsWith('.pages.dev')) fail('Use your brand domain, not *.pages.dev.');
  origin = u.origin;
} catch {
  fail('Invalid URL.');
}

const host = new URL(origin).hostname;
const apex = host.replace(/^www\./, '');
const wwwOrigin = `https://www.${apex}`;
const apexOrigin = `https://${apex}`;
const clientId = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || '(your Google OAuth client id)';

console.log(`
============================================================
Big Bazar — custom domain branding setup
Primary origin: ${origin}
============================================================

1) Cloudflare Pages (attach domain)
   Dashboard → Workers & Pages → bigbazarbariarhat → Custom domains
   → Set up a domain → add: ${apex}  and/or  www.${apex}
   DNS: CNAME www → bigbazarbariarhat.pages.dev  (or Cloudflare auto-DNS)
   Wait until status = Active (SSL ready)

2) Cloudflare Pages env vars (Production)
   PUBLIC_SITE_ORIGIN = ${origin}
   ALLOWED_ORIGINS    = ${apexOrigin},${wwwOrigin}
   Redeploy after saving vars (or push a commit)

3) Google Cloud Console (OAuth / GIS)
   APIs & Services → Credentials → Client ID:
   ${clientId}
   Authorized JavaScript origins — add:
     ${apexOrigin}
     ${wwwOrigin}
     https://bigbazarbariarhat.pages.dev
   (GIS ID-token flow: no redirect URI required for AccountPage button)

4) Google Search Console
   Add property: ${origin}  (Domain property for ${apex} preferred)
   Settings → Site name → "Big Bazar"  (or "Big Bazar Baraiyarhat")
   Sitemaps → submit: ${origin}/sitemap.xml
   URL Inspection → ${origin}/  → Request indexing
   Also request: ${origin}/store-locations

5) Verify
   Open ${origin} — title should say Big Bazar (not Cloudflare brand)
   curl -I https://bigbazarbariarhat.pages.dev/  → expect 301 → ${origin}
   Google SERP may take several days to drop the "Cloudflare" label

Code already supports PUBLIC_SITE_ORIGIN (CORS, 301 from pages.dev, SEO/sitemap).
`);
