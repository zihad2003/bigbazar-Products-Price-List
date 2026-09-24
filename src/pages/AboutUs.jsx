import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, MessageCircle, MapPin } from 'lucide-react';
import { STORE, btnBase, bnFont } from '../components/EditorialShell';
import Reveal from '../components/Reveal';
import { bigBazarApi } from '../api/client';
import { getAllSubcategories, resolveSubcategoryImage } from '../data/categories';
import { getOptimizedUrl, mediaSizes } from '../utils/media';
import { useLanguage } from '../contexts/LanguageContext';

/**
 * Easy-to-edit media constants for the About page.
 * Contact/maps come from shared STORE — change photos here later.
 * Subcategories under “এক ছাদের নিচে” load live from admin settings.
 */
const ABOUT = {
  images: {
    hero: '/img/about/showroom.jpg',
    bridal: '/img/about/biyer-sajani.jpg',
  },
};

/** Gradient placeholder until real photo URL is set */
function PhotoSlot({ src, alt, aspect = 'aspect-[4/5]', className = '' }) {
  return (
    <div className={`relative overflow-hidden bg-[#E8E2D9] ${aspect} ${className}`}>
      {src ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div
          className="absolute inset-0 bg-gradient-to-br from-[#EDE7DC] via-[#E0D8CC] to-[#D2C8BA]"
          aria-hidden
        />
      )}
    </div>
  );
}

