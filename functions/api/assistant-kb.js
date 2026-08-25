// BigBazar AI Assistant - FAQ Knowledge Base
// Content from StaticPage.jsx - no new info.

export const FAQ_KB = {
  delivery_time: {
    keywords: ["delivery", "deliver", "kotdin", "shipping", "shomoy", "lagbe", "days", "arrive", "koto", "charge", "cost"],
    answer_bn: "ডেলিভারি:\n- মীরসরাই: ফ্রি\n- চট্টগ্রাম মেট্রো: ৬০ টাকা, ১-২ দিন\n- সারা বাংলাদেশ: ১২০ টাকা, ২-৫ দিন",
    answer_en: "Delivery: Mirsarai: Free. Chittagong: 60 BDT 1-2d. Bangladesh: 120 BDT 2-5d."
  },
  return_policy: {
    keywords: ["return", "exchange", "ferat", "replace", "refund", "problem", "defect", "damaged"],
    answer_bn: "রিটার্ন: পণ্য পাওয়ার ২৪ ঘণ্টার মধ্যে WhatsApp-এ জানান। রিফান্ড ৩-৫ দিনে bKash/Nagad-এ।",
    answer_en: "Return: WhatsApp within 24h, unused+tags. Refund 3-5 days bKash/Nagad."
  },
  payment: {
    keywords: ["bkash", "nagad", "rocket", "payment", "pay", "cash", "cod", "advance"],
    answer_bn: "পেমেন্ট: bKash/Nagad - TrxID মেসেঞ্জারে দিন। COD সারা দেশে। Advance ৫০%।",
    answer_en: "Payment: bKash/Nagad/Rocket TrxID on Messenger. COD nationwide. Advance 50% upfront."
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
    answer_bn: "অর্ডার: পণ্যে অর্ডার বাটন ক্লিক করুন, সাইজ ও কালার বেছে নাম+মোবাইল+ঠিকানা দিন। মেসেঞ্জারেও অর্ডার হয়।",
    answer_en: "Order: Click Order Now, pick size+colour, enter name/mobile/address, confirm. Also order via Messenger."
  },
  mirsarai_offer: {
    keywords: ["mirsarai", "baraiyarhat", "bariarhat", "free", "upazila", "local"],
    answer_bn: "মীরসরাই: ১০০% ফ্রি ডেলিভারি অনলাইন অর্ডারে। COD সুবিধা। শোরুম: জমিরদার প্লাজা ২য় তলা, বারইয়ারহাট।",
    answer_en: "Mirsarai: 100% Free Delivery online. COD available. Showroom 2F Jomidar Plaza, Baraiyarhat."
  }
};

export const DELIVERY_AREAS = {
  mirsarai: { days: "Same/Next day", charge: "Free" },
  chittagong: { days: "1-2", charge: "60 BDT" },
  dhaka: { days: "2-3", charge: "120 BDT" },
  sylhet: { days: "3-4", charge: "120 BDT" },
  default: { days: "2-5", charge: "120 BDT" }
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