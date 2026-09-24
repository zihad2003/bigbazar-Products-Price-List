import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Reveal from './Reveal';

export { Reveal };

/** Shared store contacts — edit once for all editorial pages */
export const STORE = {
  brandLabel: 'Big Bazar · Bariarhat',
  helpline: '01857045449',
  helplineTel: 'tel:01857045449',
  whatsapp: '01824950082',
  whatsappUrl: 'https://wa.me/8801824950082',
  email: 'infobigbazar01@gmail.com',
  mapsUrl: 'https://maps.app.goo.gl/nTyss67XVkuZRLwy9',
  address: 'জমিদার প্লাজা (২য় তলা), বারইয়ারহাট, মীরসরাই, চট্টগ্রাম',
  hours: 'প্রতিদিন সকাল ৯:০০ – রাত ৯:০০',
};

export const btnBase =
  'inline-flex items-center justify-center gap-2 min-h-[44px] px-5 py-2.5 text-[15px] font-semibold rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B3122B] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FAF7F2]';

/** Site Bangla stack — same as footer / global (Noto Sans Bengali) */
export const bnFont = { fontFamily: "'Noto Sans Bengali', 'Inter', system-ui, sans-serif" };
/** @deprecated use bnFont — kept so older imports keep working */
export const serif = bnFont;
export const sans = bnFont;

/**
 * Editorial page chrome matching About Us — warm paper bg, no outer card.
 */
export default function EditorialShell({ title, intro, children, maxWidth = 'max-w-[720px]' }) {
  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#1F1D1B]" style={sans}>
      <div className={`${maxWidth} mx-auto px-5 sm:px-8 pt-8 md:pt-12 pb-20 md:pb-28`}>
        <Link
          to="/"
          className={`${btnBase} text-[#5C574F] hover:text-[#1F1D1B] px-0 gap-1.5 mb-10 md:mb-14`}
        >
          <ArrowLeft size={16} strokeWidth={1.75} />
          হোমে ফিরুন
        </Link>

        <Reveal>
          <p
            className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[#5C574F] mb-4"
            style={bnFont}
          >
            {STORE.brandLabel}
          </p>
          <h1
            className="text-[1.85rem] sm:text-[2.35rem] md:text-[2.75rem] leading-[1.2] font-bold tracking-tight text-[#1F1D1B] mb-5"
            style={bnFont}
          >
            {title}
          </h1>
          {intro && (
            <p className="text-[16px] md:text-[17px] leading-[1.75] text-[#3D3A36] max-w-2xl mb-2">
              {intro}
            </p>
          )}
        </Reveal>

        <div className="mt-12 md:mt-16 space-y-12 md:space-y-16">{children}</div>
      </div>
    </div>
  );
}

/** Thin hairline section divider */
export function Divider() {
  return <hr className="border-0 border-t border-[#1F1D1B]/12" />;
}

/** Numbered / titled block without card chrome */
export function SectionBlock({ label, title, children }) {
  return (
    <Reveal>
      {label && (
        <p className="text-[12px] font-bold uppercase tracking-[0.18em] text-[#B3122B] mb-2">{label}</p>
      )}
      {title && (
        <h2 className="text-xl md:text-2xl font-bold text-[#1F1D1B] mb-4 leading-snug" style={serif}>
          {title}
        </h2>
      )}
      <div className="text-[16px] md:text-[17px] leading-[1.75] text-[#3D3A36] space-y-3">{children}</div>
    </Reveal>
  );
}
