import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, MapPin, Phone, Mail, MessageCircle, Clock,
} from 'lucide-react';
import AboutUs from './AboutUs';
import EditorialShell, {
  STORE, Reveal, Divider, SectionBlock, btnBase, serif,
} from '../components/EditorialShell';

const FAQ_ITEMS = [
  {
    q: 'শোরুম কোথায়?',
    a: 'মীরসরাই, বারইয়ারহাট — জমিদার প্লাজার ২য় তলা। প্রতিদিন সকাল ৯:০০ থেকে রাত ৯:০০ খোলা।',
  },
  {
    q: 'মীরসরাইতে ডেলিভারি ফ্রি?',
    a: 'হ্যাঁ। অনলাইন অর্ডারে মীরসরাই উপজেলায় ফ্রি হোম ডেলিভারি (কনফার্মেশন ফি অগ্রিম প্রযোজ্য, যা মোট বিল থেকে সমন্বয় হয়)।',
  },
  {
    q: 'ডেলিভারি চার্জ কত?',
    a: 'মীরসরাই: ফ্রি · চট্টগ্রাম জেলা: ৳১০০ (১–২ দিন) · দেশের অন্যান্য: ৳১৫০ (২–৫ দিন)। ওজন বেশি হলে আগে জানানো হবে।',
  },
  {
    q: 'কীভাবে অর্ডার করব?',
    a: 'পণ্যে সাইজ/কালার বেছে “অর্ডার করুন” চাপুন → নাম, মোবাইল, ঠিকানা দিন → কনফার্ম। লগইন ছাড়াই অর্ডার করা যায়।',
  },
  {
    q: 'বিয়ের সাজনি কী?',
    a: 'বিয়ের সাজনি আমাদের ওয়েডিং সেকশন — কনের শাড়ি/পার্টি ওয়্যার এবং বরের শেরওয়ানি-পাঞ্জাবি কালেকশন।',
  },
  {
    q: 'পেমেন্ট কীভাবে?',
    a: 'ক্যাশ অন ডেলিভারি, বিকাশ অগ্রিম, বা Bangla QR। সম্পূর্ণ পেমেন্ট অ্যাডমিন ভেরিফাই করে।',
  },
];

const SIZE_ROWS = [
  ['S', '36"–38"', '26"', 'Regular'],
  ['M', '38"–40"', '27"', 'Regular'],
  ['L', '40"–42"', '28"', 'Regular'],
  ['XL', '42"–44"', '29"', 'Regular'],
  ['FREE', '34"–44"', 'Flexible', 'Universal'],
];

