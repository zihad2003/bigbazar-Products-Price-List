import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, MapPin, Phone, Mail, MessageCircle, Clock,
} from 'lucide-react';
import AboutUs from './AboutUs';
import EditorialShell, {
  STORE, Reveal, Divider, SectionBlock, btnBase, serif,
} from '../components/EditorialShell';
import { useLanguage } from '../contexts/LanguageContext';

const pick = (lang, bn, en) => (lang === 'en' ? en : bn);

const FAQ_ITEMS = [
  {
    q: { bn: 'শোরুম কোথায়?', en: 'Where is the showroom?' },
    a: {
      bn: 'মীরসরাই, বারইয়ারহাট — জমিদার প্লাজার ২য় তলা। প্রতিদিন সকাল ৯:০০ থেকে রাত ৯:০০ খোলা।',
      en: 'Mirsharai, Bariarhat — 2nd floor of Jomidar Plaza. Open daily 9:00 AM – 9:00 PM.',
    },
  },
  {
    q: { bn: 'মীরসরাইতে ডেলিভারি ফ্রি?', en: 'Is delivery free in Mirsharai?' },
    a: {
      bn: 'হ্যাঁ। অনলাইন অর্ডারে মীরসরাই উপজেলায় ফ্রি হোম ডেলিভারি।',
      en: 'Yes. Free home delivery within Mirsharai Upazila on online orders.',
    },
  },
  {
    q: { bn: 'ডেলিভারি চার্জ কত?', en: 'What are the delivery charges?' },
    a: {
      bn: 'মীরসরাই: ফ্রি · চট্টগ্রাম জেলা: ৳১০০ (১–২ দিন) · দেশের অন্যান্য: ৳১৫০ (২–৫ দিন)। ওজন বেশি হলে আগে জানানো হবে।',
      en: 'Mirsharai: Free · Chattogram district: ৳100 (1–2 days) · Rest of Bangladesh: ৳150 (2–5 days). Extra weight is confirmed before shipping.',
    },
  },
  {
    q: { bn: 'কীভাবে অর্ডার করব?', en: 'How do I place an order?' },
    a: {
      bn: 'পণ্যে সাইজ/কালার বেছে “অর্ডার করুন” চাপুন → নাম, মোবাইল, ঠিকানা দিন → কনফার্ম। লগইন ছাড়াই অর্ডার করা যায়।',
      en: 'Pick size/color on the product → tap Order → enter name, mobile, address → confirm. You can order without logging in.',
    },
  },
  {
    q: { bn: 'বিয়ের সাজনি কী?', en: 'What is Biyer Sajani?' },
    a: {
      bn: 'বিয়ের সাজনি আমাদের ওয়েডিং সেকশন — কনের শাড়ি/পার্টি ওয়্যার এবং বরের শেরওয়ানি-পাঞ্জাবি কালেকশন।',
      en: 'Biyer Sajani is our wedding section — bridal sarees/party wear and groom sherwani–panjabi collections.',
    },
  },
  {
    q: { bn: 'পেমেন্ট কীভাবে?', en: 'How can I pay?' },
    a: {
      bn: 'ক্যাশ অন ডেলিভারি, বিকাশ অগ্রিম, বা Bangla QR। সম্পূর্ণ পেমেন্ট অ্যাডমিন ভেরিফাই করে।',
      en: 'Cash on delivery, bKash advance, or Bangla QR. Payments are verified by admin.',
    },
  },
];

const SIZE_ROWS = [
  ['S', '36"–38"', '26"', 'Regular'],
  ['M', '38"–40"', '27"', 'Regular'],
  ['L', '40"–42"', '28"', 'Regular'],
  ['XL', '42"–44"', '29"', 'Regular'],
  ['FREE', '34"–44"', 'Flexible', 'Universal'],
];

