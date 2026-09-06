import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Local Assistant Dev Plugin — shares query routing with production
function assistantDevPlugin() {
  return {
    name: 'assistant-dev-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!(req.url?.startsWith('/api/assistant') && req.method === 'POST')) {
          return next();
        }

        let bodyStr = '';
        req.on('data', chunk => { bodyStr += chunk; });
        req.on('end', async () => {
          const send = (payload, status = 200) => {
            res.statusCode = status;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(payload));
          };

          try {
            const body = JSON.parse(bodyStr || '{}');
            const env = loadEnv('development', process.cwd(), '');
            const geminiApiKey = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
            const groqApiKey = env.GROQ_API_KEY || process.env.GROQ_API_KEY;
            const dbUrl = env.DATABASE_URL || process.env.DATABASE_URL;

            const q = await import('./functions/api/assistant-query.js');
            const userMessage = (body.message || '').trim();
            const lang = body.language === 'en' ? 'en' : 'bn';
            const lowerMsg = userMessage.toLowerCase();
            const requestedOffset = parseInt(body.offset, 10) || 0;
            const requestedLimit = 5;

            if (!userMessage) {
              return send({
                reply: lang === 'en'
                  ? 'Welcome to Big Bazar! How can I help you today?'
                  : 'আসসালামু আলাইকুম! বিগ বাজারে কীভাবে সাহায্য করতে পারি?',
                products: [],
                quick_replies: q.defaultQuickReplies(lang)
              });
            }

            let conn = null;
            const getConn = async () => {
              if (conn) return conn;
              if (!dbUrl) throw new Error('DATABASE_URL missing');
              const { connect } = await import('@tidbcloud/serverless');
              conn = connect({ url: dbUrl });
              return conn;
            };

            // ── Order intent ──
            if (q.isDirectOrderIntent(lowerMsg)) {
              const orderQty = q.extractOrderQuantity(lowerMsg);
              const keywords = q.extractOrderKeywords(lowerMsg);
              let targetProduct = null;

              try {
                const db = await getConn();
                for (const kw of keywords) {
                  const matchedRows = await db.execute(
                    "SELECT id, name, price, original_price, images, image_url, description, category, subcategory, stock_count, available_sizes, available_colors, is_exclusive FROM products WHERE (LOWER(name) LIKE ? OR LOWER(subcategory) LIKE ?) AND status = 'published' AND (is_deleted = 0 OR is_deleted IS NULL) LIMIT 1",
                    [`%${kw}%`, `%${kw}%`]
                  );
                  if (matchedRows?.length) {
                    targetProduct = q.mapProductRow(matchedRows[0]);
                    break;
                  }
                }
              } catch (e) {
                console.error('Dev order-intent DB error:', e.message || e);
              }

              if (!targetProduct && body.current_product?.id) {
                targetProduct = body.current_product;
              }

              if (targetProduct) {
                return send({
                  reply: lang === 'en'
                    ? `Ready to order ${targetProduct.name} (×${orderQty}). Fill in your name and delivery address, then submit.`
                    : `আপনার ${targetProduct.name} (${orderQty} টি) অর্ডারের জন্য নিচে ফরমটি প্রস্তুত করা হয়েছে। অনুগ্রহ করে আপনার নাম ও ডেলিভারির ঠিকানা দিয়ে সাবমিট করুন:`,
                  order_intent: { product: targetProduct, quantity: orderQty },
                  products: [targetProduct],
                  total_count: 1,
                  has_more: false,
                  current_offset: 0,
                  category_query: '',
                  quick_replies: [],
                  handoff: false
                });
              }
            }

            // ── FAQ first for customer-service queries (no DB needed) ──
            const faqReply = q.resolveFaqReply(userMessage, lang);
            const { matchedCategory, searchTerm } = q.detectCategoryMatch(lowerMsg, body.category_query);
            const wantsCatalog = q.hasProductCatalogSearchIntent(lowerMsg, matchedCategory);

            let productsRes = [];
            let totalAvailable = 0;
            let hasMore = false;
            let replyText = '';

            if (wantsCatalog) {
              try {
                const db = await getConn();
                const { countSql, countParams, dataSql, dataParams } = q.buildProductSearch(
                  matchedCategory, userMessage, requestedLimit, requestedOffset
                );
                const countRows = await db.execute(countSql, countParams);
                totalAvailable = countRows[0]?.total || 0;
                const rows = await db.execute(dataSql, dataParams);
                productsRes = (rows || []).map(q.mapProductRow);
                hasMore = (requestedOffset + productsRes.length) < totalAvailable;
                replyText = q.getCatalogReplyText(productsRes.length, requestedOffset, lang);
              } catch (err) {
                console.error('Dev TiDB query error:', err.message || err);
                replyText = lang === 'en'
                  ? 'Catalog is temporarily unavailable. Try again or call 01857045449.'
                  : 'কালেকশন সাময়িকভাবে লোড হচ্ছে না। অনুগ্রহ করে আবার চেষ্টা করুন বা 01857045449 এ কল দিন।';
              }
            } else if (faqReply) {
              replyText = faqReply;
            }

            // ── AI fallback ──
            if (!replyText && (geminiApiKey || groqApiKey)) {
              const currProd = body.current_product || null;
              const prodContextStr = currProd
                ? `\nCURRENT PRODUCT: ${currProd.name || ''} | ৳${currProd.price || ''} | ${currProd.category || ''}/${currProd.subcategory || ''}\nDescription: ${currProd.description || 'n/a'}\n`
                : '';
              const systemPrompt = `You are BigBazar shopping assistant (Baraiyarhat, Mirsarai, Chittagong).
${prodContextStr}
Knowledge: Helpline 01857045449, WhatsApp 01824950082, showroom 2nd floor Zamindar Plaza.
Delivery: Mirsarai free (+৳100 confirm fee), Chattogram ৳100, Bangladesh ৳150. Fixed prices, no bargaining.
Reply in ${lang === 'en' ? 'English' : 'Bengali'}, 1-3 short helpful sentences. No emojis.`;

              if (groqApiKey) {
                for (const m of ['openai/gpt-oss-120b', 'groq/compound', 'qwen/qwen3.6-27b']) {
                  try {
                    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${groqApiKey}` },
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
                    if (text) { replyText = text; break; }
                  } catch (e) {
                    console.error(`Dev Groq error for ${m}:`, e.message || e);
                  }
                }
              }

              if (!replyText && geminiApiKey) {
                for (const model of ['gemini-2.0-flash', 'gemini-1.5-flash']) {
                  try {
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
                    if (candidateText) { replyText = candidateText; break; }
                  } catch (e) {
                    console.error('Dev Gemini error:', e.message || e);
                  }
                }
              }
            }

            if (!replyText) {
              replyText = faqReply || q.getSmartFallbackReply(lowerMsg, lang);
            }

            return send({
              reply: replyText,
              products: productsRes,
              total_count: totalAvailable,
              has_more: hasMore,
              current_offset: requestedOffset,
              category_query: matchedCategory || searchTerm || '',
              quick_replies: productsRes.length ? [] : q.defaultQuickReplies(lang),
              handoff: false
            });
          } catch (err) {
            console.error('Dev assistant error:', err);
            send({
              reply: 'সাময়িক সমস্যা হচ্ছে। অনুগ্রহ করে আবার চেষ্টা করুন বা হেল্পলাইন 01857045449 এ কল দিন।',
              products: [],
              quick_replies: ['ডেলিভারি তথ্য', 'শোরুম লোকেশন'],
              handoff: true
            }, 200);
          }
        });
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
