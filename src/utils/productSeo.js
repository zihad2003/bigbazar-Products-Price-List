/**
 * Shared SEO helpers for product + listing pages (Bangla-first ranking).
 */

const STORE_BN = 'বিগ বাজার বারইয়ারহাট';
const STORE_EN = 'Big Bazar Baraiyarhat';
const PLACE_BN = 'মীরসরাই, চট্টগ্রাম';
const PLACE_EN = 'Mirsharai, Chattogram';

function stripHtml(text = '') {
  return String(text)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function clip(text, max = 155) {
  const t = stripHtml(text);
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trim()}…`;
}

/**
 * Build bilingual product title, description, keywords, and JSON-LD pieces.
 */
export function buildProductSeo(product, { origin = '', language = 'bn' } = {}) {
  if (!product) return null;
  const name = product.name || 'পণ্য';
  const cat = product.category || '';
  const sub = product.subcategory || '';
  const price = product.price != null ? Number(product.price) : null;
  const priceBit = price != null && !Number.isNaN(price) ? `৳${Math.round(price)}` : '';
  const locBits = `${STORE_BN} | ${PLACE_BN}`;

  const title =
    language === 'bn'
      ? `${name}${priceBit ? ` ${priceBit}` : ''} | ${STORE_BN} — অনলাইন অর্ডার`
      : `${name}${priceBit ? ` ${priceBit}` : ''} | ${STORE_EN} — Buy Online`;

  const rawDesc = stripHtml(product.description || '');
  const description = clip(
    rawDesc ||
      (language === 'bn'
        ? `${name}${cat ? ` — ${cat}` : ''}${sub ? ` / ${sub}` : ''}। ${STORE_BN}, ${PLACE_BN}-এ ফিক্সড প্রাইস। মীরসরাইতে ফ্রি ডেলিভারি, সারাদেশে COD।`
        : `${name}${cat ? ` — ${cat}` : ''}${sub ? ` / ${sub}` : ''}. Fixed price at ${STORE_EN}, ${PLACE_EN}. Free Mirsharai delivery, COD nationwide.`)
  );

  const keywords = [
    name,
    cat,
    sub,
    'Big Bazar',
    'বিগ বাজার',
    'বারইয়ারহাট',
    'মীরসরাই',
    'অনলাইন শপিং',
    'ক্যাশ অন ডেলিভারি',
    'বিয়ের সাজনি',
  ]
    .filter(Boolean)
    .join(', ');

  const images = Array.isArray(product.images)
    ? product.images.filter(Boolean)
    : [product.image_url || product.image].filter(Boolean);

  const path = `/product/${product.id}`;
  const url = origin ? `${origin}${path}` : path;

  const jsonLd = {
    '@type': 'Product',
    '@id': `${url}#product`,
    name,
    description,
    image: images.length ? images : undefined,
    sku: String(product.serial_no || product.id),
    mpn: String(product.id),
    category: sub ? `${cat} > ${sub}` : cat || undefined,
    brand: { '@type': 'Brand', name: 'Big Bazar' },
    offers: {
      '@type': 'Offer',
      url,
      priceCurrency: 'BDT',
      price: price != null && !Number.isNaN(price) ? String(price) : undefined,
      availability: product.is_sold_out
        ? 'https://schema.org/OutOfStock'
        : 'https://schema.org/InStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: {
        '@type': 'Organization',
        name: STORE_EN,
        url: origin || 'https://onlinebigbazar.com',
      },
    },
  };

  const breadcrumb = {
    '@type': 'BreadcrumbList',
    '@id': `${url}#breadcrumb`,
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: language === 'bn' ? 'হোম' : 'Home', item: origin || undefined },
      ...(cat
        ? [{
            '@type': 'ListItem',
            position: 2,
            name: cat,
            item: origin ? `${origin}/products?category=${encodeURIComponent(cat)}` : undefined,
          }]
        : []),
      ...(sub
        ? [{
            '@type': 'ListItem',
            position: cat ? 3 : 2,
            name: sub,
            item: origin
              ? `${origin}/products?category=${encodeURIComponent(cat)}&subcategory=${encodeURIComponent(sub)}`
              : undefined,
          }]
        : []),
      {
        '@type': 'ListItem',
        position: (cat ? 1 : 0) + (sub ? 1 : 0) + 2,
        name,
        item: url,
      },
    ],
  };

  return { title, description, keywords, image: images[0] || '', jsonLd, breadcrumb, url };
}

/** Apply title + core meta tags in the document head */
export function applyDocumentSeo({ title, description, keywords, image, canonicalUrl, locale = 'bn_BD' }) {
  if (typeof document === 'undefined') return;
  if (title) document.title = title;

  const set = (selector, attr, val, createAttr) => {
    if (!val) return;
    let el = document.querySelector(selector);
    if (!el) {
      el = document.createElement(selector.startsWith('link') ? 'link' : 'meta');
      if (createAttr) Object.entries(createAttr).forEach(([k, v]) => el.setAttribute(k, v));
      document.head.appendChild(el);
    }
    el.setAttribute(attr, val);
  };

  set('meta[name="description"]', 'content', description, { name: 'description' });
  set('meta[name="keywords"]', 'content', keywords, { name: 'keywords' });
  set('meta[property="og:title"]', 'content', title, { property: 'og:title' });
  set('meta[property="og:description"]', 'content', description, { property: 'og:description' });
  set('meta[property="og:image"]', 'content', image, { property: 'og:image' });
  set('meta[property="og:url"]', 'content', canonicalUrl, { property: 'og:url' });
  set('meta[property="og:type"]', 'content', 'website', { property: 'og:type' });
  set('meta[property="og:locale"]', 'content', locale, { property: 'og:locale' });
  set('meta[property="og:locale:alternate"]', 'content', locale === 'bn_BD' ? 'en_US' : 'bn_BD', {
    property: 'og:locale:alternate',
  });
  set('meta[name="twitter:card"]', 'content', 'summary_large_image', { name: 'twitter:card' });
  set('meta[name="twitter:title"]', 'content', title, { name: 'twitter:title' });
  set('meta[name="twitter:description"]', 'content', description, { name: 'twitter:description' });
  set('meta[name="twitter:image"]', 'content', image, { name: 'twitter:image' });

  let canonical = document.querySelector('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.setAttribute('rel', 'canonical');
    document.head.appendChild(canonical);
  }
  if (canonicalUrl) canonical.setAttribute('href', canonicalUrl);
}
