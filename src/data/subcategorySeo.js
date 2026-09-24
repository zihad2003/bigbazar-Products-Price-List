/**
 * Per-subcategory SEO copy for /products?category=&subcategory=
 * Keys are normalized ids (lowercase, spaces/& → -).
 */

const STORE = {
  name: 'Big Bazar',
  place: 'Baraiyarhat, Mirsharai, Chattogram',
  placeBn: 'বারইয়ারহাট, মীরসরাই, চট্টগ্রাম',
  freeDeliveryBn: 'মীরসরাই উপজেলায় ফ্রি হোম ডেলিভারি',
  freeDeliveryEn: 'Free home delivery within Mirsharai Upazila',
  codBn: 'সারা দেশে ক্যাশ অন ডেলিভারি (COD)',
  codEn: 'Cash on Delivery (COD) nationwide',
};

function norm(id = '') {
  return String(id)
    .trim()
    .toLowerCase()
    .replace(/&/g, '-')
    .replace(/[_\s/]+/g, '-')
    .replace(/-+/g, '-');
}

/** Dedicated copy for known subcategories */
const SEO_BY_ID = {
  saree: {
    h2_bn: 'শাড়ি কালেকশন — Big Bazar বারইয়ারহাট',
    h2_en: 'Saree Collection — Big Bazar Baraiyarhat',
    intro_bn:
      'জামদানি, কাতান, জর্জেট, সিল্ক ও পার্টি শাড়ির ফিক্সড-প্রাইস কালেকশন। বিয়ের সাজনি থেকে দৈনন্দিন পরা — একই শোরুম ও onlinebigbazar.com-এ।',
    intro_en:
      'Fixed-price jamdani, cotton, georgette, silk and party sarees — from bridal looks to everyday wear. Shop in-store at Baraiyarhat or online.',
    bullets_bn: [
      'কাতান, জামদানি, জর্জেট ও স্টোন ওয়ার্ক শাড়ি',
      'বিয়ের সাজনি ও পার্টি লুকের ম্যাচিং অপশন',
      'ফিক্সড প্রাইস — টানা-টানা ছাড়া স্বচ্ছ দাম',
      `${STORE.freeDeliveryBn} · ${STORE.codBn}`,
    ],
    bullets_en: [
      'Cotton, jamdani, georgette & stone-work sarees',
      'Bridal & party matching options',
      'Fixed prices — transparent, no bargaining',
      `${STORE.freeDeliveryEn} · ${STORE.codEn}`,
    ],
    faq: [
      {
        q_bn: 'শাড়ি অনলাইনে অর্ডার করলে সাইজ/লম্ব কীভাবে জানব?',
        q_en: 'How do I confirm saree length/size online?',
        a_bn: 'প্রোডাক্ট ডিটেইলস দেখুন অথবা WhatsApp-এ ছবি পাঠিয়ে সাহায্য নিন। প্রয়োজনে শোরুমে এসে দেখে নিতে পারেন।',
        a_en: 'Check product details or send a photo on WhatsApp. You can also visit our Baraiyarhat showroom.',
      },
    ],
    keywords: 'saree Baraiyarhat, শাড়ি মীরসরাই, jamdani saree Chittagong, Big Bazar saree',
  },

  'three-piece': {
    h2_bn: 'থ্রি পিস কালেকশন — ফিক্সড প্রাইসে',
    h2_en: 'Three-Piece Collection — Fixed Price',
    intro_bn:
      'স্টিচড কটন, পার্টি ও ক্যাজুয়াল থ্রি পিসের বৈচিত্র্যময় কালেকশন। অফিস, উৎসব ও দৈনন্দিন পরা — Big Bazar-এ সব এক জায়গায়।',
    intro_en:
      'Stitched cotton, party and casual three-piece sets for office, festivals and everyday wear — all at fixed prices.',
    bullets_bn: [
      'স্টিচড কটন ও পার্টি থ্রি পিস',
      'কমফোর্ট ফিট ও প্রিমিয়াম ফিনিশ',
      'শোরুম + অনলাইন একই স্টক',
      STORE.freeDeliveryBn,
    ],
    bullets_en: [
      'Stitched cotton & party three-piece',
      'Comfort fit with premium finish',
      'Same stock in showroom & online',
      STORE.freeDeliveryEn,
    ],
    faq: [
      {
        q_bn: 'থ্রি পিসের সাইজ গাইড আছে?',
        q_en: 'Is there a size guide for three-piece?',
        a_bn: 'হ্যাঁ — Size Guide পেজ দেখুন, বা অর্ডারের আগে হেল্পলাইনে জিজ্ঞাসা করুন।',
        a_en: 'Yes — see our Size Guide page, or ask helpline before ordering.',
      },
    ],
    keywords: 'three piece Baraiyarhat, থ্রি পিস মীরসরাই, salwar kameez Chittagong',
  },

  'stitched-cotton-three-piece': {
    h2_bn: 'স্টিচড কটন থ্রি পিস — দৈনন্দিন কমফোর্ট',
    h2_en: 'Stitched Cotton Three-Piece — Everyday Comfort',
    intro_bn: 'নরম কটন ফেব্রিকের রেডি স্টিচড থ্রি পিস। ঘরে-বাইরে আরামদায়ক পরা, ফিক্সড প্রাইসে।',
    intro_en: 'Soft cotton ready-stitched three-piece sets for comfortable everyday wear at fixed prices.',
    bullets_bn: ['রেডি টু ওয়্যার কটন', 'সহজ কেয়ার ও দীর্ঘস্থায়ী', STORE.codBn],
    bullets_en: ['Ready-to-wear cotton', 'Easy care & durable', STORE.codEn],
    faq: [],
    keywords: 'stitched cotton three piece, কটন থ্রি পিস বারইয়ারহাট',
  },

  'party-three-piece': {
    h2_bn: 'পার্টি থ্রি পিস — উৎসবের লুক',
    h2_en: 'Party Three-Piece — Festive Looks',
    intro_bn: 'পার্টি, ওয়ালুমা ও বিশেষ অনুষ্ঠানের জন্য গ্ল্যাম থ্রি পিস কালেকশন।',
    intro_en: 'Glam three-piece sets for parties, walima and special occasions.',
    bullets_bn: ['পার্টি ওয়েয়ার ডিজাইন', 'প্রিমিয়াম ফিনিশ', 'বিয়ের সাজনি সেকশনে ম্যাচিং'],
    bullets_en: ['Party-wear designs', 'Premium finish', 'Matching options in bridal section'],
    faq: [],
    keywords: 'party three piece, পার্টি থ্রি পিস চট্টগ্রাম',
  },

  pparshi: {
    h2_bn: 'পারশি / পারসি কালেকশন',
    h2_en: 'Parshi Collection',
    intro_bn: 'ঐতিহ্যবাহী পারশি স্টাইলের পোশাক — ফিক্সড প্রাইসে Big Bazar বারইয়ারহাটে।',
    intro_en: 'Traditional parshi-style wear at fixed prices from Big Bazar Baraiyarhat.',
    bullets_bn: ['ঐতিহ্যবাহী ডিজাইন', 'শোরুমে দেখে নিন', STORE.freeDeliveryBn],
    bullets_en: ['Traditional designs', 'Try in showroom', STORE.freeDeliveryEn],
    faq: [],
    keywords: 'parshi dress, পারশি বারইয়ারহাট',
  },

  parshi: {
    h2_bn: 'পারশি কালেকশন — Big Bazar',
    h2_en: 'Parshi Collection — Big Bazar',
    intro_bn: 'পারশি স্টাইলের নির্বাচিত কালেকশন। অনলাইন অর্ডার বা শোরুম ভিজিট — দুটোই সহজ।',
    intro_en: 'Curated parshi styles — order online or visit our Baraiyarhat showroom.',
    bullets_bn: ['কুরেটেড ডিজাইন', STORE.codBn],
    bullets_en: ['Curated designs', STORE.codEn],
    faq: [],
    keywords: 'parshi, পারশি মীরসরাই',
  },

  lehenga: {
    h2_bn: 'লেহেঙ্গা কালেকশন — বিয়ে ও পার্টি',
    h2_en: 'Lehenga Collection — Wedding & Party',
    intro_bn: 'বিয়ের সাজনি ও পার্টির জন্য লেহেঙ্গা। কনে ও গেস্ট — দুই ধরনের লুক।',
    intro_en: 'Lehengas for bridal and party looks — guest and bride-ready options.',
    bullets_bn: ['বিয়ের সাজনি সিগনেচার', 'পার্টি লেহেঙ্গা', 'ফিক্সড প্রাইস'],
    bullets_en: ['Bridal signature picks', 'Party lehengas', 'Fixed prices'],
    faq: [],
    keywords: 'lehenga Baraiyarhat, লেহেঙ্গা মীরসরাই, bridal lehenga',
  },

  'kurti-&-tops': {
    h2_bn: 'কুর্তি ও টপস — ক্যাজুয়াল থেকে স্মার্ট',
    h2_en: 'Kurti & Tops — Casual to Smart',
    intro_bn: 'দৈনন্দিন ও অফিস-ফ্রেন্ডলি কুর্তি-টপসের কালেকশন। আরামদায়ক ফেব্রিক, স্মার্ট লুক।',
    intro_en: 'Everyday and office-friendly kurtis & tops — comfort fabrics, smart looks.',
    bullets_bn: ['ক্যাজুয়াল ও স্মার্ট কুর্তি', 'বহু রং ও প্রিন্ট', STORE.freeDeliveryBn],
    bullets_en: ['Casual & smart kurtis', 'Many colours & prints', STORE.freeDeliveryEn],
    faq: [],
    keywords: 'kurti Baraiyarhat, কুর্তি মীরসরাই, tops Chittagong',
  },

  kurti: {
    h2_bn: 'কুর্তি কালেকশন — Big Bazar',
    h2_en: 'Kurti Collection — Big Bazar',
    intro_bn: 'স্টাইলিশ কুর্তির ফিক্সড-প্রাইস কালেকশন — বারইয়ারহাট শোরুম ও অনলাইনে।',
    intro_en: 'Stylish kurtis at fixed prices — Baraiyarhat showroom and online.',
    bullets_bn: ['রেডি টু ওয়্যার', STORE.codBn],
    bullets_en: ['Ready to wear', STORE.codEn],
    faq: [],
    keywords: 'kurti, কুর্তি বারইয়ারহাট',
  },

  'co-ord-set': {
    h2_bn: 'কো-অর্ড সেট — ম্যাচিং লুক',
    h2_en: 'Co-ord Sets — Matching Looks',
    intro_bn: 'টপ-বটম ম্যাচিং কো-অর্ড সেট। ট্রেন্ডি, কমফোর্টেবল, ফোটো-রেডি লুক।',
    intro_en: 'Matching top-bottom co-ord sets — trendy, comfortable, photo-ready.',
    bullets_bn: ['ম্যাচিং সেট', 'ট্রেন্ডি কাট', 'ফিক্সড প্রাইস'],
    bullets_en: ['Matching sets', 'Trendy cuts', 'Fixed prices'],
    faq: [],
    keywords: 'co-ord set, কোঅর্ড সেট চট্টগ্রাম',
  },

  gown: {
    h2_bn: 'গাউন কালেকশন — সন্ধ্যার লুক',
    h2_en: 'Gown Collection — Evening Looks',
    intro_bn: 'পার্টি ও বিশেষ সন্ধ্যার জন্য এলিগ্যান্ট গাউন।',
    intro_en: 'Elegant gowns for parties and special evenings.',
    bullets_bn: ['পার্টি গাউন', 'প্রিমিয়াম ফিনিশ', STORE.codBn],
    bullets_en: ['Party gowns', 'Premium finish', STORE.codEn],
    faq: [],
    keywords: 'gown Baraiyarhat, গাউন মীরসরাই',
  },

  'burqa-&-hijab': {
    h2_bn: 'বোরকা ও হিজাব — মডেস্ট ফ্যাশন',
    h2_en: 'Burqa & Hijab — Modest Fashion',
    intro_bn: 'আরামদায়ক বোরকা, আবায়া ও হিজাবের কালেকশন। মানসম্মত ফেব্রিক, ফিক্সড প্রাইস।',
    intro_en: 'Comfortable burqa, abaya and hijab collection — quality fabric, fixed prices.',
    bullets_bn: ['বোরকা · আবায়া · হিজাব', 'দৈনন্দিন ও ফর্মাল', STORE.freeDeliveryBn],
    bullets_en: ['Burqa · Abaya · Hijab', 'Everyday & formal', STORE.freeDeliveryEn],
    faq: [],
    keywords: 'burqa Mirsharai, হিজাব বারইয়ারহাট, abaya Chittagong',
  },

  'unstitched-dresses': {
    h2_bn: 'আনস্টিচড ড্রেস / থান কাপড়',
    h2_en: 'Unstitched Dresses & Fabrics',
    intro_bn: 'নিজের মতো সেলাইয়ের জন্য আনস্টিচড ড্রেস ও থান কাপড়। রং ও ডিজাইনে বৈচিত্র্য।',
    intro_en: 'Unstitched dresses and than fabrics to tailor your own fit — variety of colours and designs.',
    bullets_bn: ['থান ও আনস্টিচড সেট', 'কাস্টম সেলাইয়ের জন্য আদর্শ', 'ফিক্সড প্রাইস'],
    bullets_en: ['Than & unstitched sets', 'Ideal for custom stitching', 'Fixed prices'],
    faq: [],
    keywords: 'unstitched dress, থান কাপড় মীরসরাই',
  },

  'bridal-wear': {
    h2_bn: 'ব্রাইডাল ওয়্যার — বিয়ের সাজনি',
    h2_en: 'Bridal Wear — Biyer Sajani',
    intro_bn:
      'Big Bazar-এর সিগনেচার বিয়ের সাজনি — কনের শাড়ি, লেহেঙ্গা, সারারা ও বরের ম্যাচিং লুক।',
    intro_en:
      'Signature Biyer Sajani bridal wear — bride sarees, lehengas, sharara and matching groom looks.',
    bullets_bn: ['কনে ও বরের কালেকশন', 'শোরুমে ট্রাই করে নিন', 'WhatsApp সাপোর্ট'],
    bullets_en: ['Bride & groom collections', 'Try in showroom', 'WhatsApp support'],
    faq: [
      {
        q_bn: 'বিয়ের সাজনি আগে থেকে বুক করা যায়?',
        q_en: 'Can I reserve bridal outfits early?',
        a_bn: 'হ্যাঁ — শোরুম বা হেল্পলাইনে যোগাযোগ করে স্টক ও তারিখ নিশ্চিত করুন।',
        a_en: 'Yes — contact the showroom or helpline to confirm stock and dates.',
      },
    ],
    keywords: 'bridal wear Baraiyarhat, বিয়ের সাজনি, Biyer Sajani',
  },

  'bridal-collection': {
    h2_bn: 'ব্রাইডাল কালেকশন — বিয়ের সাজনি',
    h2_en: 'Bridal Collection — Biyer Sajani',
    intro_bn: 'বিয়ের সম্পূর্ণ লুকের জন্য নির্বাচিত ব্রাইডাল কালেকশন।',
    intro_en: 'Curated bridal pieces for a complete wedding look.',
    bullets_bn: ['এক্সক্লুসিভ ডিজাইন', STORE.codBn],
    bullets_en: ['Exclusive designs', STORE.codEn],
    faq: [],
    keywords: 'bridal collection, বিয়ের কালেকশন',
  },

  'western-2-piece': {
    h2_bn: 'ওয়েস্টার্ন টু পিস',
    h2_en: 'Western Two-Piece',
    intro_bn: 'মডার্ন ওয়েস্টার্ন টু পিস — স্মার্ট ও ক্যাজুয়াল লুকের জন্য।',
    intro_en: 'Modern western two-piece sets for smart and casual looks.',
    bullets_bn: ['ট্রেন্ডি কাট', 'কমফোর্ট ফিট', STORE.freeDeliveryBn],
    bullets_en: ['Trendy cuts', 'Comfort fit', STORE.freeDeliveryEn],
    faq: [],
    keywords: 'western two piece, ওয়েস্টার্ন টু পিস',
  },

  'two-piece': {
    h2_bn: 'টু পিস কালেকশন',
    h2_en: 'Two-Piece Collection',
    intro_bn: 'হালকা ও স্টাইলিশ টু পিস — দৈনন্দিন পরায় পারফেক্ট।',
    intro_en: 'Light, stylish two-piece sets perfect for everyday wear.',
    bullets_bn: ['রোজকার পরা', 'ফিক্সড প্রাইস'],
    bullets_en: ['Everyday wear', 'Fixed prices'],
    faq: [],
    keywords: 'two piece dress, টু পিস মীরসরাই',
  },

  'pakistani-inspired-2-piece': {
    h2_bn: 'পাকিস্তানি ইনস্পায়ার্ড টু পিস',
    h2_en: 'Pakistani-Inspired Two-Piece',
    intro_bn: 'পাকিস্তানি স্টাইলের এলিগ্যান্ট টু পিস কালেকশন।',
    intro_en: 'Elegant Pakistani-inspired two-piece collection.',
    bullets_bn: ['এলিগ্যান্ট ডিজাইন', STORE.codBn],
    bullets_en: ['Elegant designs', STORE.codEn],
    faq: [],
    keywords: 'pakistani two piece, পাকিস্তানি টু পিস',
  },

  western: {
    h2_bn: 'ওয়েস্টার্ন ওয়্যার',
    h2_en: 'Western Wear',
    intro_bn: 'মডার্ন ওয়েস্টার্ন পোশাকের ফিক্সড-প্রাইস কালেকশন।',
    intro_en: 'Modern western wear at fixed prices.',
    bullets_bn: ['ট্রেন্ডি স্টাইল', STORE.freeDeliveryBn],
    bullets_en: ['Trendy styles', STORE.freeDeliveryEn],
    faq: [],
    keywords: 'western wear Baraiyarhat',
  },

  'sharara-dress': {
    h2_bn: 'সারারা ড্রেস',
    h2_en: 'Sharara Dress',
    intro_bn: 'পার্টি ও উৎসবের জন্য সারারা ড্রেস কালেকশন।',
    intro_en: 'Sharara dresses for parties and festivals.',
    bullets_bn: ['ফেস্টিভ লুক', 'বিয়ের সাজনি ম্যাচিং'],
    bullets_en: ['Festive looks', 'Bridal matching options'],
    faq: [],
    keywords: 'sharara dress, সারারা বারইয়ারহাট',
  },

  shirt: {
    h2_bn: 'জেন্টস শার্ট — Big Bazar',
    h2_en: 'Men’s Shirts — Big Bazar',
    intro_bn: 'ক্যাজুয়াল ও ফর্মাল শার্টের ফিক্সড-প্রাইস কালেকশন। বারইয়ারহাট শোরুম ও অনলাইনে।',
    intro_en: 'Casual and formal shirts at fixed prices — Baraiyarhat showroom and online.',
    bullets_bn: ['ক্যাজুয়াল · ফর্মাল', 'কমফোর্ট ফিট', STORE.codBn],
    bullets_en: ['Casual · Formal', 'Comfort fit', STORE.codEn],
    faq: [],
    keywords: 'mens shirt Mirsharai, শার্ট বারইয়ারহাট',
  },

  't-shirt-&-polo': {
    h2_bn: 'টি-শার্ট ও পোলো',
    h2_en: 'T-Shirts & Polo',
    intro_bn: 'দৈনন্দিন পরায় আরামদায়ক টি-শার্ট ও পোলো।',
    intro_en: 'Comfortable everyday t-shirts and polos.',
    bullets_bn: ['সফট ফেব্রিক', 'মাল্টিপল কালার', STORE.freeDeliveryBn],
    bullets_en: ['Soft fabrics', 'Multiple colours', STORE.freeDeliveryEn],
    faq: [],
    keywords: 't-shirt Baraiyarhat, পোলো মীরসরাই',
  },

  'pants-&-jeans': {
    h2_bn: 'প্যান্ট ও জিন্স',
    h2_en: 'Pants & Jeans',
    intro_bn: 'জেন্টস প্যান্ট ও জিন্সের স্মার্ট কালেকশন — ফিক্সড প্রাইসে।',
    intro_en: 'Smart men’s pants and jeans at fixed prices.',
    bullets_bn: ['জিন্স · চিনো · ক্যাজুয়াল', 'সাইজ গাইড উপলব্ধ'],
    bullets_en: ['Jeans · Chinos · Casual', 'Size guide available'],
    faq: [],
    keywords: 'jeans Mirsharai, প্যান্ট বারইয়ারহাট',
  },

  panjabi: {
    h2_bn: 'পাঞ্জাবি কালেকশন',
    h2_en: 'Panjabi Collection',
    intro_bn: 'ঈদ, বিয়ে ও ফর্মাল অনুষ্ঠানের পাঞ্জাবি। বিয়ের সাজনিতে বরের ম্যাচিং অপশন।',
    intro_en: 'Panjabis for Eid, weddings and formal events — groom matching in Biyer Sajani.',
    bullets_bn: ['ফর্মাল ও ক্যাজুয়াল পাঞ্জাবি', 'বরের শেরওয়ানি/পাঞ্জাবি', STORE.codBn],
    bullets_en: ['Formal & casual panjabis', 'Groom sherwani/panjabi options', STORE.codEn],
    faq: [],
    keywords: 'panjabi Baraiyarhat, পাঞ্জাবি মীরসরাই',
  },

  'panjabi-set': {
    h2_bn: 'কিডস পাঞ্জাবি সেট',
    h2_en: 'Kids Panjabi Set',
    intro_bn: 'ছেলে বাচ্চাদের পাঞ্জাবি সেট — উৎসব ও ফ্যামিলি অনুষ্ঠানের জন্য।',
    intro_en: 'Boys’ panjabi sets for festivals and family events.',
    bullets_bn: ['কমফোর্ট ফিট', 'ঈদ ও বিয়ের জন্য', STORE.freeDeliveryBn],
    bullets_en: ['Comfort fit', 'For Eid & weddings', STORE.freeDeliveryEn],
    faq: [],
    keywords: 'kids panjabi, বাচ্চাদের পাঞ্জাবি',
  },

  'shirt-&-pants': {
    h2_bn: 'কিডস শার্ট ও প্যান্ট',
    h2_en: 'Kids Shirt & Pants',
    intro_bn: 'ছেলে বাচ্চাদের শার্ট-প্যান্ট সেট — স্কুল ও দৈনন্দিন পরায়।',
    intro_en: 'Boys’ shirt & pants sets for school and everyday wear.',
    bullets_bn: ['টেকসই ফেব্রিক', 'সাইজ ভ্যারাইটি'],
    bullets_en: ['Durable fabrics', 'Size variety'],
    faq: [],
    keywords: 'kids shirt pants, বাচ্চাদের শার্ট',
  },

  'newborn-essentials': {
    h2_bn: 'নিউবর্ন এসেনশিয়ালস',
    h2_en: 'Newborn Essentials',
    intro_bn: 'নবজাতকের জন্য নরম ও নিরাপদ পোশাকের এসেনশিয়ালস।',
    intro_en: 'Soft, safe essential wear for newborns.',
    bullets_bn: ['সফট ফেব্রিক', 'বেবি-ফ্রেন্ডলি', STORE.codBn],
    bullets_en: ['Soft fabrics', 'Baby-friendly', STORE.codEn],
    faq: [],
    keywords: 'newborn clothes Mirsharai, নিউবর্ন পোশাক',
  },

  'lehenga-&-gharara': {
    h2_bn: 'কিডস লেহেঙ্গা ও গারারা',
    h2_en: 'Kids Lehenga & Gharara',
    intro_bn: 'মেয়ে বাচ্চাদের লেহেঙ্গা ও গারারা — পার্টি ও উৎসবের লুক।',
    intro_en: 'Girls’ lehenga and gharara for parties and festivals.',
    bullets_bn: ['ফেস্টিভ ডিজাইন', 'কমফোর্ট ফিট'],
    bullets_en: ['Festive designs', 'Comfort fit'],
    faq: [],
    keywords: 'kids lehenga, বাচ্চাদের লেহেঙ্গা',
  },

  'frock-&-dress': {
    h2_bn: 'ফ্রক ও ড্রেস — কিডস গার্লস',
    h2_en: 'Frock & Dress — Girls',
    intro_bn: 'মেয়ে বাচ্চাদের ফ্রক ও ড্রেসের রঙিন কালেকশন।',
    intro_en: 'Colourful frocks and dresses for girls.',
    bullets_bn: ['কিউট ডিজাইন', 'দৈনন্দিন ও পার্টি', STORE.freeDeliveryBn],
    bullets_en: ['Cute designs', 'Everyday & party', STORE.freeDeliveryEn],
    faq: [],
    keywords: 'kids frock, বাচ্চাদের ফ্রক বারইয়ারহাট',
  },
};

