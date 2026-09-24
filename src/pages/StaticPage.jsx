import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, MapPin, Phone, Mail, FileText, HelpCircle, Shield, RefreshCw,
  Info, ShoppingBag, MessageCircle, Clock, Truck, Ruler, Store
} from 'lucide-react';

const Card = ({ children, className = '' }) => (
  <div className={`rounded-2xl border border-zinc-200 bg-zinc-50/80 p-5 ${className}`}>{children}</div>
);

const pageData = {
  '/about-us': {
    title: 'আমাদের সম্পর্কে (About Us)',
    icon: <Info className="w-7 h-7 text-[#ce112d]" />,
    content: (
      <div className="space-y-5 text-sm text-zinc-600 leading-relaxed">
        <p>
          চট্টগ্রামের মীরসরাই, বারইয়ারহাটের <strong className="text-zinc-900">জমিদার প্লাজা (২য় তলা)</strong>-এ অবস্থিত{' '}
          <strong className="text-zinc-900">Big Bazar</strong> — পুরো পরিবারের ফিক্সড-প্রাইস ফ্যাশন শপ।
          ৬৫,০০০+ সোশ্যাল ফলোয়ারের আস্থায় শাড়ি থেকে থান কাপড়, জায়নামাজ পর্যন্ত এক ছাদের নিচে।
        </p>

        <Card className="border-rose-200 bg-gradient-to-br from-rose-50 to-red-50/60">
          <div className="flex items-center gap-2 text-[#ce112d] mb-2">
            <ShoppingBag size={18} />
            <h4 className="font-bold text-sm md:text-base">সিগনেচার: বিয়ের সাজনি</h4>
          </div>
          <p className="text-xs md:text-sm text-zinc-700">
            কনের জামদানি, কাতান, জর্জেট, স্টোন ওয়ার্ক শাড়ি, পার্টি ড্রেস, সারারা ও গারারা —
            বরের শেরওয়ানি, পাঞ্জাবি ও ফর্মাল পোশাকের এক্সক্লুসিভ কালেকশন।
          </p>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Card>
            <h5 className="font-bold text-[#ce112d] text-sm mb-1.5">লেডিস ও কিডস</h5>
            <p className="text-xs md:text-sm">বোরকা, আবায়া, হিজাব; ১–৫ ও ৫–১৫ বছরের ছেলে-মেয়ের আলাদা সেকশন।</p>
          </Card>
          <Card>
            <h5 className="font-bold text-[#ce112d] text-sm mb-1.5">জেন্টস ও হোম</h5>
            <p className="text-xs md:text-sm">টি-শার্ট, পোলো, শার্ট, শর্টস; বেডশিট, পর্দা, মশারি ও গজ কাপড়।</p>
          </Card>
        </div>

        <div className="rounded-2xl bg-zinc-900 text-white p-5 space-y-1.5">
          <h4 className="text-[#ce112d] font-bold text-xs uppercase tracking-wider">মীরসরাই বিশেষ</h4>
          <p className="text-zinc-300 text-xs md:text-sm">
            অনলাইন অর্ডারে মীরসরাই উপজেলায় <strong className="text-white">ফ্রি হোম ডেলিভারি</strong>।
            সারা দেশে ক্যাশ অন ডেলিভারি উপলব্ধ।
          </p>
        </div>
      </div>
    ),
  },

  '/contact-us': {
    title: 'যোগাযোগ (Contact Us)',
    icon: <Phone className="w-7 h-7 text-[#ce112d]" />,
    content: (
      <div className="space-y-5 text-sm text-zinc-600 leading-relaxed">
        <p>অর্ডার, স্টক বা সাইজ সংক্রান্ত যেকোনো সহায়তার জন্য সরাসরি যোগাযোগ করুন।</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { icon: Phone, label: 'হেল্পলাইন', value: '01857045449', href: 'tel:01857045449', color: 'text-[#ce112d]' },
            { icon: MessageCircle, label: 'WhatsApp', value: '01824950082', href: 'https://wa.me/8801824950082', color: 'text-emerald-600' },
            { icon: Mail, label: 'ইমেইল', value: 'infobigbazar01@gmail.com', href: 'mailto:infobigbazar01@gmail.com', color: 'text-[#ce112d]' },
            { icon: Clock, label: 'সময়', value: 'প্রতিদিন সকাল ৯:০০ – রাত ৯:০০', href: null, color: 'text-zinc-700' },
          ].map((item) => {
            const Icon = item.icon;
            const inner = (
              <>
                <div className={`w-10 h-10 rounded-xl bg-white border border-zinc-200 flex items-center justify-center ${item.color}`}>
                  <Icon size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">{item.label}</p>
                  <p className="text-sm font-semibold text-zinc-900 truncate">{item.value}</p>
                </div>
              </>
            );
            return item.href ? (
              <a key={item.label} href={item.href} target={item.href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4 hover:border-[#ce112d]/30 transition-colors">
                {inner}
              </a>
            ) : (
              <div key={item.label} className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4">
                {inner}
              </div>
            );
          })}
        </div>
        <Card>
          <div className="flex items-start gap-3">
            <MapPin className="text-[#ce112d] shrink-0 mt-0.5" size={18} />
            <div>
              <p className="font-bold text-zinc-900 text-sm mb-1">শোরুম</p>
              <p className="text-xs md:text-sm">২য় তলা, জমিদার প্লাজা, বারইয়ারহাট পৌরসভা, মীরসরাই, চট্টগ্রাম</p>
            </div>
          </div>
        </Card>
      </div>
    ),
  },

  '/faq': {
    title: 'সাধারণ প্রশ্ন (FAQs)',
    icon: <HelpCircle className="w-7 h-7 text-[#ce112d]" />,
    content: (
      <div className="space-y-3">
        {[
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
        ].map((item, idx) => (
          <Card key={idx}>
            <h4 className="font-bold text-zinc-900 text-sm mb-1.5">
              <span className="text-[#ce112d] mr-1.5">প্রশ্ন:</span>{item.q}
            </h4>
            <p className="text-xs md:text-sm text-zinc-600 leading-relaxed">
              <span className="font-semibold text-zinc-800">উত্তর:</span> {item.a}
            </p>
          </Card>
        ))}
      </div>
    ),
  },

  '/size-guide': {
    title: 'সাইজ গাইড (Size Guide)',
    icon: <Ruler className="w-7 h-7 text-[#ce112d]" />,
    content: (
      <div className="space-y-5 text-sm text-zinc-600 leading-relaxed">
        <p>সঠিক সাইজ বেছে নিতে এই চার্ট ব্যবহার করুন। প্রোডাক্ট পেজে আলাদা সাইজ থাকলে সেটাই প্রাধান্য পাবে।</p>
        <div className="overflow-x-auto rounded-2xl border border-zinc-200">
          <table className="w-full text-center text-xs md:text-sm">
            <thead>
              <tr className="bg-[#ce112d]/5 text-[#ce112d] font-bold">
                <th className="py-3 px-3">Size</th>
                <th className="py-3 px-3">Chest</th>
                <th className="py-3 px-3">Length</th>
                <th className="py-3 px-3">Fit</th>
              </tr>
            </thead>
            <tbody className="text-zinc-700">
              {[
                ['S', '36"–38"', '26"', 'Regular'],
                ['M', '38"–40"', '27"', 'Regular'],
                ['L', '40"–42"', '28"', 'Regular'],
                ['XL', '42"–44"', '29"', 'Regular'],
                ['FREE', '34"–44"', 'Flexible', 'Universal'],
              ].map((row, i) => (
                <tr key={row[0]} className={i % 2 === 0 ? 'bg-white' : 'bg-zinc-50'}>
                  {row.map((cell) => (
                    <td key={cell} className="py-2.5 px-3 font-medium">{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Card>
          <p className="text-xs md:text-sm">
            কাস্টম মাপ বা সন্দেহ হলে WhatsApp-এ ছবি পাঠান:{' '}
            <a href="https://wa.me/8801824950082" target="_blank" rel="noopener noreferrer" className="text-emerald-600 font-semibold hover:underline">
              01824950082
            </a>
          </p>
        </Card>
      </div>
    ),
  },

  '/shipping': {
    title: 'শিপিং তথ্য (Shipping)',
    icon: <Truck className="w-7 h-7 text-[#ce112d]" />,
    content: (
      <div className="space-y-5 text-sm text-zinc-600 leading-relaxed">
        <p>বিশ্বস্ত কুরিয়ার দিয়ে সারা বাংলাদেশে হোম ডেলিভারি। অর্ডার কনফার্ম হলে ট্র্যাকিং আপডেট জানানো হয়।</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Card className="border-emerald-200 bg-emerald-50/50">
            <h4 className="font-bold text-emerald-800 text-sm mb-1.5">মীরসরাই</h4>
            <p className="text-xs md:text-sm text-emerald-900/80">
              <strong>ফ্রি ডেলিভারি</strong> · কনফার্মেশন ফি ৳১০০ অগ্রিম (মোট বিল থেকে বাদ) · ১–২ দিন
            </p>
          </Card>
          <Card>
            <h4 className="font-bold text-zinc-900 text-sm mb-1.5">চট্টগ্রাম জেলা</h4>
            <p className="text-xs md:text-sm">ডেলিভারি ৳১০০ · সাধারণত ১–২ কার্যদিবস</p>
          </Card>
          <Card>
            <h4 className="font-bold text-zinc-900 text-sm mb-1.5">সারা দেশ</h4>
            <p className="text-xs md:text-sm">ডেলিভারি ৳১৫০ · সাধারণত ২–৫ কার্যদিবস</p>
          </Card>
        </div>
        <Card>
          <p className="text-xs md:text-sm">
            ভারী পার্সেলে চার্জ বাড়তে পারে — কনফার্মেশনের আগে জানিয়ে দেওয়া হবে।
            COD ও অগ্রিম বিকাশ/QR দুটোই চলবে।
          </p>
        </Card>
      </div>
    ),
  },

  '/returns': {
    title: 'রিটার্ন ও এক্সচেঞ্জ',
    icon: <RefreshCw className="w-7 h-7 text-[#ce112d]" />,
    content: (
      <div className="space-y-5 text-sm text-zinc-600 leading-relaxed">
        <p>মানসম্মত পণ্য পাওয়ার নিশ্চয়তা আমাদের অঙ্গীকার। সমস্যা হলে দ্রুত সমাধান করি।</p>
        <div className="grid gap-3">
          <Card>
            <h4 className="font-bold text-zinc-900 text-sm mb-2">শর্তাবলী</h4>
            <ul className="list-disc list-inside text-xs md:text-sm space-y-1.5">
              <li>পণ্য হাতে পাওয়ার <strong>২৪ ঘণ্টার</strong> মধ্যে WhatsApp/কলে জানান</li>
              <li>অব্যবহৃত পণ্য + ট্যাগ + প্যাকেজিং অক্ষত থাকতে হবে</li>
              <li>ডেলিভারিতে দৃশ্যমান ড্যামেজ হলে ম্যানের কাছেই ফেরত দিতে পারবেন</li>
            </ul>
          </Card>
          <Card className="border-rose-200 bg-rose-50/40">
            <h4 className="font-bold text-[#ce112d] text-sm mb-1.5">যোগাযোগ</h4>
            <p className="text-xs md:text-sm">
              WhatsApp{' '}
              <a href="https://wa.me/8801824950082" className="font-semibold text-emerald-700 hover:underline" target="_blank" rel="noopener noreferrer">
                01824950082
              </a>
              {' '}বা কল{' '}
              <a href="tel:01857045449" className="font-semibold text-[#ce112d] hover:underline">01857045449</a>
              — অর্ডার আইডি ও ছবি পাঠান।
            </p>
          </Card>
        </div>
      </div>
    ),
  },

  '/store-locations': {
    title: 'শোরুম লোকেশন',
    icon: <Store className="w-7 h-7 text-[#ce112d]" />,
    content: (
      <div className="space-y-5 text-sm text-zinc-600 leading-relaxed">
        <p>সরাসরি এসে কাপড় দেখে কিনতে পারেন — অনলাইন ও অফলাইন একই ব্র্যান্ড অভিজ্ঞতা।</p>
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-3">
            <ShoppingBag className="text-[#ce112d]" size={18} />
            <h4 className="font-bold text-zinc-900 text-base">Big Bazar · বারইয়ারহাট</h4>
          </div>
          <p className="text-xs md:text-sm font-medium text-zinc-700 mb-4">
            জমিদার প্লাজা, ২য় তলা · বারইয়ারহাট পৌরসভা · মীরসরাই · চট্টগ্রাম
          </p>
          <div className="flex flex-wrap gap-3 text-xs">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-zinc-200">
              <Clock size={13} className="text-[#ce112d]" /> সকাল ৯:০০ – রাত ৯:০০
            </span>
            <a href="tel:01857045449" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-zinc-200 hover:border-[#ce112d]/40">
              <Phone size={13} className="text-[#ce112d]" /> 01857045449
            </a>
            <a href="https://maps.google.com/?q=Baraiyarhat+Mirsharai+Chittagong" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#ce112d] text-white font-semibold">
              <MapPin size={13} /> Maps-এ খুলুন
            </a>
          </div>
        </Card>
      </div>
    ),
  },

  '/privacy-policy': {
    title: 'গোপনীয়তা নীতি (Privacy Policy)',
    icon: <Shield className="w-7 h-7 text-[#ce112d]" />,
    content: (
      <div className="space-y-5 text-sm text-zinc-600 leading-relaxed">
        <p>
          Big Bazar (<strong className="text-zinc-900">onlinebigbazar.com</strong>) আপনার ব্যক্তিগত তথ্যের গোপনীয়তাকে গুরুত্ব দেয়।
        </p>
        <div className="space-y-3">
          <Card>
            <h4 className="font-bold text-zinc-900 text-sm mb-2">১. কী সংগ্রহ করি</h4>
            <ul className="list-disc list-inside space-y-1.5 text-xs md:text-sm">
              <li>নাম, মোবাইল, ডেলিভারি ঠিকানা</li>
              <li>অ্যাকাউন্ট থাকলে ইমেইল / Google সাইন-ইন</li>
              <li>পেমেন্ট রেফারেন্স — কার্ড তথ্য সংরক্ষণ করি না</li>
              <li>পেজ ভিউ অ্যানালিটিক্স</li>
            </ul>
          </Card>
          <Card>
            <h4 className="font-bold text-zinc-900 text-sm mb-2">২. কীভাবে ব্যবহার</h4>
            <p className="text-xs md:text-sm">অর্ডার ডেলিভারি, সাপোর্ট ও সার্ভিস উন্নতিতে। ফোন নম্বর তৃতীয় পক্ষের কাছে বিক্রি হয় না।</p>
          </Card>
          <Card>
            <h4 className="font-bold text-zinc-900 text-sm mb-2">৩. অধিকার</h4>
            <p className="text-xs md:text-sm">
              সংশোধন/মুছে ফেলার অনুরোধ:{' '}
              <a href="tel:01857045449" className="text-[#ce112d] font-semibold">01857045449</a>
              {' '}বা{' '}
              <a href="mailto:infobigbazar01@gmail.com" className="text-[#ce112d] font-semibold">infobigbazar01@gmail.com</a>
            </p>
          </Card>
        </div>
      </div>
    ),
  },

  '/terms': {
    title: 'সেবার শর্তাবলী (Terms)',
    icon: <FileText className="w-7 h-7 text-[#ce112d]" />,
    content: (
      <div className="space-y-5 text-sm text-zinc-600 leading-relaxed">
        <p>onlinebigbazar.com ব্যবহার করে আপনি নিচের শর্তে সম্মত।</p>
        <ol className="space-y-2.5 list-decimal list-inside text-xs md:text-sm">
          <li><strong className="text-zinc-900">সঠিক তথ্য:</strong> নাম, ফোন ও ঠিকানা সঠিক হতে হবে।</li>
          <li><strong className="text-zinc-900">মূল্য ও স্টক:</strong> পরিবর্তন হতে পারে; স্টক শেষ হলে বিকল্প/রিফান্ড।</li>
          <li><strong className="text-zinc-900">ছবি:</strong> আলোর কারণে রঙ ১০–২০% ভিন্ন দেখাতে পারে।</li>
          <li><strong className="text-zinc-900">পেমেন্ট:</strong> COD, বিকাশ অগ্রিম, Bangla QR — অ্যাডমিন ভেরিফাই করে।</li>
          <li><strong className="text-zinc-900">আচরণ:</strong> ভুয়া অর্ডার/হয়রানিতে অর্ডার বাতিলের অধিকার সংরক্ষিত।</li>
        </ol>
      </div>
    ),
  },

  '/refund': {
    title: 'রিফান্ড পলিসি (Refund)',
    icon: <RefreshCw className="w-7 h-7 text-[#ce112d]" />,
    content: (
      <div className="space-y-5 text-sm text-zinc-600 leading-relaxed">
        <p>নিচের ক্ষেত্রে সম্পূর্ণ বা আংশিক রিফান্ড দেওয়া হয়:</p>
        <div className="grid gap-3">
          <Card className="border-emerald-200 bg-emerald-50/50">
            <h4 className="font-bold text-emerald-800 text-sm mb-2">রিফান্ড পাবেন যখন</h4>
            <ul className="list-disc list-inside text-xs md:text-sm space-y-1.5 text-emerald-900/80">
              <li>স্টক না থাকায় অর্ডার ক্যান্সেল</li>
              <li>মিসিং/মারাত্মক ড্যামেজ এবং এক্সচেঞ্জ সম্ভব নয়</li>
              <li>ভুল পণ্য এবং রিপ্লেসমেন্ট সম্ভব নয়</li>
            </ul>
          </Card>
          <Card>
            <h4 className="font-bold text-zinc-900 text-sm mb-2">প্রক্রিয়া</h4>
            <p className="text-xs md:text-sm">
              জানান → যাচাই → সাধারণত <strong>৩–৫ কার্যদিবস</strong>-এ বিকাশ/নগদ/ব্যাংকে ফেরত।
            </p>
          </Card>
        </div>
      </div>
    ),
  },
};

export default function StaticPage({ path }) {
  const data = pageData[path];

  if (!data) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-20 text-center space-y-6 bg-white rounded-3xl border border-zinc-100 shadow-sm mt-8">
        <h2 className="text-2xl font-semibold text-zinc-700">Page Not Found</h2>
        <Link to="/" className="inline-flex items-center gap-2 bg-[#ce112d] text-white px-6 py-3 rounded-2xl text-xs font-bold uppercase tracking-wider hover:brightness-110 transition-all">
          <ArrowLeft size={16} /> Home
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] py-10 md:py-16 px-4 md:px-6 bg-gradient-to-b from-zinc-50 to-white font-sans text-zinc-900">
      <div className="max-w-3xl mx-auto space-y-8">
        <Link to="/" className="inline-flex items-center gap-2 text-zinc-500 hover:text-zinc-900 font-semibold tracking-wide text-[11px] transition-colors">
          <ArrowLeft size={14} /> হোমে ফিরুন
        </Link>

        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center border border-zinc-200 shadow-sm shrink-0">
            {data.icon}
          </div>
          <div className="min-w-0 pt-1">
            <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-zinc-900">{data.title}</h1>
            <p className="text-zinc-400 text-[11px] font-medium mt-1">Big Bazar · Baraiyarhat</p>
          </div>
        </div>

        <div className="bg-white border border-zinc-200/90 rounded-3xl p-6 md:p-10 shadow-sm">
          {data.content}
        </div>
      </div>
    </div>
  );
}
