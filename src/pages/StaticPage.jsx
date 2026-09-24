import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, MapPin, Phone, Mail, FileText, HelpCircle, Shield, RefreshCw, Info, ShoppingBag, MessageCircle, Clock } from 'lucide-react';

const pageData = {
  '/about-us': {
    title: 'আমাদের সম্পর্কে (About Us)',
    icon: <Info className="w-8 h-8 text-[#ce112d]" />,
    content: (
      <div className="space-y-6">
        <p className="text-zinc-700 leading-relaxed text-sm md:text-base font-medium">
          চট্টগ্রাম জেলার মীরসরাই উপজেলার বারইয়ারহাট পৌরসভার জমিরদার প্লাজার ২য় তলায় অবস্থিত <strong className="text-zinc-900 font-bold">Big Bazar</strong> পুরো পরিবারের কেনাকাটার জন্য অত্র অঞ্চলের সবচেয়ে বিশ্বস্ত ও জনপ্রিয় ফিক্সড প্রাইস রিটেইল শপ। ৬৫,০০০-এরও বেশি সোশ্যাল মিডিয়া ফলোয়ারের আস্থা অর্জিত এই প্রতিষ্ঠানে পরিবারের প্রতিটি মানুষের প্রয়োজনীয় পোশাক—এমনকি কাপড়ের থান, গজ কাপড় ও জায়নামাজ পর্যন্ত এক ছাদের নিচে পাওয়া যায়।
        </p>

        {/* Biyer Sajani Signature Section */}
        <div className="p-6 bg-gradient-to-br from-rose-50 to-red-50 border border-rose-200/80 rounded-3xl space-y-3 shadow-sm">
          <div className="flex items-center gap-2 text-[#ce112d]">
            <ShoppingBag size={20} />
            <h4 className="font-bold text-base md:text-lg">সিগনেচার ওয়েডিং সেকশন: "বিয়ের সাজনি" (Biyer Sajani)</h4>
          </div>
          <p className="text-zinc-650 text-xs md:text-sm leading-relaxed">
            Big Bazar-এর প্রধানতম আকর্ষণ হলো এক্সক্লুসিভ ওয়েডিং কালেকশন <strong>"বিয়ের সাজনি"</strong>। কনের জন্য বর্তমানে সবচেয়ে জনপ্রিয় কারচুপি জামদানি, ঢাকাই জামদানি, বিলাসবহুল কাতান, জর্জ্রেট, হেভি স্টোন ওয়ার্ক, জিমুজি, ডিজিটাল প্রিন্ট শাড়ি এবং পাকিস্তানি ও ইন্ডিয়ান ভাইরালাইজড লং পার্টি ড্রেস, সারারা ও গারারার বিশাল কালেকশন রয়েছে। পাশাপাশি বরের সাজের জন্য শেয়ারওয়ানি, প্রিমিয়াম পাঞ্জাবি, ব্লেজার এবং ফর্মাল-ক্যাজুয়াল পোশাকের সমৃদ্ধ আয়োজন রয়েছে।
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 bg-zinc-50 border border-zinc-200/60 rounded-2xl space-y-2">
            <h5 className="font-bold text-zinc-900 text-xs md:text-sm text-[#ce112d]">কডস ও লেডিস ফ্যাশন</h5>
            <p className="text-zinc-600 text-xs leading-relaxed">
              ছোটদের জন্য ১-৫ বছর এবং ৫-১৫ বছর বয়সী ছেলে ও মেয়েদের আলাদা সেকশন রয়েছে। নারীদের জন্য সব ধরনের বোরকা, আবায়ায়, কুটি বোরকা, হিজাব, নিকাব ও পেটিকোট।
            </p>
          </div>
          <div className="p-5 bg-zinc-50 border border-zinc-200/60 rounded-2xl space-y-2">
            <h5 className="font-bold text-zinc-900 text-xs md:text-sm text-[#ce112d]">জেন্টস ও হোম ডেকোর</h5>
            <p className="text-zinc-600 text-xs leading-relaxed">
              পুরুষদের ড্রপ শোল্ডার টি-শার্ট, পোলো, শার্ট, গাবার্ডিন ও শর্টস। এছাড়া গৃহস্থালির সাজসজ্জার জন্য বেডশিট, পর্দা, মশারি, জায়নামাজ ও গজ কাপড়।
            </p>
          </div>
        </div>

        <div className="p-6 bg-zinc-900 text-white rounded-3xl space-y-2">
          <h4 className="text-[#ce112d] font-bold text-sm uppercase tracking-wider">মীরসরাইবাসীদের জন্য বিশেষ সুবিধা</h4>
          <p className="text-zinc-300 text-xs md:text-sm font-medium">
            অনলাইনে অর্ডার করলে মীরসরাই উপজেলার বাসিন্দারা পাচ্ছেন <strong>১০০% ফ্রি হোম ডেলিভারি (Free Home Delivery)</strong>! এছাড়া সারা বাংলাদেশে ক্যাশ অন ডেলিভারি সুবিধাতো থাকছেই।
          </p>
        </div>
      </div>
    )
  },
  '/contact-us': {
    title: 'যোগাযোগ (Contact Us)',
    icon: <Phone className="w-8 h-8 text-[#ce112d]" />,
    content: (
      <div className="space-y-8">
        <p className="text-zinc-600 leading-relaxed text-sm font-medium">
          যেকোনো অর্ডার সংক্রান্ত তথ্য, প্রোডাক্টের স্টক কিংবা কাস্টমাইজেশন বিষয়ে যেকোনো তথ্যের জন্য সরাসরি আমাদের হেল্পলাইন বা শোরুমে যোগাযোগ করতে পারেন।
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-6 bg-zinc-50 border border-zinc-150 rounded-3xl flex flex-col items-center text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#ce112d]/10 flex items-center justify-center text-[#ce112d]">
              <Phone size={20} />
            </div>
            <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">মোবাইল নম্বর</span>
            <a href="tel:01857045449" className="text-zinc-900 font-bold hover:text-[#ce112d] transition-colors text-sm">01857045449</a>
          </div>

          <div className="p-6 bg-emerald-50/60 border border-emerald-150 rounded-3xl flex flex-col items-center text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
              <MessageCircle size={20} />
            </div>
            <span className="text-[10px] font-black uppercase text-emerald-600 tracking-wider">হোয়াটসঅ্যাপ (WhatsApp)</span>
            <a href="https://wa.me/8801824950082" target="_blank" rel="noopener noreferrer" className="text-zinc-900 font-bold hover:text-emerald-600 transition-colors text-sm">01824950082</a>
          </div>

          <div className="p-6 bg-zinc-50 border border-zinc-150 rounded-3xl flex flex-col items-center text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#ce112d]/10 flex items-center justify-center text-[#ce112d]">
              <Mail size={20} />
            </div>
            <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">ইমেইল ঠিকানা</span>
            <a href="mailto:infobigbazar01@gmail.com" className="text-zinc-900 font-bold hover:text-[#ce112d] transition-colors text-sm">infobigbazar01@gmail.com</a>
          </div>

          <div className="p-6 bg-zinc-50 border border-zinc-150 rounded-3xl flex flex-col items-center text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#ce112d]/10 flex items-center justify-center text-[#ce112d]">
              <MapPin size={20} />
            </div>
            <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">শো-রুম লোকেশন</span>
            <p className="text-zinc-900 font-bold text-xs">২য় তলা, জমিরদার প্লাজা, বারইয়ারহাট পৌরসভা, মীরসরাই, চট্টগ্রাম</p>
          </div>
        </div>
      </div>
    )
  },
  '/faq': {
    title: 'সাধারণ প্রশ্ন ও উত্তর (FAQs)',
    icon: <HelpCircle className="w-8 h-8 text-[#ce112d]" />,
    content: (
      <div className="space-y-6">
        {[
          { q: 'বিগ বাজার বারইয়ারহাট শোরুমের ঠিকানা কোথায়?', a: 'আমাদের শোরুমটি চট্টগ্রাম জেলার মীরসরাই উপজেলার বারইয়ারহাট পৌরসভার জমিরদার প্লাজার ২য় তলায় অবস্থিত।' },
          { q: 'মীরসরাই এলাকায় হোম ডেলিভারি কি ফ্রি?', a: 'হ্যাঁ! মীরসরাই উপজেলার যেকোনো গ্রাহক ওয়েবসাইটে অনলাইন অর্ডার করলে সম্পূর্ণ ফ্রি হোম ডেলিভারি পাবেন।' },
          { q: 'বিগ বাজারের "বিয়ের সাজনি" সেকশনে কী কী পাওয়া যায়?', a: 'বিয়ের সাজনি সেকশনে কনের জন্য কারচুপি জামদানি, কাতান, জর্জ্রেট, সারারা, গারারা এবং বরের জন্য শেরওয়ানি, প্রিমিয়াম পাঞ্জাবি ও ব্লেজারের সম্পূর্ণ ব্রাইডাল সেট পাওয়া যায়।' },
          { q: 'আমি কীভাবে অর্ডার করব?', a: 'পছন্দের প্রোডাক্টের নিচে সরাসরি "অর্ডার করুন" বাটনে ক্লিক করুন। সাইজ ও কালার নির্বাচন করে আপনার নাম, মোবাইল নম্বর এবং ঠিকানা পূরণ করে কনফার্ম করুন।' },
          { q: 'ডেলিভারি চার্জ কত এবং কীভাবে পেইড করব?', a: 'মীরসরাই উপজেলায় ফ্রি ডেলিভারি, চট্টগ্রামের অন্যান্য এলাকায় ১০০ টাকা এবং চট্টগ্রাম বিভাগের বাইরে ১৫০ টাকা। অর্ডার কনফার্মেশনের জন্য ডেলিভারি চার্জ অগ্রিম প্রদান করতে হয় এবং বাকি টাকা ক্যাশ অন ডেলিভারি (COD) এর মাধ্যমে পণ্য হাতে পেয়ে পরিশোধ করা যাবে। (বিশেষ দ্রষ্টব্য: পণ্যের ওজনের ওপর ভিত্তি করে কিছু ক্ষেত্রে ডেলিভারি চার্জ বাড়তে পারে; চার্জ বেশি হলে অর্ডার কনফার্মেশনের সময় গ্রাহককে জানিয়ে দেওয়া হবে)।' }
        ].map((item, idx) => (
          <div key={idx} className="p-6 bg-zinc-50 border border-zinc-150 rounded-3xl space-y-2">
            <h4 className="text-zinc-900 font-bold text-sm md:text-base flex items-start gap-3">
              <span className="text-[#ce112d]">প্রশ্ন:</span> {item.q}
            </h4>
            <p className="text-zinc-650 text-xs md:text-sm pl-8 leading-relaxed">
              <span className="text-rose-600 font-semibold">উত্তর:</span> {item.a}
            </p>
          </div>
        ))}
      </div>
    )
  },
  '/size-guide': {
    title: 'সাইজ গাইড (Size Guide)',
    icon: <FileText className="w-8 h-8 text-[#ce112d]" />,
    content: (
      <div className="space-y-6">
        <p className="text-zinc-600 leading-relaxed text-sm">
          আপনার জন্য সঠিক মাপের পোশাকটি অর্ডার করতে নিচের সাইজ চার্ট নির্দেশিকাটি অনুসরণ করুন।
        </p>
        <div className="overflow-x-auto rounded-3xl border border-zinc-200 bg-zinc-50 p-4">
          <table className="w-full text-center border-collapse text-xs md:text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-[#ce112d] font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Size (সাইজ)</th>
                <th className="py-3 px-4">Chest (বডি ইঞ্চি)</th>
                <th className="py-3 px-4">Length (লম্বা ইঞ্চি)</th>
                <th className="py-3 px-4">Fit Type</th>
              </tr>
            </thead>
            <tbody className="text-zinc-655 font-semibold">
              <tr className="border-b border-zinc-100">
                <td className="py-3 px-4">S</td>
                <td className="py-3 px-4">36" - 38"</td>
                <td className="py-3 px-4">26"</td>
                <td className="py-3 px-4">Regular</td>
              </tr>
              <tr className="border-b border-zinc-100">
                <td className="py-3 px-4">M</td>
                <td className="py-3 px-4">38" - 40"</td>
                <td className="py-3 px-4">27"</td>
                <td className="py-3 px-4">Regular</td>
              </tr>
              <tr className="border-b border-zinc-100">
                <td className="py-3 px-4">L</td>
                <td className="py-3 px-4">40" - 42"</td>
                <td className="py-3 px-4">28"</td>
                <td className="py-3 px-4">Regular</td>
              </tr>
              <tr className="border-b border-zinc-100">
                <td className="py-3 px-4">XL</td>
                <td className="py-3 px-4">42" - 44"</td>
                <td className="py-3 px-4">29"</td>
                <td className="py-3 px-4">Regular</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-bold text-zinc-900">FREE SIZE</td>
                <td className="py-3 px-4">34" - 44"</td>
                <td className="py-3 px-4">Flexible</td>
                <td className="py-3 px-4 font-bold text-rose-500">Universal Fit</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs text-zinc-400 italic mt-4 pl-1">
          * প্রিপেইড বা কাস্টমাইজড অর্ডারের সময় সঠিক গাইড পেতে আমাদের হোয়াটসঅ্যাপ হেল্পলাইনে (<a href="https://wa.me/8801824950082" target="_blank" rel="noopener noreferrer" className="text-emerald-600 font-bold hover:underline">01824950082</a>) সরাসরি মেসেজ দিতে পারেন।
        </p>
      </div>
    )
  },
  '/shipping': {
    title: 'শিপিং সম্পর্কিত তথ্য (Shipping Info)',
    icon: <MapPin className="w-8 h-8 text-[#ce112d]" />,
    content: (
      <div className="space-y-6">
        <p className="text-zinc-600 leading-relaxed text-sm md:text-base">
          আমরা অত্যন্ত যত্ন এবং কম সময়ে পণ্যটি সরাসরি আপনার কাছে পৌঁছে দেওয়ার জন্য দেশের প্রথম সারির কুরিয়ার কোম্পানিগুলোর মাধ্যমে কাস্টমারের ঠিকানায় হোম ডেলিভারি নিশ্চিত করে থাকি।
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <div className="p-6 bg-zinc-50 border border-zinc-150 rounded-3xl space-y-2">
            <h4 className="text-zinc-900 font-bold text-sm">লোকাল শিপিং (চট্টগ্রাম জেলা)</h4>
            <p className="text-zinc-500 text-xs leading-relaxed font-medium">
              মীরসরাই উপজেলায় ফ্রি ডেলিভারি (অর্ডার কনফার্মেশন ফি ১০০ টাকা অগ্রিম প্রযোজ্য যা মোট বিল থেকে বাদ যাবে) এবং চট্টগ্রামের অন্যান্য এলাকায় ডেলিভারি চার্জ ১০০ টাকা। ১ থেকে ২ কার্যদিবসের মধ্যে হোম ডেলিভারি পাওয়া যাবে।
            </p>
          </div>
          <div className="p-6 bg-zinc-50 border border-zinc-150 rounded-3xl space-y-2">
            <h4 className="text-zinc-900 font-bold text-sm">জাতীয় শিপিং (চট্টগ্রামের বাহিরে)</h4>
            <p className="text-zinc-500 text-xs leading-relaxed font-medium">
              ডেলিভারি চার্জ ১৫০ টাকা (অর্ডার কনফার্মেশনের জন্য ডেলিভারি চার্জ অগ্রিম প্রযোজ্য)। ২ থেকে ৫ কার্যদিবসের মধ্যে দেশের যেকোনো প্রান্তে হোম ডেলিভারি সুবিধা উপলব্ধ। পণ্যের ওজনের ওপর ভিত্তি করে চার্জ পরিবর্তিত হলে আগেই জানানো হবে।
            </p>
          </div>
        </div>
      </div>
    )
  },
  '/returns': {
    title: 'রিটার্ন এবং এক্সচেঞ্জ পলিসি (Returns & Exchanges)',
    icon: <RefreshCw className="w-8 h-8 text-[#ce112d]" />,
    content: (
      <div className="space-y-6">
        <p className="text-zinc-600 leading-relaxed text-sm md:text-base">
          বিগ বাজার থেকে কেনা প্রতিটি পোশাকে আপনার সন্তুষ্টি আমাদের বড় অনুপ্রেরণা। যদি কোনো কারণে প্রোডাক্টে ম্যানুফ্যাকচারিং ত্রুটি বা ছেঁড়া থাকে অথবা সাইজ অর্ডার করা অনুযায়ী না মেলে, তবে সহজে রিটার্ন বা এক্সচেঞ্জ করতে সাহায্য করছি।
        </p>

        <div className="space-y-4 mt-6">
          <h4 className="text-zinc-900 font-bold text-sm uppercase tracking-wide">রিটার্নের প্রধান শর্তাবলী:</h4>
          <ul className="list-disc list-inside text-zinc-500 text-xs md:text-sm space-y-2 ml-2 font-medium">
            <li>আমাদের প্রোডাক্ট হাতে পাওয়ার ২৪ ঘণ্টার মধ্যে যেকোনো সমস্যার সমাধান বা এক্সচেঞ্জ রিকোয়েস্ট হোয়াটসঅ্যাপে পাঠাতে হবে।</li>
            <li>পোশাকটি অব্যবহৃত এবং এর সাথে মূল প্রাইস ট্যাগ, প্যাকেট ও চালানের কপি সুরক্ষিত থাকতে হবে।</li>
            <li>যদি ডেলিভারির সময় ডিফেক্ট নজরে আসে, তবে ডেলিভারি ম্যানের হাতেই ডিফেক্টিভ প্রোডাক্ট ইনস্ট্যান্ট রিটার্ন করতে পারবেন সম্পূর্ণ ফ্রিতে।</li>
          </ul>
        </div>
      </div>
    )
  },
  '/store-locations': {
    title: 'আউটলেট লোকেশন (Store Locations)',
    icon: <MapPin className="w-8 h-8 text-[#ce112d]" />,
    content: (
      <div className="space-y-6">
        <p className="text-zinc-600 leading-relaxed text-sm md:text-base">
          আপনি সরাসরি আমাদের মেইন শোরুম আউটলেটে এসে পছন্দের গুণগত মান যাচাই করে কাপড় কেনাকাটা করতে পারেন। আমাদের শোরুমের ঠিকানা নিচে দেওয়া হলো:
        </p>

        <div className="p-8 bg-zinc-50 border border-zinc-150 rounded-3xl space-y-4">
          <h4 className="text-zinc-900 font-bold text-base md:text-lg flex items-center gap-2">
            <ShoppingBag className="text-[#ce112d]" size={18} /> বিগ বাজার বারইয়ারহাট শোরুম
          </h4>
          <p className="text-zinc-500 text-xs md:text-sm leading-relaxed font-semibold">
            বারইয়ারহাট পৌরসভা বাজার রোড, মীরসরাই উপজেলা, চট্টগ্রাম বিভাগ, বাংলাদেশ।
          </p>
          <div className="pt-4 border-t border-zinc-200 text-zinc-400 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
            <Clock size={14} className="text-zinc-400 shrink-0" />
            <span>খোলা থাকে: প্রতিদিন সকাল ৯:০০ - রাত ৯:০০ টা পর্যন্ত</span>
          </div>
        </div>
      </div>
    )
  },
  '/privacy-policy': {
    title: 'গোপনীয়তা নীতি (Privacy Policy)',
    icon: <Shield className="w-8 h-8 text-[#ce112d]" />,
    content: (
      <div className="space-y-6 text-sm text-zinc-600 leading-relaxed">
        <p>
          Big Bazar (<strong className="text-zinc-900">onlinebigbazar.com</strong>) আপনার ব্যক্তিগত তথ্যের গোপনীয়তাকে গুরুত্ব দেয়। এই নীতি ব্যাখ্যা করে আমরা কী সংগ্রহ করি, কেন করি এবং কীভাবে সুরক্ষা করি।
        </p>
        <div className="space-y-4">
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-5">
            <h4 className="font-bold text-zinc-900 text-sm mb-2">১. আমরা কী তথ্য সংগ্রহ করি</h4>
            <ul className="list-disc list-inside space-y-1.5 text-zinc-600 text-xs md:text-sm">
              <li>অর্ডারের জন্য নাম, মোবাইল নম্বর, ডেলিভারি ঠিকানা</li>
              <li>অ্যাকাউন্ট থাকলে ইমেইল / Google সাইন-ইন তথ্য</li>
              <li>পেমেন্ট রেফারেন্স (বিকাশ নম্বরের শেষ অংশ) — কার্ড তথ্য আমরা সংরক্ষণ করি না</li>
              <li>ওয়েবসাইট ব্যবহারের বেসিক অ্যানালিটিক্স (পৃষ্ঠা ভিউ)</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-5">
            <h4 className="font-bold text-zinc-900 text-sm mb-2">২. তথ্য কীভাবে ব্যবহার হয়</h4>
            <p className="text-xs md:text-sm">অর্ডার ডেলিভারি, কাস্টমার সাপোর্ট, অর্ডার স্ট্যাটাস আপডেট এবং সার্ভিস উন্নত করতে। বিপণন এজেন্সির কাছে আমরা আপনার ফোন নম্বর বিক্রি করি না।</p>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-5">
            <h4 className="font-bold text-zinc-900 text-sm mb-2">৩. নিরাপত্তা ও অধিকার</h4>
            <p className="text-xs md:text-sm">তথ্য শুধু প্রয়োজনীয় স্টাফ ও ডেলিভারি পার্টনারের সাথে শেয়ার হয়। তথ্য সংশোধন বা মুছে ফেলার অনুরোধ: <a href="tel:01857045449" className="text-[#ce112d] font-semibold">01857045449</a> বা <a href="mailto:infobigbazar01@gmail.com" className="text-[#ce112d] font-semibold">infobigbazar01@gmail.com</a></p>
          </div>
        </div>
      </div>
    )
  },
  '/terms': {
    title: 'সেবার শর্তাবলী (Terms of Service)',
    icon: <FileText className="w-8 h-8 text-[#ce112d]" />,
    content: (
      <div className="space-y-5 text-sm text-zinc-600 leading-relaxed">
        <p>onlinebigbazar.com ব্যবহার করে আপনি নিচের শর্তাবলীতে সম্মত হচ্ছেন।</p>
        <ol className="space-y-3 list-decimal list-inside text-xs md:text-sm">
          <li><strong className="text-zinc-900">সঠিক তথ্য:</strong> অর্ডারের সময় সঠিক নাম, ফোন ও ঠিকানা দিতে হবে। ভুল ঠিকানায় রিটার্ন হলে ডেলিভারি চার্জ গ্রাহক বহন করতে পারেন।</li>
          <li><strong className="text-zinc-900">মূল্য ও স্টক:</strong> ওয়েবসাইটের মূল্য ও স্টক পরিবর্তন হতে পারে। কনফার্মেশনের আগে স্টক শেষ হলে বিকল্প বা রিফান্ড দেওয়া হবে।</li>
          <li><strong className="text-zinc-900">ছবির তারতম্য:</strong> আলোর কারণে রঙ ১০–২০% ভিন্ন দেখাতে পারে — এটা স্বাভাবিক।</li>
          <li><strong className="text-zinc-900">পেমেন্ট:</strong> COD, বিকাশ অগ্রিম বা QR গ্রহণযোগ্য। সম্পূর্ণ পেমেন্ট ভেরিফিকেশন অ্যাডমিন নিশ্চিত করে।</li>
          <li><strong className="text-zinc-900">আচরণ:</strong> অপব্যবহার, ভুয়া অর্ডার বা হয়রানি করলে অর্ডার বাতিলের অধিকার সংরক্ষিত।</li>
        </ol>
      </div>
    )
  },
  '/refund': {
    title: 'রিফান্ড পলিসি (Refund Policy)',
    icon: <RefreshCw className="w-8 h-8 text-[#ce112d]" />,
    content: (
      <div className="space-y-6 text-sm text-zinc-600 leading-relaxed">
        <p>নিচের ক্ষেত্রে Big Bazar সম্পূর্ণ বা আংশিক রিফান্ড প্রদান করে:</p>
        <div className="grid gap-3">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5">
            <h4 className="font-bold text-emerald-800 text-sm mb-2">রিফান্ড পাবেন যখন</h4>
            <ul className="list-disc list-inside text-xs md:text-sm space-y-1.5 text-emerald-900/80">
              <li>স্টক না থাকায় অর্ডার ক্যান্সেল</li>
              <li>ডেলিভারিতে প্রোডাক্ট মিসিং / মারাত্মক ড্যামেজ এবং এক্সচেঞ্জ সম্ভব নয়</li>
              <li>ভুল পণ্য পাঠানো হয়েছে এবং রিপ্লেসমেন্ট সম্ভব নয়</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
            <h4 className="font-bold text-zinc-900 text-sm mb-2">প্রক্রিয়া</h4>
            <p className="text-xs md:text-sm">হোয়াটসঅ্যাপ / কলে জানান → যাচাই → সাধারণত <strong>৩–৫ কার্যদিবস</strong>-এ বিকাশ/নগদ/ব্যাংকে ফেরত। অগ্রিম কনফার্মেশন ফি প্রযোজ্য ক্ষেত্রে নীতি অনুযায়ী সমন্বয় হয়।</p>
          </div>
        </div>
      </div>
    )
  }
};

export default function StaticPage({ path }) {
  const data = pageData[path];

  if (!data) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-20 text-center space-y-6 bg-white rounded-3xl border border-zinc-100 shadow-sm mt-8">
        <h2 className="text-3xl font-black uppercase text-zinc-700">Page Not Found</h2>
        <Link to="/" className="inline-flex items-center gap-2 bg-[#ce112d] text-white px-8 py-3 rounded-2xl font-bold uppercase text-xs hover:brightness-110 transition-all">
          <ArrowLeft size={16} /> Home
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] py-10 md:py-16 px-4 md:px-6 bg-gradient-to-b from-zinc-50 to-white font-sans text-zinc-900">
      <div className="max-w-3xl mx-auto space-y-8">
        <Link to="/" className="inline-flex items-center gap-2 text-zinc-500 hover:text-zinc-900 font-semibold tracking-wide text-[11px] transition-colors">
          <ArrowLeft size={14} /> {path.startsWith('/') ? 'হোমে ফিরুন' : 'Back home'}
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
