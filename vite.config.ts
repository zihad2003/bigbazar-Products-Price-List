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

              if (/saree|sari|saari|saaree|sharee|shari|শাড়ি|শাড়ী/i.test(lowerMsg)) {
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
              } else if (/আরও|more|next/i.test(lowerMsg)) {
                if (body.category_query) {
                  matchedCategory = body.category_query;
                  searchTerm = body.category_query;
                }
              }

              const hasProductIntent = matchedCategory !== null || 
                /ki\s*ace|ki\s*ache|ki\s*ki|কি\s*আছে|কি\s*কি|ace|ache|collection|কালেকশন|price|দাম|কত|koto|dekhaw|dekhan|দেখান|show|product|পণ্য|dress|পোশাক|poshak|পাওয়া\s*যাবে|pawa\s*jabe/i.test(lowerMsg);

              let productsRes = [];
              let totalAvailable = 0;
              let hasMore = false;

              if (hasProductIntent) {
                let sql = "SELECT id, name, price, original_price, images, image_url, description, category, subcategory, stock_count, available_sizes, available_colors FROM products WHERE status = 'published' AND (is_deleted = 0 OR is_deleted IS NULL) AND (is_sold_out = 0 OR is_sold_out IS NULL)";
                const params = [];

                if (matchedCategory) {
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
                } else if (userMessage.length > 2) {
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

              if (hasProductIntent) {
                if (productsRes.length > 0) {
                  replyText = 'আমাদের কালেকশন থেকে প্রোডাক্টগুলো নিচে দেওয়া হলো। আপনি সরাসরি অর্ডার করতে পারেন বা বিস্তারিত দেখতে পারেন:';
                } else {
                  replyText = 'পণ্যটি এখনও ওয়েবসাইটে যুক্ত করা হয়নি। আপনি আমাদের শোরুমে (২য় তলা, জমিদারের প্লাজা, বারইয়ারহাট) সরাসরি ভিজিট করে পণ্যটি নিতে পারবেন।';
                }
              } else {
                const faqMatch = matchFAQ(userMessage);
                if (faqMatch && faqMatch.entry) {
                  replyText = lang === 'bn' ? faqMatch.entry.answer_bn : faqMatch.entry.answer_en;
                }
              }

              // If still no reply, ask Gemini/Gemma
              if (!replyText) {
                try {
                  const systemPrompt = `You are BigBazar AI Shopping Assistant for a Bangladeshi fashion store (Mirsarai, Chittagong).
RULES:
1. Always reply in 1-2 complete, polite Bengali sentences. Never cut off or leave sentences incomplete.
2. If customer asks about products or shopping, invite them to browse our categories or visit our showroom (2nd Floor, Jomidar Plaza, Baraiyarhat).`;

                  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${geminiApiKey}`;
                  const prompt = `Customer asks: "${userMessage}". Reply politely in complete Bengali sentences:`;

                  const gRes = await fetch(geminiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      systemInstruction: { parts: [{ text: systemPrompt }] },
                      contents: [{ role: 'user', parts: [{ text: prompt }] }],
                      generationConfig: { maxOutputTokens: 600, temperature: 0.3 }
                    })
                  });
                  const gData = await gRes.json();
                  replyText = gData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
                } catch (e) {
                  console.error('Gemini error:', e);
                }
              }

              if (!replyText) {
                replyText = 'আমি কীভাবে আপনাকে সহায়তা করতে পারি? নিচে আমাদের ক্যাটাগরিগুলো দেখতে পারেন।';
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