/** Alias map for DB id variants → canonical SEO key */
const ALIASES = {
  sari: 'saree',
  saree: 'saree',
  'three-piece-salwar': 'three-piece',
  'stiched-coton-three-piece': 'stitched-cotton-three-piece',
  'stitched-coton-three-piece': 'stitched-cotton-three-piece',
};

function buildGeneric(nameEn, nameBn, category) {
  const labelBn = nameBn || nameEn;
  const labelEn = nameEn || nameBn;
  const cat = category && category !== 'All' ? category : 'Family Fashion';
  return {
    h2_bn: `${labelBn} কালেকশন — Big Bazar ${STORE.placeBn}`,
    h2_en: `${labelEn} Collection — Big Bazar ${STORE.place}`,
    intro_bn: `Big Bazar-এ ${labelBn} এর ফিক্সড-প্রাইস কালেকশন। শোরুমে দেখে কিনুন অথবা onlinebigbazar.com-এ অর্ডার করুন — ${STORE.freeDeliveryBn}।`,
    intro_en: `Shop ${labelEn} at fixed prices from Big Bazar. Visit our showroom or order on onlinebigbazar.com — ${STORE.freeDeliveryEn}.`,
    bullets_bn: [
      `${cat} ক্যাটাগরিতে নির্বাচিত ${labelBn}`,
      'ফিক্সড প্রাইস · স্বচ্ছ দাম',
      STORE.codBn,
      'বারইয়ারহাট জমিদার প্লাজা (২য় তলা)',
    ],
    bullets_en: [
      `Curated ${labelEn} in ${cat}`,
      'Fixed prices · transparent',
      STORE.codEn,
      'Jomidar Plaza, 2nd floor, Baraiyarhat',
    ],
    faq: [
      {
        q_bn: `${labelBn} স্টক কীভাবে চেক করব?`,
        q_en: `How do I check ${labelEn} stock?`,
        a_bn: 'এই পেজের প্রোডাক্টগুলো দেখুন, বা WhatsApp/হেল্পলাইনে জিজ্ঞাসা করুন।',
        a_en: 'Browse products on this page, or ask via WhatsApp/helpline.',
      },
    ],
    keywords: `${labelEn} Baraiyarhat, ${labelBn} মীরসরাই, Big Bazar ${labelEn}`,
  };
}

/**
 * @param {{ id?: string, name_en?: string, name_bn?: string, en?: string, bn?: string }} sub
 * @param {string} [category]
 */
export function getSubcategorySeo(sub, category = '') {
  if (!sub && !category) return null;
  const id = sub?.id || '';
  const nameEn = sub?.name_en || sub?.en || id.replace(/-/g, ' ');
  const nameBn = sub?.name_bn || sub?.bn || nameEn;
  const key = ALIASES[norm(id)] || norm(id);
  const dedicated = SEO_BY_ID[key];
  if (dedicated) return { ...dedicated, nameEn, nameBn, id };
  return { ...buildGeneric(nameEn, nameBn, category), nameEn, nameBn, id };
}

export function getSubcategoryMeta(sub, category = '') {
  const seo = getSubcategorySeo(sub, category);
  if (!seo) return null;
  const title = `${seo.nameEn} | ${seo.nameBn} — Big Bazar Baraiyarhat | Buy Online`;
  const description = `${seo.intro_en} ${STORE.codEn}. Showroom: ${STORE.place}.`;
  return { title, description, keywords: seo.keywords, seo };
}
