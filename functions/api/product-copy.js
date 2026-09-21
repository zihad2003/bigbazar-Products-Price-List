/**
 * Admin product naming + description helper.
 * Uses Groq/Gemini when keys exist; otherwise template fallback.
 */

function cleanText(s) {
  return String(s || '').replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
}

function colorLabels(colors) {
  if (!Array.isArray(colors)) return [];
  return colors
    .map((c) => (typeof c === 'object' ? c.name : c))
    .filter(Boolean)
    .slice(0, 6);
}

function sizeLabels(sizes) {
  if (!Array.isArray(sizes)) return [];
  return sizes
    .map((s) => (typeof s === 'object' ? s.name : s))
    .filter(Boolean)
    .slice(0, 8);
}

export function buildTemplateCopy(ctx = {}) {
  const category = String(ctx.category || '').trim() || 'Fashion';
  const subcategory = String(ctx.subcategory || '').split('/')[0].trim();
  const seed = String(ctx.name || '').trim();
  const colors = colorLabels(ctx.colors);
  const sizes = sizeLabels(ctx.sizes);
  const price = ctx.price ? `৳${ctx.price}` : '';
  const exclusive = Boolean(ctx.is_exclusive);
  const base = subcategory || category;
  const colorBit = colors.length ? colors.slice(0, 2).join(' / ') : '';

  const names = [
    seed || null,
    exclusive ? `Exclusive ${base}` : null,
    colorBit ? `${base} — ${colorBit}` : `${base} Collection`,
    `Premium ${base}`,
    `Ready ${base}`,
  ]
    .filter(Boolean)
    .map((n) => n.replace(/\s+/g, ' ').trim())
    .filter((n, i, arr) => arr.findIndex((x) => x.toLowerCase() === n.toLowerCase()) === i)
    .slice(0, 5);

  const fabricHint = /panjabi|shirt|t-shirt|tee/i.test(base)
    ? 'Comfortable fabric with a clean everyday fit.'
    : /saree|sharee|শাড়ি/i.test(base)
      ? 'Elegant drape for parties, weddings, and festive wear.'
      : /three.?piece|3.?piece|থ্রি/i.test(base)
        ? 'Matching set designed for a polished party look.'
        : 'Soft fabric, easy to wear, made for regular and occasion use.';

  const colorLine = colors.length ? ` Available colors: ${colors.join(', ')}.` : '';
  const sizeLine = sizes.length ? ` Sizes: ${sizes.join(', ')}.` : '';
  const priceLine = price ? ` Sale price ${price}.` : '';

  const descriptionBn = `${base} — ${fabricHint.replace(/\.$/, '')}।${colorLine}${sizeLine}${priceLine} Big Bazar, Baraiyarhat।`.trim();
  const descriptionEn = `${names[0] || base}: ${fabricHint}${colorLine}${sizeLine}${priceLine} Shop Big Bazar, Baraiyarhat.`.trim();

  return {
    names,
    description: descriptionBn,
    description_en: descriptionEn,
    source: 'template',
  };
}

function parseAiJson(raw) {
  const text = cleanText(raw);
  if (!text) return null;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced ? fenced[1] : text).trim();
  try {
    return JSON.parse(candidate);
  } catch {
    const start = candidate.indexOf('{');
    const end = candidate.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(candidate.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

async function callGroq(apiKey, systemPrompt, userPrompt) {
  const models = ['openai/gpt-oss-120b', 'groq/compound', 'qwen/qwen3.6-27b'];
  for (const model of models) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: 700,
          temperature: 0.45,
        }),
      });
      const data = await res.json();
      const text = cleanText(data.choices?.[0]?.message?.content);
      if (text) return text;
    } catch (e) {
      console.error(`product-copy Groq ${model}:`, e);
    }
  }
  return '';
}

async function callGemini(apiKey, systemPrompt, userPrompt) {
  const models = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];
  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          generationConfig: { maxOutputTokens: 700, temperature: 0.45 },
        }),
      });
      const data = await res.json();
      const text = cleanText(data.candidates?.[0]?.content?.parts?.[0]?.text);
      if (text) return text;
    } catch (e) {
      console.error(`product-copy Gemini ${model}:`, e);
    }
  }
  return '';
}

export async function generateProductCopy(env, ctx = {}) {
  const fallback = buildTemplateCopy(ctx);
  const groqApiKey = env?.GROQ_API_KEY || (typeof process !== 'undefined' && process.env?.GROQ_API_KEY);
  const geminiApiKey = env?.GEMINI_API_KEY || (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY);

  if (!groqApiKey && !geminiApiKey) return fallback;

  const mode = ctx.mode === 'name' || ctx.mode === 'description' ? ctx.mode : 'both';
  const colors = colorLabels(ctx.colors);
  const sizes = sizeLabels(ctx.sizes);

  const systemPrompt = `You are Big Bazar's product copywriter for a Bangladeshi family fashion store (Baraiyarhat, Mirsarai, Chattogram).
Return ONLY valid JSON (no markdown) with this shape:
{"names":["...","...","..."],"description":"...","description_en":"..."}

Rules:
- names: 3 to 5 short retail titles (max ~60 chars). Mix natural Bangla + English fashion wording customers search for.
- Prefer category/subcategory style (e.g. Panjabi, Three Piece, Partywear) over vague words.
- description: 2-4 short Bangla sentences covering fabric/feel, occasion, fit, and care if obvious. No emojis. No fake claims.
- description_en: 1-2 English sentences mirroring the Bangla pitch.
- If improving an existing name/description, keep brand truth and only polish clarity.
- Never invent stock, discounts, or materials that were not provided.`;

  const userPrompt = JSON.stringify({
    mode,
    current_name: ctx.name || '',
    current_description: ctx.description || '',
    category: ctx.category || '',
    subcategory: ctx.subcategory || '',
    price: ctx.price || '',
    original_price: ctx.original_price || '',
    colors,
    sizes,
    is_exclusive: Boolean(ctx.is_exclusive),
    notes: ctx.notes || '',
  });

  let raw = '';
  if (groqApiKey) raw = await callGroq(groqApiKey, systemPrompt, userPrompt);
  if (!raw && geminiApiKey) raw = await callGemini(geminiApiKey, systemPrompt, userPrompt);
  if (!raw) return fallback;

  const parsed = parseAiJson(raw);
  if (!parsed) return { ...fallback, source: 'template', ai_raw: raw.slice(0, 200) };

  const names = (Array.isArray(parsed.names) ? parsed.names : [])
    .map((n) => String(n || '').replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .slice(0, 5);

  const description = String(parsed.description || '').trim();
  const descriptionEn = String(parsed.description_en || '').trim();

  return {
    names: names.length ? names : fallback.names,
    description: description || fallback.description,
    description_en: descriptionEn || fallback.description_en,
    source: 'ai',
  };
}
