import React, { useEffect, useState } from 'react';
import { bigBazarApi } from '../api/client';
import { useLanguage } from '../contexts/LanguageContext';

/**
 * Landing page only. Shows chat screenshots the admin uploaded.
 * No names, stars, or written reviews.
 */
export default function HomeReviews() {
  const { language } = useLanguage();
  const [shots, setShots] = useState([]);
  const [open, setOpen] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/reviews?featured=1');
        const json = await res.json().catch(() => ({}));
        const list = (Array.isArray(json?.data) ? json.data : []).filter((r) => r.image_url);
        if (!cancelled) setShots(list.slice(0, 12));
      } catch (_) {
        try {
          const { data } = await bigBazarApi.from('reviews').select('*');
          const list = (Array.isArray(data) ? data : []).filter((r) => r.image_url);
          if (!cancelled) setShots(list.slice(0, 12));
        } catch (__) {}
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (open == null) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(null);
      if (e.key === 'ArrowRight') setOpen((i) => (i + 1) % shots.length);
      if (e.key === 'ArrowLeft') setOpen((i) => (i - 1 + shots.length) % shots.length);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, shots.length]);

  if (!shots.length) return null;

  return (
    <section className="w-full max-w-[1920px] 2xl:max-w-[2560px] mx-auto px-4 md:px-12 mt-16 md:mt-24">
      <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-zinc-400 mb-4">
        {language === 'bn' ? 'কাস্টমারের কথা' : 'From customers'}
      </p>
      <div className="flex gap-3 overflow-x-auto pb-2 snap-x">
        {shots.map((r, i) => (
          <button
            key={r.id}
            type="button"
            onClick={() => setOpen(i)}
            className="snap-start shrink-0 w-[132px] sm:w-[156px] rounded-2xl overflow-hidden bg-zinc-100 border border-zinc-200/90 focus:outline-none focus:ring-2 focus:ring-zinc-300"
          >
            <img
              src={r.image_url}
              alt={language === 'bn' ? 'কাস্টমার রিভিউ' : 'Customer review'}
              className="w-full aspect-[3/5] object-cover object-top"
              loading="lazy"
            />
          </button>
        ))}
      </div>

      {open != null && shots[open] && (
        <div
          className="fixed inset-0 z-[80] bg-black/80 flex items-center justify-center p-4"
          onClick={() => setOpen(null)}
          role="dialog"
          aria-modal="true"
        >
          <img
            src={shots[open].image_url}
            alt=""
            className="max-h-[88vh] max-w-[92vw] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </section>
  );
}
