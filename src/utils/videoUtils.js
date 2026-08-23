/**
 * Video Utilities for BigBazar:
 * - Extract a video frame at a specified timestamp using HTML5 Video + Canvas
 * - Generate a high-contrast video thumbnail poster with play badge
 */

/**
 * Attempts to capture a frame from a direct video URL or Blob URL.
 * @param {string|File|Blob} videoSource - URL or File/Blob object
 * @param {number} seekTime - Timestamp in seconds to capture (default: 1.0)
 * @returns {Promise<string|null>} - Resolves to a WebP/JPEG Data URL or null if capture fails (e.g. CORS)
 */
export async function captureVideoFrame(videoSource, seekTime = 1.0) {
  return new Promise((resolve) => {
    try {
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.muted = true;
      video.playsInline = true;
      video.preload = 'metadata';

      let objectUrl = null;
      if (videoSource instanceof Blob || videoSource instanceof File) {
        objectUrl = URL.createObjectURL(videoSource);
        video.src = objectUrl;
      } else if (typeof videoSource === 'string') {
        video.src = videoSource;
      } else {
        return resolve(null);
      }

      let timeout = setTimeout(() => {
        cleanup();
        resolve(null);
      }, 7000);

      function cleanup() {
        clearTimeout(timeout);
        video.onloadeddata = null;
        video.onseeked = null;
        video.onerror = null;
        if (objectUrl) URL.revokeObjectURL(objectUrl);
      }

      video.onloadeddata = () => {
        const timeToSeek = Math.min(seekTime, (video.duration || 2) / 2);
        video.currentTime = Math.max(0.1, timeToSeek);
      };

      video.onseeked = () => {
        try {
          const width = video.videoWidth || 720;
          const height = video.videoHeight || 1280;
          
          const canvas = document.createElement('canvas');
          canvas.width = Math.min(width, 1080);
          canvas.height = Math.min(height, 1440);

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            cleanup();
            return resolve(null);
          }

          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/webp', 0.88);
          cleanup();
          resolve(dataUrl);
        } catch (canvasErr) {
          console.warn('Canvas frame capture blocked (likely CORS):', canvasErr);
          cleanup();
          resolve(null);
        }
      };

      video.onerror = () => {
        cleanup();
        resolve(null);
      };
    } catch (err) {
      console.warn('Video frame capture error:', err);
      resolve(null);
    }
  });
}

/**
 * Generates an elegant SVG/DataURL video placeholder poster when direct frame extraction is blocked by CORS.
 * @param {string} title - Product or video title
 * @returns {string} - Data URL of the poster image
 */
export function generateVideoPoster(title = 'Big Bazar Video') {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 1000;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Background Gradient
  const grad = ctx.createLinearGradient(0, 0, 800, 1000);
  grad.addColorStop(0, '#121215');
  grad.addColorStop(0.5, '#1e1014');
  grad.addColorStop(1, '#0a0a0c');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 800, 1000);

  // Play button circle
  ctx.beginPath();
  ctx.arc(400, 480, 80, 0, Math.PI * 2);
  ctx.fillStyle = '#ce112d';
  ctx.shadowColor = 'rgba(206, 17, 45, 0.6)';
  ctx.shadowBlur = 40;
  ctx.fill();

  // Play triangle
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.moveTo(375, 435);
  ctx.lineTo(445, 480);
  ctx.lineTo(375, 525);
  ctx.closePath();
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  // Text: BigBazar Video Reel
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('VIDEO REEL', 400, 620);

  ctx.fillStyle = '#a1a1aa';
  ctx.font = '500 24px sans-serif';
  const cleanTitle = title.length > 35 ? title.substring(0, 32) + '...' : title;
  ctx.fillText(cleanTitle, 400, 670);

  return canvas.toDataURL('image/webp', 0.9);
}
