/**
 * imageCompressor.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Client-side image compression using the browser's Canvas API.
 * Zero external dependencies — works entirely in the browser before upload,
 * so no large base64 payloads ever hit the network or database.
 *
 * Presets are tuned per use-case:
 *   • product  — 1080 × 1350 (portrait 4:5), quality 82%  → ~80-150 KB
 *   • gallery  — 900  × 1125 (portrait 4:5), quality 80%  → ~60-120 KB
 *   • color    — 600  × 750  (portrait 4:5), quality 75%  → ~30-60  KB
 *   • banner   — 1920 × 1080 (landscape),   quality 85%  → ~200-400 KB
 *   • slider   — 1920 × 900  (ultra-wide),  quality 83%  → ~150-350 KB
 */

// ── Presets ──────────────────────────────────────────────────────────────────
export const COMPRESS_PRESETS = {
  product:   { maxW: 1080, maxH: 1350, quality: 0.82 },
  gallery:   { maxW: 900,  maxH: 1125, quality: 0.80 },
  color:     { maxW: 600,  maxH: 750,  quality: 0.75 },
  banner:        { maxW: 1920, maxH: 1080, quality: 0.85 },
  slider:        { maxW: 1920, maxH: 1080, quality: 0.85 }, // 1920x1080 (16:9), 1920x600 (Slim), 1024x500 (Tablet)
  slider_mobile: { maxW: 1080, maxH: 1080, quality: 0.85 }, // 768x1024 (Vertical), 600x600 (Square), 420x400
  thumbnail:     { maxW: 400,  maxH: 400,  quality: 0.80 },
};

/**
 * Helper: Try multiple browser image decoding mechanisms
 * (createImageBitmap -> FileReader DataURL -> ObjectURL)
 */
async function decodeImageFile(file) {
  // Method 1: createImageBitmap (Modern, off-thread, fast & extremely reliable for AI PNGs/JPEGs)
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
      console.warn('imageCompressor: createImageBitmap decoding failed, trying FileReader:', e);
    }
  }

  // Method 2: FileReader Data URL + HTMLImageElement (Bypasses object URL security restrictions)
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
    console.warn('imageCompressor: FileReader DataURL load failed, trying ObjectURL:', e);
  }

  // Method 3: Blob ObjectURL + HTMLImageElement
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

/**
 * Compress a single File or Blob using Canvas.
 *
 * @param {File|Blob} file       - Source image file from <input type="file">
 * @param {object}   options     - { maxW, maxH, quality } — see COMPRESS_PRESETS
 * @returns {Promise<File>}      - Compressed File (always JPEG for maximum compat)
 */
export async function compressImage(file, options = {}) {
  const { maxW = 1080, maxH = 1350, quality = 0.82 } = options;

  // Check mime type and file extension fallback
  const isImage = (file.type && file.type.startsWith('image/')) || 
                  /\.(jpe?g|png|webp|jfif|hdr|heic|heif|bmp|tiff)$/i.test(file.name);

  if (!isImage) {
    throw new Error(`File "${file.name}" is not a recognized image format.`);
  }

  // Skip GIFs (animation frame flattening prevention)
  if (file.type === 'image/gif' || /\.gif$/i.test(file.name)) {
    console.log('imageCompressor: Skipped GIF to reserve animation:', file.name);
    return file;
  }

  console.log(`imageCompressor: Starting compression for ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)...`);

  try {
    const { drawable, width: origW, height: origH, cleanup } = await decodeImageFile(file);
    console.log(`imageCompressor: Decoded ${file.name}. Dimensions: ${origW}x${origH}`);

    // Calculate scaled dimensions keeping aspect ratio
    const ratio = Math.min(maxW / origW, maxH / origH, 1); // never upscale
    const width = Math.round(origW * ratio);
    const height = Math.round(origH * ratio);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // White background (handles transparent PNGs gracefully when saving as JPEG)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(drawable, 0, 0, width, height);

    if (typeof cleanup === 'function') {
      cleanup();
    }

    const blob = await new Promise((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', quality);
    });

    if (!blob) {
      console.warn('imageCompressor: canvas.toBlob returned null for', file.name, '- using original file fallback');
      return file;
    }

    const baseName = file.name.replace(/\.[^.]+$/, '');
    const compressed = new File([blob], `${baseName}.jpg`, {
      type: 'image/jpeg',
      lastModified: Date.now(),
    });

    console.log(`imageCompressor: Compressed ${file.name} successfully. Size: ${(compressed.size / 1024 / 1024).toFixed(4)} MB`);
    return compressed;
  } catch (err) {
    console.warn(`imageCompressor: Multi-stage decoding failed for "${file.name}". Falling back to raw file:`, err.message);
    // Resilient fallback: if the original file is less than 8MB, return it directly so upload doesn't fail!
    if (file.size <= 8 * 1024 * 1024) {
      return file;
    }
    throw new Error(`Failed to decode image "${file.name}". This file format might not be supported natively by your browser (e.g. corrupt image). Please convert it to JPG/PNG before uploading.`);
  }
}

/**
 * Compress multiple files in parallel (up to 4 concurrent to avoid OOM).
 *
 * @param {File[]}  files    - Array of image files
 * @param {object}  options  - Same as compressImage options
 * @param {Function} [onProgress] - Called with (done, total) after each file
 * @returns {Promise<File[]>}
 */
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

/**
 * Returns a human-readable file size string.
 * @param {number} bytes
 */
export function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
