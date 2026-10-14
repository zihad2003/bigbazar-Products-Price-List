/**
 * productColorExtract.js — admin-only helper, imported from Admin.jsx only.
 *
 * Reads an uploaded product photo on a small canvas and guesses the product
 * colors without any network call. This is the instant placeholder; the
 * server-side AI result is the authority when it arrives.
 *
 * Method:
 *  - downsample to ~64x64
 *  - estimate the background from the border pixels and drop similar pixels
 *  - weight center pixels higher, lightly down-weight likely skin
 *  - k-means in LAB space, map each cluster to the site color catalog
 *  - keep clusters above ~8% share
 */

import { getColorName } from './colorNames';

const SIZE = 64;
const K = 5;
const KMEANS_ITERATIONS = 8;
const MIN_SHARE = 0.08;
const BG_DISTANCE = 14; // LAB distance that still counts as "same as background"

function srgbToLinear(v) {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function rgbToLab(r, g, b) {
  const rl = srgbToLinear(r);
  const gl = srgbToLinear(g);
  const bl = srgbToLinear(b);
  // sRGB D65
  let x = (rl * 0.4124 + gl * 0.3576 + bl * 0.1805) / 0.95047;
  let y = rl * 0.2126 + gl * 0.7152 + bl * 0.0722;
  let z = (rl * 0.0193 + gl * 0.1192 + bl * 0.9505) / 1.08883;
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  x = f(x); y = f(y); z = f(z);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}

function labDistance(a, b) {
  const dl = a[0] - b[0];
  const da = a[1] - b[1];
  const db = a[2] - b[2];
  return Math.sqrt(dl * dl + da * da + db * db);
}

function rgbToHex(r, g, b) {
  const h = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

/** Rough skin probability from RGB. Used only to down-weight, never to drop. */
function looksLikeSkin(r, g, b) {
  return r > 95 && g > 40 && b > 20
    && r > g && r > b
    && (r - Math.min(g, b)) > 15
    && Math.abs(r - g) > 15;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('image load failed'));
    img.src = src;
  });
}

function samplePixels(img) {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, SIZE, SIZE);
  return ctx.getImageData(0, 0, SIZE, SIZE).data;
}

/** Average LAB of the outer border ring — the background estimate. */
function backgroundLabs(data) {
  const labs = [];
  const border = 2;
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const onBorder = x < border || y < border || x >= SIZE - border || y >= SIZE - border;
      if (!onBorder) continue;
      const i = (y * SIZE + x) * 4;
      if (data[i + 3] < 128) continue;
      labs.push(rgbToLab(data[i], data[i + 1], data[i + 2]));
    }
  }
  // Two background anchors (e.g. gradient backdrops): simple 2-means
  if (!labs.length) return [];
  let c1 = labs[0];
  let c2 = labs[labs.length - 1];
  for (let iter = 0; iter < 4; iter++) {
    const g1 = []; const g2 = [];
    labs.forEach((lab) => (labDistance(lab, c1) <= labDistance(lab, c2) ? g1 : g2).push(lab));
    const mean = (g) => g.length
      ? [0, 1, 2].map((ch) => g.reduce((s, v) => s + v[ch], 0) / g.length)
      : null;
    c1 = mean(g1) || c1;
    c2 = mean(g2) || c2;
  }
  return [c1, c2];
}

/**
 * Extract the dominant product colors from an image URL.
 * Resolves to [{ name_en, name_bn, hex, share }] sorted by share, or [] on
 * any failure (CORS-tainted canvas, broken URL, blank image).
 */
export async function extractProductColors(src) {
  try {
    const img = await loadImage(src);
    const data = samplePixels(img);
    const bgs = backgroundLabs(data);

    const points = []; // { lab, rgb, weight }
    const center = (SIZE - 1) / 2;
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const i = (y * SIZE + x) * 4;
        if (data[i + 3] < 128) continue;
        const r = data[i]; const g = data[i + 1]; const b = data[i + 2];
        const lab = rgbToLab(r, g, b);
        if (bgs.some((bg) => labDistance(lab, bg) < BG_DISTANCE)) continue;

        const dx = (x - center) / center;
        const dy = (y - center) / center;
        let weight = 1.6 - Math.min(1, Math.sqrt(dx * dx + dy * dy)); // center counts more
        if (looksLikeSkin(r, g, b)) weight *= 0.35;
        points.push({ lab, rgb: [r, g, b], weight });
      }
    }
    if (points.length < 40) return []; // nearly everything matched the background

    // k-means seeded by spread
    let centers = [];
    const step = Math.max(1, Math.floor(points.length / K));
    for (let k = 0; k < K; k++) centers.push(points[Math.min(points.length - 1, k * step)].lab.slice());

    let assign = new Array(points.length).fill(0);
    for (let iter = 0; iter < KMEANS_ITERATIONS; iter++) {
      for (let p = 0; p < points.length; p++) {
        let best = 0; let bestD = Infinity;
        for (let k = 0; k < centers.length; k++) {
          const d = labDistance(points[p].lab, centers[k]);
          if (d < bestD) { bestD = d; best = k; }
        }
        assign[p] = best;
      }
      const sums = centers.map(() => [0, 0, 0, 0]);
      for (let p = 0; p < points.length; p++) {
        const s = sums[assign[p]];
        const w = points[p].weight;
        s[0] += points[p].lab[0] * w;
        s[1] += points[p].lab[1] * w;
        s[2] += points[p].lab[2] * w;
        s[3] += w;
      }
      centers = centers.map((c, k) => (sums[k][3] > 0
        ? [sums[k][0] / sums[k][3], sums[k][1] / sums[k][3], sums[k][2] / sums[k][3]]
        : c));
    }

    // Cluster share + mean RGB
    const totals = centers.map(() => ({ weight: 0, r: 0, g: 0, b: 0 }));
    let totalWeight = 0;
    for (let p = 0; p < points.length; p++) {
      const t = totals[assign[p]];
      const w = points[p].weight;
      t.weight += w;
      t.r += points[p].rgb[0] * w;
      t.g += points[p].rgb[1] * w;
      t.b += points[p].rgb[2] * w;
      totalWeight += w;
    }

    const byName = new Map();
    totals.forEach((t) => {
      if (!t.weight || !totalWeight) return;
      const share = t.weight / totalWeight;
      if (share < MIN_SHARE) return;
      const hex = rgbToHex(t.r / t.weight, t.g / t.weight, t.b / t.weight);
      const named = getColorName(hex);
      const key = named.en.toLowerCase();
      const prev = byName.get(key);
      if (prev) {
        prev.share += share;
      } else {
        byName.set(key, { name_en: named.en, name_bn: named.bn, hex, share });
      }
    });

    return [...byName.values()].sort((a, b) => b.share - a.share).slice(0, 3);
  } catch (_) {
    return [];
  }
}

/** One display label for a photo: "Maroon" or "Maroon & Gold". */
export function combinedColorLabel(colors) {
  const names = (colors || []).map((c) => c.name_en).filter(Boolean);
  if (!names.length) return '';
  if (names.length === 1) return names[0];
  return `${names[0]} & ${names[1]}`;
}
