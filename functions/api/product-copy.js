/**
 * Admin product naming + description helper.
 * Prefer AI (Gemini vision when image available, then Groq); smart template fallback.
 */

function cleanText(s) {
  return String(s || '').replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
}

function colorLabels(colors) {
  if (!Array.isArray(colors)) return [];
  return colors
    .map((c) => {
      if (typeof c === 'object' && c) return String(c.name || '').trim();
      return String(c || '').trim();
    })
    .filter((n) => n && !/^#?[0-9a-f]{3,8}$/i.test(n) && !/^unknown$/i.test(n))
    .filter((n, i, arr) => arr.findIndex((x) => x.toLowerCase() === n.toLowerCase()) === i)
    .slice(0, 6);
}

function sizeLabels(sizes) {
  if (!Array.isArray(sizes)) return [];
  return sizes
    .map((s) => (typeof s === 'object' ? s.name : s))
    .map((s) => String(s || '').trim())
    .filter(Boolean)
    .slice(0, 8);
}

/** Turn IDs like "STITCHED PARTY THREE PIECE" into retail labels */
export function humanizeLabel(raw) {
  let s = String(raw || '').split('/')[0].trim();
  if (!s) return '';
  s = s
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  // Drop noisy prefixes
  s = s.replace(/^(stitched|unstitched|ready|premium|exclusive)\s+/i, '').trim() || s;
  // Title-ish case for Latin words only
  s = s.replace(/\b[a-zA-Z][a-zA-Z']*\b/g, (w) => {
    if (w.length <= 3 && w === w.toUpperCase()) return w;
    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  });
  // Common fashion normalizations
  s = s
    .replace(/\bThree Piece\b/gi, 'Three Piece')
    .replace(/\b3 Piece\b/gi, 'Three Piece')
    .replace(/\b2 Piece\b/gi, 'Two Piece')
    .replace(/\bPartywear\b/gi, 'Partywear')
    .replace(/\bParshi\b/gi, 'Parshi');
  return s;
}

function styleHints(label) {
  const t = label.toLowerCase();
  if (/panjabi|punjabi|shirt/.test(t)) {
    return {
      occasion: 'casual ও semi-formal',
      fabric: 'নরম আরামদায়ক কাপড়',
      pitch: 'দৈনন্দিন ও অফিস লুকে সহজে পরা যায়',
    };
  }
  if (/saree|sharee|শাড়ি|jamdani|katan|karchupi/.test(t)) {
    return {
      occasion: 'পার্টি, বিয়েবাড়ি ও উৎসব',
      fabric: 'এলিগ্যান্ট ড্রেপ',
      pitch: 'বিশেষ দিনের জন্য প্রিমিয়াম লুক',
    };
  }
  if (/three.?piece|3.?piece|থ্রি|party/.test(t)) {
    return {
      occasion: 'পার্টি ও অনুষ্ঠান',
      fabric: 'ম্যাচিং সেট',
      pitch: 'একসাথে পরার পারফেক্ট পার্টি লুক',
    };
  }
  if (/two.?piece|2.?piece|western|kurti|parshi/.test(t)) {
    return {
      occasion: 'ক্যাজুয়াল ও আউটগোয়িং',
      fabric: 'আরামদায়ক ফ্যাব্রিক',
      pitch: 'স্মার্ট ও স্টাইলিশ ডেইলি লুক',
    };
  }
  return {
    occasion: 'দৈনন্দিন ও উপলক্ষ',
    fabric: 'নরম পরতে সুবিধাজনক কাপড়',
    pitch: 'ফ্যামিলি ফ্যাশনের জন্য সহজ চয়েস',
  };
}

export function buildTemplateCopy(ctx = {}) {
  const category = humanizeLabel(ctx.category) || 'Fashion';
  const subcategory = humanizeLabel(ctx.subcategory_label || ctx.subcategory);
  const seed = String(ctx.name || '').trim();
  const colors = colorLabels(ctx.colors);
  const exclusive = Boolean(ctx.is_exclusive);
  const base = subcategory || category;
  const hints = styleHints(base);
  const colorBit = colors.length ? colors.slice(0, 2).join(' / ') : '';

  // Never invent colors — only mention if admin already added them
  const names = [
    exclusive ? `Exclusive ${base}` : null,
    colorBit ? `${base} — ${colorBit}` : null,
    `Premium ${base}`,
    /party|three|saree|parshi/i.test(base) ? `Ready ${base}` : `New ${base}`,
    subcategory && category && subcategory.toLowerCase() !== category.toLowerCase()
      ? `${category} ${base}`
      : null,
    seed && !/^women collection$/i.test(seed) ? seed : null,
  ]
    .filter(Boolean)
    .map((n) => n.replace(/\s+/g, ' ').trim())
    .filter((n) => !/^women collection$/i.test(n) && !/^men collection$/i.test(n))
    .filter((n, i, arr) => arr.findIndex((x) => x.toLowerCase() === n.toLowerCase()) === i)
    .slice(0, 5);

  if (!names.length) names.push(`Premium ${base}`);

  const colorLine = colors.length
    ? ` উপলব্ধ রং: ${colors.join(', ')}।`
    : '';

  const description = [
    `${base} — ${hints.fabric}, ${hints.pitch}।`,
    `${hints.occasion}-এর জন্য উপযোগী।`,
    colorLine.trim(),
  ]
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  const descriptionEn = [
    `${names[0]}: ${hints.pitch} with a polished finish.`,
    `Ideal for ${hints.occasion.replace(/ও/g, 'and')}.`,
    colors.length ? `Colors: ${colors.join(', ')}.` : '',
  ]
    .filter(Boolean)
    .join(' ');

  return {
    names,
    description,
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

function sanitizeNames(names, ctx) {
  const base = humanizeLabel(ctx.subcategory_label || ctx.subcategory || ctx.category) || 'Fashion';
  const allowedColors = new Set(colorLabels(ctx.colors).map((c) => c.toLowerCase()));
  return (Array.isArray(names) ? names : [])
    .map((n) => String(n || '').replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .filter((n) => n.length <= 70)
    .filter((n) => !/^women collection$/i.test(n) && !/^men collection$/i.test(n) && !/^kids collection$/i.test(n))
    .map((n) => {
      // Strip color claims that were not in admin color list
      if (!allowedColors.size && /\s[—\-–]\s*[A-Za-z\u0980-\u09FF]+$/.test(n)) {
        // keep as-is if no colors provided — AI may have seen image; still ok
        return n;
      }
      if (allowedColors.size) {
        const m = n.match(/\s[—\-–]\s*([A-Za-z\u0980-\u09FF /]+)$/);
        if (m) {
          const claimed = m[1].split(/[\/,]/).map((x) => x.trim().toLowerCase()).filter(Boolean);
          if (claimed.some((c) => !allowedColors.has(c))) {
            return n.replace(/\s[—\-–]\s*[A-Za-z\u0980-\u09FF /]+$/, '').trim() || base;
          }
        }
      }
      return n;
    })
    .filter((n, i, arr) => arr.findIndex((x) => x.toLowerCase() === n.toLowerCase()) === i)
    .slice(0, 5);
}

function sanitizeDescription(text, ctx) {
  let d = String(text || '').trim();
  if (!d) return '';
  // Remove store spam / fake claims
  d = d
    .replace(/\s*Big\s*Bazar\s*,?\s*Baraiyarhat\.?/gi, '')
    .replace(/\s*Shop\s+Big\s*Bazar[^.]*\.?/gi, '')
    .replace(/\s*Sale price\s*৳?\s*[\d,]+\.?/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  const colors = colorLabels(ctx.colors);
  if (!colors.length) {
    // Drop "Available colors: X" lines when admin didn't set colors
    d = d.replace(/(উপলব্ধ রং|Available colors?)\s*[:：][^.।]*[.।]?/gi, '').trim();
  }
  return d;
}

const SYSTEM_PROMPT = `You are Big Bazar's expert fashion copywriter for a Bangladeshi family clothing store.
Return ONLY valid JSON (no markdown):
{"names":["...","...","...","...","..."],"description":"...","description_en":"..."}

STRICT RULES:
1. names: exactly 4-5 short retail titles (max 55 chars). Specific fashion names customers search on Facebook/WhatsApp.
2. NEVER use vague titles like "Women Collection", "Men Collection", "New Arrival", "Fashion Item".
3. Anchor titles on the subcategory product type (Three Piece, Saree, Panjabi, Parshi, Two Piece, etc.).
4. description: 2-3 natural Bangla sentences — look/feel, occasion, who it suits. No emojis.
5. description_en: 1-2 English sentences mirroring the Bangla pitch.
6. ONLY mention a color if it appears in the provided colors array OR you can clearly see it in the product photo. Never guess wrong colors (e.g. do not say Brown for a lavender outfit).
7. Do NOT invent fabric composition, discounts, stock, or brand claims not given.
8. Do NOT append store address, "Big Bazar", or "Baraiyarhat" in the description.
9. If improving existing copy, keep truth and only polish clarity + appeal.
10. Prefer searchable Bangla-English mix titles when natural (e.g. "রেডি পার্টি থ্রি পিস", "Premium Party Three Piece").`;

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
          max_tokens: 800,
          temperature: 0.55,
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

async function callGemini(apiKey, systemPrompt, userPrompt, imageUrl) {
  const models = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];
  const userParts = [{ text: userPrompt }];

  if (imageUrl && /^https?:\/\//i.test(imageUrl)) {
    try {
      const imgRes = await fetch(imageUrl, { cf: { cacheTtl: 300 } });
      if (imgRes.ok) {
        const buf = await imgRes.arrayBuffer();
        if (buf.byteLength > 0 && buf.byteLength < 4_500_000) {
          const bytes = new Uint8Array(buf);
          let binary = '';
          for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
          const b64 = btoa(binary);
          const mime = imgRes.headers.get('content-type') || 'image/jpeg';
          userParts.push({ inlineData: { mimeType: mime.split(';')[0], data: b64 } });
        }
      }
    } catch (e) {
      console.error('product-copy image fetch:', e);
    }
  }

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts: userParts }],
          generationConfig: { maxOutputTokens: 800, temperature: 0.5 },
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

function absoluteImageUrl(env, imageUrl) {
  const raw = String(imageUrl || '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith('data:')) return '';
  const site =
    env?.PUBLIC_SITE_URL ||
    env?.SITE_URL ||
    (typeof process !== 'undefined' && (process.env?.PUBLIC_SITE_URL || process.env?.SITE_URL)) ||
    'https://onlinebigbazar.com';
  try {
    return new URL(raw, String(site).replace(/\/$/, '') + '/').href;
  } catch {
    return '';
  }
}

export async function generateProductCopy(env, ctx = {}) {
  const fallback = buildTemplateCopy(ctx);
  const groqApiKey = env?.GROQ_API_KEY || (typeof process !== 'undefined' && process.env?.GROQ_API_KEY);
  const geminiApiKey = env?.GEMINI_API_KEY || (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY);

  if (!groqApiKey && !geminiApiKey) return fallback;

  const mode = ctx.mode === 'name' || ctx.mode === 'description' ? ctx.mode : 'both';
  const colors = colorLabels(ctx.colors);
  const sizes = sizeLabels(ctx.sizes);
  const subcategory = humanizeLabel(ctx.subcategory_label || ctx.subcategory);
  const category = humanizeLabel(ctx.category);
  const imageUrl = absoluteImageUrl(env, ctx.image_url);

  const userPrompt = JSON.stringify({
    task: mode === 'name'
      ? 'Suggest retail product names only (still return full JSON; description can be short polish of current).'
      : mode === 'description'
        ? 'Write a better product description; still return name options anchored on subcategory.'
        : 'Suggest names and write description.',
    current_name: ctx.name || '',
    current_description: ctx.description || '',
    category,
    subcategory,
    subcategory_raw: ctx.subcategory || '',
    price: ctx.price || '',
    original_price: ctx.original_price || '',
    colors_confirmed_by_admin: colors,
    sizes,
    is_exclusive: Boolean(ctx.is_exclusive),
    has_product_photo: Boolean(imageUrl),
    notes: ctx.notes || '',
    reminder: 'If colors_confirmed_by_admin is empty, do not invent color names unless clearly visible in the photo.',
  });

  let raw = '';
  // Prefer Gemini when we have a photo (vision) or always try Gemini first for copy quality
  if (geminiApiKey) raw = await callGemini(geminiApiKey, SYSTEM_PROMPT, userPrompt, imageUrl);
  if (!raw && groqApiKey) raw = await callGroq(groqApiKey, SYSTEM_PROMPT, userPrompt);
  if (!raw) return fallback;

  const parsed = parseAiJson(raw);
  if (!parsed) return { ...fallback, source: 'template', ai_raw: raw.slice(0, 200) };

  const names = sanitizeNames(parsed.names, ctx);
  const description = sanitizeDescription(parsed.description, ctx);
  const descriptionEn = sanitizeDescription(parsed.description_en, ctx);

  return {
    names: names.length ? names : fallback.names,
    description: description || fallback.description,
    description_en: descriptionEn || fallback.description_en,
    source: 'ai',
    used_image: Boolean(imageUrl),
  };
}
