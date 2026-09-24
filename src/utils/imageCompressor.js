/**
 * imageCompressor.js
 * Client-side Canvas compression before upload.
 *
 * Product photos → WebP (high quality, no aggressive crush)
 * Banner / slider / subcategory thumbnails → JPEG (unchanged)
 */

export const COMPRESS_PRESETS = {
  // Products: WebP, near-original quality, generous max size
  product:       { maxW: 2000, maxH: 2500, quality: 0.92, format: 'webp' },
  gallery:       { maxW: 1600, maxH: 2000, quality: 0.90, format: 'webp' },
  color:         { maxW: 1200, maxH: 1500, quality: 0.90, format: 'webp' },
  // Banners / subcategory — keep JPEG as requested
  banner:        { maxW: 1920, maxH: 1080, quality: 0.85, format: 'jpeg' },
  slider:        { maxW: 1920, maxH: 1080, quality: 0.85, format: 'jpeg' },
  slider_mobile: { maxW: 1080, maxH: 1080, quality: 0.85, format: 'jpeg' },
  thumbnail:     { maxW: 400,  maxH: 400,  quality: 0.80, format: 'jpeg' },
};

async function decodeImageFile(file) {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file);
      return {
        drawable: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        cleanup: () => {
          if (typeof bitmap.close === 'function') bitmap.close();
        }
      };
    } catch (e) {
      console.warn('imageCompressor: createImageBitmap failed, trying FileReader:', e);
    }
  }

  try {
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });

    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = dataUrl;
    });

    return {
      drawable: img,
      width: img.width,
      height: img.height,
      cleanup: () => {}
    };
  } catch (e) {
    console.warn('imageCompressor: FileReader failed, trying ObjectURL:', e);
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = objectUrl;
    });

    return {
      drawable: img,
      width: img.width,
      height: img.height,
      cleanup: () => URL.revokeObjectURL(objectUrl)
    };
  } catch (e) {
    URL.revokeObjectURL(objectUrl);
    throw new Error(`Failed to decode image file "${file.name}".`);
  }
}

function supportsWebP() {
  try {
    const c = document.createElement('canvas');
    c.width = 1;
    c.height = 1;
    return c.toDataURL('image/webp').startsWith('data:image/webp');
  } catch (_) {
    return false;
  }
}

/**
 * @param {File|Blob} file
 * @param {object} options - { maxW, maxH, quality, format: 'webp'|'jpeg' }
 * @returns {Promise<File>}
 */
export async function compressImage(file, options = {}) {
  const {
    maxW = 1080,
    maxH = 1350,
    quality = 0.82,
    format = 'jpeg',
  } = options;

  const isImage = (file.type && file.type.startsWith('image/')) ||
    /\.(jpe?g|png|webp|jfif|hdr|heic|heif|bmp|tiff)$/i.test(file.name);

  if (!isImage) {
    throw new Error(`File "${file.name}" is not a recognized image format.`);
  }

  if (file.type === 'image/gif' || /\.gif$/i.test(file.name)) {
    return file;
  }

  const wantWebp = format === 'webp' && supportsWebP();
  const mime = wantWebp ? 'image/webp' : 'image/jpeg';
  const ext = wantWebp ? 'webp' : 'jpg';

  try {
    const { drawable, width: origW, height: origH, cleanup } = await decodeImageFile(file);

    const ratio = Math.min(maxW / origW, maxH / origH, 1);
    const width = Math.round(origW * ratio);
    const height = Math.round(origH * ratio);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // WebP keeps alpha; JPEG needs white fill for transparent PNGs
    if (!wantWebp) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
    }
    ctx.drawImage(drawable, 0, 0, width, height);

    if (typeof cleanup === 'function') cleanup();

    const blob = await new Promise((resolve) => {
      canvas.toBlob(resolve, mime, quality);
    });

    if (!blob) {
      console.warn('imageCompressor: toBlob null — using original');
      return file;
    }

    // Prefer compressed only if smaller OR we converted format; never inflate tiny originals badly
    if (blob.size > file.size * 1.15 && file.type === mime) {
      return file;
    }

    const baseName = file.name.replace(/\.[^.]+$/, '');
    return new File([blob], `${baseName}.${ext}`, {
      type: mime,
      lastModified: Date.now(),
    });
  } catch (err) {
    console.warn(`imageCompressor: failed for "${file.name}":`, err.message);
    if (file.size <= 8 * 1024 * 1024) return file;
    throw new Error(`Failed to decode image "${file.name}". Convert to JPG/PNG/WebP and retry.`);
  }
}

export async function compressImages(files, options = {}, onProgress) {
  const CONCURRENCY = 4;
  const results = new Array(files.length);
  let done = 0;

  for (let i = 0; i < files.length; i += CONCURRENCY) {
    const batch = files.slice(i, i + CONCURRENCY);
    const compressed = await Promise.all(
      batch.map((f) => compressImage(f, options))
    );
    compressed.forEach((f, j) => {
      results[i + j] = f;
      done++;
      if (onProgress) onProgress(done, files.length);
    });
  }

  return results;
}

export function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
