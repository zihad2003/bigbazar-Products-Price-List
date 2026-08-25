// BigBazar AI Assistant - FAQ Knowledge Base
// Content from StaticPage.jsx - no new info.

export const FAQ_KB = {
  delivery_time: {
    keywords: ["delivery", "deliver", "kotdin", "shipping", "shomoy", "lagbe", "days", "arrive", "koto", "charge", "cost"],
    answer_bn: "ডেলিভারি:\n- মীরসরাই: ফ্রি ডেলিভারি (কনফার্মেশন ফি ১০০ টাকা অগ্রিম)\n- চট্টগ্রাম জেলা: ১০০ টাকা, ১-২ দিন\n- সারা বাংলাদেশ: ১৫০ টাকা, ২-৫ দিন\n(অর্ডার কনফার্মেশনের জন্য ডেলিভারি চার্জ অগ্রিম প্রযোজ্য। পণ্যের ওজনের ওপর ভিত্তি করে ডেলিভারি চার্জ কম-বেশি হতে পারে, যা কনফার্মেশনের সময় গ্রাহককে জানানো হবে)।",
    answer_en: "Delivery:\n- Mirsarai: Free Delivery (100 BDT Confirmation Advance)\n- Chittagong Area: 100 BDT, 1-2 days\n- All Bangladesh: 150 BDT, 2-5 days\n(Delivery charge is required in advance for order confirmation. Delivery charge may vary depending on product weight, which will be informed if applicable)."
  },
  return_policy: {
    keywords: ["return", "exchange", "ferat", "replace", "refund", "problem", "defect", "damaged"],
    answer_bn: "রিটার্ন: পণ্য পাওয়ার ২৪ ঘণ্টার মধ্যে WhatsApp-এ জানান। রিফান্ড ৩-৫ দিনে bKash/Nagad-এ।",
    answer_en: "Return: WhatsApp within 24h, unused+tags. Refund 3-5 days bKash/Nagad."
  },
  payment: {
    keywords: ["bkash", "nagad", "rocket", "payment", "pay", "cash", "cod", "advance"],
    answer_bn: "পেমেন্ট: অর্ডার কনফার্মেশনের জন্য ডেলিভারি চার্জ অগ্রিম bKash/Nagad-এ দিতে হবে। বাকি টাকা ক্যাশ অন ডেলিভারি (COD)-তে পরিশোধ করবেন।",
    answer_en: "Payment: Delivery charge must be paid in advance via bKash/Nagad for order confirmation. Remaining amount payable via Cash on Delivery (COD)."
  },
  size_chart: {
    keywords: ["size", "measurement", "fit", "small", "medium", "large", "xl", "xxl", "free size", "inch"],
    answer_bn: "সাইজ: S 36-38/26 ইঞ্চি, M 38-40/27, L 40-42/28, XL 42-44/29, FREE 34-44। WhatsApp: 01824950082",
    answer_en: "Sizes: S 36-38/26in, M 38-40/27in, L 40-42/28in, XL 42-44/29in, FREE 34-44in. WhatsApp 01824950082."
  },
  contact_info: {
    keywords: ["contact", "phone", "number", "showroom", "address", "location", "hours", "open", "whatsapp", "email", "call"],
    answer_bn: "যোগাযোগ: 01857045449 | WhatsApp 01824950082 | infobigbazar01@gmail.com\nশোরুম: জমিরদার প্লাজা ২য় তলা, বারইয়ারহাট। খোলা: ৯টা-রাত ৯টা।",
    answer_en: "Contact: 01857045449, WhatsApp 01824950082, infobigbazar01@gmail.com. Showroom: 2F Jomidar Plaza, Baraiyarhat, Mirsarai. Open 9AM-9PM."
  },
  how_to_order: {
    keywords: ["order", "korbo", "how to", "kivabe", "confirm", "checkout", "buy"],
    answer_bn: "অর্ডার: পণ্যে অর্ডার বাটন ক্লিক করুন, সাইজ ও কালার বেছে নাম+মোবাইল+ঠিকানা দিন এবং ডেলিভারি চার্জ অগ্রিম দিয়ে কনফার্ম করুন। মেসেঞ্জারেও অর্ডার করা যায়।",
    answer_en: "Order: Click Order Now, select size+colour, enter name/mobile/address, pay advance delivery charge to confirm. You can also order via Messenger."
  },
  mirsarai_offer: {
    keywords: ["mirsarai", "baraiyarhat", "bariarhat", "free", "upazila", "local"],
    answer_bn: "মীরসরাই: ১০০% ফ্রি ডেলিভারি অনলাইন অর্ডারে। অর্ডার কনফার্মেশন ফি ১০০ টাকা অগ্রিম প্রযোজ্য যা মোট বিল থেকে বাদ যাবে। শোরুম: জমিরদার প্লাজা ২য় তলা, বারইয়ারহাট।",
    answer_en: "Mirsarai: 100% Free Delivery online. 100 BDT Confirmation advance fee applies which is deducted from the total bill. Showroom: 2F Jomidar Plaza, Baraiyarhat."
  }
};

export const DELIVERY_AREAS = {
  mirsarai: { days: "Same/Next day", charge: "Free (100 BDT Advance)" },
  chittagong: { days: "1-2", charge: "100 BDT" },
  dhaka: { days: "2-3", charge: "150 BDT" },
  sylhet: { days: "3-4", charge: "150 BDT" },
  default: { days: "2-5", charge: "150 BDT" }
};

export function normalizeQuery(msg) {
  return (msg || '')
    .toLowerCase()
    .replace(/[^\w\s\u0980-\u09FF]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 120);
}

export function matchFAQ(message) {
  const lower = (message || '').toLowerCase();
  let best = null;
  let score = 0;
  for (const [k, e] of Object.entries(FAQ_KB)) {
    let s = 0;
    for (const kw of e.keywords) {
      if (lower.includes(kw)) s += kw.length;
    }
    if (s > score) {
      score = s;
      best = { key: k, entry: e };
    }
  }
  return score < 4 ? null : best;
}

export function detectLanguage(text) {
  if (/[\u0980-\u09FF]/.test(text || '')) return "bn";
  const bw = ["ache", "koi", "ki", "chai", "sari", "panjabi", "borka", "lagbe", "koto", "ase", "korbo", "kemon", "dorkar", "apnader"];
  return bw.some(k => (text || '').toLowerCase().includes(k)) ? "bn" : "en";
}