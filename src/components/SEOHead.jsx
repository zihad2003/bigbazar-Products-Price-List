import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Client-Side SPA Head & Metadata Manager.
 * Dynamically updates document title, meta tags, and JSON-LD schema on route navigation.
 */
const SEOHead = ({ title, description, image, productData }) => {
  const location = useLocation();

  useEffect(() => {
    const origin = window.location.origin;
    const canonicalUrl = `${origin}${location.pathname}`;

    const defaultTitle = "Big Bazar | Baraiyarhat — Complete Family Fashion & Lifestyle Destination";
    const defaultDesc = "Located on the 2nd Floor of Jomidar Plaza in Baraiyarhat, Mirsharai, Chattogram, Big Bazar is the premier fixed-price family shopping destination. Home of signature bridal section Biyer Sajani (বিয়ের সাজনি), kids wear, modest fashion, gents wear, and home decor. Free Home Delivery within Mirsharai Upazila.";

    const pageTitle = title || defaultTitle;
    const pageDesc = description || defaultDesc;
    const pageImage = image || `${origin}/b.jpg`;

    // 1. Update Title
    document.title = pageTitle;

    // Helper to update meta tag content
    const updateMeta = (selector, attr, val) => {
      let el = document.querySelector(selector);
      if (!el) {
        el = document.createElement('meta');
        if (selector.includes('property=')) {
          const propName = selector.match(/property="([^"]+)"/)[1];
          el.setAttribute('property', propName);
        } else if (selector.includes('name=')) {
          const nameVal = selector.match(/name="([^"]+)"/)[1];
          el.setAttribute('name', nameVal);
        }
        document.head.appendChild(el);
      }
      el.setAttribute(attr, val);
    };

    // 2. Update Description & OpenGraph
    updateMeta('meta[name="description"]', 'content', pageDesc);
    updateMeta('meta[property="og:title"]', 'content', pageTitle);
    updateMeta('meta[property="og:description"]', 'content', pageDesc);
    updateMeta('meta[property="og:image"]', 'content', pageImage);
    updateMeta('meta[property="og:url"]', 'content', canonicalUrl);
    updateMeta('meta[name="twitter:title"]', 'content', pageTitle);
    updateMeta('meta[name="twitter:description"]', 'content', pageDesc);
    updateMeta('meta[name="twitter:image"]', 'content', pageImage);

    // 3. Update Canonical Tag
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', canonicalUrl);

    // 4. Update Client JSON-LD Schema
    const schemaId = 'bigbazar-jsonld-dynamic';
    let scriptTag = document.getElementById(schemaId);
    if (!scriptTag) {
      scriptTag = document.createElement('script');
      scriptTag.id = schemaId;
      scriptTag.type = 'application/ld+json';
      document.head.appendChild(scriptTag);
    }

    const schemaGraph = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": ["ClothingStore", "LocalBusiness", "Organization"],
          "@id": `${origin}/#organization`,
          "name": "Big Bazar",
          "alternateName": [
            "Big Bazar Baraiyarhat",
            "বিগ বাজার বারইয়ারহাট",
            "Biyer Sajani",
            "বিয়ের সাজনি"
          ],
          "url": origin,
          "logo": `${origin}/b.jpg`,
          "image": pageImage,
          "description": pageDesc,
          "telephone": "+8801857045449",
          "email": "infobigbazar01@gmail.com",
          "priceRange": "৳৳",
          "address": {
            "@type": "PostalAddress",
            "streetAddress": "2nd Floor, Jomidar Plaza, Baraiyarhat Pouroshoba",
            "addressLocality": "Mirsharai",
            "addressRegion": "Chattogram",
            "postalCode": "4327",
            "addressCountry": "BD"
          },
          "geo": {
            "@type": "GeoCoordinates",
            "latitude": 22.8984,
            "longitude": 91.5303
          },
          "sameAs": [
            "https://www.facebook.com/100063541603515",
            "https://www.instagram.com/big_bazar_25",
            "https://www.tiktok.com/@big.bazar2"
          ]
        }
      ]
    };

    if (productData) {
      schemaGraph["@graph"].push({
        "@type": "Product",
        "@id": `${origin}/product/${productData.id}`,
        "name": productData.name,
        "description": productData.description || pageDesc,
        "image": productData.images || [pageImage],
        "offers": {
          "@type": "Offer",
          "priceCurrency": "BDT",
          "price": productData.price,
          "availability": productData.is_sold_out ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
          "seller": { "@id": `${origin}/#organization` }
        }
      });
    }

    scriptTag.textContent = JSON.stringify(schemaGraph);
  }, [location, title, description, image, productData]);

  return null;
};

export default SEOHead;