const pages = {
  '/contact-us': {
    title: 'যোগাযোগ',
    intro: 'অর্ডার, স্টক বা সাইজ সংক্রান্ত যেকোনো সহায়তার জন্য সরাসরি যোগাযোগ করুন।',
    body: (
      <>
        <Reveal>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-8">
            {[
              { icon: Phone, label: 'হেল্পলাইন', value: STORE.helpline, href: STORE.helplineTel },
              { icon: MessageCircle, label: 'WhatsApp', value: STORE.whatsapp, href: STORE.whatsappUrl },
              { icon: Mail, label: 'ইমেইল', value: STORE.email, href: `mailto:${STORE.email}` },
              { icon: Clock, label: 'সময়', value: STORE.hours, href: null },
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

        <SectionBlock title="শোরুম">
          <p className="flex items-start gap-2">
            <MapPin size={18} strokeWidth={1.75} className="text-[#B3122B] shrink-0 mt-1" />
            {STORE.address}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <a href={STORE.mapsUrl} target="_blank" rel="noopener noreferrer" className={`${btnBase} bg-[#B3122B] text-[#FAF7F2] hover:bg-[#961022]`}>
              <MapPin size={18} strokeWidth={1.75} />
              Google Maps-এ দেখুন
            </a>
            <a href={STORE.whatsappUrl} target="_blank" rel="noopener noreferrer" className={`${btnBase} border border-[#1F1D1B]/20 hover:border-[#1F1D1B]/45`}>
              <MessageCircle size={18} strokeWidth={1.75} />
              WhatsApp-এ মেসেজ
            </a>
          </div>
        </SectionBlock>
      </>
    ),
  },

  '/faq': {
    title: 'সাধারণ প্রশ্ন',
    intro: 'অর্ডার, ডেলিভারি ও শোরুম নিয়ে যে প্রশ্নগুলো সবচেয়ে বেশি আসে।',
    maxWidth: 'max-w-[720px]',
    body: (
      <div className="space-y-0 divide-y divide-[#1F1D1B]/12">
        {FAQ_ITEMS.map((item) => (
          <Reveal key={item.q}>
            <div className="py-7 md:py-8 first:pt-0">
              <h2 className="text-lg md:text-xl font-bold text-[#1F1D1B] mb-2.5 leading-snug" style={serif}>
                {item.q}
              </h2>
              <p className="text-[16px] md:text-[17px] leading-[1.75] text-[#3D3A36]">{item.a}</p>
              {item.q.includes('শোরুম') && (
                <a
                  href={STORE.mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 mt-3 text-[15px] font-semibold text-[#B3122B] hover:underline min-h-[44px]"
                >
                  <MapPin size={16} strokeWidth={1.75} />
                  Google Maps-এ দেখুন
                </a>
              )}
            </div>
          </Reveal>
        ))}
      </div>
    ),
  },

  '/size-guide': {
    title: 'সাইজ গাইড',
    intro: 'সঠিক সাইজ বেছে নিতে এই চার্ট ব্যবহার করুন। প্রোডাক্ট পেজে আলাদা সাইজ থাকলে সেটাই প্রাধান্য পাবে।',
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
                      <td key={cell} className="py-3.5 px-3 font-medium">{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Reveal>

        <SectionBlock title="সন্দেহ হলে">
          <p>কাস্টম মাপ বা সন্দেহ হলে WhatsApp-এ ছবি পাঠান — আমরা গাইড করব।</p>
          <a href={STORE.whatsappUrl} target="_blank" rel="noopener noreferrer" className={`${btnBase} bg-[#B3122B] text-[#FAF7F2] hover:bg-[#961022] mt-2`}>
            <MessageCircle size={18} strokeWidth={1.75} />
            WhatsApp · {STORE.whatsapp}
          </a>
        </SectionBlock>
      </>
    ),
  },

  '/shipping': {
    title: 'শিপিং তথ্য',
    intro: 'বিশ্বস্ত কুরিয়ার দিয়ে সারা বাংলাদেশে হোম ডেলিভারি। অর্ডার কনফার্ম হলে ট্র্যাকিং আপডেট জানানো হয়।',
    body: (
      <>
        <Reveal>
          <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[#1F1D1B]/12 border-y border-[#1F1D1B]/12">
            {[
              { title: 'মীরসরাই', desc: 'ফ্রি ডেলিভারি · কনফার্মেশন ফি ৳১০০ অগ্রিম (মোট বিল থেকে বাদ) · ১–২ দিন' },
              { title: 'চট্টগ্রাম জেলা', desc: 'ডেলিভারি ৳১০০ · সাধারণত ১–২ কার্যদিবস' },
              { title: 'সারা দেশ', desc: 'ডেলিভারি ৳১৫০ · সাধারণত ২–৫ কার্যদিবস' },
            ].map((z) => (
              <div key={z.title} className="py-8 sm:py-10 px-2 sm:px-6 text-center sm:text-left">
                <p className="text-xl font-bold text-[#1F1D1B] mb-2" style={serif}>{z.title}</p>
                <p className="text-[15px] md:text-[16px] leading-[1.7] text-[#3D3A36]">{z.desc}</p>
              </div>
            ))}
          </div>
        </Reveal>

        <SectionBlock title="নোট">
          <p>
            ভারী পার্সেলে চার্জ বাড়তে পারে — কনফার্মেশনের আগে জানিয়ে দেওয়া হবে।
            COD ও অগ্রিম বিকাশ/QR দুটোই চলবে।
          </p>
        </SectionBlock>
      </>
    ),
  },

  '/returns': {
    title: 'রিটার্ন ও এক্সচেঞ্জ',
    intro: 'মানসম্মত পণ্য পাওয়ার নিশ্চয়তা আমাদের অঙ্গীকার। সমস্যা হলে দ্রুত সমাধান করি।',
    body: (
      <>
        <SectionBlock title="শর্তাবলী">
          <ul className="space-y-3 list-none">
            {[
              'পণ্য হাতে পাওয়ার ২৪ ঘণ্টার মধ্যে WhatsApp/কলে জানান',
              'অব্যবহৃত পণ্য + ট্যাগ + প্যাকেজিং অক্ষত থাকতে হবে',
              'ডেলিভারিতে দৃশ্যমান ড্যামেজ হলে ম্যানের কাছেই ফেরত দিতে পারবেন',
            ].map((li) => (
              <li key={li} className="flex gap-3">
                <span className="mt-2.5 w-1.5 h-1.5 rounded-full bg-[#B3122B] shrink-0" aria-hidden />
                <span>{li}</span>
              </li>
            ))}
          </ul>
        </SectionBlock>

        <Divider />

        <SectionBlock label="সাপোর্ট" title="যোগাযোগ">
          <p>অর্ডার আইডি ও ছবি পাঠান — আমরা দ্রুত দেখে নেব।</p>
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <a href={STORE.whatsappUrl} target="_blank" rel="noopener noreferrer" className={`${btnBase} bg-[#B3122B] text-[#FAF7F2] hover:bg-[#961022]`}>
              <MessageCircle size={18} strokeWidth={1.75} />
              WhatsApp · {STORE.whatsapp}
            </a>
            <a href={STORE.helplineTel} className={`${btnBase} border border-[#1F1D1B]/20 hover:border-[#1F1D1B]/45`}>
              <Phone size={18} strokeWidth={1.75} />
              কল · {STORE.helpline}
            </a>
          </div>
        </SectionBlock>
      </>
    ),
  },

  '/store-locations': {
    title: 'শোরুম লোকেশন',
    intro: 'সরাসরি এসে কাপড় দেখে কিনতে পারেন — অনলাইন ও অফলাইন একই ব্র্যান্ড অভিজ্ঞতা।',
    body: (
      <>
        <Reveal>
          <p className="text-[12px] font-bold uppercase tracking-[0.18em] text-[#B3122B] mb-3">একমাত্র শোরুম</p>
          <h2 className="text-2xl md:text-3xl font-bold text-[#1F1D1B] mb-4" style={serif}>
            Big Bazar · বারইয়ারহাট
          </h2>
          <p className="text-[16px] md:text-[17px] leading-[1.75] text-[#3D3A36] mb-2 flex items-start gap-2">
            <MapPin size={18} strokeWidth={1.75} className="text-[#B3122B] shrink-0 mt-1" />
            {STORE.address}
          </p>
          <p className="text-[16px] text-[#5C574F] mb-8 flex items-center gap-2 pl-7">
            <Clock size={16} strokeWidth={1.75} className="text-[#B3122B]" />
            {STORE.hours}
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <a href={STORE.mapsUrl} target="_blank" rel="noopener noreferrer" className={`${btnBase} bg-[#B3122B] text-[#FAF7F2] hover:bg-[#961022]`}>
              <MapPin size={18} strokeWidth={1.75} />
              Maps-এ খুলুন
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
    title: 'গোপনীয়তা নীতি',
    intro: 'Big Bazar (onlinebigbazar.com) আপনার ব্যক্তিগত তথ্যের গোপনীয়তাকে গুরুত্ব দেয়।',
    body: (
      <>
        <SectionBlock label="০১" title="কী সংগ্রহ করি">
          <ul className="space-y-2.5">
            {[
              'নাম, মোবাইল, ডেলিভারি ঠিকানা',
              'অ্যাকাউন্ট থাকলে ইমেইল / Google সাইন-ইন',
              'পেমেন্ট রেফারেন্স — কার্ড তথ্য সংরক্ষণ করি না',
              'পেজ ভিউ অ্যানালিটিক্স',
            ].map((li) => (
              <li key={li} className="flex gap-3">
                <span className="mt-2.5 w-1.5 h-1.5 rounded-full bg-[#B3122B] shrink-0" aria-hidden />
                <span>{li}</span>
              </li>
            ))}
          </ul>
        </SectionBlock>
        <Divider />
        <SectionBlock label="০২" title="কীভাবে ব্যবহার">
          <p>অর্ডার ডেলিভারি, সাপোর্ট ও সার্ভিস উন্নতিতে। ফোন নম্বর তৃতীয় পক্ষের কাছে বিক্রি হয় না।</p>
        </SectionBlock>
        <Divider />
        <SectionBlock label="০৩" title="অধিকার">
          <p>
            সংশোধন/মুছে ফেলার অনুরোধ:{' '}
            <a href={STORE.helplineTel} className="font-semibold text-[#B3122B] hover:underline">{STORE.helpline}</a>
            {' '}বা{' '}
            <a href={`mailto:${STORE.email}`} className="font-semibold text-[#B3122B] hover:underline">{STORE.email}</a>
          </p>
        </SectionBlock>
      </>
    ),
  },

  '/terms': {
    title: 'সেবার শর্তাবলী',
    intro: 'onlinebigbazar.com ব্যবহার করে আপনি নিচের শর্তে সম্মত।',
    body: (
      <div className="space-y-0 divide-y divide-[#1F1D1B]/12">
        {[
          { t: 'সঠিক তথ্য', d: 'নাম, ফোন ও ঠিকানা সঠিক হতে হবে।' },
          { t: 'মূল্য ও স্টক', d: 'পরিবর্তন হতে পারে; স্টক শেষ হলে বিকল্প/রিফান্ড।' },
          { t: 'ছবি', d: 'আলোর কারণে রঙ ১০–২০% ভিন্ন দেখাতে পারে।' },
          { t: 'পেমেন্ট', d: 'COD, বিকাশ অগ্রিম, Bangla QR — অ্যাডমিন ভেরিফাই করে।' },
          { t: 'আচরণ', d: 'ভুয়া অর্ডার/হয়রানিতে অর্ডার বাতিলের অধিকার সংরক্ষিত।' },
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
    title: 'রিফান্ড পলিসি',
    intro: 'নিচের ক্ষেত্রে সম্পূর্ণ বা আংশিক রিফান্ড দেওয়া হয়।',
    body: (
      <>
        <SectionBlock label="রিফান্ড" title="পাবেন যখন">
          <ul className="space-y-3">
            {[
              'স্টক না থাকায় অর্ডার ক্যান্সেল',
              'মিসিং/মারাত্মক ড্যামেজ এবং এক্সচেঞ্জ সম্ভব নয়',
              'ভুল পণ্য এবং রিপ্লেসমেন্ট সম্ভব নয়',
            ].map((li) => (
              <li key={li} className="flex gap-3">
                <span className="mt-2.5 w-1.5 h-1.5 rounded-full bg-[#B3122B] shrink-0" aria-hidden />
                <span>{li}</span>
              </li>
            ))}
          </ul>
        </SectionBlock>
        <Divider />
        <SectionBlock title="প্রক্রিয়া">
          <p>
            জানান → যাচাই → সাধারণত <strong className="text-[#1F1D1B]">৩–৫ কার্যদিবস</strong>-এ বিকাশ/নগদ/ব্যাংকে ফেরত।
          </p>
          <a href={STORE.whatsappUrl} target="_blank" rel="noopener noreferrer" className={`${btnBase} bg-[#B3122B] text-[#FAF7F2] hover:bg-[#961022] mt-2`}>
            <MessageCircle size={18} strokeWidth={1.75} />
            WhatsApp-এ জানান
          </a>
        </SectionBlock>
      </>
    ),
  },
};

export default function StaticPage({ path }) {
  if (path === '/about-us') {
    return <AboutUs />;
  }

  const data = pages[path];

  if (!data) {
    return (
      <div className="min-h-[60vh] bg-[#FAF7F2] flex flex-col items-center justify-center px-6 text-center gap-6">
        <h2 className="text-2xl font-bold text-[#1F1D1B]" style={serif}>Page Not Found</h2>
        <Link to="/" className={`${btnBase} bg-[#B3122B] text-[#FAF7F2]`}>
          <ArrowLeft size={16} strokeWidth={1.75} /> হোমে ফিরুন
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
