/**
 * Cloudflare Pages root middleware.
 * Explicitly forwards /api/* to the Hono API so SPA static fallback never
 * swallows product/API JSON responses.
 *
 * Non-API HTML routes: pass through then apply SEO HTMLRewriter.
 */

function normalizeOrigin(raw) {
  const s = String(raw || '').trim().replace(/\/$/, '');
  if (!s) return '';
  try {
    return new URL(s).origin;
  } catch {
    return '';
  }
}

async function handleApi(context) {
  try {
    const mod = await import('./api/handler.js');
    if (typeof mod.onRequest === 'function') {
      return await mod.onRequest(context);
    }
    if (mod.default && typeof mod.default.fetch === 'function') {
      return mod.default.fetch(context.request, context.env, context);
    }
    return new Response(JSON.stringify({ error: 'API handler missing' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  } catch (err) {
    console.error('API middleware forward error:', err);
    return new Response(
      JSON.stringify({
        error: 'API failed',
        message: err?.message || String(err),
      }),
      { status: 500, headers: { 'content-type': 'application/json' } }
    );
  }
}

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  const publicOrigin = normalizeOrigin(env?.PUBLIC_SITE_ORIGIN);

  // Always handle API on this host first — never 301 /api/* to the custom
  // domain. Proxies (Vite local) follow redirects and turn POST→GET, which
  // then hits Hostinger's SPA fallback as "Endpoint not found".
  if (path.startsWith('/api/')) {
    return handleApi(context);
  }

  if (
    publicOrigin &&
    url.hostname.endsWith('.pages.dev') &&
    url.origin !== publicOrigin
  ) {
    const dest = new URL(path + url.search + url.hash, publicOrigin);
    return Response.redirect(dest.toString(), 301);
  }

  // Dedicated function files (not SPA HTML)
  if (path === '/sitemap.xml' || path === '/robots.txt' || path === '/llms.txt') {
    return context.next();
  }

  // Static assets — no SEO rewrite
  if (/\.(png|jpe?g|gif|svg|webp|ico|css|js|map|json|woff2?|ttf|eot)$/i.test(path)) {
    return context.next();
  }

  // HTML routes — SEO pre-render
  const response = await context.next();
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) {
    return response;
  }

  const domain = publicOrigin || url.origin;
  const canonicalUrl = `${domain}${path}`;
  const defaultTitle =
    'বিগ বাজার বারইয়ারহাট | Big Bazar — ফ্যামিলি ফ্যাশন ও বিয়ের সাজনি';
  const defaultDesc =
    'বিগ বাজার — জমিদার প্লাজা (২য় তলা), বারইয়ারহাট, মীরসরাই, চট্টগ্রাম। ফিক্সড প্রাইস ফ্যামিলি ফ্যাশন, বিয়ের সাজনি, মীরসরাইতে ফ্রি হোম ডেলিভারি, সারাদেশে COD।';

  let pageTitle = defaultTitle;
  let pageDesc = defaultDesc;
  let ogImage = `${domain}/b.jpg`;
  let productJsonLd = null;

  if (path.startsWith('/product/')) {
    const productId = path.replace('/product/', '').trim();
    try {
      let prod = null;
      try {
        const apiRes = await fetch(
          `${domain}/api/products?id=${encodeURIComponent(productId)}`
        );
        if (apiRes.ok) {
          const apiJson = await apiRes.json();
          prod = apiJson?.data || null;
          if (Array.isArray(prod)) prod = prod[0] || null;
        }
      } catch (_) {}

      if (prod) {
        const priceLabel = prod.price != null ? ` ৳${Math.round(Number(prod.price) || 0)}` : '';
        pageTitle = `${prod.name}${priceLabel} | বিগ বাজার বারইয়ারহাট — অনলাইন অর্ডার`;
        const rawDesc = prod.description
          ? prod.description.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
          : '';
        pageDesc = rawDesc
          ? rawDesc.length > 160
            ? rawDesc.substring(0, 157) + '…'
            : rawDesc
          : `${prod.name} — বিগ বাজার বারইয়ারহাট, মীরসরাই থেকে কিনুন। ফিক্সড প্রাইস, মীরসরাইতে ফ্রি ডেলিভারি, সারাদেশে COD।`;

        const img =
          prod.image_url || prod.image || (prod.images && prod.images[0]);
        if (img) ogImage = img;

        const isOutOfStock =
          !!prod.is_sold_out ||
          (prod.stock_count !== null && prod.stock_count <= 0);

        productJsonLd = {
          '@type': 'Product',
          '@id': `${domain}${path}#product`,
          name: prod.name,
          description: pageDesc,
          image: ogImage,
          sku: String(prod.serial_no || prod.id),
          category: prod.subcategory
            ? `${prod.category} > ${prod.subcategory}`
            : prod.category,
          brand: { '@type': 'Brand', name: 'Big Bazar' },
          offers: {
            '@type': 'Offer',
            url: canonicalUrl,
            priceCurrency: 'BDT',
            price: parseFloat(prod.price || 0),
            availability: isOutOfStock
              ? 'https://schema.org/OutOfStock'
              : 'https://schema.org/InStock',
            itemCondition: 'https://schema.org/NewCondition',
            seller: {
              '@type': 'Organization',
              name: 'Big Bazar Baraiyarhat',
            },
          },
        };
      }
    } catch (err) {
      console.warn('Edge pre-render product fetch warning:', err);
    }
    if (!productJsonLd) {
      pageTitle = 'কালেকশন | বিগ বাজার বারইয়ারহাট';
      pageDesc =
        'বিগ বাজার বারইয়ারহাট থেকে ফ্যামিলি ফ্যাশন কিনুন — মীরসরাইতে ফ্রি ডেলিভারি, সারাদেশে COD।';
    }
  } else if (path === '/products') {
    const categoryParam = url.searchParams.get('category');
    const subcategoryParam = url.searchParams.get('subcategory');
    if (subcategoryParam) {
      pageTitle = `${subcategoryParam} কিনুন | বিগ বাজার বারইয়ারহাট | অনলাইন অর্ডার`;
      pageDesc = `${subcategoryParam}${categoryParam ? ' — ' + categoryParam : ''} কালেকশন বিগ বাজার বারইয়ারহাট, মীরসরাই। ফিক্সড প্রাইস, ফ্রি মীরসরাই ডেলিভারি, COD।`;
    } else if (categoryParam && categoryParam !== 'All') {
      pageTitle = `${categoryParam} কালেকশন | বিগ বাজার বারইয়ারহাট`;
      pageDesc = `${categoryParam} ফ্যাশন — বিগ বাজার বারইয়ারহাট। ফিক্সড প্রাইস, মীরসরাইতে ফ্রি ডেলিভারি, সারাদেশে COD।`;
    } else {
      pageTitle = 'সব পণ্য | বিগ বাজার বারইয়ারহাট — ফ্যামিলি ফ্যাশন';
      pageDesc =
        'শাড়ি, থ্রি পিস, পাঞ্জাবি, কিডস ও বিয়ের সাজনি — বিগ বাজার বারইয়ারহাট থেকে অনলাইন অর্ডার করুন।';
    }
  } else if (path === '/about-us') {
    pageTitle =
      'আমাদের সম্পর্কে | বিগ বাজার বারইয়ারহাট — এক শোরুম, পুরো পরিবার';
    pageDesc =
      'বিগ বাজার জমিদার প্লাজা, বারইয়ারহাট। ফিক্সড প্রাইস ফ্যামিলি ফ্যাশন, বিয়ের সাজনি, মীরসরাইতে ফ্রি হোম ডেলিভারি।';
  } else if (path === '/store-locations') {
    pageTitle =
      'শোরুম লোকেশন | বিগ বাজার — জমিদার প্লাজা, বারইয়ারহাট, মীরসরাই';
    pageDesc =
      'ভিজিট করুন: জমিদার প্লাজা ২য় তলা, বারইয়ারহাট পৌরসভা, মীরসরাই, চট্টগ্রাম। প্রতিদিন সকাল ৯:০০ – রাত ৯:০০।';
  } else if (path === '/faq') {
    pageTitle = 'সাধারণ প্রশ্ন (FAQ) | বিগ বাজার বারইয়ারহাট';
    pageDesc =
      'অর্ডার, মীরসরাই ফ্রি ডেলিভারি, COD, রিটার্ন ও বিয়ের সাজনি নিয়ে প্রশ্নোত্তর — বিগ বাজার বারইয়ারহাট।';
  } else if (path === '/shipping') {
    pageTitle =
      'শিপিং ও ফ্রি মীরসরাই ডেলিভারি | বিগ বাজার বারইয়ারহাট';
    pageDesc =
      'মীরসরাই উপজেলায় ফ্রি হোম ডেলিভারি। চট্টগ্রাম ও সারাদেশে নির্ভরযোগ্য COD ডেলিভারি।';
  } else if (path === '/returns') {
    pageTitle = 'রিটার্ন ও এক্সচেঞ্জ নীতি | বিগ বাজার বারইয়ারহাট';
    pageDesc =
      'ডেলিভারির ২৪ ঘণ্টার মধ্যে ত্রুটি/সাইজ সমস্যায় রিটার্ন বা এক্সচেঞ্জ — বিগ বাজার বারইয়ারহাট।';
  } else if (path === '/contact-us') {
    pageTitle = 'যোগাযোগ | বিগ বাজার বারইয়ারহাট';
    pageDesc =
      'হেল্পলাইন 01857045449 · WhatsApp 01824950082 · জমিদার প্লাজা, বারইয়ারহাট, মীরসরাই।';
  } else if (path === '/privacy-policy') {
    pageTitle = 'গোপনীয়তা নীতি | বিগ বাজার বারইয়ারহাট';
    pageDesc = 'onlinebigbazar.com-এ আপনার ব্যক্তিগত তথ্য কীভাবে সংরক্ষণ ও ব্যবহার হয়।';
  } else if (path === '/terms') {
    pageTitle = 'সেবার শর্তাবলী | বিগ বাজার বারইয়ারহাট';
    pageDesc = 'onlinebigbazar.com ব্যবহারের শর্তাবলী — অর্ডার, পেমেন্ট ও আচরণনীতি।';
  } else if (path === '/refund') {
    pageTitle = 'রিফান্ড পলিসি | বিগ বাজার বারইয়ারহাট';
    pageDesc = 'স্টক না থাকা, ভুল/ড্যামেজড পণ্যে রিফান্ড প্রক্রিয়া — সাধারণত ৩–৫ কার্যদিবস।';
  }

  const jsonLdGraph = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${domain}/#website`,
        name: 'Big Bazar',
        alternateName: [
          'Big Bazar Baraiyarhat',
          'বিগ বাজার বারইয়ারহাট',
          new URL(domain).hostname.toLowerCase(),
        ],
        url: `${domain}/`,
        publisher: { '@id': `${domain}/#organization` },
        inLanguage: ['bn', 'en'],
      },
      {
        '@type': ['ClothingStore', 'LocalBusiness', 'Organization'],
        '@id': `${domain}/#organization`,
        name: 'Big Bazar',
        alternateName: [
          'Big Bazar Baraiyarhat',
          'বিগ বাজার বারইয়ারহাট',
          'Biyer Sajani',
          'বিয়ের সাজনি',
          'onlinebigbazar.com',
        ],
        url: domain,
        logo: `${domain}/b.jpg`,
        image: ogImage,
        description: defaultDesc,
        telephone: '+8801857045449',
        email: 'infobigbazar01@gmail.com',
        priceRange: '৳৳',
        address: {
          '@type': 'PostalAddress',
          streetAddress: '2nd Floor, Jomidar Plaza, Baraiyarhat Pouroshoba',
          addressLocality: 'Mirsharai',
          addressRegion: 'Chattogram',
          postalCode: '4327',
          addressCountry: 'BD',
        },
        geo: {
          '@type': 'GeoCoordinates',
          latitude: 22.8984,
          longitude: 91.5303,
        },
        areaServed: [
          { '@type': 'AdministrativeArea', name: 'Mirsharai Upazila' },
          { '@type': 'AdministrativeArea', name: 'Chattogram Division' },
          { '@type': 'Country', name: 'Bangladesh' },
        ],
        sameAs: [
          'https://www.facebook.com/100063541603515',
          'https://www.instagram.com/big_bazar_25',
          'https://www.tiktok.com/@big.bazar2',
        ],
        hasOfferCatalog: {
          '@type': 'OfferCatalog',
          name: 'Family Fashion & Bridal Catalog',
          itemListElement: [
            {
              '@type': 'OfferCatalog',
              name: 'Biyer Sajani (Bridal & Groom Wear)',
            },
            {
              '@type': 'OfferCatalog',
              name: 'Ladies Modest Fashion (Abayas, Borkas, Hijabs)',
            },
            { '@type': 'OfferCatalog', name: 'Kids Wear (0-15 Years)' },
            {
              '@type': 'OfferCatalog',
              name: 'Menswear (Panjabis, Suits, Polos)',
            },
            { '@type': 'OfferCatalog', name: 'Home Decor & Goj Kapor' },
          ],
        },
      },
      ...(productJsonLd ? [productJsonLd] : []),
      {
        '@type': 'FAQPage',
        '@id': `${domain}/#faq`,
        mainEntity: [
          {
            '@type': 'Question',
            name: 'Where is Big Bazar located in Baraiyarhat?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Big Bazar is located on the 2nd Floor of Jomidar Plaza, Baraiyarhat Pouroshoba, Mirsharai Upazila, Chattogram, Bangladesh.',
            },
          },
          {
            '@type': 'Question',
            name: 'What is Biyer Sajani at Big Bazar?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: "Biyer Sajani (বিয়ের সাজনি) is Big Bazar's signature bridal and groom section, featuring Karchupi Jamdani, Dhakai Jamdani, Katan, Jorjet, Sararas, Gararas for brides, and Sherwanis, Panjabis, Blazers, and Suits for grooms.",
            },
          },
          {
            '@type': 'Question',
            name: 'Does Big Bazar offer Free Home Delivery in Mirsharai?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Yes! Residents of Mirsharai Upazila enjoy 100% Free Home Delivery on all online orders. Cash on Delivery is available nationwide across Bangladesh.',
            },
          },
        ],
      },
    ],
  };

  const seoBootHtml = `
    <div id="seo-boot">
      <h1>Big Bazar | Baraiyarhat</h1>
      <p>${pageDesc.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
      <p>Store: 2nd Floor, Jomidar Plaza, Baraiyarhat Pouroshoba, Mirsharai Upazila, Chattogram. Phone: 01857045449.</p>
    </div>
  `;

  const rewriter = new HTMLRewriter()
    .on('title', {
      element(element) {
        element.setInnerContent(pageTitle);
      },
    })
    .on('meta[name="description"]', {
      element(element) {
        element.setAttribute('content', pageDesc);
      },
    })
    .on('#root', {
      element(element) {
        element.setInnerContent(seoBootHtml, { html: true });
      },
    })
    .on('head', {
      element(element) {
        element.append(`<link rel="canonical" href="${canonicalUrl}" />`, {
          html: true,
        });
        element.append(
          `<meta property="og:title" content="${pageTitle.replace(/"/g, '&quot;')}" />`,
          { html: true }
        );
        element.append(
          `<meta property="og:description" content="${pageDesc.replace(/"/g, '&quot;')}" />`,
          { html: true }
        );
        element.append(`<meta property="og:image" content="${ogImage}" />`, {
          html: true,
        });
        element.append(`<meta property="og:url" content="${canonicalUrl}" />`, {
          html: true,
        });
        element.append(`<meta property="og:type" content="website" />`, {
          html: true,
        });
        element.append(
          `<meta property="og:site_name" content="Big Bazar Baraiyarhat" />`,
          { html: true }
        );
        element.append(
          `<meta name="twitter:card" content="summary_large_image" />`,
          { html: true }
        );
        element.append(
          `<meta name="twitter:title" content="${pageTitle.replace(/"/g, '&quot;')}" />`,
          { html: true }
        );
        element.append(
          `<meta name="twitter:description" content="${pageDesc.replace(/"/g, '&quot;')}" />`,
          { html: true }
        );
        element.append(`<meta name="twitter:image" content="${ogImage}" />`, {
          html: true,
        });
        element.append(
          `<script type="application/ld+json">${JSON.stringify(jsonLdGraph)}</script>`,
          { html: true }
        );
      },
    });

  return rewriter.transform(response);
}
