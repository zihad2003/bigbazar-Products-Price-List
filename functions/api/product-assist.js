/**
 * product-assist.js — vision analysis for the admin "AI Product Assist".
 *
 * One exported function so the provider stays swappable. No template
 * fallback on purpose: when the model fails, the caller keeps the
 * browser-canvas colors and the admin types the rest.
 */

const MODELS = ['gemini-3.5-flash-lite', 'gemini-3.8-flash'];
const MAX_IMAGES = 4;
const MAX_IMAGE_BYTES = 4_500_000;

const CATEGORIES = ['Men', 'Women', 'Kids (Boys)', 'Kids (Girls)'];

const SYSTEM_PROMPT = `You name and describe clothing photos for Big Bazar Baraiyarhat, a Bangladeshi family fashion shop.
Style:
- name_en (PRIMARY): English only — "Khaki Checkered Hoodie Vest & Jogger Set", "Red Bow Design Knitted Girls Dress".
- name_bn: optional short Bangla gloss of the same title (may be empty).
- description_bn: Bangla-main with natural English fashion words (Hoodie, Jogger, Dress, Set, Jacket). Exactly 2 sentences — (1) photo details (2) warm occasion. Kids → "ছোট্ট সোনামণি/রাজকন্যা". Adults → adult tone.
Rules:
- Describe ONLY what is visible. Never invent fabric %, price, size, or origin.
- No hashtags, emoji, price, delivery talk.
- category must be exactly one of: ${CATEGORIES.join(', ')}.
- colors: one entry per photo, same order. Each has "name" (shop color label; join two with " & ") and "hex".
- Reply with JSON only, no markdown fence:
{"name_en":"","name_bn":"","description_bn":"","category":"","colors":[{"name":"","hex":""}]}`;

function readEnv(env, key) {
  if (env && env[key]) return env[key];
  if (typeof process !== 'undefined' && process.env && process.env[key]) return process.env[key];
  return undefined;
}

export function productAssistEnabled(env) {
  return String(readEnv(env, 'AI_PRODUCT_ASSIST_ENABLED') || '').toLowerCase() === 'true';
}

function bytesToBase64(buf) {
  const bytes = new Uint8Array(buf);
  const CHUNK = 8192;
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

async function fetchImagePart(url) {
  const res = await fetch(url);
  if (!res.ok) return null;
  const buf = await res.arrayBuffer();
  if (!buf.byteLength || buf.byteLength > MAX_IMAGE_BYTES) return null;
  const mime = (res.headers.get('content-type') || 'image/jpeg').split(';')[0];
  if (!mime.startsWith('image/')) return null;
  return { inlineData: { mimeType: mime, data: bytesToBase64(buf) } };
}

function parseModelJson(text) {
  const raw = String(text || '').trim()
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/, '')
    .trim();
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  try { return JSON.parse(raw.slice(start, end + 1)); } catch (_) { return null; }
}

function sanitizeResult(parsed, imageUrls) {
  if (!parsed || typeof parsed !== 'object') return null;
  const text = (v, max) => String(v || '').trim().slice(0, max);
  const category = CATEGORIES.includes(parsed.category) ? parsed.category : '';
  const colors = (Array.isArray(parsed.colors) ? parsed.colors : [])
    .slice(0, imageUrls.length)
    .map((c, i) => ({
      image_url: imageUrls[i],
      name: text(c?.name, 60),
      hex: /^#[0-9a-fA-F]{6}$/.test(String(c?.hex || '')) ? c.hex : null,
    }))
    .filter((c) => c.name);
  const out = {
    name_en: text(parsed.name_en, 120),
    name_bn: text(parsed.name_bn, 120),
    description_bn: text(parsed.description_bn, 1500),
    category,
    colors,
  };
  if (!out.name_en && !out.description_bn && !out.colors.length) return null;
  return out;
}

/**
 * Analyze up to 4 product photos. Returns
 * { ok: true, ...fields } or { ok: false, status, error }.
 * Never throws; never includes provider internals in the error text.
 */
export async function analyzeProductImages(env, imageUrls) {
  const apiKey = readEnv(env, 'GEMINI_API_KEY');
  if (!apiKey) return { ok: false, status: 503, error: 'AI is not configured on this server.' };

  const urls = (Array.isArray(imageUrls) ? imageUrls : [])
    .filter((u) => /^https?:\/\//i.test(String(u || '')))
    .slice(0, MAX_IMAGES);
  if (!urls.length) return { ok: false, status: 400, error: 'No readable photo URL was given.' };

  const parts = [{ text: `There are ${urls.length} photo(s) of one product, in order.` }];
  for (const url of urls) {
    try {
      const part = await fetchImagePart(url);
      if (part) parts.push(part);
    } catch (_) {}
  }
  if (parts.length === 1) return { ok: false, status: 422, error: 'The photos could not be downloaded.' };

  let sawRateLimit = false;
  for (const model of MODELS) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
            contents: [{ role: 'user', parts }],
            generationConfig: {
              maxOutputTokens: 900,
              temperature: 0.4,
              responseMimeType: 'application/json',
            },
          }),
        }
      );
      if (res.status === 429) { sawRateLimit = true; continue; }
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        // Server console only — the client never sees provider internals.
        console.error(`product-assist ${model} HTTP ${res.status}:`, data?.error?.message || '');
        continue;
      }
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      const result = sanitizeResult(parseModelJson(text), urls);
      if (result) return { ok: true, ...result };
      console.error(`product-assist ${model}: empty or unparseable candidate`);
    } catch (err) {
      console.error(`product-assist ${model}:`, err?.message || err);
    }
  }

  return {
    ok: false,
    status: sawRateLimit ? 429 : 502,
    error: sawRateLimit
      ? 'The free AI quota is used up for now. Colors from the browser are still filled.'
      : 'Could not read the photos. Colors from the browser are still filled.',
  };
}