function buildPages(lang) {
  const address = pick(lang, STORE.address, STORE.addressEn);
  const hours = pick(lang, STORE.hours, STORE.hoursEn);
  const isEn = lang === 'en';

  return {
    '/contact-us': {
      title: pick(lang, 'যোগাযোগ', 'Contact'),
      intro: pick(
        lang,
        'অর্ডার, স্টক বা সাইজ সংক্রান্ত যেকোনো সহায়তার জন্য সরাসরি যোগাযোগ করুন।',
        'Reach us directly for help with orders, stock, or sizing.',
      ),
      body: (
        <>
          <Reveal>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-8">
              {[
                { icon: Phone, label: pick(lang, 'হেল্পলাইন', 'Helpline'), value: STORE.helpline, href: STORE.helplineTel },
                { icon: MessageCircle, label: 'WhatsApp', value: STORE.whatsapp, href: STORE.whatsappUrl },
                { icon: Mail, label: pick(lang, 'ইমেইল', 'Email'), value: STORE.email, href: `mailto:${STORE.email}` },
                { icon: Clock, label: pick(lang, 'সময়', 'Hours'), value: hours, href: null },
              ].map((item) => {
                const Icon = item.icon;
                const inner = (
                  <div className="flex gap-4 items-start border-t border-[#1F1D1B]/10 pt-5">
                    <Icon size={20} strokeWidth={1.75} className="text-[#B3122B] shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-[#5C574F] mb-1">{item.label}</p>
                      <p className="text-[17px] font-semibold text-[#1F1D1B]">{item.value}</p>
                    </div>
                  </div>
                );
                return item.href ? (
                  <a
                    key={item.label}
                    href={item.href}
                    target={item.href.startsWith('http') ? '_blank' : undefined}
                    rel="noopener noreferrer"
                    className="block hover:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B3122B] rounded-sm"
                  >
                    {inner}
                  </a>
                ) : (
                  <div key={item.label}>{inner}</div>
                );
              })}
            </div>
          </Reveal>

          <Divider />

          <SectionBlock title={pick(lang, 'শোরুম', 'Showroom')}>
            <p className="flex items-start gap-2">
              <MapPin size={18} strokeWidth={1.75} className="text-[#B3122B] shrink-0 mt-1" />
              {address}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <a href={STORE.mapsUrl} target="_blank" rel="noopener noreferrer" className={`${btnBase} bg-[#B3122B] text-[#FAF7F2] hover:bg-[#961022]`}>
                <MapPin size={18} strokeWidth={1.75} />
                {pick(lang, 'Google Maps-এ দেখুন', 'Open in Google Maps')}
              </a>
              <a href={STORE.whatsappUrl} target="_blank" rel="noopener noreferrer" className={`${btnBase} border border-[#1F1D1B]/20 hover:border-[#1F1D1B]/45`}>
                <MessageCircle size={18} strokeWidth={1.75} />
                {pick(lang, 'WhatsApp-এ মেসেজ', 'Message on WhatsApp')}
              </a>
            </div>
          </SectionBlock>
        </>
      ),
    },

    '/faq': {
      title: pick(lang, 'সাধারণ প্রশ্ন', 'FAQ'),
      intro: pick(
        lang,
        'অর্ডার, ডেলিভারি ও শোরুম নিয়ে যে প্রশ্নগুলো সবচেয়ে বেশি আসে।',
        'Common questions about orders, delivery, and the showroom.',
      ),
      maxWidth: 'max-w-[720px]',
      body: (
        <div className="space-y-0 divide-y divide-[#1F1D1B]/12">
          {FAQ_ITEMS.map((item) => {
            const q = pick(lang, item.q.bn, item.q.en);
            const a = pick(lang, item.a.bn, item.a.en);
            const showMap = item.q.bn.includes('শোরুম');
            return (
              <Reveal key={item.q.en}>
                <div className="py-7 md:py-8 first:pt-0">
                  <h2 className="text-lg md:text-xl font-bold text-[#1F1D1B] mb-2.5 leading-snug" style={serif}>
                    {q}
                  </h2>
                  <p className="text-[16px] md:text-[17px] leading-[1.75] text-[#3D3A36]">{a}</p>
                  {showMap && (
                    <a
                      href={STORE.mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 mt-3 text-[15px] font-semibold text-[#B3122B] hover:underline min-h-[44px]"
                    >
                      <MapPin size={16} strokeWidth={1.75} />
                      {pick(lang, 'Google Maps-এ দেখুন', 'Open in Google Maps')}
                    </a>
                  )}
                </div>
              </Reveal>
            );
          })}
        </div>
      ),
    },

    '/size-guide': {
      title: pick(lang, 'সাইজ গাইড', 'Size Guide'),
      intro: pick(
        lang,
        'সঠিক সাইজ বেছে নিতে এই চার্ট ব্যবহার করুন। প্রোডাক্ট পেজে আলাদা সাইজ থাকলে সেটাই প্রাধান্য পাবে।',
        'Use this chart to pick the right size. If a product lists its own sizes, those take priority.',
      ),
      maxWidth: 'max-w-[800px]',
      body: (
        <>
          <Reveal>
            <div className="overflow-x-auto border-y border-[#1F1D1B]/12">
              <table className="w-full text-center text-[15px] md:text-[16px]">
                <thead>
                  <tr className="border-b border-[#1F1D1B]/12">
                    {['Size', 'Chest', 'Length', 'Fit'].map((h) => (
                      <th key={h} className="py-4 px-3 font-bold text-[#B3122B] tracking-wide text-[13px] uppercase">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="text-[#1F1D1B]">
                  {SIZE_ROWS.map((row) => (
                    <tr key={row[0]} className="border-b border-[#1F1D1B]/08 last:border-0">
                      {row.map((cell) => (
                        <td key={`${row[0]}-${cell}`} className="py-3.5 px-3 font-medium">{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Reveal>

          <SectionBlock title={pick(lang, 'সন্দেহ হলে', 'If you are unsure')}>
            <p>
              {pick(
                lang,
                'কাস্টম মাপ বা সন্দেহ হলে WhatsApp-এ ছবি পাঠান — আমরা গাইড করব।',
                'For custom measurements or doubts, send a photo on WhatsApp — we will guide you.',
              )}
            </p>
            <a href={STORE.whatsappUrl} target="_blank" rel="noopener noreferrer" className={`${btnBase} bg-[#B3122B] text-[#FAF7F2] hover:bg-[#961022] mt-2`}>
              <MessageCircle size={18} strokeWidth={1.75} />
              WhatsApp · {STORE.whatsapp}
            </a>
          </SectionBlock>
        </>
      ),
    },

    '/shipping': {
      title: pick(lang, 'শিপিং তথ্য', 'Shipping'),
      intro: pick(
        lang,
        'বিশ্বস্ত কুরিয়ার দিয়ে সারা বাংলাদেশে হোম ডেলিভারি। অর্ডার কনফার্ম হলে ট্র্যাকিং আপডেট জানানো হয়।',
        'Home delivery across Bangladesh via trusted courier. Tracking updates after order confirmation.',
      ),
      body: (
        <>
          <Reveal>
            <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[#1F1D1B]/12 border-y border-[#1F1D1B]/12">
              {[
                {
                  title: pick(lang, 'মীরসরাই', 'Mirsharai'),
                  desc: pick(
                    lang,
                    'ফ্রি ডেলিভারি · কনফার্মেশন ফি ৳১০০ অগ্রিম (মোট বিল থেকে বাদ) · ১–২ দিন',
                    'Free delivery · ৳100 confirmation fee in advance (adjusted from total) · 1–2 days',
                  ),
                },
                {
                  title: pick(lang, 'চট্টগ্রাম জেলা', 'Chattogram district'),
                  desc: pick(lang, 'ডেলিভারি ৳১০০ · সাধারণত ১–২ কার্যদিবস', 'Delivery ৳100 · usually 1–2 business days'),
                },
                {
                  title: pick(lang, 'সারা দেশ', 'Nationwide'),
                  desc: pick(lang, 'ডেলিভারি ৳১৫০ · সাধারণত ২–৫ কার্যদিবস', 'Delivery ৳150 · usually 2–5 business days'),
                },
              ].map((z) => (
                <div key={z.title} className="py-8 sm:py-10 px-2 sm:px-6 text-center sm:text-left">
                  <p className="text-xl font-bold text-[#1F1D1B] mb-2" style={serif}>{z.title}</p>
                  <p className="text-[15px] md:text-[16px] leading-[1.7] text-[#3D3A36]">{z.desc}</p>
                </div>
              ))}
            </div>
          </Reveal>

          <SectionBlock title={pick(lang, 'নোট', 'Note')}>
            <p>
              {pick(
                lang,
                'ভারী পার্সেলে চার্জ বাড়তে পারে — কনফার্মেশনের আগে জানিয়ে দেওয়া হবে। COD ও অগ্রিম বিকাশ/QR দুটোই চলবে।',
                'Heavy parcels may cost more — we confirm before shipping. COD and advance bKash/QR are both available.',
              )}
            </p>
          </SectionBlock>
        </>
      ),
    },

    '/returns': {
      title: pick(lang, 'রিটার্ন ও এক্সচেঞ্জ', 'Returns & Exchange'),
      intro: pick(
        lang,
        'মানসম্মত পণ্য পাওয়ার নিশ্চয়তা আমাদের অঙ্গীকার। সমস্যা হলে দ্রুত সমাধান করি।',
        'Quality products are our promise. If something goes wrong, we resolve it quickly.',
      ),
      body: (
        <>
          <SectionBlock title={pick(lang, 'শর্তাবলী', 'Conditions')}>
            <ul className="space-y-3 list-none">
              {[
                pick(lang, 'পণ্য হাতে পাওয়ার ২৪ ঘণ্টার মধ্যে WhatsApp/কলে জানান', 'Inform us on WhatsApp/call within 24 hours of receiving'),
                pick(lang, 'অব্যবহৃত পণ্য + ট্যাগ + প্যাকেজিং অক্ষত থাকতে হবে', 'Item unused with tags and packaging intact'),
                pick(lang, 'ডেলিভারিতে দৃশ্যমান ড্যামেজ হলে ম্যানের কাছেই ফেরত দিতে পারবেন', 'Visible damage on delivery can be refused to the courier'),
              ].map((li) => (
                <li key={li} className="flex gap-3">
                  <span className="mt-2.5 w-1.5 h-1.5 rounded-full bg-[#B3122B] shrink-0" aria-hidden />
                  <span>{li}</span>
                </li>
              ))}
            </ul>
          </SectionBlock>

          <Divider />

          <SectionBlock label={pick(lang, 'সাপোর্ট', 'Support')} title={pick(lang, 'যোগাযোগ', 'Contact')}>
            <p>
              {pick(lang, 'অর্ডার আইডি ও ছবি পাঠান — আমরা দ্রুত দেখে নেব।', 'Send your order ID and photos — we will review quickly.')}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <a href={STORE.whatsappUrl} target="_blank" rel="noopener noreferrer" className={`${btnBase} bg-[#B3122B] text-[#FAF7F2] hover:bg-[#961022]`}>
                <MessageCircle size={18} strokeWidth={1.75} />
                WhatsApp · {STORE.whatsapp}
              </a>
              <a href={STORE.helplineTel} className={`${btnBase} border border-[#1F1D1B]/20 hover:border-[#1F1D1B]/45`}>
                <Phone size={18} strokeWidth={1.75} />
                {pick(lang, `কল · ${STORE.helpline}`, `Call · ${STORE.helpline}`)}
              </a>
            </div>
          </SectionBlock>
        </>
      ),
    },

    '/store-locations': {
      title: pick(lang, 'শোরুম লোকেশন', 'Store Location'),
      intro: pick(
        lang,
        'সরাসরি এসে কাপড় দেখে কিনতে পারেন — অনলাইন ও অফলাইন একই ব্র্যান্ড অভিজ্ঞতা।',
        'Visit in person to see and buy — the same Big Bazar experience online and offline.',
      ),
      body: (
        <>
          <Reveal>
            <p className="text-[12px] font-bold uppercase tracking-[0.18em] text-[#B3122B] mb-3">
              {pick(lang, 'একমাত্র শোরুম', 'Only showroom')}
            </p>
            <h2 className="text-2xl md:text-3xl font-bold text-[#1F1D1B] mb-4" style={serif}>
              Big Bazar · {pick(lang, 'বারইয়ারহাট', 'Bariarhat')}
            </h2>
            <p className="text-[16px] md:text-[17px] leading-[1.75] text-[#3D3A36] mb-2 flex items-start gap-2">
              <MapPin size={18} strokeWidth={1.75} className="text-[#B3122B] shrink-0 mt-1" />
              {address}
            </p>
            <p className="text-[16px] text-[#5C574F] mb-8 flex items-center gap-2 pl-7">
              <Clock size={16} strokeWidth={1.75} className="text-[#B3122B]" />
              {hours}
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <a href={STORE.mapsUrl} target="_blank" rel="noopener noreferrer" className={`${btnBase} bg-[#B3122B] text-[#FAF7F2] hover:bg-[#961022]`}>
                <MapPin size={18} strokeWidth={1.75} />
                {pick(lang, 'Maps-এ খুলুন', 'Open in Maps')}
              </a>
              <a href={STORE.helplineTel} className={`${btnBase} border border-[#1F1D1B]/20 hover:border-[#1F1D1B]/45`}>
                <Phone size={18} strokeWidth={1.75} />
                {STORE.helpline}
              </a>
              <a href={STORE.whatsappUrl} target="_blank" rel="noopener noreferrer" className={`${btnBase} border border-[#1F1D1B]/20 hover:border-[#1F1D1B]/45`}>
                <MessageCircle size={18} strokeWidth={1.75} />
                WhatsApp
              </a>
            </div>
          </Reveal>
        </>
      ),
    },

    '/privacy-policy': {
      title: pick(lang, 'গোপনীয়তা নীতি', 'Privacy Policy'),
      intro: pick(
        lang,
        'Big Bazar (onlinebigbazar.com) আপনার ব্যক্তিগত তথ্যের গোপনীয়তাকে গুরুত্ব দেয়।',
        'Big Bazar (onlinebigbazar.com) takes your personal privacy seriously.',
      ),
      body: (
        <>
          <SectionBlock label={isEn ? '01' : '০১'} title={pick(lang, 'কী সংগ্রহ করি', 'What we collect')}>
            <ul className="space-y-2.5">
              {[
                pick(lang, 'নাম, মোবাইল, ডেলিভারি ঠিকানা', 'Name, mobile, delivery address'),
                pick(lang, 'অ্যাকাউন্ট থাকলে ইমেইল / Google সাইন-ইন', 'Email / Google sign-in if you have an account'),
                pick(lang, 'পেমেন্ট রেফারেন্স — কার্ড তথ্য সংরক্ষণ করি না', 'Payment references — we do not store card details'),
                pick(lang, 'পেজ ভিউ অ্যানালিটিক্স', 'Page-view analytics'),
              ].map((li) => (
                <li key={li} className="flex gap-3">
                  <span className="mt-2.5 w-1.5 h-1.5 rounded-full bg-[#B3122B] shrink-0" aria-hidden />
                  <span>{li}</span>
                </li>
              ))}
            </ul>
          </SectionBlock>
          <Divider />
          <SectionBlock label={isEn ? '02' : '০২'} title={pick(lang, 'কীভাবে ব্যবহার', 'How we use it')}>
            <p>
              {pick(
                lang,
                'অর্ডার ডেলিভারি, সাপোর্ট ও সার্ভিস উন্নতিতে। ফোন নম্বর তৃতীয় পক্ষের কাছে বিক্রি হয় না।',
                'For order delivery, support, and service improvement. We do not sell phone numbers to third parties.',
              )}
            </p>
          </SectionBlock>
          <Divider />
          <SectionBlock label={isEn ? '03' : '০৩'} title={pick(lang, 'অধিকার', 'Your rights')}>
            <p>
              {pick(lang, 'সংশোধন/মুছে ফেলার অনুরোধ:', 'Request correction/deletion:')}{' '}
              <a href={STORE.helplineTel} className="font-semibold text-[#B3122B] hover:underline">{STORE.helpline}</a>
              {' '}{pick(lang, 'বা', 'or')}{' '}
              <a href={`mailto:${STORE.email}`} className="font-semibold text-[#B3122B] hover:underline">{STORE.email}</a>
            </p>
          </SectionBlock>
        </>
      ),
    },

    '/terms': {
      title: pick(lang, 'সেবার শর্তাবলী', 'Terms of Service'),
      intro: pick(
        lang,
        'onlinebigbazar.com ব্যবহার করে আপনি নিচের শর্তে সম্মত।',
        'By using onlinebigbazar.com you agree to the terms below.',
      ),
      body: (
        <div className="space-y-0 divide-y divide-[#1F1D1B]/12">
          {[
            {
              t: pick(lang, 'সঠিক তথ্য', 'Accurate information'),
              d: pick(lang, 'নাম, ফোন ও ঠিকানা সঠিক হতে হবে।', 'Name, phone, and address must be correct.'),
            },
            {
              t: pick(lang, 'মূল্য ও স্টক', 'Price & stock'),
              d: pick(lang, 'পরিবর্তন হতে পারে; স্টক শেষ হলে বিকল্প/রিফান্ড।', 'May change; if out of stock we offer alternatives/refund.'),
            },
            {
              t: pick(lang, 'ছবি', 'Photos'),
              d: pick(lang, 'আলোর কারণে রঙ ১০–২০% ভিন্ন দেখাতে পারে।', 'Colors may look 10–20% different due to lighting.'),
            },
            {
              t: pick(lang, 'পেমেন্ট', 'Payment'),
              d: pick(lang, 'COD, বিকাশ অগ্রিম, Bangla QR — অ্যাডমিন ভেরিফাই করে।', 'COD, bKash advance, Bangla QR — verified by admin.'),
            },
            {
              t: pick(lang, 'আচরণ', 'Conduct'),
              d: pick(lang, 'ভুয়া অর্ডার/হয়রানিতে অর্ডার বাতিলের অধিকার সংরক্ষিত।', 'We may cancel fake orders or abusive behavior.'),
            },
          ].map((item, i) => (
            <Reveal key={item.t}>
              <div className="py-7 md:py-8 first:pt-0 flex gap-5 md:gap-8">
                <span className="text-[13px] font-bold text-[#B3122B] tracking-wider shrink-0 pt-1">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div>
                  <h2 className="text-lg md:text-xl font-bold text-[#1F1D1B] mb-1.5" style={serif}>{item.t}</h2>
                  <p className="text-[16px] md:text-[17px] leading-[1.75] text-[#3D3A36]">{item.d}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      ),
    },

    '/refund': {
      title: pick(lang, 'রিফান্ড পলিসি', 'Refund Policy'),
      intro: pick(
        lang,
        'নিচের ক্ষেত্রে সম্পূর্ণ বা আংশিক রিফান্ড দেওয়া হয়।',
        'Full or partial refunds apply in the cases below.',
      ),
      body: (
        <>
          <SectionBlock label={pick(lang, 'রিফান্ড', 'Refund')} title={pick(lang, 'পাবেন যখন', 'When you get it')}>
            <ul className="space-y-3">
              {[
                pick(lang, 'স্টক না থাকায় অর্ডার ক্যান্সেল', 'Order cancelled due to no stock'),
                pick(lang, 'মিসিং/মারাত্মক ড্যামেজ এবং এক্সচেঞ্জ সম্ভব নয়', 'Missing/severe damage and exchange not possible'),
                pick(lang, 'ভুল পণ্য এবং রিপ্লেসমেন্ট সম্ভব নয়', 'Wrong item and replacement not possible'),
              ].map((li) => (
                <li key={li} className="flex gap-3">
                  <span className="mt-2.5 w-1.5 h-1.5 rounded-full bg-[#B3122B] shrink-0" aria-hidden />
                  <span>{li}</span>
                </li>
              ))}
            </ul>
          </SectionBlock>
          <Divider />
          <SectionBlock title={pick(lang, 'প্রক্রিয়া', 'Process')}>
            <p>
              {pick(lang, 'জানান → যাচাই → সাধারণত', 'Report → verify → usually')}{' '}
              <strong className="text-[#1F1D1B]">
                {pick(lang, '৩–৫ কার্যদিবস', '3–5 business days')}
              </strong>
              {pick(lang, '-এ বিকাশ/নগদ/ব্যাংকে ফেরত।', ' refund to bKash/Nagad/bank.')}
            </p>
            <a href={STORE.whatsappUrl} target="_blank" rel="noopener noreferrer" className={`${btnBase} bg-[#B3122B] text-[#FAF7F2] hover:bg-[#961022] mt-2`}>
              <MessageCircle size={18} strokeWidth={1.75} />
              {pick(lang, 'WhatsApp-এ জানান', 'Tell us on WhatsApp')}
            </a>
          </SectionBlock>
        </>
      ),
    },
  };
}

export default function StaticPage({ path }) {
  const { language } = useLanguage();
  const pages = useMemo(() => buildPages(language), [language]);

  if (path === '/about-us') {
    return <AboutUs />;
  }

  const data = pages[path];

  if (!data) {
    return (
      <div className="min-h-[60vh] bg-[#FAF7F2] flex flex-col items-center justify-center px-6 text-center gap-6">
        <h2 className="text-2xl font-bold text-[#1F1D1B]" style={serif}>
          {pick(language, 'পেজ পাওয়া যায়নি', 'Page Not Found')}
        </h2>
        <Link to="/" className={`${btnBase} bg-[#B3122B] text-[#FAF7F2]`}>
          <ArrowLeft size={16} strokeWidth={1.75} />
          {pick(language, 'হোমে ফিরুন', 'Back to home')}
        </Link>
      </div>
    );
  }

  return (
    <EditorialShell title={data.title} intro={data.intro} maxWidth={data.maxWidth || 'max-w-[720px]'}>
      {data.body}
    </EditorialShell>
  );
}
