import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Local Assistant Dev Plugin for Vite
function assistantDevPlugin() {
  return {
    name: 'assistant-dev-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url?.startsWith('/api/assistant') && req.method === 'POST') {
          let bodyStr = '';
          req.on('data', chunk => { bodyStr += chunk; });
          req.on('end', async () => {
            try {
              const body = JSON.parse(bodyStr || '{}');
              const env = loadEnv('development', process.cwd(), '');
              const geminiApiKey = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
              const groqApiKey = env.GROQ_API_KEY || process.env.GROQ_API_KEY;
              const dbUrl = env.DATABASE_URL || process.env.DATABASE_URL;

              const { FAQ_KB, matchFAQ } = await import('./functions/api/assistant-kb.js');
              const { connect } = await import('@tidbcloud/serverless');
              const conn = connect({ url: dbUrl });

              const userMessage = (body.message || '').trim();
              const lang = body.language || (/[ঀ-৿]/.test(userMessage) ? 'bn' : 'bn'); // default to Bengali
              const requestedOffset = parseInt(body.offset) || 0;
              const requestedLimit = 5;

              if (!userMessage) {
                res.setHeader('Content-Type', 'application/json');
                return res.end(JSON.stringify({
                  reply: 'আসসালামু আলাইকুম! বিগ বাজারে কীভাবে সাহায্য করতে পারি? নিচে আমাদের জনপ্রিয় কালেকশনগুলো দেখতে পারেন।',
                  products: [],
                  quick_replies: ['শাড়ি কালেকশন', 'থ্রি-পিস কালেকশন', 'পারশি কালেকশন', 'ওয়েস্টার্ন টু-পিস', 'ডেলিভারি তথ্য']
                }));
              }

              const lowerMsg = userMessage.toLowerCase();

              // Subcategory & Category Keyword Mapping (Bangla, English & Banglish)
              let matchedCategory = null;
              let searchTerm = null;

              // Prioritize explicit category_query from client selection
              if (body.category_query && body.category_query !== 'ALL') {
                matchedCategory = body.category_query;
                searchTerm = body.category_query;
              } else if (/saree|sari|saari|saaree|sharee|shari|শাড়ি|শাড়ী/i.test(lowerMsg)) {
                matchedCategory = 'SAREE';
                searchTerm = 'saree';
              } else if (/three\s*piece|3\s*piece|thri|three|থ্রি|পিস|৩\s*পিস/i.test(lowerMsg)) {
                matchedCategory = 'STITCHED-COTTON-THREE-PIECE';
                searchTerm = 'three piece';
              } else if (/parshi|porshi|parsi|পারশি|পারশী/i.test(lowerMsg)) {
                matchedCategory = 'PARSHI';
                searchTerm = 'parshi';
              } else if (/western|2\s*piece|টু\s*পিস|টু-পিস|ওয়েস্টার্ন/i.test(lowerMsg)) {
                matchedCategory = 'WESTERN-2-PIECE';
                searchTerm = 'western';
              } else if (/panjabi|punjabi|পাঞ্জাবি|পাঞ্জাবী/i.test(lowerMsg)) {
                matchedCategory = 'PANJABI';
                searchTerm = 'panjabi';
              } else if (/borka|burqa|abaya|বোরকা|বোরখা|আবায়া/i.test(lowerMsg)) {
                matchedCategory = 'BORKA';
                searchTerm = 'borka';
              } else if (/kurti|kurtee|কুর্তি/i.test(lowerMsg)) {
                matchedCategory = 'KURTI';
                searchTerm = 'kurti';
              } else if (/chele|cheleder|purush|gents|men|ছেলেদের|পুরুষ|ছেলে/i.test(lowerMsg)) {
                matchedCategory = 'Men';
                searchTerm = 'Men';
              } else if (/baccader\s*chele|baccha\s*chele|kids\s*boys?|বাচ্চাদের\s*\(?ছেলে\)?/i.test(lowerMsg)) {
                matchedCategory = 'Kids (Boys)';
                searchTerm = 'Kids (Boys)';
              } else if (/baccader\s*meye|baccha\s*meye|kids\s*girls?|বাচ্চাদের\s*\(?মেয়ে\)?/i.test(lowerMsg)) {
                matchedCategory = 'Kids (Girls)';
                searchTerm = 'Kids (Girls)';
              } else if (/baccha|baccader|kids|shishu|বাচ্চাদের|শিশু/i.test(lowerMsg)) {
                matchedCategory = 'Kids';
                searchTerm = 'Kids';
              } else if (/meye|meyeder|mohila|women|ladies|মেয়েদের|মহিলা|মেয়ে/i.test(lowerMsg)) {
                matchedCategory = 'Women';
                searchTerm = 'Women';
              } else if (/biyer|bridal|wedding|karchupi|বিয়ের\s*সাজনি|বিয়ে|কারচুপি/i.test(lowerMsg)) {
                matchedCategory = 'Biyer Sajani';
                searchTerm = 'Biyer Sajani';
              } else if (/আরও|aro|more|next|baki|অন্যান্য/i.test(lowerMsg)) {
                if (body.category_query && body.category_query !== 'ALL') {
                  matchedCategory = body.category_query;
                  searchTerm = body.category_query;
                } else {
                  matchedCategory = 'ALL';
                }
              }

              // Check if user is asking an inquiry about fabric/material/video/quality/details rather than searching catalog
              const isDetailInquiry = /video|ভিডিও|kapor|কাপড়|কাপর|fabric|ফেব্রি|মেটেরিয়াল|material|কোয়ালিটি|quality|rong|রং|কালার|color|wash|ওয়াশ|suiti|সুতি|silk|সিল্ক|jamdani|জামদানি|dupiyan|ডুপিয়ান|chobi|ছবি|photo|picture|real|লাইভ|হাতে|পাওয়া|কতদিন|সময়|ঠিকানা|শোরুম|কম|discount|customer|দাম|price|koto|কত|পেমেন্ট|বিকাশ|bkash/i.test(lowerMsg);

              const hasProductCatalogSearchIntent = (matchedCategory !== null || 
                /কালেকশন|collection|দেখাও|দেখান|show|খুঁজছি|dekhte\s*chai|দেখতে\s*চাই|dress|পোশাক|poshak|পাওয়া\s*যাবে|pawa\s*jabe|aro|আরও|more|next/i.test(lowerMsg)) && !isDetailInquiry;

              let productsRes = [];
              let totalAvailable = 0;
              let hasMore = false;

              if (hasProductCatalogSearchIntent) {
                let sql = "SELECT id, name, price, original_price, images, image_url, description, category, subcategory, stock_count, available_sizes, available_colors FROM products WHERE status = 'published' AND (is_deleted = 0 OR is_deleted IS NULL) AND (is_sold_out = 0 OR is_sold_out IS NULL)";
                const params = [];

                if (matchedCategory && matchedCategory !== 'ALL') {
                  if (matchedCategory === 'Men' || matchedCategory === 'Women' || matchedCategory === 'Kids (Boys)' || matchedCategory === 'Kids (Girls)') {
                    sql += " AND UPPER(category) = ?";
                    params.push(matchedCategory.toUpperCase());
                  } else if (matchedCategory === 'Kids') {
                    sql += " AND UPPER(category) LIKE 'KIDS%'";
                  } else if (matchedCategory === 'Biyer Sajani') {
                    sql += " AND (UPPER(subcategory) LIKE '%JAMDANI%' OR UPPER(subcategory) LIKE '%KATAN%' OR UPPER(subcategory) LIKE '%BRIDAL%' OR UPPER(name) LIKE '%BRIDAL%' OR UPPER(name) LIKE '%WEDDING%')";
                  } else {
                    sql += " AND (UPPER(subcategory) LIKE ? OR UPPER(name) LIKE ? OR UPPER(category) LIKE ?)";
                    params.push(`%${matchedCategory.toUpperCase()}%`, `%${matchedCategory.toUpperCase()}%`, `%${matchedCategory.toUpperCase()}%`);
                  }
                } else if (matchedCategory !== 'ALL' && userMessage.length > 2) {
                  const cleanKeyword = userMessage.replace(/[^\w\s\u0980-\u09FF]/g, '').trim().split(' ')[0];
                  sql += " AND (name LIKE ? OR category LIKE ? OR subcategory LIKE ?)";
                  params.push(`%${cleanKeyword}%`, `%${cleanKeyword}%`, `%${cleanKeyword}%`);
                }

                // Get total count in stock
                const countSql = sql.replace("SELECT id, name, price, original_price, images, image_url, description, category, subcategory, stock_count, available_sizes, available_colors", "SELECT COUNT(*) as total");
                try {
                  const countRows = await conn.execute(countSql, params);
                  totalAvailable = countRows[0]?.total || 0;

                  sql += " ORDER BY is_hot DESC, created_at DESC LIMIT ? OFFSET ?";
                  params.push(requestedLimit, requestedOffset);

                  const rows = await conn.execute(sql, params);
                  productsRes = rows.map(r => {
                    let imgs = [];
                    try { imgs = r.images ? JSON.parse(r.images) : []; } catch (_) {}
                    let sizes = [];
                    try { sizes = typeof r.available_sizes === 'string' ? JSON.parse(r.available_sizes) : (r.available_sizes || []); } catch (_) {}
                    let colors = [];
                    try { colors = typeof r.available_colors === 'string' ? JSON.parse(r.available_colors) : (r.available_colors || []); } catch (_) {}

                    return {
                      id: r.id,
                      name: r.name,
                      price: parseFloat(r.price),
                      original_price: r.original_price ? parseFloat(r.original_price) : null,
                      image_url: r.image_url || imgs[0] || '',
                      images: imgs,
                      available_sizes: sizes,
                      available_colors: colors,
                      description: r.description || '',
                      category: r.category || '',
                      subcategory: r.subcategory || '',
                      stock_count: r.stock_count || 0
                    };
                  });

                  hasMore = (requestedOffset + productsRes.length) < totalAvailable;
                } catch (err) {
                  console.error('TiDB query error:', err);
                }
              }

              let replyText = '';

              if (hasProductCatalogSearchIntent) {
                if (productsRes.length > 0) {
                  replyText = requestedOffset > 0
                    ? 'আমাদের কালেকশন থেকে আরও কিছু আকর্ষণীয় পণ্য নিচে দেওয়া হলো:'
                    : 'আমাদের কালেকশন থেকে প্রোডাক্টগুলো নিচে দেওয়া হলো। আপনি সরাসরি অর্ডার করতে পারেন বা বিস্তারিত দেখতে পারেন:';
                } else {
                  replyText = requestedOffset > 0
                    ? 'এই কালেকশনের আর কোনো অতিরিক্ত পণ্য এই মুহূর্তে নেই। আপনি পুরো কালেকশনটি শপে গিয়ে দেখতে পারেন।'
                    : 'পণ্যটি এখনও ওয়েবসাইটে যুক্ত করা হয়নি। আপনি আমাদের শোরুমে (২য় তলা, জমিদারের প্লাজা, বারইয়ারহাট) সরাসরি ভিজিট করে পণ্যটি নিতে পারবেন।';
                }
              } else {
                const faqMatch = matchFAQ(userMessage);
                if (faqMatch && faqMatch.entry) {
                  replyText = lang === 'bn' ? faqMatch.entry.answer_bn : faqMatch.entry.answer_en;
                }
              }

              // Step 3: AI Inference (Groq Ultra-Fast LPU & Google Gemini)
              if (!replyText && (geminiApiKey || groqApiKey)) {
                const currProd = body.current_product || null;
                let prodContextStr = '';
                if (currProd) {
                  prodContextStr = `
CURRENT VIEWED PRODUCT CONTEXT:
- Product Name: ${currProd.name || ''}
- Price: ৳${currProd.price || ''}
- Category/Subcategory: ${currProd.category || ''} / ${currProd.subcategory || ''}
- Description: ${currProd.description || 'Not specifically described'}
`;
                }

                const systemPrompt = `You are BigBazar AI Shopping Assistant for Big Bazar, a leading premier family fashion retail store located at 2nd Floor, Jomidar Plaza, Baraiyarhat Bazar, Mirsarai, Chittagong.
${prodContextStr}
FOOTER & BRAND KNOWLEDGE:
- Facebook: https://www.facebook.com/profile.php?id=100063541603515
- Instagram: https://www.instagram.com/big_bazar_25/
- TikTok & Videos: https://www.tiktok.com/@big.bazar2
- WhatsApp: 01824950082 (call/text for live video view, custom sizing or sharing photos: https://wa.me/8801824950082)
- Helpline: 01857045449
- Email: infobigbazar01@gmail.com
- Opening hours: Everyday 9:30 AM to 9:30 PM
- Pricing: Strict fixed-price shop ensuring fair prices and premium fabric quality.
- Delivery: Mirsarai Upazila 100% Free delivery (100 Tk advance confirmation fee), Chittagong District 100 Tk, All Bangladesh 150 Tk. Cash on delivery available.
- Bridal Zone: 'Biyer Sajani' (Exclusive bridal sarees, katan, lehenga, sherwani, kabli set, blazers).

PRODUCT INQUIRY & FABRIC INTELLIGENCE:
1. Delivery & Location Inquiries:
   - When a customer asks about delivery charge or delivery time ("delivery charge koto?", "delivery fee?", "kotodin lagbe?"):
     Explain clearly:
     * মীরসরাই উপজেলা: সম্পূর্ণ ফ্রি ডেলিভারি (১০০ টাকা অর্ডার কনফার্মেশন ফি অগ্রিম, যা মোট বিল থেকে বাদ যাবে)।
     * চট্টগ্রাম জেলা: ১০০ টাকা (১-২ দিন)।
     * সারা বাংলাদেশ: ১৫০ টাকা (২-৫ দিন)।
     Always finish by asking: "আপনার ডেলিভারির লোকেশন বা ঠিকানাটি কোথায়? (যেমন: মীরসরাই, চট্টগ্রাম নাকি অন্য কোনো জেলা?)"
   - When customer states their location (e.g. Mirsarai, Chittagong, Dhaka, Feni):
     * Mirsarai / Baraiyarhat: "মীরসরাই উপজেলায় সম্পূর্ণ ফ্রি হোম ডেলিভারি সুবিধা রয়েছে (১০০ টাকা অগ্রিম কনফার্মেশন ফি, যা মোট বিল থেকে বাদ যাবে)।"
     * Chittagong District: "চট্টগ্রাম জেলায় ডেলিভারি চার্জ মাত্র ১০০ টাকা (১-২ দিনের মধ্যে ডেলিভারি)।"
     * Other Districts: "আপনার এলাকায় ডেলিভারি চার্জ ১৫০ টাকা (২-৫ দিনের মধ্যে ক্যাশ অন ডেলিভারি)।"

2. Video Requests: If the customer asks for a video/real look of the dress/product, tell them: "এই পোশাকটির রিয়েল ভিডিও দেখতে বা লাইভ ভিডিও কলের মাধ্যমে দেখতে আমাদের অফিসিয়াল হোয়াটসঅ্যাপে (https://wa.me/8801824950082 বা 01824950082) মেসেজ দিন অথবা আমাদের টিকটক পেইজে (https://www.tiktok.com/@big.bazar2) ভিডিও দেখতে পারেন।"
3. Fabric / Material / Quality Requests:
   - If the product description contains details, use it.
   - If description is brief or missing, intelligently explain the fabric based on Bangladeshi fashion expertise:
     * Jamdani / Karchupi Saree: প্রিমিয়াম রেশম-সুতি মিক্সড সুতায় বোনা জমিন এবং নিখুঁত বিলাসবহুল কারচুপি ও জরির কাজ। পার্টি বা বিয়েতে পরার জন্য অত্যন্ত গর্জিয়াস ও আরামদায়ক।
     * Dupiyan Silk / Silk Saree: লাক্সারিয়াস ডুপিয়ান সিল্ক ফেব্রিক, চমৎকার শাইন ও নিখুঁত ড্রেপ।
     * Cotton Three-Piece / Kurti: ১০০% প্রিমিয়াম পিওর সুতি ফেব্রিক, যা অত্যন্ত আরামদায়ক, টেকসই এবং রঙ পাকা।
     * Panjabi / Sherwani: এক্সক্লুসিভ প্রিমিয়াম ফেব্রিক ও নিখুঁত ফিনিশিং।
   - Reassure the customer that Big Bazar guarantees 100% genuine quality and fixed fair pricing.

RULES:
1. Always reply in 1-2 fluent, polite, helpful Bengali sentences.
2. If customer asks for Facebook, Instagram, TikTok, Video, or any social link, provide the exact URL above.
3. Never use any emojis. Never output unfinished thoughts.`;

                if (groqApiKey) {
                  const groqModels = ['openai/gpt-oss-120b', 'groq/compound', 'qwen/qwen3.6-27b'];
                  for (const m of groqModels) {
                    try {
                      const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${groqApiKey}`
                        },
                        body: JSON.stringify({
                          model: m,
                          messages: [
                            { role: 'system', content: systemPrompt },
                            { role: 'user', content: userMessage }
                          ],
                          max_tokens: 350,
                          temperature: 0.3
                        })
                      });
                      const groqData = await groqRes.json();
                      let text = groqData.choices?.[0]?.message?.content?.trim() || '';
                      text = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
                      if (text) {
                        replyText = text;
                        break;
                      }
                    } catch (e) {
                      console.error(`Dev Groq error for ${m}:`, e);
                    }
                  }
                }

                if (!replyText && geminiApiKey) {
                  try {
                    const geminiModels = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];
                    for (const model of geminiModels) {
                      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`;
                      const gRes = await fetch(geminiUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          systemInstruction: { parts: [{ text: systemPrompt }] },
                          contents: [{ role: 'user', parts: [{ text: userMessage }] }],
                          generationConfig: { maxOutputTokens: 500, temperature: 0.3 }
                        })
                      });
                      const gData = await gRes.json();
                      const candidateText = gData.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
                      if (candidateText) {
                        replyText = candidateText;
                        break;
                      }
                    }
                  } catch (e) {
                    console.error('Dev Gemini error:', e);
                  }
                }
              }

              // Step 4: Smart Conversational Fallbacks for Random Queries
              if (!replyText) {
                const norm = lowerMsg.replace(/[^\w\s\u0980-\u09FF]/g, ' ');
                if (/kom|discount|dam\s*kom|char|bargain|ফিক্সড|কম|ছাড়|ডিসকাউন্ট/i.test(norm)) {
                  replyText = 'বিগ বাজার একটি ফিক্সড প্রাইস ফ্যাশন শপ। আমাদের প্রতিটি পণ্যের কোয়ালিটি অনুযায়ী ন্যায্য ও নির্দিষ্ট মূল্য নির্ধারণ করা থাকে। তাই আলাদা কোনো দরদাম বা ছাড়ের সুযোগ নেই।';
                } else if (/regular\s*customer|puran\s*customer|puraton|sob\s*shomoy|রেগুলার|পুরাতন/i.test(norm)) {
                  replyText = 'বিগ বাজারে নিয়মিত কেনাকাটা করার জন্য আপনাকে আন্তরিক ধন্যবাদ! আমাদের সম্মানিত রেগুলার কাস্টমারদের জন্য আমরা সবসময় সর্বোচ্চ কোয়ালিটি এবং দ্রুততম ডেলিভারি নিশ্চিত করি।';
                } else if (/kemon|kemon\s*achen|valo|hi|hello|salam|সালাম|কেমন/i.test(norm)) {
                  replyText = 'আসসালামু আলাইকুম! আলহামদুলিল্লাহ, ভালো আছি। বিগ বাজারে আপনাকে স্বাগতম। আপনি আজ কী ধরনের পোশাক দেখতে চান?';
                } else if (/thikana|kothay|location|dokandari|কোথায়|ঠিকানা|শোরুম/i.test(norm)) {
                  replyText = 'আমাদের শোরুমের ঠিকানা: ২য় তলা, জমিদারের প্লাজা, বারইয়ারহাট পৌরসভা, মীরসরাই, চট্টগ্রাম। প্রতিদিন সকাল ৯:০০ টা থেকে রাত ৯:০০ টা পর্যন্ত খোলা থাকে।';
                } else if (/delivery|charge|deli|ডেলিভারি|খরচ/i.test(norm)) {
                  replyText = 'মীরসরাই উপজেলায় হোম ডেলিভারি সম্পূর্ণ ফ্রি! চট্টগ্রাম জেলায় ১০০ টাকা এবং সারা বাংলাদেশে ১৫০ টাকা ডেলিভারি চার্জ প্রযোজ্য।';
                } else if (/quality|original|fabric|কোয়ালিটি|ফেব্রিক/i.test(norm)) {
                  replyText = 'বিগ বাজারে আমরা প্রিমিয়াম কোয়ালিটির ফেব্রিক ও নিখুঁত ফিনিশিং নিশ্চিত করি। আপনি শতভাগ আস্থার সাথে কেনাকাটা করতে পারেন।';
                } else {
                  replyText = 'আমি আপনার মেসেজটি বুঝতে পেরেছি। পোশাকের কালেকশন দেখতে ক্যাটাগরি বেছে নিন অথবা আমাদের হেল্পলাইনে (01857045449) সরাসরি যোগাযোগ করুন।';
                }
              }

              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                reply: replyText,
                products: productsRes,
                total_count: totalAvailable,
                has_more: hasMore,
                current_offset: requestedOffset,
                category_query: matchedCategory || searchTerm || '',
                quick_replies: [],
                handoff: false
              }));

            } catch (err) {
              console.error('Dev assistant error:', err);
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                reply: 'সাময়িক সমস্যা হচ্ছে। মেসেঞ্জারে যোগাযোগ করুন।',
                products: [],
                quick_replies: ['মেসেঞ্জারে যোগাযোগ করুন'],
                handoff: true
              }));
            }
          });
        } else {
          next();
        }
      });
    }
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), assistantDevPlugin()],
  server: {
    watch: {
      usePolling: true,
    },
    proxy: {
      '/api': {
        target: 'https://bigbazarbariarhat.pages.dev',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false
  }
})
