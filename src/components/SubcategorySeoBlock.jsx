import React from 'react';
import { getSubcategorySeo } from '../data/subcategorySeo';

/**
 * Bottom-of-page SEO content for a selected subcategory.
 * Visible to users + crawlers; keeps product grid clean above.
 */
export default function SubcategorySeoBlock({ subcategory, category, language = 'bn' }) {
  if (!subcategory?.id) return null;
  const seo = getSubcategorySeo(subcategory, category);
  if (!seo) return null;

  const bn = language === 'bn';
  const h2 = bn ? seo.h2_bn : seo.h2_en;
  const intro = bn ? seo.intro_bn : seo.intro_en;
  const bullets = bn ? seo.bullets_bn : seo.bullets_en;
  const faqs = seo.faq || [];

  return (
    <section
      className="mt-14 md:mt-16 pt-10 border-t border-zinc-100"
      aria-label={bn ? 'ক্যাটাগরি তথ্য' : 'Category information'}
    >
      <div className="max-w-3xl space-y-5">
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#ce112d]">
            Big Bazar · {bn ? 'বারইয়ারহাট' : 'Baraiyarhat'}
          </p>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-zinc-900 leading-snug">
            {h2}
          </h2>
          <p className="text-sm text-zinc-600 leading-relaxed">{intro}</p>
        </div>

        {bullets?.length > 0 && (
          <ul className="grid gap-2 sm:grid-cols-2 text-sm text-zinc-700">
            {bullets.map((b) => (
              <li key={b} className="flex gap-2 items-start">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#ce112d] shrink-0" aria-hidden />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        )}

        {faqs.length > 0 && (
          <div className="space-y-3 pt-2">
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500">
              {bn ? 'প্রশ্নোত্তর' : 'FAQ'}
            </h3>
            {faqs.map((f) => (
              <div key={f.q_en || f.q_bn} className="rounded-2xl border border-zinc-100 bg-zinc-50/80 p-4">
                <p className="text-sm font-semibold text-zinc-900 mb-1">{bn ? f.q_bn : f.q_en}</p>
                <p className="text-xs md:text-sm text-zinc-600 leading-relaxed">{bn ? f.a_bn : f.a_en}</p>
              </div>
            ))}
          </div>
        )}

        <p className="text-[11px] text-zinc-400 leading-relaxed">
          {bn
            ? 'শোরুম: ২য় তলা, জমিদার প্লাজা, বারইয়ারহাট পৌরসভা, মীরসরাই, চট্টগ্রাম · হেল্পলাইন: 01857045449'
            : 'Showroom: 2nd Floor, Jomidar Plaza, Baraiyarhat, Mirsharai, Chattogram · Helpline: 01857045449'}
        </p>
      </div>
    </section>
  );
}
