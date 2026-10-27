/**
 * Admin product naming + description helper.
 * Prefer AI (Gemini vision when image available, then Groq); smart template fallback.
 */

function cleanText(s) {
  return String(s || '').replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
}

function bytesToBase64(buf) {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  const CHUNK = 8192;
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

function mimeFromName(fileName) {
  const ext = String(fileName || '').split('.').pop()?.toLowerCase();
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'gif') return 'image/gif';
  return 'image/jpeg';
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
  const isMostlyBangla = (n) => (/[\u0980-\u09FF]/.test(n) && (n.match(/[\u0980-\u09FF]/g) || []).length >= (n.match(/[A-Za-z]/g) || []).length);
  const cleaned = (Array.isArray(names) ? names : [])
    .map((n) => String(n || '').replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .filter((n) => n.length <= 80)
    .filter((n) => !/^women collection$/i.test(n) && !/^men collection$/i.test(n) && !/^kids collection$/i.test(n))
    .filter((n) => !/^(premium\s+)?kids\s+winter\s+collection$/i.test(n))
    .filter((n) => !/^new\s+kids\s+winter\s+collection$/i.test(n))
    .filter((n) => !/^kids\s*\(girls\)\s*kids\s+winter/i.test(n))
    // Product title must be English — drop Bangla-script names from the chip list
    .filter((n) => !isMostlyBangla(n))
    .map((n) => {
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
    .filter((n, i, arr) => arr.findIndex((x) => x.toLowerCase() === n.toLowerCase()) === i);
  return cleaned.slice(0, 5);
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

const SYSTEM_PROMPT = `You are Big Bazar's expert fashion copywriter for a Bangladeshi family clothing store (Baraiyarhat).
When a product photo is attached, LOOK AT THE PHOTO FIRST — colors, garment type, pattern, neckline, sleeve, buttons, bows, layers, pants/skirt — then write.

Return ONLY valid JSON (no markdown):
{"names":["English Name","...","...","...","..."],"description":"...","description_en":"..."}

NAME (English only):
- names[0] is the main product title — English only (Latin script). Formula: Color + design detail + garment (+ Set if multi-piece).
- Example: "Khaki Checkered Hoodie Vest & Jogger Set", "Mustard Jacket & Black Jogger Set", "Red Bow Design Knitted Girls Dress".
- names[1..4]: more English variants customers might search. Max ~60 chars. No Bangla script in names.

DESCRIPTION (Bangla-main + natural English fashion words — NOT pure English, NOT stiff pure Bangla):
- description: exactly 2 sentences in Bangla script, but keep common fashion words in English when natural (Hoodie, Jogger, Set, Dress, Jacket, T-Shirt, Bow, Ruffle, Knitted, Zipper, Collar).
- Sentence 1: concrete photo details (colors, sleeves, print, buttons, bows, pants/skirt).
- Sentence 2: who it suits + occasion (winter/casual/party), warm retail tone.
- Style example: "খাকি রঙের stylish Hoodie Vest, কালো-ক্রিম checkered full sleeve ডিজাইন, ভেতরে সাদা T-Shirt এবং matching Jogger pant-এর সুন্দর combination। শীতের দিনে ছোট্ট সোনামণির casual ও trendy look-এর জন্য দারুণ একটি outfit।"
- description_en: 1–2 full English sentences mirroring the same pitch (optional reference).

STRICT RULES:
1. NEVER vague titles: "Women Collection", "Men Collection", "New Arrival", "Fashion Item", "Kids Collection", "Kids Winter Collection", "Premium Kids Winter Collection", or any title that is only the subcategory name.
2. When a photo is attached you MUST describe what is visible (color, neckline, sleeves, bows, flowers, vest/layer, dress/set). Generic "soft fabric winter wear" text without those details is forbidden.
3. ONLY mention colors visible in the photo or in colors_confirmed_by_admin.
4. Do NOT invent fabric %, discounts, stock, brand, or store address. No "Big Bazar" / "Baraiyarhat" in description. No emoji, hashtags, or price.
5. If subcategory and photo disagree, trust the PHOTO.
6. Kids (Boys)/Kids (Girls): soft tone ("ছোট্ট সোনামণি" / "ছোট্ট রাজকন্যা"). Men/Women: adult tone.`;

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
          max_tokens: 900,
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

async function loadProductImage(env, imageUrl) {
  const raw = String(imageUrl || '').trim();
  if (!raw || raw.startsWith('data:')) return null;

  // Hostinger disk: /api/img/up-xxxx.webp → uploads/api/img/up-xxxx.webp
  const relMatch = raw.match(/\/api\/img\/([^/?#]+)$/i) || raw.match(/^\/?([^/?#]+\.(?:webp|jpe?g|png|gif))$/i);
  if (relMatch && typeof process !== 'undefined') {
    try {
      const fs = await import('fs');
      const path = await import('path');
      const fileName = decodeURIComponent(relMatch[1]);
      const candidates = [
        path.resolve(process.cwd(), 'uploads', 'api', 'img', fileName),
        path.resolve(process.cwd(), 'dist', 'api', 'img', fileName),
        path.resolve(process.cwd(), 'public', 'api', 'img', fileName),
      ];
      for (const file of candidates) {
        try {
          if (!fs.existsSync(file)) continue;
          const buf = fs.readFileSync(file);
          if (buf.length > 0 && buf.length < 4_500_000) {
            return { mimeType: mimeFromName(fileName), data: bytesToBase64(buf) };
          }
        } catch (e) {
          console.error('product-copy disk read:', e?.message || e);
        }
      }
    } catch (_) {
      /* Workers / non-Node — fall through to HTTP fetch */
    }
  }

  const site =
    env?.PUBLIC_SITE_ORIGIN ||
    env?.PUBLIC_SITE_URL ||
    env?.SITE_URL ||
    (typeof process !== 'undefined' && (process.env?.PUBLIC_SITE_ORIGIN || process.env?.PUBLIC_SITE_URL || process.env?.SITE_URL)) ||
    'https://onlinebigbazar.com';
  let absolute = raw;
  if (!/^https?:\/\//i.test(raw)) {
    try {
      absolute = new URL(raw, String(site).replace(/\/$/, '') + '/').href;
    } catch {
      return null;
    }
  }

  try {
    const imgRes = await fetch(absolute, { cf: { cacheTtl: 60 } });
    if (!imgRes.ok) {
      console.error('product-copy image HTTP', imgRes.status, absolute);
      return null;
    }
    const buf = await imgRes.arrayBuffer();
    if (!buf.byteLength || buf.byteLength >= 4_500_000) return null;
    const mime = (imgRes.headers.get('content-type') || mimeFromName(absolute)).split(';')[0];
    return { mimeType: mime.startsWith('image/') ? mime : 'image/jpeg', data: bytesToBase64(buf) };
  } catch (e) {
    console.error('product-copy image fetch:', e?.message || e);
    return null;
  }
}

async function callGemini(apiKey, systemPrompt, userPrompt, imagePart) {
  // Prefer current vision Flash models; keep 2.5/2.0 as fallbacks.
  const models = ['gemini-3.8-flash', 'gemini-3.5-flash-lite', 'gemini-2.5-flash', 'gemini-2.0-flash'];
  const userParts = [{ text: userPrompt }];
  const attachedImage = Boolean(imagePart?.data);

  if (attachedImage) {
    userParts.unshift({
      text: 'Product photo is attached as inline image. You MUST name and describe THIS exact garment from the photo (colors, layers, bows, flowers, sleeves). Do not write generic subcategory copy.',
    });
    userParts.push({ inlineData: { mimeType: imagePart.mimeType || 'image/jpeg', data: imagePart.data } });
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
          generationConfig: {
            maxOutputTokens: 900,
            temperature: 0.35,
            ...(attachedImage ? { responseMimeType: 'application/json' } : {}),
          },
        }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        console.error(`product-copy Gemini ${model} HTTP ${res.status}:`, errBody?.error?.message || '');
        continue;
      }
      const data = await res.json();
      const text = cleanText(data.candidates?.[0]?.content?.parts?.[0]?.text);
      if (text) return { text, usedImage: attachedImage };
    } catch (e) {
      console.error(`product-copy Gemini ${model}:`, e);
    }
  }
  return { text: '', usedImage: false };
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
  const imagePart = ctx.image_url ? await loadProductImage(env, ctx.image_url) : null;

  const userPrompt = JSON.stringify({
    task: mode === 'name'
      ? 'Suggest retail product names from the PHOTO (still return full JSON).'
      : mode === 'description'
        ? 'Write a photo-accurate product description; names must also match the photo, not only subcategory.'
        : 'Suggest names and write description from the product PHOTO.',
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
    has_product_photo: Boolean(imagePart),
    notes: ctx.notes || '',
    reminder: imagePart
      ? 'Photo is attached. Describe visible details. Never output only the subcategory name.'
      : 'No photo attached — use category/subcategory carefully; avoid inventing unseen details.',
  });

  let raw = '';
  let usedImage = false;
  if (geminiApiKey) {
    const gem = await callGemini(geminiApiKey, SYSTEM_PROMPT, userPrompt, imagePart);
    raw = gem.text;
    usedImage = gem.usedImage;
  }
  // Groq has no vision — only use when there is no photo to describe
  if (!raw && groqApiKey && !imagePart) {
    raw = await callGroq(groqApiKey, SYSTEM_PROMPT, userPrompt);
  }
  if (!raw) {
    return {
      ...fallback,
      source: 'template',
      used_image: false,
      warning: ctx.image_url && !imagePart
        ? 'Photo could not be loaded for AI vision — used template. Redeploy/check /api/img path.'
        : (imagePart ? 'Vision model failed — used template.' : undefined),
    };
  }

  const parsed = parseAiJson(raw);
  if (!parsed) return { ...fallback, source: 'template', used_image: usedImage, ai_raw: raw.slice(0, 200) };

  const names = sanitizeNames(parsed.names, ctx);
  const description = sanitizeDescription(parsed.description, ctx);
  const descriptionEn = sanitizeDescription(parsed.description_en, ctx);

  return {
    names: names.length ? names : fallback.names,
    description: description || fallback.description,
    description_en: descriptionEn || fallback.description_en,
    source: 'ai',
    used_image: usedImage,
  };
}
