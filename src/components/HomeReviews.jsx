import React, { useEffect, useState } from 'react';
import { Star, Quote } from 'lucide-react';
import { bigBazarApi } from '../api/client';
import { useLanguage } from '../contexts/LanguageContext';

/**
 * Landing-page social proof — pulls high-rated reviews from /api/reviews?featured=1
 * Admin can add testimonials from Admin → Reviews.
 */
export default function HomeReviews() {
  const { language } = useLanguage();
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/reviews?featured=1');
        const json = await res.json().catch(() => ({}));
        const list = Array.isArray(json?.data) ? json.data : [];
        if (!cancelled) setReviews(list.slice(0, 8));
      } catch (_) {
        // Fallback via client
        try {
          const { data } = await bigBazarApi.from('reviews').select('*');
          const list = (Array.isArray(data) ? data : [])
            .filter((r) => (r.rating || 0) >= 4)
            .slice(0, 8);
          if (!cancelled) setReviews(list);
        } catch (__) {}
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (!reviews.length) return null;

  return (
    <section className="w-full max-w-[1920px] 2xl:max-w-[2560px] mx-auto px-4 md:px-12 mt-14 md:mt-20">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-8">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#ce112d] mb-1.5">
            {language === 'bn' ? 'কাস্টমার মতামত' : 'Customer love'}
          </p>
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-zinc-900">
            {language === 'bn' ? 'যাঁরা আমাদের বিশ্বাস করেন' : 'Trusted by our customers'}
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
        {reviews.map((r) => (
          <article
            key={r.id}
            className="relative rounded-2xl border border-zinc-200/80 bg-white p-5 md:p-6 shadow-sm hover:shadow-md hover:border-zinc-300 transition-all"
          >
            <Quote className="absolute top-4 right-4 text-zinc-100" size={28} strokeWidth={1.5} />
            <div className="flex gap-0.5 text-[#ce112d] mb-3">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  size={14}
                  className={s <= (r.rating || 5) ? 'fill-current' : 'text-zinc-200'}
                />
              ))}
            </div>
            <p className="text-sm text-zinc-700 leading-relaxed line-clamp-4 min-h-[4.5rem]">
              {r.comment || (language === 'bn' ? 'দারুণ অভিজ্ঞতা!' : 'Great experience!')}
            </p>
            <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-zinc-900 truncate">
                {r.customer_name || (language === 'bn' ? 'কাস্টমার' : 'Customer')}
              </p>
              {r.product_name && (
                <p className="text-[10px] text-zinc-400 truncate max-w-[45%]">{r.product_name}</p>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
