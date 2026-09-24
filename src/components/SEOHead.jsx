import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { getSubcategoryMeta } from '../data/subcategorySeo';

/**
 * Client-Side SPA Head & Metadata Manager.
 * Dynamically updates document title, meta tags, and JSON-LD schema on route navigation.
 * Product pages also refine meta from ProductDetails via buildProductSeo.
 */
const SEOHead = ({ title, description, image, productData }) => {
  const location = useLocation();

  useEffect(() => {
    const origin = window.location.origin;
    const params = new URLSearchParams(location.search);
    const category = params.get('category') || '';
    const subcategory = params.get('subcategory') || '';
    const isProduct = location.pathname.startsWith('/product/');

    const canonicalPath =
      location.pathname === '/products' && (category || subcategory)
        ? `${location.pathname}?${[
            category ? `category=${encodeURIComponent(category)}` : '',
            subcategory ? `subcategory=${encodeURIComponent(subcategory)}` : '',
          ]
            .filter(Boolean)
            .join('&')}`
        : location.pathname;
    const canonicalUrl = `${origin}${canonicalPath}`;

    const defaultTitle =
      'বিগ বাজার বারইয়ারহাট | Big Bazar — ফ্যামিলি ফ্যাশন ও বিয়ের সাজনি';
    const defaultDesc =
      'বিগ বাজার — জমিদার প্লাজা (২য় তলা), বারইয়ারহাট, মীরসরাই, চট্টগ্রাম। ফিক্সড প্রাইস ফ্যামিলি ফ্যাশন, বিয়ের সাজনি, মীরসরাইতে ফ্রি হোম ডেলিভারি, সারাদেশে COD।';

    let pageTitle = title || defaultTitle;
    let pageDesc = description || defaultDesc;
    let pageKeywords =
      'বিগ বাজার, বারইয়ারহাট, মীরসরাই, বিয়ের সাজনি, অনলাইন শপিং, শাড়ি, থ্রি পিস, পাঞ্জাবি, ক্যাশ অন ডেলিভারি, Big Bazar Baraiyarhat';

    if (!title && !description && location.pathname === '/products' && subcategory) {
      const meta = getSubcategoryMeta({ id: subcategory, name_en: subcategory.replace(/-/g, ' ') }, category);
      if (meta) {
        pageTitle = meta.title;
        pageDesc = meta.description;
        pageKeywords = meta.keywords || pageKeywords;
      }
    } else if (!title && !description && location.pathname === '/products' && category && category !== 'All') {
      pageTitle = `${category} কালেকশন কিনুন | বিগ বাজার বারইয়ারহাট`;
      pageDesc = `${category} ফ্যাশন — বিগ বাজার বারইয়ারহাট, মীরসরাই। ফিক্সড প্রাইস, মীরসরাইতে ফ্রি ডেলিভারি, সারাদেশে COD।`;
      pageKeywords = `${category}, বিগ বাজার, বারইয়ারহাট, মীরসরাই, অনলাইন শপিং, ${pageKeywords}`;
    } else if (!title && !description && location.pathname === '/about-us') {
      pageTitle = 'আমাদের সম্পর্কে | বিগ বাজার বারইয়ারহাট — এক শোরুম, পুরো পরিবার';
      pageDesc =
        'বিগ বাজার বারইয়ারহাট — জমিদার প্লাজা (২য় তলা)। ফিক্সড প্রাইস ফ্যামিলি ফ্যাশন, বিয়ের সাজনি, এক লক্ষ+ ফলোয়ারের আস্থা।';
    } else if (!title && location.pathname === '/contact-us') {
      pageTitle = 'যোগাযোগ | বিগ বাজার বারইয়ারহাট — হেল্পলাইন ও WhatsApp';
      pageDesc = 'অর্ডার ও স্টক সাপোর্ট: 01857045449 · WhatsApp 01824950082 · জমিদার প্লাজা, বারইয়ারহাট, মীরসরাই।';
    } else if (!title && location.pathname === '/store-locations') {
      pageTitle = 'শোরুম লোকেশন | বিগ বাজার — জমিদার প্লাজা, বারইয়ারহাট';
      pageDesc = 'ভিজিট করুন: জমিদার প্লাজা ২য় তলা, বারইয়ারহাট, মীরসরাই, চট্টগ্রাম। প্রতিদিন সকাল ৯টা – রাত ৯টা।';
    }

    // ProductDetails may pass productData; otherwise leave defaults (ProductDetails also applies SEO)
    if (productData?.name) {
      const price = productData.price != null ? ` ৳${productData.price}` : '';
      pageTitle = `${productData.name}${price} | বিগ বাজার বারইয়ারহাট`;
      pageDesc =
        productData.description ||
        `${productData.name} — বিগ বাজার বারইয়ারহাট থেকে অনলাইন অর্ডার। মীরসরাইতে ফ্রি ডেলিভারি, সারাদেশে COD।`;
      pageKeywords = `${productData.name}, ${productData.category || ''}, ${productData.subcategory || ''}, বিগ বাজার, বারইয়ারহাট`;
    }

    const pageImage = image || productData?.images?.[0] || `${origin}/b.jpg`;

    document.title = pageTitle;

    const updateMeta = (selector, attr, val) => {
      let el = document.querySelector(selector);
      if (!el) {
        el = document.createElement('meta');
        if (selector.includes('property=')) {
          el.setAttribute('property', selector.match(/property="([^"]+)"/)[1]);
        } else if (selector.includes('name=')) {
          el.setAttribute('name', selector.match(/name="([^"]+)"/)[1]);
        }
        document.head.appendChild(el);
      }
      el.setAttribute(attr, val);
    };

    updateMeta('meta[name="description"]', 'content', pageDesc);
    updateMeta('meta[name="keywords"]', 'content', pageKeywords);
    updateMeta('meta[property="og:title"]', 'content', pageTitle);
    updateMeta('meta[property="og:description"]', 'content', pageDesc);
    updateMeta('meta[property="og:image"]', 'content', pageImage);
    updateMeta('meta[property="og:url"]', 'content', canonicalUrl);
    updateMeta('meta[property="og:type"]', 'content', isProduct || productData ? 'product' : 'website');
    updateMeta('meta[property="og:locale"]', 'content', 'bn_BD');
    updateMeta('meta[property="og:locale:alternate"]', 'content', 'en_US');
    updateMeta('meta[property="og:site_name"]', 'content', 'Big Bazar Baraiyarhat');
    updateMeta('meta[name="twitter:card"]', 'content', 'summary_large_image');
    updateMeta('meta[name="twitter:title"]', 'content', pageTitle);
    updateMeta('meta[name="twitter:description"]', 'content', pageDesc);
    updateMeta('meta[name="twitter:image"]', 'content', pageImage);
    updateMeta('meta[name="robots"]', 'content', 'index, follow, max-image-preview:large');

    if (subcategory) {
      const meta = getSubcategoryMeta({ id: subcategory }, category);
      if (meta?.keywords) updateMeta('meta[name="keywords"]', 'content', meta.keywords);
    }

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', canonicalUrl);

    const schemaId = 'bigbazar-jsonld-dynamic';
    let scriptTag = document.getElementById(schemaId);
    if (!scriptTag) {
      scriptTag = document.createElement('script');
      scriptTag.id = schemaId;
      scriptTag.type = 'application/ld+json';
      document.head.appendChild(scriptTag);
    }

    const schemaGraph = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'WebSite',
          '@id': `${origin}/#website`,
          name: 'Big Bazar',
          alternateName: ['বিগ বাজার বারইয়রহাট', 'Big Bazar Baraiyarhat', 'onlinebigbazar.com'],
          url: origin,
          inLanguage: ['bn', 'en'],
          publisher: { '@id': `${origin}/#organization` },
          potentialAction: {
            '@type': 'SearchAction',
            target: `${origin}/products?q={search_term_string}`,
            'query-input': 'required name=search_term_string',
          },
        },
        {
          '@type': ['ClothingStore', 'LocalBusiness', 'Organization'],
          '@id': `${origin}/#organization`,
          name: 'Big Bazar',
          alternateName: [
            'Big Bazar Baraiyarhat',
            'বিগ বাজার বারইয়রহাট',
            'Biyer Sajani',
            'বিয়ের সাজনি',
          ],
          url: origin,
          logo: `${origin}/b.jpg`,
          image: pageImage,
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
          openingHoursSpecification: {
            '@type': 'OpeningHoursSpecification',
            dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
            opens: '09:00',
            closes: '21:00',
          },
          sameAs: [
            'https://www.facebook.com/100063541603515',
            'https://www.instagram.com/big_bazar_25',
            'https://www.tiktok.com/@big.bazar2',
            'https://maps.app.goo.gl/nTyss67XVkuZRLwy9',
          ],
          hasMap: 'https://maps.app.goo.gl/nTyss67XVkuZRLwy9',
          areaServed: [
            { '@type': 'AdministrativeArea', name: 'Mirsharai' },
            { '@type': 'AdministrativeArea', name: 'Chattogram' },
            { '@type': 'Country', name: 'Bangladesh' },
          ],
        },
      ],
    };

    if (productData) {
      schemaGraph['@graph'].push({
        '@type': 'Product',
        '@id': `${origin}/product/${productData.id}#product`,
        name: productData.name,
        description: productData.description || pageDesc,
        image: productData.images || [pageImage],
        sku: String(productData.serial_no || productData.id),
        brand: { '@type': 'Brand', name: 'Big Bazar' },
        category: productData.subcategory
          ? `${productData.category || ''} > ${productData.subcategory}`
          : productData.category,
        offers: {
          '@type': 'Offer',
          url: `${origin}/product/${productData.id}`,
          priceCurrency: 'BDT',
          price: productData.price,
          availability: productData.is_sold_out
            ? 'https://schema.org/OutOfStock'
            : 'https://schema.org/InStock',
          itemCondition: 'https://schema.org/NewCondition',
          seller: { '@id': `${origin}/#organization` },
        },
      });
      schemaGraph['@graph'].push({
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'হোম', item: origin },
          ...(productData.category
            ? [{
                '@type': 'ListItem',
                position: 2,
                name: productData.category,
                item: `${origin}/products?category=${encodeURIComponent(productData.category)}`,
              }]
            : []),
          {
            '@type': 'ListItem',
            position: productData.category ? 3 : 2,
            name: productData.name,
            item: `${origin}/product/${productData.id}`,
          },
        ],
      });
    } else if (location.pathname === '/products' && subcategory) {
      schemaGraph['@graph'].push({
        '@type': 'CollectionPage',
        '@id': canonicalUrl,
        name: pageTitle,
        description: pageDesc,
        url: canonicalUrl,
        inLanguage: 'bn',
        isPartOf: { '@id': `${origin}/#website` },
        about: { '@type': 'Thing', name: subcategory.replace(/-/g, ' ') },
      });
      schemaGraph['@graph'].push({
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'হোম', item: origin },
          ...(category
            ? [{
                '@type': 'ListItem',
                position: 2,
                name: category,
                item: `${origin}/products?category=${encodeURIComponent(category)}`,
              }]
            : []),
          {
            '@type': 'ListItem',
            position: category ? 3 : 2,
            name: subcategory.replace(/-/g, ' '),
            item: canonicalUrl,
          },
        ],
      });
    }

    scriptTag.textContent = JSON.stringify(schemaGraph);
  }, [location, title, description, image, productData]);

  return null;
};

export default SEOHead;
