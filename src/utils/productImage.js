/**
 * Resolve product photos, preferring the ordered color variant image.
 */

function parseMaybeJson(raw) {
  if (raw == null) return raw;
  if (typeof raw !== 'string') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

export function productImageList(product) {
  const list = [];
  const push = (url) => {
    const value = String(url || '').trim();
    if (value && !list.includes(value)) list.push(value);
  };

  let images = parseMaybeJson(product?.images);
  if (Array.isArray(images)) images.forEach(push);
  else if (typeof images === 'string') push(images);

  push(product?.image_url);
  return list;
}

export function colorVariantImage(product, colorName) {
  const want = String(colorName || '').trim().toLowerCase();
  if (!product || !want) return null;

  let colors = parseMaybeJson(product.available_colors);
  if (!Array.isArray(colors)) return null;

  const matched = colors.find((entry) => {
    const name = typeof entry === 'object' ? entry?.name : entry;
    return name && String(name).trim().toLowerCase() === want;
  });

  if (matched && typeof matched === 'object') {
    return matched.image || matched.image_url || null;
  }
  return null;
}

export function productImageForColor(product, colorName) {
  if (!product) return null;
  return (
    colorVariantImage(product, colorName)
    || product.image_url
    || productImageList(product)[0]
    || null
  );
}

/** Color variant first, then remaining gallery photos. */
export function productPhotosPreferColor(product, colorName) {
  const list = productImageList(product);
  const colorImg = colorVariantImage(product, colorName);
  if (!colorImg) return list;
  return [colorImg, ...list.filter((url) => url !== colorImg)];
}
