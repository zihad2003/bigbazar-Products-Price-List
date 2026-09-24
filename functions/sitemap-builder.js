/**
 * Shared XML sitemap builder for Cloudflare Pages + Hostinger Node.
 * No all_products.json fallback (DB/API only).
 */

const PAGE_SIZE = 100;

const STATIC_ROUTES = [
  '',
  '/products',
  '/about-us',
  '/store-locations',
  '/faq',
  '/shipping',
  '/returns',
  '/refund',
  '/size-guide',
  '/contact-us',
  '/privacy-policy',
  '/terms',
];

async function fetchPublishedProducts(domain) {
  const all = [];
  let page = 0;
  while (page < 50) {
    const apiRes = await fetch(
      `${domain}/api/products?status=published&limit=${PAGE_SIZE}&page=${page}`
    );
    if (!apiRes.ok) break;
    const apiJson = await apiRes.json();
    const batch = Array.isArray(apiJson?.data) ? apiJson.data : [];
    if (!batch.length) break;
    all.push(...batch);
    if (batch.length < PAGE_SIZE) break;
    page += 1;
  }
  return all;
}

/** Collect /products?category=&subcategory= URLs from site settings */
async function fetchSubcategoryUrls(domain) {
  const urls = [];
  try {
    const res = await fetch(`${domain}/api/settings`);
    if (!res.ok) return urls;
    const json = await res.json();
    const settings = json?.data || json || {};
    const subcats = settings.subcategories || {};
    for (const [category, list] of Object.entries(subcats)) {
      if (!Array.isArray(list)) continue;
      for (const sub of list) {
        if (!sub?.id) continue;
        const q = `category=${encodeURIComponent(category)}&subcategory=${encodeURIComponent(sub.id)}`;
        urls.push(`/products?${q}`);
      }
    }
  } catch (err) {
    console.warn('Sitemap subcategory fetch warning:', err?.message || err);
  }
  return urls;
}

/**
 * @param {string} domain - e.g. https://onlinebigbazar.com
 * @returns {Promise<string>} XML document
 */
export async function buildSitemapXml(domain) {
  const origin = String(domain || 'https://onlinebigbazar.com').replace(/\/$/, '');
  const currentDate = new Date().toISOString().split('T')[0];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

  for (const r of STATIC_ROUTES) {
    const loc = `${origin}${r}`;
    const priority = r === '' ? '1.0' : r === '/products' ? '0.9' : '0.8';
    xml += `  <url>\n`;
    xml += `    <loc>${loc}</loc>\n`;
    xml += `    <lastmod>${currentDate}</lastmod>\n`;
    xml += `    <changefreq>daily</changefreq>\n`;
    xml += `    <priority>${priority}</priority>\n`;
    xml += `  </url>\n`;
  }

  try {
    const subUrls = await fetchSubcategoryUrls(origin);
    for (const path of subUrls) {
      xml += `  <url>\n`;
      xml += `    <loc>${origin}${path}</loc>\n`;
      xml += `    <lastmod>${currentDate}</lastmod>\n`;
      xml += `    <changefreq>daily</changefreq>\n`;
      xml += `    <priority>0.85</priority>\n`;
      xml += `  </url>\n`;
    }
  } catch (err) {
    console.warn('Sitemap subcategory urls warning:', err?.message || err);
  }

  try {
    const products = await fetchPublishedProducts(origin);
    for (const p of products) {
      if (!p?.id) continue;
      const lastMod = p.created_at ? String(p.created_at).split('T')[0] : currentDate;
      xml += `  <url>\n`;
      xml += `    <loc>${origin}/product/${p.id}</loc>\n`;
      xml += `    <lastmod>${lastMod}</lastmod>\n`;
      xml += `    <changefreq>weekly</changefreq>\n`;
      xml += `    <priority>0.7</priority>\n`;
      xml += `  </url>\n`;
    }
  } catch (err) {
    console.warn('Sitemap products fetch warning:', err?.message || err);
  }

  xml += `</urlset>`;
  return xml;
}

export function buildRobotsTxt(domain) {
  const origin = String(domain || 'https://onlinebigbazar.com').replace(/\/$/, '');
  return [
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin',
    'Disallow: /checkout',
    'Disallow: /account',
    '',
    `Sitemap: ${origin}/sitemap.xml`,
    '',
  ].join('\n');
}