export default function AboutUs() {
  const { language } = useLanguage();
  const [subcategoriesData, setSubcategoriesData] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await bigBazarApi.from('site_settings').select('*');
        if (cancelled || !data) return;
        if (data.subcategories && typeof data.subcategories === 'object') {
          setSubcategoriesData(data.subcategories);
          return;
        }
        if (Array.isArray(data)) {
          const settingsMap = {};
          data.forEach((row) => {
            if (row?.key) settingsMap[row.key] = row.value;
          });
          if (settingsMap.subcategories && typeof settingsMap.subcategories === 'object') {
            setSubcategoriesData(settingsMap.subcategories);
          }
        }
      } catch (_) {}
    })();
    return () => { cancelled = true; };
  }, []);

  // All admin-managed subcategories (with images) — grows as superadmin adds more
  const showcaseSubs = getAllSubcategories(subcategoriesData, 48);

  return (
    <div
      className="about-page min-h-screen bg-[#FAF7F2] text-[#1F1D1B]"
      style={bnFont}
    >
      <div className="max-w-[1120px] mx-auto px-5 sm:px-8 pt-8 md:pt-12 pb-20 md:pb-28">
        <Link
          to="/"
          className={`${btnBase} text-[#5C574F] hover:text-[#1F1D1B] px-0 gap-1.5 mb-10 md:mb-14 min-h-[44px]`}
        >
          <ArrowLeft size={16} strokeWidth={1.75} />
          হোমে ফিরুন
        </Link>

        {/* 1. HERO */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <Reveal>
            <p
              className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[#5C574F] mb-4"
              style={bnFont}
            >
              Big Bazar · Bariarhat
            </p>
            <h1
              className="text-[2rem] sm:text-[2.5rem] md:text-[3.25rem] leading-[1.2] font-bold tracking-tight text-[#1F1D1B] mb-5"
              style={bnFont}
            >
              এক শোরুম। পুরো পরিবার।{' '}
              <span className="text-[#B3122B]">ফিক্সড প্রাইস.</span>
            </h1>
            <p className="text-[16px] md:text-[17px] leading-[1.75] text-[#3D3A36] max-w-xl mb-8">
              চট্টগ্রামের মীরসরাই, বারইয়ারহাটের জমিদার প্লাজা (২য় তলা)-এর ফিক্সড-প্রাইস
              ফ্যাশন ডেস্টিনেশন। শোরুমে দেখে কিনুন, অথবা onlinebigbazar.com-এ অর্ডার করুন —
              একই মান, একই বিশ্বাস।
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href={STORE.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`${btnBase} bg-[#B3122B] text-[#FAF7F2] hover:bg-[#961022]`}
              >
                <MessageCircle size={18} strokeWidth={1.75} />
                WhatsApp-এ মেসেজ করুন
              </a>
              <a
                href={STORE.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`${btnBase} border border-[#1F1D1B]/20 text-[#1F1D1B] hover:border-[#1F1D1B]/45 bg-transparent`}
              >
                <MapPin size={18} strokeWidth={1.75} />
                শোরুমের লোকেশন
              </a>
            </div>
          </Reveal>

          <Reveal className="lg:pl-4">
            <PhotoSlot
              src={ABOUT.images.hero}
              alt="Big Bazar বারইয়ারহাট শোরুম — জমিদার প্লাজা"
              aspect="aspect-[4/3] lg:aspect-[5/4]"
              className="w-full max-w-md mx-auto lg:max-w-none rounded-sm"
            />
          </Reveal>
        </section>

        {/* 2. STATS */}
        <Reveal className="mt-16 md:mt-24">
          <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[#1F1D1B]/12 border-y border-[#1F1D1B]/12">
            {[
              { value: '১ লক্ষ+', label: 'সোশ্যাল ফলোয়ার' },
              { value: 'ফিক্সড প্রাইস', label: 'দরদাম ছাড়াই' },
              { value: 'সারাদেশে COD', label: 'ক্যাশ অন ডেলিভারি' },
            ].map((stat) => (
              <div key={stat.value} className="py-8 sm:py-10 px-2 sm:px-6 text-center">
                <p
                  className="text-2xl md:text-3xl font-bold text-[#1F1D1B] mb-1.5"
                  style={bnFont}
                >
                  {stat.value}
                </p>
                <p className="text-[13px] md:text-sm text-[#5C574F] tracking-wide">{stat.label}</p>
              </div>
            ))}
          </div>
        </Reveal>

        {/* 3. STORY — pull quote */}
        <Reveal className="mt-16 md:mt-24 max-w-3xl mx-auto text-center">
          <blockquote
            className="text-[1.35rem] sm:text-[1.65rem] md:text-[1.85rem] leading-[1.55] font-medium text-[#1F1D1B]"
            style={bnFont}
          >
            এক লক্ষেরও বেশি সোশ্যাল ফলোয়ারের আস্থা নিয়ে আমরা প্রতিদিন হাজারো পরিবারকে সাজাতে সাহায্য করি।
          </blockquote>
        </Reveal>

        {/* 4. FEATURED — বিয়ের সাজনি */}
        <section className="mt-16 md:mt-24 -mx-5 sm:-mx-8 px-5 sm:px-8 py-14 md:py-20 bg-[#B3122B]/[0.06]">
          <div className="max-w-[1120px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center">
            <Reveal>
              <PhotoSlot
                src={ABOUT.images.bridal}
                alt="বিয়ের সাজনি — Big Bazar ব্রাইডাল কালেকশন"
                aspect="aspect-[4/5]"
                className="w-full max-w-md mx-auto lg:max-w-none rounded-sm"
              />
            </Reveal>
            <Reveal>
              <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-[#B3122B] mb-3">
                সিগনেচার
              </p>
              <h2
                className="text-3xl md:text-4xl font-bold text-[#1F1D1B] mb-5 leading-tight"
                style={bnFont}
              >
                বিয়ের সাজনি
              </h2>
              <p className="text-[16px] md:text-[17px] leading-[1.75] text-[#3D3A36] mb-7">
                বিয়ের দিনের সম্পূর্ণ লুক এক জায়গায়। কনের জামদানি, কাতান, জর্জেট ও স্টোন ওয়ার্ক শাড়ি
                থেকে পার্টি ড্রেস, সালোয়ার-কামিজ, বরের শেরওয়ানি, পাঞ্জাবি ও ব্লেজার —
                কিউরেটেড ওয়েডিং কালেকশন।
              </p>
              <a
                href={STORE.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`${btnBase} bg-[#B3122B] text-[#FAF7F2] hover:bg-[#961022] mb-5`}
              >
                <MessageCircle size={18} strokeWidth={1.75} />
                WhatsApp-এ ছবি পাঠান
              </a>
              <p className="text-[14px] leading-[1.7] text-[#5C574F]">
                সাইজ, স্টক বা ম্যাচিং সেট নিয়ে দ্বিধা? শোরুমে এসে দেখুন, বা WhatsApp-এ ছবি পাঠান — আমরা গাইড করব।
              </p>
            </Reveal>
          </div>
        </section>

        {/* 5. SUBCATEGORIES — live from admin (images + labels) */}
        <section className="mt-16 md:mt-24">
          <Reveal>
            <h2
              className="text-2xl md:text-3xl font-bold text-[#1F1D1B] mb-3 md:mb-4"
              style={bnFont}
            >
              এক ছাদের নিচে যা পাবেন
            </h2>
            <p className="text-[15px] text-[#5C574F] mb-8 md:mb-10 max-w-xl leading-relaxed">
              শাড়ি থেকে ব্রাইডাল, কিডস থেকে হোম টেক্সটাইল — কালেকশন দেখতে ট্যাপ করুন।
            </p>
          </Reveal>

          {showcaseSubs.length === 0 ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-[3/4] rounded-sm bg-[#E8E2D9] animate-pulse"
                  aria-hidden
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {showcaseSubs.map((sub) => {
                const label =
                  language === 'bn'
                    ? (sub.name_bn || sub.name_en || sub.id)
                    : (sub.name_en || sub.name_bn || sub.id);
                const imgSrc = resolveSubcategoryImage(sub);
                const cat = sub._category;
                const to =
                  cat && cat !== 'All'
                    ? `/products?category=${encodeURIComponent(cat)}&subcategory=${encodeURIComponent(sub.id)}`
                    : `/products?subcategory=${encodeURIComponent(sub.id)}`;

                return (
                  <Reveal key={sub.id}>
                    <Link
                      to={to}
                      className="group relative block overflow-hidden rounded-sm bg-[#E8E2D9] aspect-[3/4] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B3122B]/50"
                    >
                      {imgSrc ? (
                        <img
                          src={getOptimizedUrl(imgSrc, mediaSizes.subcat)}
                          alt={label}
                          loading="lazy"
                          decoding="async"
                          width={280}
                          height={360}
                          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                        />
                      ) : (
                        <div
                          className="absolute inset-0 bg-gradient-to-br from-[#EDE7DC] via-[#DDD5C8] to-[#C9BFB0] flex items-center justify-center"
                          aria-hidden
                        >
                          <span className="text-3xl font-bold text-[#1F1D1B]/25">
                            {(label || '?')[0]}
                          </span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#1F1D1B]/75 via-[#1F1D1B]/15 to-transparent" />
                      <p className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 text-[14px] sm:text-[15px] font-semibold text-[#FAF7F2] leading-snug">
                        {label}
                      </p>
                    </Link>
                  </Reveal>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* 6. PROMISE — full bleed dark */}
      <section className="bg-[#1F1D1B] text-[#FAF7F2]">
        <div className="max-w-[1120px] mx-auto px-5 sm:px-8 py-16 md:py-20">
          <Reveal>
            <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-[#B3122B] mb-4">
              আমাদের প্রতিশ্রুতি
            </p>
            <p
              className="text-xl md:text-2xl font-medium leading-[1.55] mb-4 max-w-2xl"
              style={bnFont}
            >
              মানসম্মত পণ্য, পরিষ্কার দাম, দ্রুত সাপোর্ট।
            </p>
            <p className="text-[16px] md:text-[17px] leading-[1.75] text-[#D4CFC6] max-w-2xl">
              মীরসরাই উপজেলায় অনলাইন অর্ডারে ফ্রি হোম ডেলিভারি — বাকি দেশে নির্ভরযোগ্য ক্যাশ অন ডেলিভারি।
            </p>
          </Reveal>
        </div>
      </section>

      {/* 7. FINAL CTA */}
      <section className="bg-[#FAF7F2]">
        <div className="max-w-[1120px] mx-auto px-5 sm:px-8 py-16 md:py-24">
          <Reveal>
            <h2
              className="text-3xl md:text-4xl font-bold text-[#1F1D1B] mb-4"
              style={bnFont}
            >
              শোরুমে আসুন
            </h2>
            <p className="text-[16px] md:text-[17px] leading-[1.75] text-[#3D3A36] mb-8 flex items-start gap-2 max-w-lg">
              <MapPin size={18} strokeWidth={1.75} className="text-[#B3122B] shrink-0 mt-1" />
              জমিদার প্লাজা (২য় তলা), বারইয়ারহাট, মীরসরাই, চট্টগ্রাম
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href={STORE.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`${btnBase} bg-[#B3122B] text-[#FAF7F2] hover:bg-[#961022]`}
              >
                <MapPin size={18} strokeWidth={1.75} />
                Google Maps-এ দেখুন
              </a>
              <a
                href={STORE.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`${btnBase} border border-[#1F1D1B]/20 text-[#1F1D1B] hover:border-[#1F1D1B]/45`}
              >
                <MessageCircle size={18} strokeWidth={1.75} />
                WhatsApp-এ মেসেজ
              </a>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
