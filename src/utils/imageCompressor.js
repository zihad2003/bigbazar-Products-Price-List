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
  product: { maxW: 1080, maxH: 1350, quality: 0.82 },
  gallery: { maxW: 900,  maxH: 1125, quality: 0.80 },
  color:   { maxW: 600,  maxH: 750,  quality: 0.75 },
  banner:  { maxW: 1920, maxH: 1080, quality: 0.85 },
  slider:  { maxW: 1920, maxH: 900,  quality: 0.83 },
};

/**
 * Compress a single File or Blob using Canvas.
 *
 * @param {File|Blob} file       - Source image file from <input type="file">
 * @param {object}   options     - { maxW, maxH, quality } — see COMPRESS_PRESETS
 * @returns {Promise<File>}      - Compressed File (always JPEG for maximum compat)
 */
export async function compressImage(file, options = {}) {
  const { maxW = 1080, maxH = 1350, quality = 0.82 } = options;

  return new Promise((resolve, reject) => {
    // Check mime type and file extension fallback (vital on Windows where mime types can be empty)
    const isImage = (file.type && file.type.startsWith('image/')) || 
                    /\.(jpe?g|png|webp|jfif|hdr|heic|heif|bmp|tiff)$/i.test(file.name);

    if (!isImage) {
      reject(new Error(`File "${file.name}" is not a recognized image format. Only JPEG, PNG, WEBP, and standard web graphics are supported. If it is an iPhone photo (HEIC), please convert it to JPEG first.`));
      return;
    }

    // Skip GIFs (animation frame flattening prevention)
    if (file.type === 'image/gif' || /\.gif$/i.test(file.name)) {
      console.log('imageCompressor: Skipped GIF to reserve animation:', file.name);
      resolve(file); // GIFs are allowed as-is
      return;
    }

    console.log(`imageCompressor: Starting compression for ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)...`);
    const img = new Image();

    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      console.log(`imageCompressor: Loaded ${file.name}. Original dimensions: ${img.width}x${img.height}`);

      // ── Calculate scaled dimensions keeping aspect ratio ──────────────────
      let { width, height } = img;
      const ratio = Math.min(maxW / width, maxH / height, 1); // never upscale
      width  = Math.round(width  * ratio);
      height = Math.round(height * ratio);
      console.log(`imageCompressor: Resizing ${file.name} to ${width}x${height} with ratio ${ratio}`);

      // ── Draw to offscreen canvas ──────────────────────────────────────────
      const canvas = document.createElement('canvas');
      canvas.width  = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      // White background (handles transparent PNGs gracefully when saving as JPEG)
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      // ── Export as JPEG blob ───────────────────────────────────────────────
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            console.error('imageCompressor: canvas.toBlob returned null target for', file.name);
            reject(new Error('Failed to generate compressed image binary (canvas export failed).'));
            return;
          }
          // Preserve original filename, change extension to jpg
          const baseName = file.name.replace(/\.[^.]+$/, '');
          const compressed = new File([blob], `${baseName}.jpg`, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });
          console.log(`imageCompressor: Compressed ${file.name} successfully. Compressed size: ${(compressed.size / 1024 / 1024).toFixed(4)} MB`);
          resolve(compressed);
        },
        'image/jpeg',
        quality,
      );
    };

    img.onerror = (e) => {
      console.error(`imageCompressor: Error loading file ${file.name} into Image decoder.`, e);
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`Failed to decode image "${file.name}". This file format might not be supported natively by your browser (e.g. iPhone HEIC, TIFF, or corrupt image). Please convert it to JPG/PNG before uploading.`));
    };

    img.src = objectUrl;
  });
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
